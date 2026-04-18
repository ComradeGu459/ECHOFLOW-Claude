"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import MediaPlayerSurface from "../components/media-player-surface";
import {
  buildCueCardDraft,
  clampSplitRatio,
  clampSubtitleFontSize,
} from "../lib/player-workspace";
import { formatTime } from "../lib/platform-model";
import { getTone } from "../lib/ui-tone";
import { usePlatformStore } from "../platform-store";

const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5];
const FONT_SIZES = [16, 18, 21];

export default function PlayerScreenV5() {
  const {
    currentMaterial,
    currentCue,
    currentCues,
    resolvedAiRoutes,
    selectedWordInsight,
    state,
    selectCue,
    selectWord,
    syncCueWithPlaybackTime,
    rememberPlayerProgress,
    toggleCueFavorite,
    addCard,
    setPlayerPreferences,
    runSpeechSynthesis,
    runSpeechTranscription,
  } = usePlatformStore();
  const playerRef = useRef(null);
  const cueRefs = useRef(new Map());
  const dragStateRef = useRef(null);
  const saveProgressRef = useRef({ seconds: 0 });
  const restoredMaterialIdRef = useRef("");
  const loopGuardRef = useRef(0);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [ttsAudioUrl, setTtsAudioUrl] = useState("");
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const playerUi = state.ui.player;
  const splitRatio = clampSplitRatio(playerUi.splitRatio);
  const playbackRate = playerUi.playbackRate;
  const subtitleFontSize = clampSubtitleFontSize(playerUi.subtitleFontSize);
  const loopCurrentCue = playerUi.loopCurrentCue;
  const showTranslation = playerUi.showTranslation;
  const currentRecording = state.practice.recordings.find(
    (recording) => recording.materialId === currentMaterial?.id,
  );

  useEffect(() => {
    restoredMaterialIdRef.current = "";
    setIsReady(false);
    setIsPlaying(false);
    setCurrentTime(0);
  }, [currentMaterial?.id]);

  useEffect(() => {
    if (!currentCue?.id) return;
    const target = cueRefs.current.get(currentCue.id);
    target?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [currentCue?.id]);

  useEffect(() => {
    function handlePointerMove(event) {
      if (!dragStateRef.current) return;
      const nextRatio = clampSplitRatio(
        (event.clientX - dragStateRef.current.left) / dragStateRef.current.width,
      );
      setPlayerPreferences({ splitRatio: nextRatio });
    }

    function handlePointerUp() {
      dragStateRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [setPlayerPreferences]);

  useEffect(() => () => {
    if (ttsAudioUrl) URL.revokeObjectURL(ttsAudioUrl);
  }, [ttsAudioUrl]);

  function handlePlayerReady() {
    setIsReady(true);

    if (
      currentMaterial?.lastPositionSeconds > 0 &&
      restoredMaterialIdRef.current !== currentMaterial.id
    ) {
      restoredMaterialIdRef.current = currentMaterial.id;
      playerRef.current?.seekTo(currentMaterial.lastPositionSeconds);
      setCurrentTime(currentMaterial.lastPositionSeconds);
      syncCueWithPlaybackTime(currentMaterial.lastPositionSeconds);
    }
  }

  function handleTimeChange(seconds) {
    setCurrentTime(seconds);
    syncCueWithPlaybackTime(seconds);

    if (
      currentCue &&
      loopCurrentCue &&
      seconds >= currentCue.end + (currentMaterial?.subtitleOffset || 0)
    ) {
      const now = Date.now();
      if (now - loopGuardRef.current > 250) {
        loopGuardRef.current = now;
        playerRef.current?.seekTo(currentCue.start + (currentMaterial?.subtitleOffset || 0));
        if (isPlaying) playerRef.current?.play();
        return;
      }
    }

    if (Math.abs(seconds - saveProgressRef.current.seconds) >= 1) {
      saveProgressRef.current.seconds = seconds;
      rememberPlayerProgress(seconds);
    }
  }

  function seekToCue(cueId) {
    const cue = currentCues.find((item) => item.id === cueId);
    if (!cue) return;
    selectCue(cueId);
    const targetTime = cue.start + (currentMaterial?.subtitleOffset || 0);
    playerRef.current?.seekTo(targetTime);
    setCurrentTime(targetTime);
  }

  function goRelative(delta) {
    if (!currentCue) return;
    const currentIndex = currentCues.findIndex((cue) => cue.id === currentCue.id);
    const nextIndex = Math.min(currentCues.length - 1, Math.max(0, currentIndex + delta));
    const target = currentCues[nextIndex];
    if (target) seekToCue(target.id);
  }

  async function handleAiSpeech() {
    if (!currentCue?.english) return;
    setIsSynthesizing(true);
    const result = await runSpeechSynthesis(currentCue.english);
    if (result.ok && result.audioUrl) {
      if (ttsAudioUrl) URL.revokeObjectURL(ttsAudioUrl);
      setTtsAudioUrl(result.audioUrl);
    }
    setIsSynthesizing(false);
  }

  async function handleAiTranscription() {
    if (!currentRecording) return;
    setIsTranscribing(true);
    await runSpeechTranscription(currentRecording);
    setIsTranscribing(false);
  }

  const splitStyle = {
    gridTemplateColumns: `${splitRatio}fr 12px ${1 - splitRatio}fr`,
  };

  const progressLabel = useMemo(() => {
    if (!currentMaterial) return "00:00:00";
    return `${formatTime(currentTime)} / ${formatTime((currentMaterial.durationMinutes || 0) * 60)}`;
  }, [currentMaterial, currentTime]);

  if (!currentMaterial) {
    return (
      <section className="ios-card section-card player-empty-state">
        <h2>还没有可学习的素材</h2>
        <p>先去导入页导入视频和字幕，播放器不会展示假视频或假字幕。</p>
        <div className="button-row">
          <Link className="ios-button primary button-link" href="/import">
            去导入素材
          </Link>
          <Link className="ios-button ghost button-link" href="/library">
            返回学习空间
          </Link>
        </div>
      </section>
    );
  }

  return (
    <div className="player-screen-v4">
      <section className="ios-card section-card player-top-strip">
        <div>
          <h2>{currentMaterial.title}</h2>
          <p>{currentMaterial.topic || "未设置主题"} · {currentMaterial.learningGoal} · {currentMaterial.sourceType}</p>
        </div>
        <div className="tag-collection">
          <span className="status-badge" data-tone={getTone(currentMaterial.status)}>
            {currentMaterial.status}
          </span>
          <span className="status-badge" data-tone={getTone(currentMaterial.difficulty)}>
            {currentMaterial.difficulty}
          </span>
          <span className="status-badge" data-tone="info">
            {progressLabel}
          </span>
        </div>
      </section>

      <div className="player-stage-v4" style={splitStyle}>
        <section className="ios-card section-card player-media-column">
          <div className="player-video-shell">
            <MediaPlayerSurface
              material={currentMaterial}
              onPlayingChange={setIsPlaying}
              onReady={handlePlayerReady}
              onTimeChange={handleTimeChange}
              playbackRate={playbackRate}
              ref={playerRef}
            />
          </div>

          <div className="player-current-cue-card">
            <div className="player-current-cue-top">
              <div>
                <span className="eyebrow-label">
                  {currentCue ? formatTime(currentCue.start + (currentMaterial.subtitleOffset || 0)) : "未选句子"}
                </span>
                <h3>{currentCue?.english || "请选择一句字幕开始学习"}</h3>
                {showTranslation && currentCue?.chinese ? <p>{currentCue.chinese}</p> : null}
              </div>
              {currentCue ? (
                <button
                  className={`material-favorite-button inline${currentCue.favorite ? " active" : ""}`}
                  type="button"
                  onClick={() => toggleCueFavorite(currentCue.id)}
                >
                  {currentCue.favorite ? "★" : "☆"}
                </button>
              ) : null}
            </div>

            <div className="button-row">
              <button className="ios-button ghost" type="button" onClick={() => currentCue && toggleCueFavorite(currentCue.id)}>
                {currentCue?.favorite ? "取消收藏本句" : "收藏本句"}
              </button>
              <button
                className="ios-button secondary"
                type="button"
                onClick={() =>
                  currentCue &&
                  addCard(
                    buildCueCardDraft({
                      cue: currentCue,
                      material: currentMaterial,
                      type: "表达卡",
                    }),
                  )
                }
              >
                加入闪卡
              </button>
            </div>
          </div>

          <div className="ios-card player-bottom-controls">
            <div className="player-control-main">
              <button className="player-round-button" type="button" onClick={() => goRelative(-1)}>
                ‹
              </button>
              <button className="player-round-button primary" disabled={!isReady} type="button" onClick={() => playerRef.current?.togglePlay()}>
                {isPlaying ? "❚❚" : "▶"}
              </button>
              <button className="player-round-button" type="button" onClick={() => goRelative(1)}>
                ›
              </button>
            </div>

            <div className="player-control-groups">
              <div className="segmented">
                {PLAYBACK_RATES.map((rate) => (
                  <button
                    key={rate}
                    className={playbackRate === rate ? "active" : ""}
                    type="button"
                    onClick={() => setPlayerPreferences({ playbackRate: rate })}
                  >
                    {rate}x
                  </button>
                ))}
              </div>

              <button
                className={`ios-button ghost${loopCurrentCue ? " active-ghost" : ""}`}
                type="button"
                onClick={() => setPlayerPreferences({ loopCurrentCue: !loopCurrentCue })}
              >
                {loopCurrentCue ? "单句循环开" : "单句循环关"}
              </button>

              <div className="segmented">
                {FONT_SIZES.map((size) => (
                  <button
                    key={size}
                    className={subtitleFontSize === size ? "active" : ""}
                    type="button"
                    onClick={() => setPlayerPreferences({ subtitleFontSize: size })}
                  >
                    {size === 16 ? "小" : size === 18 ? "中" : "大"}
                  </button>
                ))}
              </div>

              <button
                className="ios-button ghost"
                type="button"
                onClick={() => setPlayerPreferences({ showTranslation: !showTranslation })}
              >
                {showTranslation ? "隐藏中文" : "显示中文"}
              </button>
            </div>
          </div>

          <section className="ios-card section-card player-ai-card">
            <div className="section-top">
              <div>
                <h2>AI 语音能力</h2>
                <p>只在对应能力已配置时可执行，不会显示假在线状态。</p>
              </div>
              <div className="tag-collection">
                <span className="pill-tag" data-tone={resolvedAiRoutes.speech_out ? "success" : "idle"}>
                  语音输出：{resolvedAiRoutes.speech_out?.providerName || "未配置"}
                </span>
                <span className="pill-tag" data-tone={resolvedAiRoutes.speech_in ? "success" : "idle"}>
                  语音输入：{resolvedAiRoutes.speech_in?.providerName || "未配置"}
                </span>
              </div>
            </div>

            <div className="button-row">
              <button
                className="ios-button secondary"
                disabled={!resolvedAiRoutes.speech_out || !currentCue?.english || isSynthesizing}
                type="button"
                onClick={handleAiSpeech}
              >
                {isSynthesizing ? "生成中..." : "AI 朗读当前句"}
              </button>
              <button
                className="ios-button ghost"
                disabled={!resolvedAiRoutes.speech_in || !currentRecording || isTranscribing}
                type="button"
                onClick={handleAiTranscription}
              >
                {isTranscribing ? "转写中..." : "AI 转写最近录音"}
              </button>
            </div>

            {ttsAudioUrl ? <audio controls src={ttsAudioUrl} /> : null}
            {state.practice.aiTranscription ? (
              <pre className="assistant-output">{state.practice.aiTranscription}</pre>
            ) : (
              <div className="empty-note">
                {currentRecording
                  ? "录音完成后可用 AI 转写对比你的真实发音内容。"
                  : "先录一段跟读音频，这里才会出现可转写的真实录音。"}
              </div>
            )}
          </section>

          {selectedWordInsight ? (
            <section className="ios-card section-card player-word-panel">
              <div className="section-top">
                <div>
                  <h2>词汇聚焦</h2>
                  <p>{selectedWordInsight.word} 在当前素材中出现 {selectedWordInsight.count} 次。</p>
                </div>
              </div>
              <div className="mini-list">
                {selectedWordInsight.examples.map((example) => (
                  <div className="mini-row" key={`${selectedWordInsight.word}-${example.id}`}>
                    <span>{formatTime(example.start)}</span>
                    <p>{example.english}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </section>

        <div
          className="player-splitter"
          onPointerDown={(event) => {
            const rect = event.currentTarget.parentElement?.getBoundingClientRect();
            if (!rect) return;
            dragStateRef.current = { left: rect.left, width: rect.width };
            document.body.style.cursor = "col-resize";
            document.body.style.userSelect = "none";
          }}
          role="separator"
          aria-label="调整视频和字幕分栏"
        />

        <section className="ios-card section-card player-subtitle-column">
          <div className="section-top">
            <div>
              <h2>字幕文本</h2>
              <p>播放时间会驱动当前句高亮，点击任一句可跳转播放位置。</p>
            </div>
            <span className="status-badge" data-tone="info">
              {currentCues.length} 句
            </span>
          </div>

          <div className="subtitle-list-clean compact player-subtitle-list">
            {currentCues.map((cue) => (
              <button
                key={cue.id}
                className={`subtitle-clean${cue.id === currentCue?.id ? " active" : ""}`}
                ref={(node) => {
                  if (node) cueRefs.current.set(cue.id, node);
                }}
                type="button"
                onClick={() => seekToCue(cue.id)}
              >
                <span>{formatTime(cue.start + (currentMaterial.subtitleOffset || 0))}</span>
                <div className="subtitle-text-block" style={{ fontSize: `${subtitleFontSize}px` }}>
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
                  {showTranslation && cue.chinese ? <p>{cue.chinese}</p> : null}
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
