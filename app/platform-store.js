"use client";

import {
  buildEmptyImportDraft,
  buildInitialPlatformState,
  buildLocalAnalysis,
  buildPersistedSnapshot,
  createCardsFromMaterial,
  formatDateTime,
  formatTime,
  normalizeText,
  nowIso,
  parseSubtitles,
  parseYouTubeId,
  scoreDictation,
  uid
} from "./lib/platform-model";
import {
  buildMaterialFromImport,
  buildSourceDescriptor,
  buildSubtitlePayload,
  findDuplicateMaterial
} from "./lib/import-workflow";
import { buildStudyAnalytics } from "./lib/analytics-center";
import {
  loadPlatformWorkspace,
  loadUiPreferences,
  mergeStoredState,
  persistPlatformWorkspace,
  persistUiPreferences
} from "./lib/platform-storage";
import {
  findActiveCueIdAtTime,
  getAdjacentCueId
} from "./lib/player-workspace";
import {
  applyReviewFeedback,
  buildTodayReviewQueue
} from "./lib/flashcards-review";
import {
  normalizeCapabilities,
  getServiceProtocol,
  resolveAiRoutes
} from "./lib/ai-registry";
import {
  buildCapabilityPrompt,
  buildLocalCapabilityResult,
  buildMediaCapabilityRequest,
  buildRemoteRequest,
  extractRemoteText
} from "./lib/ai-client";
import { createContext, startTransition, useContext, useEffect, useMemo, useRef, useState } from "react";

const PlatformStoreContext = createContext(null);

export function PlatformStoreProvider({ children }) {
  const [state, setState] = useState(buildInitialPlatformState);
  const [loaded, setLoaded] = useState(false);
  const [apiBusyId, setApiBusyId] = useState("");
  const mediaRecorderRef = useRef(null);
  const mediaChunksRef = useRef([]);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      try {
        const [ui, workspace] = await Promise.all([loadUiPreferences(), loadPlatformWorkspace()]);
        if (cancelled) return;

        setState((current) =>
          mergeStoredState({
            ...(workspace || buildPersistedSnapshot(current)),
            ui
          })
        );
      } catch {
        if (cancelled) return;
        setState((current) => ({ ...current, status: "本地数据读取失败，请检查浏览器存储权限。" }));
      } finally {
        if (!cancelled) setLoaded(true);
      }
    }

    hydrate();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    persistUiPreferences(state.ui);
    persistPlatformWorkspace(state).catch(() => {
      console.error("Failed to persist EchoFlow Pro workspace to IndexedDB.");
    });
  }, [loaded, state]);

  const currentMaterial = useMemo(
    () => state.materials.find((item) => item.id === state.currentMaterialId) || state.materials[0] || null,
    [state.materials, state.currentMaterialId]
  );

  const currentCues = currentMaterial?.cues || [];
  const currentCue = currentCues.find((item) => item.id === state.currentCueId) || currentCues[0] || null;

  const iframeSrc = useMemo(() => {
    if (!currentMaterial?.videoId) return "";
    const start = Math.max(0, Math.floor((currentCue?.start || 0) + (currentMaterial.subtitleOffset || 0)));
    return `https://www.youtube.com/embed/${currentMaterial.videoId}?start=${start}&autoplay=0&rel=0`;
  }, [currentCue, currentMaterial]);

  const selectedWordInsight = useMemo(() => {
    if (!state.selectedWord || !currentMaterial) return null;
    const matches = currentMaterial.cues.filter((cue) => normalizeText(cue.english).includes(state.selectedWord));
    return {
      word: state.selectedWord,
      count: matches.length,
      examples: matches.slice(0, 4)
    };
  }, [currentMaterial, state.selectedWord]);

  const dueCards = useMemo(
    () => buildTodayReviewQueue(state.cards, nowIso()),
    [state.cards]
  );

  const currentCard =
    state.cards.find((item) => item.id === state.currentCardId) || dueCards[0] || state.cards[0] || null;
  const resolvedAiRoutes = useMemo(
    () => resolveAiRoutes(state.settings.apiServices, state.settings.aiRouting),
    [state.settings.aiRouting, state.settings.apiServices]
  );

  const dictation = useMemo(
    () => scoreDictation(state.practice.dictationInput, currentCue?.english || ""),
    [currentCue, state.practice.dictationInput]
  );

  const dashboardStats = useMemo(() => {
    const today = new Date().toDateString();
    const todayLogs = state.logs.filter((item) => new Date(item.createdAt).toDateString() === today);
    return {
      studyMinutes: todayLogs.filter((item) => item.type === "学习会话").length * 8,
      materialsStudied: new Set(todayLogs.map((item) => item.materialId).filter(Boolean)).size,
      cardsAdded: todayLogs.filter((item) => item.type === "新增卡片").length,
      cardsReviewed: todayLogs.filter((item) => item.type === "复习卡片").length,
      recordings: todayLogs.filter((item) => item.type === "跟读录音").length,
      dictations: todayLogs.filter((item) => item.type === "听写练习").length,
      aiRuns: todayLogs.filter((item) => item.type === "AI 分析").length
    };
  }, [state.logs]);

  function appendLog(type, message, extra = {}) {
    setState((current) => ({
      ...current,
      logs: [{ id: uid("log"), type, message, createdAt: nowIso(), ...extra }, ...current.logs].slice(0, 120)
    }));
  }

  function updateUi(updater) {
    setState((current) => ({
      ...current,
      ui: {
        ...current.ui,
        ...updater,
        player: {
          ...current.ui.player,
          ...(updater.player || {})
        }
      }
    }));
  }

  function updateImportDraft(field, value) {
    setState((current) => ({
      ...current,
      importDraft: { ...current.importDraft, [field]: value }
    }));
  }

  function commitImportedMaterial(material) {
    startTransition(() => {
      setState((current) => ({
        ...current,
        materials: [material, ...current.materials],
        currentMaterialId: material.id,
        currentCueId: material.cues[0]?.id || "",
        importDraft: buildEmptyImportDraft(),
        status: `已导入素材《${material.title}》`
      }));
    });
    appendLog("导入素材", `导入素材《${material.title}》`, { materialId: material.id });
  }

  function selectMaterial(materialId) {
    setState((current) => {
      const material = current.materials.find((item) => item.id === materialId);
      return {
        ...current,
        currentMaterialId: materialId,
        currentCueId: material?.cues[0]?.id || "",
        selectedWord: "",
        status: material ? `已切换到素材《${material.title}》` : current.status
      };
    });
  }

  function selectCue(cueId) {
    setState((current) => ({
      ...current,
      currentCueId: cueId,
      status: `已定位到 ${formatTime(currentMaterial?.cues.find((item) => item.id === cueId)?.start || 0)} 的句子。`
    }));
  }

  function selectWord(word) {
    setState((current) => ({ ...current, selectedWord: word }));
  }

  function importMaterialFromPayload({
    draft,
    youtubeUrl = "",
    videoFile = null,
    subtitleText = "",
    subtitleFileName = "",
    mode = "手动导入"
  }) {
    try {
      const source = buildSourceDescriptor({ youtubeUrl, videoFile });
      const duplicate = findDuplicateMaterial(state.materials, source.sourceKey);

      if (duplicate) {
        const message = `已存在素材《${duplicate.title}》，请不要重复导入。`;
        setState((current) => ({ ...current, status: message }));
        return {
          ok: false,
          code: "duplicate",
          materialId: duplicate.id,
          message
        };
      }

      const subtitles = buildSubtitlePayload({ subtitleText, subtitleFileName });
      const material = buildMaterialFromImport({
        draft,
        source,
        subtitles,
        mode,
        now: nowIso(),
        createId: () => uid("material")
      });

      commitImportedMaterial(material);
      return {
        ok: true,
        materialId: material.id,
        material
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "导入失败。";
      setState((current) => ({ ...current, status: message }));
      return {
        ok: false,
        code: "invalid",
        message
      };
    }
  }

  function importMaterial(mode = "手动导入") {
    const result = importMaterialFromPayload({
      draft: state.importDraft,
      youtubeUrl: state.importDraft.youtubeUrl,
      subtitleText: state.importDraft.rawSubtitles,
      subtitleFileName: "",
      mode
    });
    return result.ok;
  }

  function updateMaterialMeta(materialId, field, value) {
    setState((current) => ({
      ...current,
      materials: current.materials.map((item) => (item.id === materialId ? { ...item, [field]: value } : item))
    }));
  }

  function setMaterialTags(materialId, tagsValue) {
    updateMaterialMeta(
      materialId,
      "tags",
      tagsValue.split(",").map((item) => item.trim()).filter(Boolean)
    );
  }

  function applySubtitleOffset(materialId, seconds) {
    updateMaterialMeta(materialId, "subtitleOffset", Number(seconds) || 0);
    setState((current) => ({ ...current, status: "已更新字幕偏移。" }));
  }

  function setPracticeMode(mode) {
    setState((current) => ({ ...current, practice: { ...current.practice, mode } }));
  }

  function setDictationInput(value) {
    setState((current) => ({ ...current, practice: { ...current.practice, dictationInput: value } }));
  }

  function submitDictation() {
    appendLog("听写练习", `听写得分 ${dictation.score}%`, { materialId: currentMaterial?.id, cueId: currentCue?.id });
    setState((current) => ({ ...current, status: `听写已记录，得分 ${dictation.score}%。` }));
  }

  function addCard(cardPayload) {
    const sourceMaterialId = cardPayload.sourceMaterialId || currentMaterial?.id || "";
    const sourceCueId = cardPayload.sourceCueId || currentCue?.id || "";
    const card = {
      id: uid("card"),
      type: cardPayload.type || "表达卡",
      sourceMaterialId,
      sourceCueId,
      title: cardPayload.title,
      phonetic: cardPayload.phonetic || "",
      meaning: cardPayload.meaning || currentCue?.chinese || "",
      example: cardPayload.example || currentCue?.english || "",
      note: cardPayload.note || "手动加入卡片",
      difficultyTag: cardPayload.difficultyTag || currentCue?.difficultyTag || "四级",
      sourceType: cardPayload.sourceType || "手动创建",
      status: "新建",
      reviewLevel: 0,
      nextReviewAt: nowIso(),
      reviewCount: 0,
      favorite: Boolean(cardPayload.favorite),
      createdAt: nowIso(),
      count: 1
    };
    setState((current) => ({
      ...current,
      cards: [card, ...current.cards],
      currentCardId: card.id,
      status: `已加入卡片：${card.title}`
    }));
    appendLog("新增卡片", `加入卡片《${card.title}》`, { materialId: sourceMaterialId, cueId: sourceCueId });
  }

  function reviewCard(cardId, feedback) {
    const reviewedCard = state.cards.find((card) => card.id === cardId);
    setState((current) => ({
      ...current,
      cards: current.cards.map((card) =>
        card.id === cardId
          ? applyReviewFeedback(card, feedback, nowIso())
          : card
      ),
      status: "卡片复习结果已保存。"
    }));
    appendLog("复习卡片", `复习卡片反馈 ${feedback}`, {
      materialId: reviewedCard?.sourceMaterialId || currentMaterial?.id,
      cueId: reviewedCard?.sourceCueId || currentCue?.id
    });
  }

  function toggleCardFavorite(cardId) {
    setState((current) => ({
      ...current,
      cards: current.cards.map((card) =>
        card.id === cardId ? { ...card, favorite: !card.favorite } : card
      ),
      status: "已更新卡片收藏状态。"
    }));
  }

  function setCurrentCardId(cardId) {
    setState((current) => ({ ...current, currentCardId: cardId }));
  }

  function nextDueCard() {
    if (!dueCards.length) return;
    setCurrentCardId(dueCards[0].id);
  }

  function previousCue() {
    if (!currentCue) return;
    const targetId = getAdjacentCueId(currentCues, currentCue.id, -1);
    const target = currentCues.find((item) => item.id === targetId);
    if (target) selectCue(target.id);
  }

  function nextCue() {
    if (!currentCue) return;
    const targetId = getAdjacentCueId(currentCues, currentCue.id, 1);
    const target = currentCues.find((item) => item.id === targetId);
    if (target) selectCue(target.id);
  }

  function setPlayerPreferences(patch) {
    updateUi({ player: patch });
  }

  function syncCueWithPlaybackTime(seconds) {
    if (!currentMaterial || !currentCues.length) return;
    const subtitleTime = Math.max(0, seconds - (currentMaterial.subtitleOffset || 0));
    const nextCueId = findActiveCueIdAtTime(currentCues, subtitleTime);
    if (!nextCueId || nextCueId === state.currentCueId) return;

    setState((current) => ({
      ...current,
      currentCueId: nextCueId
    }));
  }

  function rememberPlayerProgress(seconds) {
    if (!currentMaterial) return;
    const normalizedSeconds = Math.max(0, Number(seconds) || 0);

    setState((current) => ({
      ...current,
      materials: current.materials.map((material) =>
        material.id === currentMaterial.id
          ? {
              ...material,
              lastPositionSeconds: normalizedSeconds,
              lastStudiedAt: nowIso(),
              status: material.status === "未开始" ? "学习中" : material.status
            }
          : material
      )
    }));
  }

  function toggleCueFavorite(cueId) {
    if (!currentMaterial) return;
    setState((current) => ({
      ...current,
      materials: current.materials.map((material) =>
        material.id === currentMaterial.id
          ? {
              ...material,
              cues: material.cues.map((cue) =>
                cue.id === cueId ? { ...cue, favorite: !cue.favorite } : cue
              )
            }
          : material
      ),
      status: "已更新本句收藏状态。"
    }));
  }

  async function invokeAiCapability(capabilityId, payload) {
    const service = resolvedAiRoutes[capabilityId];
    if (!service) {
      return {
        ok: false,
        code: "unconfigured",
        message: "当前能力尚未配置可用的 AI provider。",
        text: ""
      };
    }

    if (getServiceProtocol(service) === "local") {
      return {
        ok: true,
        code: "local",
        text: buildLocalCapabilityResult(capabilityId, payload)
      };
    }

    if (!service.baseUrl || !service.apiKey) {
      return {
        ok: false,
        code: "incomplete",
        message: "当前 provider 配置不完整。",
        text: ""
      };
    }

    const prompt = buildCapabilityPrompt(capabilityId, payload);
    const request = buildRemoteRequest(service, prompt);

    try {
      const response = await fetch(request.url, {
        method: "POST",
        headers: request.headers,
        body: JSON.stringify(request.body)
      });
      const data = await response.json();
      return {
        ok: true,
        code: "remote",
        text: extractRemoteText(data)
      };
    } catch {
      return {
        ok: false,
        code: "failed",
        message: "远程 AI 请求失败。",
        text: ""
      };
    }
  }

  async function invokeMediaCapability(capabilityId, payload) {
    const service = resolvedAiRoutes[capabilityId];
    if (!service) {
      return {
        ok: false,
        code: "unconfigured",
        message: "当前能力尚未配置可用的 AI provider。",
      };
    }

    if (getServiceProtocol(service) === "local") {
      if (capabilityId === "speech_out") {
        return {
          ok: true,
          code: "local",
          text: payload.text,
        };
      }

      return {
        ok: false,
        code: "unsupported",
        message: "当前本地 provider 不支持这个媒体能力。",
      };
    }

    const request = buildMediaCapabilityRequest(service, capabilityId, payload);
    if (!request) {
      return {
        ok: false,
        code: "unsupported",
        message: "当前协议还不支持这个能力。",
      };
    }

    try {
      const response = await fetch(request.url, {
        method: "POST",
        headers: request.headers,
        body: request.body,
      });

      if (request.responseType === "audio") {
        const blob = await response.blob();
        return { ok: true, code: "audio", blob };
      }

      const data = await response.json();
      return { ok: true, code: "json", text: extractRemoteText(data) };
    } catch {
      return {
        ok: false,
        code: "failed",
        message: "远程媒体能力请求失败。",
      };
    }
  }

  function speakCurrent() {
    if (!currentCue?.english || !window.speechSynthesis) {
      setState((current) => ({ ...current, status: "当前环境不支持朗读。" }));
      return;
    }
    const utterance = new SpeechSynthesisUtterance(currentCue.english);
    utterance.lang = "en-US";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setState((current) => ({ ...current, status: "正在朗读当前句。" }));
  }

  async function toggleRecording() {
    if (state.practice.recordingState === "recording") {
      mediaRecorderRef.current?.stop();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setState((current) => ({ ...current, status: "当前浏览器不支持录音。" }));
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
        setState((current) => ({
          ...current,
          practice: {
            ...current.practice,
            recordingState: "idle",
            recordings: [
              {
                id: uid("recording"),
                cueId: currentCue?.id || "",
                materialId: currentMaterial?.id || "",
                title: currentCue?.english || "未命名录音",
                createdAt: nowIso(),
                blob,
                url
              },
              ...current.practice.recordings
            ]
          },
          status: "录音已保存。"
        }));
        appendLog("跟读录音", `保存录音《${currentCue?.english || "当前句"}》`, {
          materialId: currentMaterial?.id,
          cueId: currentCue?.id
        });
        stream.getTracks().forEach((track) => track.stop());
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setState((current) => ({
        ...current,
        practice: { ...current.practice, recordingState: "recording" },
        status: "录音中，再点一次结束。"
      }));
    } catch {
      setState((current) => ({ ...current, status: "麦克风权限获取失败。" }));
    }
  }

  async function runAiAnalysis(scope = "current") {
    if (!currentCue && !currentMaterial) return;

    const local =
      scope === "material"
        ? {
            summary: `素材《${currentMaterial.title}》适合以 ${currentMaterial.learningGoal} 为主线学习。`,
            highlights: currentMaterial.cues.flatMap((cue) => cue.analysis.highlights).slice(0, 12),
            grammar: [...new Set(currentMaterial.cues.flatMap((cue) => cue.analysis.grammar))].slice(0, 6),
            pronunciation: "建议先做精听，再做影子跟读和听写。"
          }
        : buildLocalAnalysis(currentCue.english, currentCue.chinese);

    const aiResult = await invokeAiCapability("study_analysis", {
      scope,
      english: currentCue?.english || "",
      chinese: currentCue?.chinese || "",
      text: scope === "material" ? currentMaterial.cues.map((cue) => cue.english).join("\n") : currentCue?.english || "",
      localText: ""
    });

    const result = {
      generatedAt: nowIso(),
      scope,
      local,
      remoteText: aiResult.ok ? aiResult.text : aiResult.message || ""
    };
    setState((current) => ({
      ...current,
      analytics: {
        ...current.analytics,
        lastAiResult: JSON.stringify(result, null, 2),
        lastGeneratedItems: local.highlights
      },
      status: "AI 分析已更新。"
    }));
    appendLog("AI 分析", `执行${scope === "material" ? "整篇素材" : "当前句"} AI 分析`, {
      materialId: currentMaterial?.id,
      cueId: currentCue?.id
    });
  }

  async function runBehaviorAnalysis() {
    const analytics = buildStudyAnalytics({
      logs: state.logs,
      materials: state.materials,
      cards: state.cards,
      now: nowIso()
    });

    const summary = JSON.stringify(analytics, null, 2);
    const result = await invokeAiCapability("behavior_analysis", {
      analytics,
      summary
    });

    setState((current) => ({
      ...current,
      analytics: {
        ...current.analytics,
        behaviorSuggestion: result.ok ? result.text : "",
        behaviorGeneratedAt: result.ok ? nowIso() : ""
      },
      status: result.ok ? "AI 学习建议已更新。" : result.message || "AI 学习建议生成失败。"
    }));

    if (result.ok) {
      appendLog("AI 分析", "执行学习行为分析", {});
    }

    return result;
  }

  async function runTranscriptProcessing(rawText) {
    const result = await invokeAiCapability("transcript_processing", { rawText });
    return result;
  }

  async function runSpeechTranscription(recording) {
    const result = await invokeMediaCapability("speech_in", {
      blob: recording.blob,
      fileName: `${recording.id || "recording"}.webm`,
      mimeType: "audio/webm",
    });

    if (result.ok && result.text) {
      setState((current) => ({
        ...current,
        practice: {
          ...current.practice,
          aiTranscription: result.text,
          aiTranscriptionCreatedAt: nowIso(),
        },
        status: "AI 语音转写已完成。",
      }));
      appendLog("AI 分析", "执行语音转写", {
        materialId: currentMaterial?.id,
        cueId: currentCue?.id,
      });
    } else {
      setState((current) => ({
        ...current,
        status: result.message || "AI 语音转写失败。",
      }));
    }

    return result;
  }

  async function runSpeechSynthesis(text) {
    const result = await invokeMediaCapability("speech_out", { text });

    if (result.ok && result.code === "local") {
      if (!window.speechSynthesis) {
        return { ok: false, message: "当前浏览器不支持本地语音输出。" };
      }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
      return { ok: true, code: "local" };
    }

    if (result.ok && result.blob) {
      return {
        ok: true,
        code: "audio",
        audioUrl: URL.createObjectURL(result.blob),
      };
    }

    return result;
  }

  async function runVisionRecognition(imagePayload) {
    const result = await invokeMediaCapability("vision", imagePayload);
    return result;
  }

  function updateLanguage(language) {
    updateUi({ language });
  }

  function updateAiRouting(capabilityId, serviceId) {
    setState((current) => ({
      ...current,
      settings: {
        ...current.settings,
        aiRouting: {
          ...current.settings.aiRouting,
          [capabilityId]: serviceId
        }
      },
      status: "AI 能力路由已更新。"
    }));
  }

  function toggleSidebar(forceValue) {
    setState((current) => ({
      ...current,
      ui: {
        ...current.ui,
        sidebarCollapsed:
          typeof forceValue === "boolean" ? forceValue : !current.ui.sidebarCollapsed
      }
    }));
  }

  function saveApiService(service) {
    setState((current) => {
      const serviceId = service.id || uid("service");
      const exists = current.settings.apiServices.some((item) => item.id === serviceId);
      const normalized = {
        ...service,
        id: serviceId,
        vendor: service.vendor || service.providerType || "custom",
        protocol: service.protocol || service.providerType || "openai-compatible",
        endpointOverrides: service.endpointOverrides || {},
        capabilities: normalizeCapabilities(service.capabilities),
        status: service.status || "待测试"
      };
      const nextServices = exists
        ? current.settings.apiServices.map((item) =>
            item.id === serviceId
              ? { ...item, ...normalized }
              : service.isDefault
                ? { ...item, isDefault: false }
                : item
          )
        : [
            ...current.settings.apiServices.map((item) => ({
              ...item,
              isDefault: service.isDefault ? false : item.isDefault
            })),
            normalized
          ];
      return {
        ...current,
        settings: { ...current.settings, apiServices: nextServices },
        status: "接口配置已保存。"
      };
    });
  }

  function deleteApiService(serviceId) {
    setState((current) => ({
      ...current,
      settings: {
        ...current.settings,
        apiServices: current.settings.apiServices.filter((item) => item.id !== serviceId),
        aiRouting: Object.fromEntries(
          Object.entries(current.settings.aiRouting).map(([capabilityId, routedServiceId]) => [
            capabilityId,
            routedServiceId === serviceId ? "" : routedServiceId
          ])
        )
      },
      status: "接口配置已删除。"
    }));
  }

  function setDefaultApiService(serviceId) {
    setState((current) => ({
      ...current,
      settings: {
        ...current.settings,
        apiServices: current.settings.apiServices.map((item) => ({
          ...item,
          isDefault: item.id === serviceId
        }))
      },
      status: "默认接口已更新。"
    }));
  }

  function toggleApiService(serviceId) {
    setState((current) => ({
      ...current,
      settings: {
        ...current.settings,
        apiServices: current.settings.apiServices.map((item) =>
          item.id === serviceId ? { ...item, enabled: !item.enabled } : item
        )
      }
    }));
  }

  async function testApiService(serviceId) {
    setApiBusyId(serviceId);
    await new Promise((resolve) => setTimeout(resolve, 400));
    setState((current) => ({
      ...current,
      settings: {
        ...current.settings,
        apiServices: current.settings.apiServices.map((item) =>
          item.id === serviceId
            ? {
                ...item,
                status:
                  item.providerType === "local"
                    ? "可用"
                    : item.baseUrl && item.apiKey
                      ? "配置完整"
                      : "缺少地址或密钥",
                lastCheckedAt: nowIso()
              }
            : item
        )
      },
      status: "接口测试结果已更新。"
    }));
    setApiBusyId("");
  }

  function updatePreferences(section, field, value) {
    setState((current) => ({
      ...current,
      settings: {
        ...current.settings,
        [section]: { ...current.settings[section], [field]: value }
      }
    }));
  }

  function importSnapshot(jsonText) {
    try {
      const parsed = JSON.parse(jsonText);
      setState(mergeStoredState(parsed));
      return true;
    } catch {
      setState((current) => ({ ...current, status: "导入失败，JSON 格式无效。" }));
      return false;
    }
  }

  function resetWorkspace() {
    setState(buildInitialPlatformState());
  }

  const value = {
    state,
    currentMaterial,
    currentCue,
    currentCues,
    currentCard,
    dueCards,
    dictation,
    iframeSrc,
    selectedWordInsight,
    dashboardStats,
    apiBusyId,
    resolvedAiRoutes,
    exportSnapshot: JSON.stringify(buildPersistedSnapshot(state), null, 2),
    formatDateTime,
    formatTime,
    updateUi,
    updateLanguage,
    updateAiRouting,
    toggleSidebar,
    updateImportDraft,
    importMaterial,
    importMaterialFromPayload,
    selectMaterial,
    selectCue,
    selectWord,
    updateMaterialMeta,
    setMaterialTags,
    applySubtitleOffset,
    setPracticeMode,
    setDictationInput,
    submitDictation,
    previousCue,
    nextCue,
    syncCueWithPlaybackTime,
    rememberPlayerProgress,
    toggleCueFavorite,
    setPlayerPreferences,
    speakCurrent,
    toggleRecording,
    addCard,
    reviewCard,
    toggleCardFavorite,
    setCurrentCardId,
    nextDueCard,
    runAiAnalysis,
    runBehaviorAnalysis,
    runTranscriptProcessing,
    runSpeechTranscription,
    runSpeechSynthesis,
    runVisionRecognition,
    saveApiService,
    deleteApiService,
    setDefaultApiService,
    toggleApiService,
    testApiService,
    updatePreferences,
    importSnapshot,
    resetWorkspace
  };

  return <PlatformStoreContext.Provider value={value}>{children}</PlatformStoreContext.Provider>;
}

export function usePlatformStore() {
  const context = useContext(PlatformStoreContext);
  if (!context) throw new Error("usePlatformStore must be used within PlatformStoreProvider");
  return context;
}
