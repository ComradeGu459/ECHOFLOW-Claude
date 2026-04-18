export { default } from "../screens/player-screen-v6";
/*

import { useLearningStore } from "../learning-store";
import { formatTime } from "../lib/learning";

export default function PlayerPage() {
  const {
    iframeSrc,
    activeCue,
    activeCueId,
    cues,
    selectCue,
    selectWord,
    selectedWord,
    wordInsight,
    previousCue,
    nextCue,
    speakCurrent,
    toggleRecording,
    recordingState,
    recordings
  } = useLearningStore();

  return (
    <div className="page-grid player-grid">
      <section className="ios-card section-card player-stage">
        <div className="video-panel-clean">
          {iframeSrc ? (
            <iframe key={iframeSrc} src={iframeSrc} title="player" allow="autoplay; encrypted-media" allowFullScreen />
          ) : (
            <div className="empty-area">先去素材库导入 YouTube 视频。</div>
          )}
        </div>

        <div className="focus-strip">
          <div>
            <span className="eyebrow-label">{activeCue ? formatTime(activeCue.start) : "未选择句子"}</span>
            <h3>{activeCue?.english || "请选择一句字幕"}</h3>
            <p>{activeCue?.chinese || "如果字幕中有中文释义，会显示在这里。"}</p>
          </div>
          <div className="button-row">
            <button className="ios-button secondary" onClick={previousCue}>上一句</button>
            <button className="ios-button secondary" onClick={nextCue}>下一句</button>
            <button className="ios-button ghost" onClick={speakCurrent}>朗读</button>
            <button className={`ios-button ${recordingState === "recording" ? "danger" : "primary"}`} onClick={toggleRecording}>
              {recordingState === "recording" ? "结束录音" : "开始录音"}
            </button>
          </div>
        </div>
      </section>

      <section className="ios-card section-card subtitle-column">
        <div className="section-top">
          <div>
            <h2>字幕</h2>
            <p>点句子切换练习点，点单词查看词卡。</p>
          </div>
        </div>
        <div className="subtitle-list-clean">
          {cues.map((cue) => (
            <button
              key={cue.id}
              className={`subtitle-clean${cue.id === activeCueId ? " active" : ""}`}
              onClick={() => selectCue(cue.id)}
            >
              <span>{formatTime(cue.start)}</span>
              <div className="subtitle-text-block">
                <strong>
                  {cue.english.split(" ").map((word, index) => {
                    const clean = word.toLowerCase().replace(/[^a-z']/gi, "");
                    return (
                      <span
                        key={`${cue.id}-${index}`}
                        className={`inline-word${selectedWord === clean ? " active" : ""}`}
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
              <h2>词卡</h2>
              <p>从播放器里直接点词查看。</p>
            </div>
          </div>
          {wordInsight ? (
            <div className="detail-card">
              <strong>{wordInsight.word}</strong>
              <p>出现在当前素材中 {wordInsight.count} 次。</p>
              {wordInsight.examples.map((example) => (
                <div className="mini-example" key={`${wordInsight.word}-${example.id}`}>
                  <span>{formatTime(example.start)}</span>
                  <p>{example.english}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-note">在字幕中点一个英文单词。</div>
          )}
        </section>

        <section className="ios-card section-card">
          <div className="section-top">
            <div>
              <h2>录音回放</h2>
              <p>当前素材下的最近录音。</p>
            </div>
          </div>
          <div className="recording-list-clean">
            {recordings.length ? (
              recordings.slice(0, 4).map((item) => (
                <div className="recording-row" key={item.id}>
                  <div>
                    <strong>{item.createdAt}</strong>
                    <p>{item.cue}</p>
                  </div>
                  <audio controls src={item.url} />
                </div>
              ))
            ) : (
              <div className="empty-note">还没有录音。</div>
            )}
          </div>
        </section>
      </section>
    </div>
  );
}
*/
