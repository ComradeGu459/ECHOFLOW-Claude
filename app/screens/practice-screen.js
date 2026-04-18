"use client";

import { usePlatformStore } from "../platform-store";
import { getScoreTone } from "../lib/ui-tone";

export default function PracticeScreen() {
  const {
    currentCue,
    state,
    setDictationInput,
    dictation,
    submitDictation,
    toggleRecording,
    runAiAnalysis
  } = usePlatformStore();

  return (
    <div className="page-grid practice-grid">
      <section className="ios-card section-card">
        <div className="section-top">
          <div>
            <h2>跟读训练</h2>
            <p>围绕当前句做影子跟读和录音比对。</p>
          </div>
          <button className="ios-button primary" onClick={toggleRecording}>
            {state.practice.recordingState === "recording" ? "结束录音" : "开始录音"}
          </button>
        </div>
        <div className="prompt-card">
          <span>当前句</span>
          <strong>{currentCue?.english || "请先去字幕学习页选句"}</strong>
          <p>{currentCue?.chinese || "中文释义显示在这里。"}</p>
        </div>
        <div className="recording-list-clean">
          {state.practice.recordings.slice(0, 6).map((item) => (
            <div className="recording-row" key={item.id}>
              <div>
                <strong>{item.title}</strong>
                <p>{item.createdAt}</p>
              </div>
              <audio controls src={item.url} />
            </div>
          ))}
        </div>
      </section>

      <section className="ios-card section-card">
        <div className="section-top">
          <div>
            <h2>听写练习</h2>
            <p>做完听写后写入学习记录。</p>
          </div>
          <div className="score-pill" data-tone={getScoreTone(dictation.score)}>
            {dictation.score}%
          </div>
        </div>
        <textarea rows={6} value={state.practice.dictationInput} onChange={(e) => setDictationInput(e.target.value)} placeholder="输入你听到的英文句子" />
        <div className="feedback-columns">
          <div className="feedback-card"><strong>缺失</strong><p>{dictation.missing.join(", ") || "无"}</p></div>
          <div className="feedback-card"><strong>多写</strong><p>{dictation.extra.join(", ") || "无"}</p></div>
        </div>
        <div className="button-row">
          <button className="ios-button secondary" onClick={submitDictation}>记录本次听写</button>
          <button className="ios-button ghost" onClick={() => runAiAnalysis("current")}>AI 讲解当前句</button>
        </div>
        {state.analytics.lastAiResult ? (
          <details className="analysis-details">
            <summary>最近 AI 分析</summary>
            <pre className="assistant-output compact">{state.analytics.lastAiResult}</pre>
          </details>
        ) : null}
      </section>
    </div>
  );
}
