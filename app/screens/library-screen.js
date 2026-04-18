"use client";

import Link from "next/link";
import { usePlatformStore } from "../platform-store";
import { formatTime } from "../lib/platform-data";

export default function LibraryScreen() {
  const {
    state,
    currentMaterial,
    updateImportDraft,
    importMaterial,
    selectMaterial,
    setMaterialTags,
    updateMaterialMeta,
    applySubtitleOffset,
    currentCues,
    currentCard
  } = usePlatformStore();

  return (
    <div className="page-grid library-grid-v2">
      <section className="ios-card section-card">
        <div className="section-top">
          <div>
            <h2>导入与归档</h2>
            <p>每次导入都会形成可追踪、可归档、可复用的学习素材。</p>
          </div>
        </div>
        <div className="form-stack">
          <div className="split-fields">
            <label className="form-field"><span>素材标题</span><input value={state.importDraft.title} onChange={(e) => updateImportDraft("title", e.target.value)} /></label>
            <label className="form-field"><span>来源链接</span><input value={state.importDraft.youtubeUrl} onChange={(e) => updateImportDraft("youtubeUrl", e.target.value)} /></label>
          </div>
          <div className="split-fields">
            <label className="form-field"><span>素材类型</span><select value={state.importDraft.sourceType} onChange={(e) => updateImportDraft("sourceType", e.target.value)}><option>视频 + 字幕</option><option>纯音频 + 字幕</option><option>仅字幕文本</option><option>AI 分离字幕生成的学习素材</option></select></label>
            <label className="form-field"><span>学习目标</span><select value={state.importDraft.learningGoal} onChange={(e) => updateImportDraft("learningGoal", e.target.value)}><option>跟读</option><option>听写</option><option>精读</option><option>复习</option></select></label>
          </div>
          <div className="split-fields">
            <label className="form-field"><span>主题</span><input value={state.importDraft.topic} onChange={(e) => updateImportDraft("topic", e.target.value)} /></label>
            <label className="form-field"><span>难度</span><select value={state.importDraft.difficulty} onChange={(e) => updateImportDraft("difficulty", e.target.value)}><option>基础</option><option>四级</option><option>六级</option><option>考研</option><option>更高阶</option></select></label>
          </div>
          <label className="form-field"><span>标签</span><input value={state.importDraft.tags} onChange={(e) => updateImportDraft("tags", e.target.value)} /></label>
          <label className="form-field"><span>字幕内容</span><textarea rows={12} value={state.importDraft.rawSubtitles} onChange={(e) => updateImportDraft("rawSubtitles", e.target.value)} /></label>
          <div className="button-row">
            <button className="ios-button primary" onClick={() => importMaterial("视频 + 字幕一起导入")}>导入视频与字幕</button>
            <button className="ios-button secondary" onClick={() => importMaterial("AI 字幕学习素材")}>导入并生成学习素材</button>
          </div>
        </div>
      </section>

      <section className="ios-card section-card">
        <div className="section-top">
          <div>
            <h2>素材库</h2>
            <p>按主题、目标、难度和状态管理长期学习内容。</p>
          </div>
          <div className="stat-pills">
            <span>{state.materials.length} 个素材</span>
          </div>
        </div>
        <div className="material-list">
          {state.materials.map((material) => (
            <button className={`material-row${material.id === currentMaterial?.id ? " active" : ""}`} key={material.id} onClick={() => selectMaterial(material.id)}>
              <div>
                <strong>{material.title}</strong>
                <p>{material.topic} · {material.learningGoal} · {material.sourceType}</p>
              </div>
              <div className="row-meta">
                <span>{material.status}</span>
                <span>{material.difficulty}</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="ios-card section-card material-detail-card">
        <div className="section-top">
          <div>
            <h2>素材详情</h2>
            <p>查看字幕、学习记录、闪卡和时间轴同步状态。</p>
          </div>
          <Link className="ios-button ghost button-link" href="/player">进入学习</Link>
        </div>

        {currentMaterial ? (
          <>
            <div className="split-fields">
              <label className="form-field"><span>学习状态</span><select value={currentMaterial.status} onChange={(e) => updateMaterialMeta(currentMaterial.id, "status", e.target.value)}><option>未开始</option><option>学习中</option><option>已完成</option><option>已归档</option></select></label>
              <label className="form-field"><span>字幕偏移（秒）</span><input type="number" value={currentMaterial.subtitleOffset} onChange={(e) => applySubtitleOffset(currentMaterial.id, e.target.value)} /></label>
            </div>
            <label className="form-field"><span>标签</span><input value={currentMaterial.tags.join(", ")} onChange={(e) => setMaterialTags(currentMaterial.id, e.target.value)} /></label>

            <div className="stat-pills detail-tags">
              <span>{currentMaterial.archiveState}</span>
              <span>{currentMaterial.durationMinutes} 分钟</span>
              <span>{currentMaterial.cues.length} 条字幕</span>
            </div>

            <div className="detail-panels">
              <div className="detail-card">
                <strong>逐句对齐检查</strong>
                <div className="mini-list">
                  {currentCues.slice(0, 5).map((cue) => (
                    <div className="mini-row" key={cue.id}>
                      <span>{formatTime(cue.start + currentMaterial.subtitleOffset)}</span>
                      <p>{cue.english}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="detail-card">
                <strong>学习产物</strong>
                <p>最新闪卡：{currentCard?.title || "暂无"}</p>
                <p>AI 分析与跟读结果会同步进入学习记录页。</p>
              </div>
            </div>
          </>
        ) : (
          <div className="empty-note">还没有可查看的素材。</div>
        )}
      </section>
    </div>
  );
}
