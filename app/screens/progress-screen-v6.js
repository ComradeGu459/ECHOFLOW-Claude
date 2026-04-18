"use client";

import { useMemo, useState } from "react";

import { buildStudyAnalytics } from "../lib/analytics-center";
import { usePlatformStore } from "../platform-store";

function buildTrendBars(trend, field) {
  const maxValue = Math.max(...trend.map((item) => item[field]), 0);
  return trend.map((item) => ({
    ...item,
    ratio: maxValue ? item[field] / maxValue : 0,
  }));
}

export default function ProgressScreenV6() {
  const { state, resolvedAiRoutes, runBehaviorAnalysis } = usePlatformStore();
  const [isRunningAdvice, setIsRunningAdvice] = useState(false);
  const analytics = useMemo(
    () =>
      buildStudyAnalytics({
        logs: state.logs,
        materials: state.materials,
        cards: state.cards,
        now: new Date().toISOString(),
      }),
    [state.cards, state.logs, state.materials],
  );

  const studyBars = buildTrendBars(analytics.trend, "studyMinutes");
  const topicTotal = analytics.topicDistribution.reduce((sum, item) => sum + item.count, 0);
  const behaviorService = resolvedAiRoutes.behavior_analysis;

  async function handleBehaviorAnalysis() {
    setIsRunningAdvice(true);
    await runBehaviorAnalysis();
    setIsRunningAdvice(false);
  }

  return (
    <div className="page-grid progress-reference-grid">
      <section className="progress-reference-head">
        <div>
          <h2>学习数据中心</h2>
          <p>追踪你的口语训练进展与表达资产积累。</p>
        </div>
        <label className="compact-select">
          <span>时间范围</span>
          <select value="7days" readOnly>
            <option value="7days">近 7 天</option>
          </select>
        </label>
      </section>

      <section className="progress-reference-stats">
        <article className="progress-stat-card">
          <span className="progress-stat-icon blue">◷</span>
          <strong>{analytics.totalStudyMinutes}m</strong>
          <p>总学习时长</p>
          <small>真实学习会话累计</small>
        </article>
        <article className="progress-stat-card">
          <span className="progress-stat-icon purple">◉</span>
          <strong>{analytics.shadowingCount} 句</strong>
          <p>口语输出训练</p>
          <small>{state.logs.filter((item) => item.type === "跟读录音").length} 次发音反馈</small>
        </article>
        <article className="progress-stat-card">
          <span className="progress-stat-icon green">≋</span>
          <strong>{analytics.masteredExpressionCount} 掌握</strong>
          <p>表达资产积累</p>
          <small>今日待复习 {analytics.dueReviewCount} 张</small>
        </article>
        <article className="progress-stat-card">
          <span className="progress-stat-icon orange">⌁</span>
          <strong>{analytics.continuousStudyDays} 天</strong>
          <p>连续学习</p>
          <small>本周一致性 {analytics.continuousStudyDays ? Math.min(100, analytics.continuousStudyDays * 14) : 0}%</small>
        </article>
      </section>

      <section className="progress-reference-panels">
        <div className="progress-trend-panel">
          <div className="section-top">
            <div>
              <h2>学习行为趋势 (分钟)</h2>
              <p>没有真实记录就保持空态，不画假曲线。</p>
            </div>
            <div className="tag-collection">
              <span className="pill-tag" data-tone="info">输入</span>
              <span className="pill-tag" data-tone="learning">输出</span>
              <span className="pill-tag" data-tone="warning">复习</span>
            </div>
          </div>

          {studyBars.some((item) => item.studyMinutes > 0 || item.shadowingCount > 0 || item.reviewCount > 0) ? (
            <div className="progress-trend-chart">
              <div className="progress-trend-gridlines">
                {[4, 3, 2, 1, 0].map((tick) => (
                  <span key={tick}>{tick}</span>
                ))}
              </div>
              <div className="progress-trend-bars">
                {studyBars.map((item) => (
                  <div className="progress-trend-column" key={item.day}>
                    <div className="progress-trend-stack">
                      <span className="trend-bar study" style={{ height: `${item.ratio * 180}px` }} />
                    </div>
                    <label>{item.day.slice(5)}</label>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="empty-note">最近 7 天还没有真实学习记录。</div>
          )}
        </div>

        <div className="progress-topic-panel">
          <div className="section-top">
            <div>
              <h2>语料主题分布</h2>
              <p>仅按真实学习行为聚合。</p>
            </div>
          </div>
          {analytics.topicDistribution.length ? (
            <div className="progress-topic-donut-shell">
              <div className="progress-topic-donut">
                <div className="progress-topic-donut-center">
                  <strong>{topicTotal}</strong>
                  <span>涉猎主题</span>
                </div>
              </div>
              <div className="progress-topic-legend">
                {analytics.topicDistribution.map((item, index) => (
                  <div className="progress-topic-legend-row" key={item.topic}>
                    <span className={`legend-dot tone-${(index % 5) + 1}`} />
                    <strong>{item.topic}</strong>
                    <p>{item.count} 次</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="empty-note">暂无主题数据。</div>
          )}
        </div>
      </section>

      <section className="progress-reference-bottom">
        <div className="progress-skill-panel">
          <div className="section-top">
            <div>
              <h2>能力图谱</h2>
              <p>只基于真实记录粗粒度展示，不做演示分数。</p>
            </div>
          </div>
          {state.logs.length ? (
            <div className="progress-skill-bars">
              <div className="progress-skill-row">
                <span>听理解</span>
                <div className="progress-skill-track"><i style={{ width: `${Math.min(100, analytics.totalStudyMinutes * 2)}%` }} /></div>
              </div>
              <div className="progress-skill-row">
                <span>口语输出</span>
                <div className="progress-skill-track"><i style={{ width: `${Math.min(100, analytics.shadowingCount * 18)}%` }} /></div>
              </div>
              <div className="progress-skill-row">
                <span>复习巩固</span>
                <div className="progress-skill-track"><i style={{ width: `${Math.min(100, analytics.dueReviewCount * 16)}%` }} /></div>
              </div>
            </div>
          ) : (
            <div className="empty-note">开始学习后，这里才会出现真实能力图谱。</div>
          )}
        </div>

        <div className="progress-advice-panel">
          <div className="section-top">
            <div>
              <h2>AI 学习建议</h2>
              <p>只在 behavior_analysis 已配置时生成。</p>
            </div>
            <button
              className="ios-button secondary"
              disabled={!behaviorService || !state.logs.length || isRunningAdvice}
              type="button"
              onClick={handleBehaviorAnalysis}
            >
              {isRunningAdvice ? "分析中..." : "生成建议"}
            </button>
          </div>

          {state.analytics.behaviorSuggestion ? (
            <pre className="assistant-output">{state.analytics.behaviorSuggestion}</pre>
          ) : (
            <div className="empty-note">
              {!state.logs.length
                ? "导入并完成一次真实学习后，这里才会出现建议。"
                : behaviorService
                  ? `当前建议由 ${behaviorService.providerName} 生成，点击按钮后才会出现真实内容。`
                  : "未配置 behavior_analysis provider。"}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
