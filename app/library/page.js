export { default } from "../screens/library-screen-v5";
/*

import { useLearningStore } from "../learning-store";
import { formatTime } from "../lib/learning";
import { useRouter } from "next/navigation";

export default function LibraryPage() {
  const router = useRouter();
  const {
    youtubeInput,
    setYoutubeInput,
    rawSubtitles,
    setRawSubtitles,
    cues,
    activeCueId,
    selectCue,
    importVideo,
    loadSubtitles,
    cards,
    status
  } = useLearningStore();

  return (
    <div className="page-grid library-grid">
      <section className="ios-card section-card">
        <div className="section-top">
          <div>
            <h2>导入素材</h2>
            <p>先确定视频，再粘贴字幕。导入完成后直接去播放器练习。</p>
          </div>
        </div>

        <div className="form-stack">
          <label className="form-field">
            <span>YouTube 链接或视频 ID</span>
            <input value={youtubeInput} onChange={(event) => setYoutubeInput(event.target.value)} placeholder="https://www.youtube.com/watch?v=..." />
          </label>

          <div className="button-row">
            <button
              className="ios-button primary"
              onClick={() => {
                if (importVideo()) router.push("/player");
              }}
            >
              导入并去播放器
            </button>
          </div>

          <label className="form-field">
            <span>字幕</span>
            <textarea rows={16} value={rawSubtitles} onChange={(event) => setRawSubtitles(event.target.value)} />
          </label>

          <div className="button-row">
            <button
              className="ios-button secondary"
              onClick={() => {
                if (loadSubtitles()) router.push("/player");
              }}
            >
              解析字幕
            </button>
            <button className="ios-button ghost" onClick={() => router.push("/cards")}>
              去闪卡
            </button>
          </div>

          <p className="soft-note">{status}</p>
        </div>
      </section>

      <section className="ios-card section-card">
        <div className="section-top">
          <div>
            <h2>素材结构</h2>
            <p>解析后可直接选择句子，播放器和练习页会同步到当前句。</p>
          </div>
          <div className="stat-pills">
            <span>{cues.length} 条字幕</span>
            <span>{cards.length} 张卡片</span>
          </div>
        </div>

        <div className="cue-outline">
          {cues.map((cue) => (
            <button
              key={cue.id}
              className={`outline-row${cue.id === activeCueId ? " active" : ""}`}
              onClick={() => selectCue(cue.id)}
            >
              <span>{formatTime(cue.start)}</span>
              <strong>{cue.english}</strong>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
*/
