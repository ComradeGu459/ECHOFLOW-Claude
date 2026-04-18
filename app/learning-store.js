"use client";

import {
  buildCards,
  buildWorkspaceSnapshot,
  formatTime,
  normalizeText,
  parseSubtitles,
  parseYouTubeId,
  SAMPLE_SUBTITLES,
  SAMPLE_URL,
  scoreDictation
} from "./lib/learning";
import { createContext, startTransition, useContext, useEffect, useMemo, useRef, useState } from "react";

const LearningStoreContext = createContext(null);

const DEFAULT_API_CONFIG = {
  provider: "deepseek",
  endpoint: "",
  apiKey: "",
  model: "",
  prompt: "Explain the current subtitle, give a simpler rewrite and one speaking tip."
};

export function LearningStoreProvider({ children }) {
  const [youtubeInput, setYoutubeInput] = useState(SAMPLE_URL);
  const [videoId, setVideoId] = useState(parseYouTubeId(SAMPLE_URL));
  const [rawSubtitles, setRawSubtitles] = useState(SAMPLE_SUBTITLES);
  const [cues, setCues] = useState(() => parseSubtitles(SAMPLE_SUBTITLES));
  const [activeCueId, setActiveCueId] = useState("1");
  const [selectedWord, setSelectedWord] = useState("");
  const [dictationInput, setDictationInput] = useState("");
  const [cards, setCards] = useState(() => buildCards(parseSubtitles(SAMPLE_SUBTITLES)));
  const [cardIndex, setCardIndex] = useState(0);
  const [cardFlipped, setCardFlipped] = useState(false);
  const [recordings, setRecordings] = useState([]);
  const [recordingState, setRecordingState] = useState("idle");
  const [status, setStatus] = useState("准备就绪");
  const [apiConfig, setApiConfig] = useState(DEFAULT_API_CONFIG);
  const [apiResult, setApiResult] = useState("");
  const [apiLoading, setApiLoading] = useState(false);

  const mediaRecorderRef = useRef(null);
  const mediaChunksRef = useRef([]);

  useEffect(() => {
    const saved = window.localStorage.getItem("speakflow-workspace");
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved);
      if (parsed.youtubeInput) setYoutubeInput(parsed.youtubeInput);
      if (parsed.videoId) setVideoId(parsed.videoId);
      if (parsed.rawSubtitles) setRawSubtitles(parsed.rawSubtitles);
      if (parsed.cues?.length) setCues(parsed.cues);
      if (parsed.activeCueId) setActiveCueId(parsed.activeCueId);
      if (parsed.selectedWord) setSelectedWord(parsed.selectedWord);
      if (parsed.cards?.length) setCards(parsed.cards);
      if (parsed.apiConfig) setApiConfig(parsed.apiConfig);
    } catch {
      setStatus("本地数据读取失败，已回退到示例内容。");
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      "speakflow-workspace",
      JSON.stringify(
        buildWorkspaceSnapshot({
          youtubeInput,
          videoId,
          rawSubtitles,
          cues,
          activeCueId,
          selectedWord,
          cards,
          apiConfig
        })
      )
    );
  }, [youtubeInput, videoId, rawSubtitles, cues, activeCueId, selectedWord, cards, apiConfig]);

  const activeCue = useMemo(
    () => cues.find((cue) => cue.id === activeCueId) || cues[0] || null,
    [cues, activeCueId]
  );

  const iframeSrc = useMemo(() => {
    if (!videoId) return "";
    const start = Math.max(0, Math.floor(activeCue?.start || 0));
    return `https://www.youtube.com/embed/${videoId}?start=${start}&autoplay=0&rel=0`;
  }, [videoId, activeCue]);

  const wordInsight = useMemo(() => {
    if (!selectedWord) return null;
    const normalized = selectedWord.toLowerCase();
    const matches = cues.filter((cue) => normalizeText(cue.english).includes(normalized));
    return {
      word: normalized,
      count: matches.length,
      examples: matches.slice(0, 4)
    };
  }, [selectedWord, cues]);

  const dictation = useMemo(
    () => scoreDictation(dictationInput, activeCue?.english || ""),
    [dictationInput, activeCue]
  );

  const currentCard = cards[cardIndex] || null;

  function importVideo() {
    const id = parseYouTubeId(youtubeInput);
    if (!id) {
      setStatus("YouTube 链接无效，或不是标准视频地址。");
      return false;
    }
    setVideoId(id);
    setStatus("视频已载入。现在可以去播放器页练习。");
    return true;
  }

  function loadSubtitles() {
    const parsed = parseSubtitles(rawSubtitles);
    if (!parsed.length) {
      setStatus("字幕解析失败，请粘贴 SRT/VTT，或每行使用 english || 中文。");
      return false;
    }
    startTransition(() => {
      setCues(parsed);
      setActiveCueId(parsed[0].id);
      setSelectedWord("");
      setCards(buildCards(parsed));
      setCardIndex(0);
      setCardFlipped(false);
      setDictationInput("");
      setStatus(`已加载 ${parsed.length} 条字幕。`);
    });
    return true;
  }

  function selectCue(id) {
    setActiveCueId(id);
    setStatus(`已切换到 ${formatTime(cues.find((cue) => cue.id === id)?.start || 0)} 的句子。`);
  }

  function selectWord(word) {
    setSelectedWord(word.toLowerCase().replace(/[^a-z']/gi, ""));
  }

  function previousCue() {
    if (!activeCue) return;
    const index = cues.findIndex((cue) => cue.id === activeCue.id);
    const target = cues[Math.max(0, index - 1)];
    if (target) setActiveCueId(target.id);
  }

  function nextCue() {
    if (!activeCue) return;
    const index = cues.findIndex((cue) => cue.id === activeCue.id);
    const target = cues[Math.min(cues.length - 1, index + 1)];
    if (target) setActiveCueId(target.id);
  }

  function speakCurrent() {
    if (!activeCue?.english || typeof window === "undefined" || !window.speechSynthesis) {
      setStatus("当前环境不支持系统朗读。");
      return;
    }
    const utterance = new SpeechSynthesisUtterance(activeCue.english);
    utterance.lang = "en-US";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setStatus("正在朗读当前句。");
  }

  async function toggleRecording() {
    if (recordingState === "recording") {
      mediaRecorderRef.current?.stop();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("当前浏览器不支持录音。");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) mediaChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(mediaChunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setRecordings((prev) => [
          {
            id: `${Date.now()}`,
            cue: activeCue?.english || "未选句子",
            url,
            createdAt: new Date().toLocaleTimeString()
          },
          ...prev
        ]);
        setRecordingState("idle");
        setStatus("录音已保存，可在播放器页回放。");
        stream.getTracks().forEach((track) => track.stop());
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecordingState("recording");
      setStatus("录音中，再点一次结束。");
    } catch {
      setStatus("无法获取麦克风权限。");
    }
  }

  async function runApi() {
    if (!activeCue?.english) {
      setStatus("请先选择一句字幕。");
      return;
    }
    if (!apiConfig.endpoint || !apiConfig.apiKey) {
      setStatus("请先在设置页填写 API endpoint 和 key。");
      return;
    }
    setApiLoading(true);
    setApiResult("");
    try {
      let response;
      if (apiConfig.provider === "gemini") {
        response = await fetch(
          `${apiConfig.endpoint}${apiConfig.endpoint.includes("?") ? "&" : "?"}key=${apiConfig.apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: `${apiConfig.prompt}\n\nSubtitle:\n${activeCue.english}\n${activeCue.chinese || ""}`
                    }
                  ]
                }
              ]
            })
          }
        );
      } else {
        response = await fetch(apiConfig.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiConfig.apiKey}`
          },
          body: JSON.stringify({
            model: apiConfig.model || "default-model",
            messages: [
              { role: "system", content: "You are an English speaking coach." },
              {
                role: "user",
                content: `${apiConfig.prompt}\n\nSubtitle:\n${activeCue.english}\n${activeCue.chinese || ""}`
              }
            ]
          })
        });
      }
      const data = await response.json();
      const text =
        data?.choices?.[0]?.message?.content ||
        data?.candidates?.[0]?.content?.parts?.map((part) => part.text).join("\n") ||
        data?.output_text ||
        JSON.stringify(data, null, 2);
      setApiResult(text);
      setStatus("AI 请求已完成。");
    } catch (error) {
      setApiResult(String(error));
      setStatus("AI 请求失败，请检查接口地址、密钥或浏览器跨域限制。");
    } finally {
      setApiLoading(false);
    }
  }

  function regenerateCards() {
    const nextCards = buildCards(cues);
    setCards(nextCards);
    setCardIndex(0);
    setCardFlipped(false);
    setStatus("已根据当前字幕重新生成闪卡。");
  }

  function nextCard() {
    if (!cards.length) return;
    setCardFlipped(false);
    setCardIndex((prev) => (prev + 1) % cards.length);
  }

  function previousCard() {
    if (!cards.length) return;
    setCardFlipped(false);
    setCardIndex((prev) => (prev - 1 + cards.length) % cards.length);
  }

  function importWorkspaceJson(input) {
    try {
      const parsed = JSON.parse(input);
      if (parsed.youtubeInput) setYoutubeInput(parsed.youtubeInput);
      if (parsed.videoId) setVideoId(parsed.videoId);
      if (parsed.rawSubtitles) setRawSubtitles(parsed.rawSubtitles);
      if (parsed.cues?.length) setCues(parsed.cues);
      if (parsed.activeCueId) setActiveCueId(parsed.activeCueId);
      if (parsed.selectedWord) setSelectedWord(parsed.selectedWord);
      if (parsed.cards?.length) setCards(parsed.cards);
      if (parsed.apiConfig) setApiConfig(parsed.apiConfig);
      setStatus("工作区数据已导入。");
      return true;
    } catch {
      setStatus("导入失败，JSON 格式无效。");
      return false;
    }
  }

  function resetToSample() {
    const sampleCues = parseSubtitles(SAMPLE_SUBTITLES);
    setYoutubeInput(SAMPLE_URL);
    setVideoId(parseYouTubeId(SAMPLE_URL));
    setRawSubtitles(SAMPLE_SUBTITLES);
    setCues(sampleCues);
    setActiveCueId(sampleCues[0]?.id || "1");
    setSelectedWord("");
    setCards(buildCards(sampleCues));
    setCardIndex(0);
    setCardFlipped(false);
    setDictationInput("");
    setRecordings([]);
    setApiResult("");
    setStatus("已恢复示例内容。");
  }

  const value = {
    youtubeInput,
    setYoutubeInput,
    videoId,
    rawSubtitles,
    setRawSubtitles,
    cues,
    activeCueId,
    activeCue,
    selectedWord,
    wordInsight,
    cards,
    cardIndex,
    cardFlipped,
    currentCard,
    recordings,
    recordingState,
    dictationInput,
    setDictationInput,
    dictation,
    status,
    apiConfig,
    setApiConfig,
    apiResult,
    apiLoading,
    iframeSrc,
    importVideo,
    loadSubtitles,
    selectCue,
    selectWord,
    previousCue,
    nextCue,
    speakCurrent,
    toggleRecording,
    runApi,
    regenerateCards,
    nextCard,
    previousCard,
    setCardFlipped,
    importWorkspaceJson,
    resetToSample,
    exportWorkspaceJson: JSON.stringify(
      buildWorkspaceSnapshot({
        youtubeInput,
        videoId,
        rawSubtitles,
        cues,
        activeCueId,
        selectedWord,
        cards,
        apiConfig
      }),
      null,
      2
    )
  };

  return <LearningStoreContext.Provider value={value}>{children}</LearningStoreContext.Provider>;
}

export function useLearningStore() {
  const context = useContext(LearningStoreContext);
  if (!context) {
    throw new Error("useLearningStore must be used within LearningStoreProvider");
  }
  return context;
}
