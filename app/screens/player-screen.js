"use client";

import { usePlatformStore } from "../platform-store";
import { formatTime } from "../lib/platform-data";

const MODES = ["精读模式", "跟读模式", "听写模式", "复习模式"];

export default function PlayerScreen() {
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

  return (
    <div className="page-grid player-grid-v2">
      <section className="ios-card section-card learning-stage-card">
        <div className="section-top">
          <div>
            <h2>字幕学习工作台</h2>
            <p>围绕当前句进行精读、跟读、听写与重点提取。</p>
          </div>
          <div className="segmented">
            {MODES.map((mode) => (
              <button key={mode} className={state.practice.mode === mode ? "active" : ""} onClick={() => setPracticeMode(mode)}>
                {mode}
              </button>
            ))}
          </div>
        </div>

        <div className="player-layout">
          <div className="video-panel-clean">
            {iframeSrc ? <iframe key={iframeSrc} src={iframeSrc} title="player" allow="autoplay; encrypted-media" allowFullScreen /> : <div className="empty-area">先在素材库导入视频或字幕。</div>}
          </div>

          <div className="focus-card v2">
            <span className="eyebrow-label">{currentCue ? formatTime(currentCue.start + (currentMaterial?.subtitleOffset || 0)) : "未选择句子"}</span>
            <strong>{currentCue?.english || "请选择一句字幕"}</strong>
            <p>{currentCue?.chinese || "中文翻译会显示在这里。"}</p>
            <div className="stat-pills">
              <span>{currentCue?.difficultyTag || "四级"}</span>
              <span>{state.practice.mode}</span>
            </div>
            <div className="button-row">
              <button className="ios-button secondary" onClick={previousCue}>上一句</button>
              <button className="ios-button secondary" onClick={nextCue}>下一句</button>
              <button className="ios-button ghost" onClick={speakCurrent}>朗读</button>
              <button className="ios-button primary" onClick={toggleRecording}>
                {state.practice.recordingState === "recording" ? "结束跟读" : "开始跟读"}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="ios-card section-card">
        <div className="section-top">
          <div>
            <h2>字幕逐句学习</h2>
            <p>点击句子定位，点击词生成闪卡。</p>
          </div>
        </div>
        <div className="subtitle-list-clean">
          {currentCues.map((cue) => (
            <button key={cue.id} className={`subtitle-clean${cue.id === currentCue?.id ? " active" : ""}`} onClick={() => selectCue(cue.id)}>
              <span>{formatTime(cue.start + (currentMaterial?.subtitleOffset || 0))}</span>
              <div className="subtitle-text-block">
                <strong>
                  {cue.english.split(" ").map((word, index) => {
                    const clean = word.toLowerCase().replace(/[^a-z']/gi, "");
                    return (
                      <span key={`${cue.id}-${index}`} className={`inline-word${state.selectedWord === clean ? " active" : ""}`} onClick={(event) => {
                        event.stopPropagation();
                        selectWord(clean);
                      }}>
                        {word}{" "}
                      </span>
                    );
                  })}
                </strong>
                <p>{cue.chinese}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="side-stack">
        <section className="ios-card section-card">
          <div className="section-top">
            <div>
              <h2>AI 分析</h2>
              <p>当前句难点、搭配、语法点与发音提示。</p>
            </div>
            <button className="ios-button ghost" onClick={() => runAiAnalysis("current")}>分析当前句</button>
          </div>
          {currentCue ? (
            <div className="detail-card">
              <strong>{currentCue.difficultyTag}</strong>
              <p>{currentCue.analysis.summary}</p>
              <div className="tag-collection">
                {currentCue.analysis.highlights.map((item, index) => (
                  <button key={`${item.value}-${index}`} className="pill-tag action" onClick={() => addCard({ title: item.value, type: item.type === "word" ? "单词卡" : "短语卡", sourceType: "AI 推荐生成", note: "来自 AI 提取重点内容" })}>
                    {item.value}
                  </button>
                ))}
              </div>
              <div className="mini-list">
                {currentCue.analysis.grammar.map((item) => <div className="mini-row" key={item}><p>{item}</p></div>)}
              </div>
              <p className="soft-note">发音提示：{currentCue.analysis.pronunciation}</p>
              {state.analytics.lastAiResult ? (
                <details className="analysis-details">
                  <summary>展开分析详情</summary>
                  <pre className="assistant-output compact">{state.analytics.lastAiResult}</pre>
                </details>
              ) : null}
            </div>
          ) : <div className="empty-note">先选择一条字幕。</div>}
        </section>

        <section className="ios-card section-card">
          <div className="section-top">
            <div>
              <h2>点词卡片</h2>
              <p>从字幕进入闪卡系统。</p>
            </div>
          </div>
          {selectedWordInsight ? (
            <div className="detail-card">
              <strong>{selectedWordInsight.word}</strong>
              <p>在当前素材出现 {selectedWordInsight.count} 次。</p>
              <button className="ios-button secondary" onClick={() => addCard({ title: selectedWordInsight.word, type: "单词卡", sourceType: "手动创建" })}>
                加入闪卡
              </button>
            </div>
          ) : <div className="empty-note">点击字幕中的词查看。</div>}
        </section>
      </section>
    </div>
  );
}
