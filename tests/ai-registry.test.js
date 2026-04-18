import assert from "node:assert/strict";

import {
  AI_CAPABILITIES,
  getServiceHealth,
  normalizeCapabilities,
  resolveAiRoutes,
} from "../app/lib/ai-registry.js";

function run(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

const SERVICES = [
  {
    id: "local",
    providerName: "本地分析",
    protocol: "local",
    enabled: true,
    capabilities: ["study_analysis", "transcript_processing"],
  },
  {
    id: "gpt",
    providerName: "GPT",
    protocol: "openai-compatible",
    enabled: true,
    baseUrl: "https://example.com",
    model: "gpt-5",
    apiKey: "secret",
    capabilities: ["study_analysis", "vision", "behavior_analysis"],
  },
  {
    id: "gemini",
    providerName: "Gemini",
    protocol: "gemini",
    enabled: false,
    baseUrl: "https://example.com",
    model: "gemini-2.5-pro",
    apiKey: "secret",
    capabilities: ["vision"],
  },
];

run("normalizeCapabilities keeps only known unique capability ids", () => {
  const normalized = normalizeCapabilities([
    "study_analysis",
    "study_analysis",
    "vision",
    "unknown",
  ]);

  assert.deepEqual(normalized, ["study_analysis", "vision"]);
  assert.ok(AI_CAPABILITIES.some((item) => item.id === "speech_in"));
});

run("getServiceHealth returns truthful readiness", () => {
  assert.equal(getServiceHealth(SERVICES[0]), "ready");
  assert.equal(
    getServiceHealth({
      id: "qwen",
      providerName: "千问",
      protocol: "openai-compatible",
      enabled: true,
      baseUrl: "",
      model: "",
      apiKey: "",
      capabilities: ["study_analysis"],
    }),
    "incomplete",
  );
  assert.equal(getServiceHealth(SERVICES[2]), "disabled");
});

run("resolveAiRoutes picks only enabled services that support the target capability", () => {
  const routes = resolveAiRoutes(SERVICES, {
    study_analysis: "gpt",
    transcript_processing: "local",
    vision: "gemini",
    behavior_analysis: "gpt",
    speech_in: "",
    speech_out: "",
  });

  assert.equal(routes.study_analysis?.id, "gpt");
  assert.equal(routes.transcript_processing?.id, "local");
  assert.equal(routes.vision, null);
  assert.equal(routes.behavior_analysis?.id, "gpt");
  assert.equal(routes.speech_in, null);
});
