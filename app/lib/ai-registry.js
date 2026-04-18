export const AI_CAPABILITIES = [
  {
    id: "study_analysis",
    label: "学习分析",
    description: "字幕句子解释、表达改写、学习建议",
  },
  {
    id: "speech_in",
    label: "语音输入",
    description: "语音识别、跟读转写、口语输入",
  },
  {
    id: "speech_out",
    label: "语音输出",
    description: "TTS 朗读、配音和语音播报",
  },
  {
    id: "transcript_processing",
    label: "视听文稿处理",
    description: "字幕清洗、切句、对齐、摘要与结构化",
  },
  {
    id: "vision",
    label: "图像识别",
    description: "OCR、截图理解、封面和画面识别",
  },
  {
    id: "behavior_analysis",
    label: "用户行为分析",
    description: "学习行为洞察、推荐和反馈分析",
  },
];

const LEGACY_CAPABILITY_ALIASES = {
  字幕分析: "transcript_processing",
  难度判断: "study_analysis",
  卡片生成: "study_analysis",
};

export function normalizeCapabilities(capabilities) {
  const known = new Set(AI_CAPABILITIES.map((item) => item.id));
  return [
    ...new Set(
      (capabilities || [])
        .map((item) => LEGACY_CAPABILITY_ALIASES[item] || item)
        .filter((item) => known.has(item)),
    ),
  ];
}

export function getServiceProtocol(service) {
  return service.protocol || service.providerType || "openai-compatible";
}

export function getServiceHealth(service) {
  if (!service.enabled) return "disabled";
  const protocol = getServiceProtocol(service);
  if (protocol === "local") return "ready";

  if (service.baseUrl && service.model && service.apiKey) return "ready";
  return "incomplete";
}

export function resolveAiRoutes(services, routing) {
  const serviceMap = new Map(services.map((service) => [service.id, service]));
  const routes = {};

  AI_CAPABILITIES.forEach((capability) => {
    const candidate = serviceMap.get(routing?.[capability.id]);
    if (
      candidate &&
      candidate.enabled &&
      normalizeCapabilities(candidate.capabilities).includes(capability.id)
    ) {
      routes[capability.id] = candidate;
    } else {
      routes[capability.id] = null;
    }
  });

  return routes;
}
