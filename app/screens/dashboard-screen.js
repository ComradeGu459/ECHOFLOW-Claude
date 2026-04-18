"use client";

import Link from "next/link";
import { getTone } from "../lib/ui-tone";
import { usePlatformStore } from "../platform-store";

export default function DashboardScreen() {
  const { dashboardStats, state, currentMaterial, dueCards, formatDateTime } = usePlatformStore();

  return (
    <div className="page-grid dashboard-grid">
      <section className="ios-card section-card hero-card">
        <div className="section-top">
          <div>
            <h2>今日学习</h2>
            <p>保持素材学习、跟读、听写和卡片复习的完整闭环。</p>
          </div>
          <Link className="ios-button primary button-link" href="/player">
            继续学习
          </Link>
        </div>
        <div className="stats-grid">
          <div className="metric-card">
            <strong>{dashboardStats.studyMinutes}</strong>
            <span>今日学习时长 / 分钟</span>
          </div>
          <div className="metric-card">
            <strong>{dashboardStats.materialsStudied}</strong>
            <span>学习素材数</span>
          </div>
          <div className="metric-card">
            <strong>{dashboardStats.cardsAdded}</strong>
            <span>新增卡片数</span>
          </div>
          <div className="metric-card">
            <strong>{dashboardStats.cardsReviewed}</strong>
            <span>已复习卡片数</span>
          </div>
          <div className="metric-card">
            <strong>{dashboardStats.recordings}</strong>
            <span>跟读次数</span>
          </div>
          <div className="metric-card">
            <strong>{dashboardStats.aiRuns}</strong>
            <span>分析使用次数</span>
          </div>
        </div>
      </section>

      <section className="ios-card section-card">
        <div className="section-top">
          <div>
            <h2>当前学习流</h2>
            <p>当前素材、当前句子和下一步动作都在这里。</p>
          </div>
        </div>
        <div className="journey-card">
          <strong>{currentMaterial?.title || "未选择素材"}</strong>
          <p>{currentMaterial?.description || "先去素材库导入一段视频或字幕。"}</p>
          {currentMaterial ? (
            <div className="stat-pills">
              <span className="status-badge" data-tone={getTone(currentMaterial.status)}>
                {currentMaterial.status}
              </span>
              <span className="status-badge" data-tone={getTone(currentMaterial.difficulty)}>
                {currentMaterial.difficulty}
              </span>
              <span className="status-badge" data-tone={getTone(currentMaterial.learningGoal)}>
                {currentMaterial.learningGoal}
              </span>
            </div>
          ) : null}
          <div className="button-row">
            <Link className="ios-button secondary button-link" href="/library">
              去素材库
            </Link>
            <Link className="ios-button secondary button-link" href="/practice">
              去跟读听写
            </Link>
            <Link className="ios-button ghost button-link" href="/cards">
              去卡片中心
            </Link>
          </div>
        </div>
      </section>

      <section className="ios-card section-card">
        <div className="section-top">
          <div>
            <h2>今日待复习</h2>
            <p>使用简化 SRS，优先复习到期卡片。</p>
          </div>
          <span className="status-badge" data-tone={dueCards.length ? "learning" : "success"}>
            {dueCards.length} 张
          </span>
        </div>
        <div className="list-stack">
          {dueCards.length ? (
            dueCards.slice(0, 6).map((card) => (
              <div className="list-row" key={card.id}>
                <div>
                  <strong>{card.title}</strong>
                  <p>
                    {card.type} · {card.difficultyTag}
                  </p>
                </div>
                <span className="status-badge" data-tone={getTone(card.status)}>
                  {card.status}
                </span>
              </div>
            ))
          ) : (
            <div className="empty-note">当前没有待复习卡片。</div>
          )}
        </div>
      </section>

      <section className="ios-card section-card">
        <div className="section-top">
          <div>
            <h2>最近轨迹</h2>
            <p>帮助你快速回到上一段学习上下文。</p>
          </div>
        </div>
        <div className="list-stack">
          {state.logs.length ? (
            state.logs.slice(0, 8).map((log) => (
              <div className="list-row" key={log.id}>
                <div>
                  <strong>{log.type}</strong>
                  <p>{log.message}</p>
                </div>
                <span className="row-meta-text">{formatDateTime(log.createdAt)}</span>
              </div>
            ))
          ) : (
            <div className="empty-note">导入素材并开始学习后，这里才会出现真实轨迹。</div>
          )}
        </div>
      </section>
    </div>
  );
}
