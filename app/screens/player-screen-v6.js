"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import MediaPlayerSurface from "../components/media-player-surface";
import {
  buildCueCardDraft,
  clampSubtitleFontSize,
  formatCueEnglishForDisplay,
  shouldScrollCueIntoView,
} from "../lib/player-workspace";
import { formatTime } from "../lib/platform-model";
import { usePlatformStore } from "../platform-store";

const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5];
const FONT_SIZES = [
  { value: 16, label: "小" },
  { value: 18, label: "中" },
  { value: 21, label: "大" },
];
const CONTENT_TABS = [
  { id: "subtitles", label: "字幕文本" },
  { id: "analysis", label: "AI 深度讲解" },
  { id: "pronunciation", label: "发音诊断" },
];

export default function PlayerScreenV6() {
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
    runAiAnalysis,
    runSpeechSynthesis,
    runSpeechTranscription,
    toggleRecording,
  } = usePlatformStore();
  const playerRef = useRef(null);
  const subtitleListRef = useRef(null);
  const cueRefs = useRef(new Map());
  const cueChangeSourceRef = useRef("manual");
  const saveProgressRef = useRef({ seconds: 0 });
  const restoredMaterialIdRef = useRef("");
  const loopGuardRef = useRef(0);
  const [activeTab, setActiveTab] = useState("subtitles");
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [ttsAudioUrl, setTtsAudioUrl] = useState("");
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const playerUi = state.ui.player;
  const playbackRate = playerUi.playbackRate;
  const subtitleFontSize = clampSubtitleFontSize(playerUi.subtitleFontSize);
  const loopCurrentCue = playerUi.loopCurrentCue;
  const showTranslation = playerUi.showTranslation;
  const currentRecording = state.practice.recordings.find(
    (recording) => recording.materialId === currentMaterial?.id,
  );
  const currentCueIndex = currentCue
    ? Math.max(0, currentCues.findIndex((cue) => cue.id === currentCue.id))
    : 0;
  const progressPercent = currentMaterial?.durationMinutes
    ? Math.min(100, Math.round((currentTime / (currentMaterial.durationMinutes * 60)) * 100))
    : 0;
  const learningProgressLabel = `${currentCueIndex + 1}/${Math.max(currentCues.length, 1)} 句`;

  useEffect(() => {
    restoredMaterialIdRef.current = "";
    setIsReady(false);
    setIsPlaying(false);
    setCurrentTime(0);
    cueChangeSourceRef.current = "manual";
  }, [currentMaterial?.id]);

  useEffect(() => {
    if (!currentCue?.id || activeTab !== "subtitles") return;
    const container = subtitleListRef.current;
    const target = cueRefs.current.get(currentCue.id);
    if (!container || !target) return;

    const shouldScroll = shouldScrollCueIntoView(
      container.getBoundingClientRect(),
      target.getBoundingClientRect(),
    );
    if (!shouldScroll) return;

    target.scrollIntoView({
      block: cueChangeSourceRef.current === "manual" ? "center" : "nearest",
      behavior: cueChangeSourceRef.current === "manual" ? "smooth" : "auto",
    });
  }, [activeTab, currentCue?.id]);

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
      cueChangeSourceRef.current = "playback";
      syncCueWithPlaybackTime(currentMaterial.lastPositionSeconds);
    }
  }

  function handleTimeChange(seconds) {
    setCurrentTime(seconds);
    cueChangeSourceRef.current = "playback";
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

  function seekToCue(cueId, source = "manual") {
    const cue = currentCues.find((item) => item.id === cueId);
    if (!cue) return;
    cueChangeSourceRef.current = source;
    selectCue(cueId);
    const targetTime = cue.start + (currentMaterial?.subtitleOffset || 0);
    playerRef.current?.seekTo(targetTime);
    setCurrentTime(targetTime);
  }

  function goRelative(delta) {
    if (!currentCue) return;
    const nextIndex = Math.min(
      currentCues.length - 1,
      Math.max(0, currentCueIndex + delta),
    );
    const target = currentCues[nextIndex];
    if (target) seekToCue(target.id, "manual");
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
    <div className="player-reference-shell">
      <section className="player-reference-topbar">
        <div className="player-reference-breadcrumb">
          <Link className="player-back-link" href="/library">
            返回
          </Link>
          <div>
            <h2>{currentMaterial.title}</h2>
            <p>
              {currentMaterial.sourceMediaKind === "youtube" ? "youtube" : "local"} ·{" "}
              {currentMaterial.topic || "Topic"} · {currentMaterial.difficulty} · {progressLabel}
            </p>
          </div>
        </div>

        <div className="player-reference-progress">
          <span>学习进度 {progressPercent}%</span>
          <p>当前训练第 {learningProgressLabel}</p>
          <div className="player-reference-progressbar">
            <span style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      </section>

      <div className="player-reference-stage">
        <section className="player-reference-main">
          <div className="player-reference-video-card">
            <MediaPlayerSurface
              material={currentMaterial}
              onPlayingChange={setIsPlaying}
              onReady={handlePlayerReady}
              onTimeChange={handleTimeChange}
              playbackRate={playbackRate}
              ref={playerRef}
            />
          </div>

          <div className="player-reference-modebar">
            <button className="mode-chip" type="button">原音模式</button>
            <button className="mode-chip active" type="button">跟读模式</button>
            <button className="mode-chip" type="button">回音模式</button>
            <div className="mode-chip-spacer" />
            <button
              className={`mode-chip${loopCurrentCue ? " active" : ""}`}
              type="button"
              onClick={() => setPlayerPreferences({ loopCurrentCue: !loopCurrentCue })}
            >
              单句循环{loopCurrentCue ? "开" : "关"}
            </button>
            <button
              className="mode-chip"
              disabled={!resolvedAiRoutes.study_analysis}
              type="button"
              onClick={() => runAiAnalysis("current")}
            >
              AI 引擎就绪
            </button>
            <span className="mode-chip plain">第 {learningProgressLabel}</span>
          </div>

          {activeTab === "analysis" ? (
            <section className="player-analysis-panel">
              <div className="section-top">
                <div>
                  <h2>AI 深度讲解</h2>
                  <p>基于当前句和素材上下文生成，不会在未配置时显示假内容。</p>
                </div>
                <button
                  className="ios-button secondary"
                  disabled={!resolvedAiRoutes.study_analysis}
                  type="button"
                  onClick={() => runAiAnalysis("current")}
                >
                  重新分析
                </button>
              </div>
              {state.analytics.lastAiResult ? (
                <pre className="assistant-output">{state.analytics.lastAiResult}</pre>
              ) : (
                <div className="empty-note">还没有 AI 分析结果，点击上方按钮后才会生成真实内容。</div>
              )}
            </section>
          ) : null}

          {activeTab === "pronunciation" ? (
            <section className="player-analysis-panel">
              <div className="section-top">
                <div>
                  <h2>发音诊断</h2>
                  <p>只使用真实录音和真实转写结果，不生成演示波形。</p>
                </div>
                <div className="button-row">
                  <button className="ios-button secondary" type="button" onClick={toggleRecording}>
                    {state.practice.recordingState === "recording" ? "结束录音" : "开始录音"}
                  </button>
                  <button
                    className="ios-button ghost"
                    disabled={!resolvedAiRoutes.speech_in || !currentRecording || isTranscribing}
                    type="button"
                    onClick={handleAiTranscription}
                  >
                    {isTranscribing ? "转写中..." : "AI 转写"}
                  </button>
                </div>
              </div>
              {currentRecording ? <audio controls src={currentRecording.url} /> : null}
              {state.practice.aiTranscription ? (
                <pre className="assistant-output">{state.practice.aiTranscription}</pre>
              ) : (
                <div className="empty-note">先录一段真实跟读音频，这里才会出现诊断结果。</div>
              )}
            </section>
          ) : null}
        </section>

        <aside className="player-reference-sidebar">
          <div className="player-reference-tabs">
            {CONTENT_TABS.map((tab) => (
              <button
                key={tab.id}
                className={`reference-tab${activeTab === tab.id ? " active" : ""}`}
                type="button"
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
            <div className="reference-font-controls">
              {FONT_SIZES.map((item) => (
                <button
                  key={item.value}
                  className={`font-chip${subtitleFontSize === item.value ? " active" : ""}`}
                  type="button"
                  onClick={() => setPlayerPreferences({ subtitleFontSize: item.value })}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {activeTab === "subtitles" ? (
            <div className="reference-subtitle-list" ref={subtitleListRef}>
              {currentCues.map((cue) => (
                <button
                  key={cue.id}
                  className={`reference-subtitle-row${cue.id === currentCue?.id ? " active" : ""}`}
                  ref={(node) => {
                    if (node) cueRefs.current.set(cue.id, node);
                  }}
                  type="button"
                  onClick={() => seekToCue(cue.id, "manual")}
                >
                  <span className="reference-subtitle-time">
                    {formatTime(cue.start + (currentMaterial.subtitleOffset || 0))}
                  </span>
                  <div className="reference-subtitle-copy">
                    <strong style={{ fontSize: `${subtitleFontSize}px` }}>
                      {formatCueEnglishForDisplay(cue.english).split(" ").map((word, index) => {
                        const clean = word.toLowerCase().replace(/[^a-z']/gi, "");
                        return (
                          <span
                            key={`${cue.id}-${index}`}
                            className={`reference-word${state.selectedWord === clean ? " active" : ""}`}
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
          ) : (
            <div className="reference-tab-empty">
              {activeTab === "analysis"
                ? "左侧显示 AI 深度讲解。"
                : "左侧显示发音诊断与转写结果。"}
            </div>
          )}

          <div className="reference-side-actions">
            <button
              className="reference-action-button"
              type="button"
              onClick={() => currentCue && toggleCueFavorite(currentCue.id)}
            >
              收藏本句
            </button>
            <button
              className="reference-action-button"
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
        </aside>
      </div>

      <section className="player-reference-bottombar">
        <div className="player-bottom-left">
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

        <div className="player-bottom-center">
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
            className="ios-button ghost"
            disabled={!resolvedAiRoutes.speech_out || !currentCue?.english || isSynthesizing}
            type="button"
            onClick={handleAiSpeech}
          >
            {isSynthesizing ? "生成中..." : "AI 朗读"}
          </button>
          <button
            className="ios-button ghost"
            type="button"
            onClick={() => setPlayerPreferences({ showTranslation: !showTranslation })}
          >
            {showTranslation ? "隐藏中文" : "显示中文"}
          </button>
        </div>

        <div className="player-bottom-right">
          {ttsAudioUrl ? <audio controls src={ttsAudioUrl} /> : null}
          <button className="ios-button primary" type="button" onClick={toggleRecording}>
            {state.practice.recordingState === "recording" ? "结束跟读" : "按住跟读"}
          </button>
        </div>
      </section>

      {selectedWordInsight ? (
        <section className="ios-card section-card reference-word-panel">
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
    </div>
  );
}
