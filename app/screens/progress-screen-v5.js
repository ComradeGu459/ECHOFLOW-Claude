"use client";

import { useMemo, useState } from "react";

import { buildStudyAnalytics } from "../lib/analytics-center";
import { usePlatformStore } from "../platform-store";

function buildTrendPoints(trend, field, maxValue, height) {
  if (!trend.length || maxValue <= 0) return "";

  return trend
    .map((item, index) => {
      const x = (index / Math.max(trend.length - 1, 1)) * 100;
      const y = height - (item[field] / maxValue) * height;
      return `${x},${y}`;
    })
    .join(" ");
}

export default function ProgressScreenV5() {
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

  const maxTrendValue = Math.max(
    ...analytics.trend.flatMap((item) => [
      item.studyMinutes,
      item.shadowingCount,
      item.reviewCount,
    ]),
    0,
  );
  const studyPolyline = buildTrendPoints(analytics.trend, "studyMinutes", maxTrendValue, 180);
  const shadowPolyline = buildTrendPoints(analytics.trend, "shadowingCount", maxTrendValue, 180);
  const reviewPolyline = buildTrendPoints(analytics.trend, "reviewCount", maxTrendValue, 180);
  const behaviorService = resolvedAiRoutes.behavior_analysis;

  async function handleBehaviorAnalysis() {
    setIsRunningAdvice(true);
    await runBehaviorAnalysis();
    setIsRunningAdvice(false);
  }

  return (
    <div className="page-grid analytics-grid-v4">
      <section className="ios-card section-card analytics-hero-card">
        <div className="section-top">
          <div>
            <h2>学习数据中心</h2>
            <p>只追踪真实本地学习记录，不展示估算值、演示趋势或假图表。</p>
          </div>
          <span className="status-badge" data-tone="info">
            最近 7 天
          </span>
        </div>

        <div className="stats-grid analytics-stats-grid">
          <div className="metric-card">
            <strong>{analytics.totalStudyMinutes}m</strong>
            <span>总学习时长</span>
          </div>
          <div className="metric-card">
            <strong>{analytics.continuousStudyDays}</strong>
            <span>连续学习天数</span>
          </div>
          <div className="metric-card">
            <strong>{analytics.shadowingCount}</strong>
            <span>跟读次数</span>
          </div>
          <div className="metric-card">
            <strong>{analytics.masteredExpressionCount}</strong>
            <span>已掌握表达数</span>
          </div>
          <div className="metric-card">
            <strong>{analytics.dueReviewCount}</strong>
            <span>待复习数量</span>
          </div>
        </div>
      </section>

      <section className="ios-card section-card analytics-chart-card">
        <div className="section-top">
          <div>
            <h2>近 7 天趋势</h2>
            <p>趋势来自真实学习会话、跟读录音和复习日志。</p>
          </div>
          <div className="tag-collection">
            <span className="pill-tag" data-tone="info">学习时长</span>
            <span className="pill-tag" data-tone="learning">跟读</span>
            <span className="pill-tag" data-tone="warning">复习</span>
          </div>
        </div>

        {maxTrendValue > 0 ? (
          <div className="analytics-trend-wrap">
            <svg className="analytics-trend-svg" viewBox="0 0 100 200" preserveAspectRatio="none">
              <polyline className="analytics-line study" fill="none" points={studyPolyline} />
              <polyline className="analytics-line shadow" fill="none" points={shadowPolyline} />
              <polyline className="analytics-line review" fill="none" points={reviewPolyline} />
            </svg>
            <div className="analytics-trend-labels">
              {analytics.trend.map((item) => (
                <span key={item.day}>{item.day.slice(5)}</span>
              ))}
            </div>
          </div>
        ) : (
          <div className="empty-note">最近 7 天还没有真实学习记录，趋势图暂时为空。</div>
        )}
      </section>

      <section className="ios-card section-card analytics-topic-card">
        <div className="section-top">
          <div>
            <h2>学习主题分布</h2>
            <p>按真实学习日志关联到素材主题，不会用导入素材数量冒充主题活跃度。</p>
          </div>
        </div>

        {analytics.topicDistribution.length ? (
          <div className="analytics-topic-list">
            {analytics.topicDistribution.map((item) => (
              <div className="analytics-topic-row" key={item.topic}>
                <div>
                  <strong>{item.topic}</strong>
                  <p>{item.count} 次学习相关行为</p>
                </div>
                <div className="analytics-topic-bar">
                  <span style={{ width: `${(item.count / analytics.topicDistribution[0].count) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-note">还没有足够的真实学习行为来形成主题分布。</div>
        )}
      </section>

      <section className="ios-card section-card analytics-ai-card">
        <div className="section-top">
          <div>
            <h2>AI 学习建议</h2>
            <p>只在 behavior_analysis 已配置时可执行，且分析内容只基于真实本地学习数据。</p>
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
              ? "还没有足够的真实学习记录来生成行为建议。"
              : behaviorService
                ? `当前能力由 ${behaviorService.providerName} 提供，点击上方按钮后才会生成真实建议。`
                : "未配置 behavior_analysis provider。去设置页分配后，这里才可生成建议。"}
          </div>
        )}
      </section>
    </div>
  );
}
