"use client";

import { formatTime } from "../lib/platform-data";
import { getTone } from "../lib/ui-tone";
import { usePlatformStore } from "../platform-store";

const MODES = ["精读模式", "跟读模式", "听写模式", "复习模式"];

export default function PlayerScreenV3() {
  const {
    currentMaterial,
    currentCue,
    currentCues,
    iframeSrc,
    state,
    setPracticeMode,
    selectCue,
    selectWord,
    selectedWordInsight,
    previousCue,
    nextCue,
    speakCurrent,
    toggleRecording,
    runAiAnalysis,
    addCard
  } = usePlatformStore();

  const isIntensive = state.practice.mode === "精读模式";
  const isShadowing = state.practice.mode === "跟读模式";
  const isDictation = state.practice.mode === "听写模式";
  const isReview = state.practice.mode === "复习模式";

  return (
    <div className="player-workspace">
      <section
        className={`ios-card learning-stage-card primary-zone${isShadowing ? " shadowing" : ""}${isDictation ? " dictation" : ""}`}
      >
        <div className="player-topbar">
          <div>
            <h2 className="section-heading">字幕学习工作台</h2>
            <p className="section-description">主区域聚焦视频、当前句和关键操作，其他信息都降到辅助层。</p>
          </div>
          <div className="segmented">
            {MODES.map((mode) => (
              <button
                key={mode}
                className={state.practice.mode === mode ? "active" : ""}
                type="button"
                onClick={() => setPracticeMode(mode)}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        <div className="hero-player">
          <div className="video-stage-hero">
            {iframeSrc ? (
              <iframe
                key={iframeSrc}
                src={iframeSrc}
                title="Learning player"
                allow="autoplay; encrypted-media"
                allowFullScreen
              />
            ) : (
              <div className="empty-area">先在素材库导入视频或字幕。</div>
            )}
          </div>

          <div className={`current-focus-card${isShadowing ? " shadowing emphasis" : ""}`}>
            <div className="focus-meta-row">
              <span className="eyebrow-label">
                {currentCue
                  ? formatTime(currentCue.start + (currentMaterial?.subtitleOffset || 0))
                  : "未选择句子"}
              </span>
              <div className="focus-tags">
                <span className="pill-tag" data-tone={getTone(currentCue?.difficultyTag || "四级")}>
                  {currentCue?.difficultyTag || "四级"}
                </span>
                <span className="pill-tag subtle" data-tone={getTone(state.practice.mode)}>
                  {state.practice.mode}
                </span>
              </div>
            </div>

            <h3 className="focus-title">{currentCue?.english || "请选择一句字幕开始学习"}</h3>
            {!isDictation ? (
              <p className="focus-translation">
                {currentCue?.chinese || "如果素材中有翻译，这里会显示中文解释。"}
              </p>
            ) : (
              <p className="focus-translation muted">听写模式下默认隐藏翻译。</p>
            )}

            <div className={`main-actions${isShadowing ? " emphasized" : ""}`}>
              <button className="ios-button secondary" type="button" onClick={previousCue}>
                上一句
              </button>
              <button className="ios-button secondary" type="button" onClick={nextCue}>
                下一句
              </button>
              <button className="ios-button ghost" type="button" onClick={speakCurrent}>
                朗读
              </button>
              <button className="ios-button primary" type="button" onClick={toggleRecording}>
                {state.practice.recordingState === "recording" ? "结束跟读" : "开始跟读"}
              </button>
            </div>

            {isShadowing ? (
              <div className="mode-hint-banner">
                跟读模式会强化当前句和操作按钮，弱化 AI 与卡片入口。
              </div>
            ) : null}
            {isDictation ? (
              <div className="mode-hint-banner">听写模式下字幕仍可定位，但翻译会隐藏。</div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="ios-card subtitle-zone">
        <div className="zone-head">
          <div>
            <h2 className="section-heading">字幕列表</h2>
            <p className="section-description">这里保留快速定位，但不会打断主学习流。</p>
          </div>
        </div>

        <div className="subtitle-list-clean compact">
          {currentCues.map((cue) => (
            <button
              key={cue.id}
              className={`subtitle-clean${cue.id === currentCue?.id ? " active" : ""}`}
              type="button"
              onClick={() => selectCue(cue.id)}
            >
              <span>{formatTime(cue.start + (currentMaterial?.subtitleOffset || 0))}</span>
              <div className="subtitle-text-block">
                <strong>
                  {cue.english.split(" ").map((word, index) => {
                    const clean = word.toLowerCase().replace(/[^a-z']/gi, "");
                    return (
                      <span
                        key={`${cue.id}-${index}`}
                        className={`inline-word${state.selectedWord === clean ? " active" : ""}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          selectWord(clean);
                        }}
                      >
                        {word}{" "}
                      </span>
                    );
                  })}
                </strong>
                {!isDictation ? <p>{cue.chinese}</p> : null}
              </div>
            </button>
          ))}
        </div>
      </section>

      <aside className="aux-column">
        <section className="ios-card aux-card">
          <div className="zone-head">
            <div>
              <h2 className="section-heading">AI 分析</h2>
              <p className="section-description">保留在辅助区，需要时再展开。</p>
            </div>
            <button className="ios-button ghost" type="button" onClick={() => runAiAnalysis("current")}>
              分析当前句
            </button>
          </div>

          {currentCue && !isShadowing ? (
            <div className="detail-card soft">
              <strong className="detail-card-label">{currentCue.difficultyTag}</strong>
              <p>{currentCue.analysis.summary}</p>
              {isIntensive || isReview ? (
                <div className="tag-collection">
                  {currentCue.analysis.highlights.map((item, index) => (
                    <button
                      key={`${item.value}-${index}`}
                      className="pill-tag action"
                      data-tone="learning"
                      type="button"
                      onClick={() =>
                        addCard({
                          title: item.value,
                          type: item.type === "word" ? "单词卡" : "短语卡",
                          sourceType: "AI 推荐生成",
                          note: "来自 AI 提取重点内容"
                        })
                      }
                    >
                      {item.value}
                    </button>
                  ))}
                </div>
              ) : null}
              <p className="soft-note">发音提示：{currentCue.analysis.pronunciation}</p>
              {state.analytics.lastAiResult ? (
                <details className="analysis-details">
                  <summary>展开分析详情</summary>
                  <pre className="assistant-output compact">{state.analytics.lastAiResult}</pre>
                </details>
              ) : null}
            </div>
          ) : (
            <div className="empty-note">
              {isShadowing
                ? "跟读模式会弱化 AI 区域，优先看视频、当前句和录音。"
                : "先选择一条字幕。"}
            </div>
          )}
        </section>

        <section className="ios-card aux-card">
          <div className="zone-head">
            <div>
              <h2 className="section-heading">卡片入口</h2>
              <p className="section-description">保留最快速的加入方式，不打断学习节奏。</p>
            </div>
          </div>

          {selectedWordInsight ? (
            <div className="detail-card soft">
              <strong className="detail-card-label">{selectedWordInsight.word}</strong>
              <p>在当前素材中出现 {selectedWordInsight.count} 次。</p>
              <button
                className="ios-button secondary"
                type="button"
                onClick={() =>
                  addCard({
                    title: selectedWordInsight.word,
                    type: "单词卡",
                    sourceType: "手动创建"
                  })
                }
              >
                加入闪卡
              </button>
            </div>
          ) : (
            <div className="empty-note">
              {isReview ? "复习模式下也可以从字幕快速补充新卡片。" : "点击字幕里的单词即可加入闪卡。"}
            </div>
          )}
        </section>
      </aside>
    </div>
  );
}
