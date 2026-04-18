"use client";

import { usePlatformStore } from "../platform-store";
import { getTone } from "../lib/ui-tone";

export default function ProgressScreen() {
  const { state, dashboardStats, formatDateTime } = usePlatformStore();

  return (
    <div className="page-grid progress-grid">
      <section className="ios-card section-card">
        <div className="section-top">
          <div>
            <h2>学习闭环</h2>
            <p>素材、跟读、听写、闪卡、AI 分析和学习记录已经串在一起。</p>
          </div>
        </div>
        <div className="stats-grid">
          <div className="metric-card"><strong>{dashboardStats.studyMinutes}</strong><span>学习分钟</span></div>
          <div className="metric-card"><strong>{dashboardStats.recordings}</strong><span>跟读次数</span></div>
          <div className="metric-card"><strong>{dashboardStats.dictations}</strong><span>听写次数</span></div>
          <div className="metric-card"><strong>{dashboardStats.aiRuns}</strong><span>AI 分析</span></div>
        </div>
      </section>

      <section className="ios-card section-card">
        <div className="section-top">
          <div>
            <h2>素材进度</h2>
            <p>查看每个素材目前处于什么阶段。</p>
          </div>
        </div>
        <div className="list-stack">
          {state.materials.map((material) => (
            <div className="list-row" key={material.id}>
              <div>
                <strong>{material.title}</strong>
                <p>{material.topic} · {material.learningGoal}</p>
              </div>
              <span className="status-badge" data-tone={getTone(material.status)}>
                {material.status}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="ios-card section-card">
        <div className="section-top">
          <div>
            <h2>最近学习记录</h2>
            <p>方便快速回看最近的操作轨迹。</p>
          </div>
        </div>
        <div className="list-stack">
          {state.logs.slice(0, 16).map((log) => (
            <div className="list-row" key={log.id}>
              <div>
                <strong>{log.type}</strong>
                <p>{log.message}</p>
              </div>
              <span className="row-meta-text">{formatDateTime(log.createdAt)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
