"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";

let youtubeApiPromise = null;

function loadYouTubeApi() {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (youtubeApiPromise) return youtubeApiPromise;

  youtubeApiPromise = new Promise((resolve, reject) => {
    const previousReady = window.onYouTubeIframeAPIReady;
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => reject(new Error("Failed to load YouTube API"));
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      resolve(window.YT);
    };
    document.head.appendChild(script);
  });

  return youtubeApiPromise;
}

const YouTubeSurface = forwardRef(function YouTubeSurface(
  { videoId, playbackRate, onReady, onTimeChange, onPlayingChange },
  ref,
) {
  const hostRef = useRef(null);
  const playerRef = useRef(null);

  useImperativeHandle(ref, () => ({
    seekTo(seconds) {
      playerRef.current?.seekTo(seconds, true);
    },
    play() {
      playerRef.current?.playVideo();
    },
    pause() {
      playerRef.current?.pauseVideo();
    },
    togglePlay() {
      const state = playerRef.current?.getPlayerState?.();
      if (state === window.YT?.PlayerState?.PLAYING) {
        playerRef.current?.pauseVideo();
      } else {
        playerRef.current?.playVideo();
      }
    },
    getCurrentTime() {
      return playerRef.current?.getCurrentTime?.() || 0;
    },
  }));

  useEffect(() => {
    let destroyed = false;
    let pollTimer = null;

    loadYouTubeApi()
      .then((YT) => {
        if (destroyed || !hostRef.current) return;

        const player = new YT.Player(hostRef.current, {
          videoId,
          playerVars: {
            playsinline: 1,
            rel: 0,
            controls: 0,
            modestbranding: 1,
          },
          events: {
            onReady: () => {
              player.setPlaybackRate(playbackRate);
              onReady?.();
            },
            onStateChange: (event) => {
              onPlayingChange?.(event.data === YT.PlayerState.PLAYING);
            },
          },
        });

        playerRef.current = player;
        pollTimer = window.setInterval(() => {
          const currentTime = player.getCurrentTime?.();
          if (typeof currentTime === "number") onTimeChange?.(currentTime);
        }, 250);
      })
      .catch(() => {
        onPlayingChange?.(false);
      });

    return () => {
      destroyed = true;
      if (pollTimer) window.clearInterval(pollTimer);
      playerRef.current?.destroy?.();
      playerRef.current = null;
    };
  }, [onPlayingChange, onReady, onTimeChange, playbackRate, videoId]);

  useEffect(() => {
    playerRef.current?.setPlaybackRate?.(playbackRate);
  }, [playbackRate]);

  return <div className="media-player-host" ref={hostRef} />;
});

const LocalVideoSurface = forwardRef(function LocalVideoSurface(
  { fileBlob, playbackRate, onReady, onTimeChange, onPlayingChange },
  ref,
) {
  const videoRef = useRef(null);
  const objectUrl = useMemo(() => {
    if (!fileBlob) return "";
    return URL.createObjectURL(fileBlob);
  }, [fileBlob]);

  useEffect(() => () => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }, [objectUrl]);

  useImperativeHandle(ref, () => ({
    seekTo(seconds) {
      if (!videoRef.current) return;
      videoRef.current.currentTime = seconds;
    },
    play() {
      videoRef.current?.play?.();
    },
    pause() {
      videoRef.current?.pause?.();
    },
    togglePlay() {
      if (!videoRef.current) return;
      if (videoRef.current.paused) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    },
    getCurrentTime() {
      return videoRef.current?.currentTime || 0;
    },
  }));

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  return (
    <video
      className="media-player-video"
      playsInline
      preload="metadata"
      ref={videoRef}
      src={objectUrl}
      onCanPlay={() => onReady?.()}
      onPlay={() => onPlayingChange?.(true)}
      onPause={() => onPlayingChange?.(false)}
      onTimeUpdate={(event) => onTimeChange?.(event.currentTarget.currentTime)}
    />
  );
});

const MediaPlayerSurface = forwardRef(function MediaPlayerSurface(
  { material, playbackRate, onReady, onTimeChange, onPlayingChange },
  ref,
) {
  if (!material) {
    return <div className="media-player-empty">先从素材库选择一个真实导入素材。</div>;
  }

  if (material.sourceMediaKind === "local-video" && material.localVideoBlob) {
    return (
      <LocalVideoSurface
        fileBlob={material.localVideoBlob}
        playbackRate={playbackRate}
        onPlayingChange={onPlayingChange}
        onReady={onReady}
        onTimeChange={onTimeChange}
        ref={ref}
      />
    );
  }

  if (material.videoId) {
    return (
      <YouTubeSurface
        onPlayingChange={onPlayingChange}
        onReady={onReady}
        onTimeChange={onTimeChange}
        playbackRate={playbackRate}
        ref={ref}
        videoId={material.videoId}
      />
    );
  }

  return <div className="media-player-empty">当前素材没有可播放的视频来源。</div>;
});

export default MediaPlayerSurface;
