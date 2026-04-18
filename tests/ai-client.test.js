import assert from "node:assert/strict";

import {
  buildLocalCapabilityResult,
  buildCapabilityPrompt,
  buildMediaCapabilityRequest,
  buildRemoteRequest,
  extractRemoteText,
} from "../app/lib/ai-client.js";

function run(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

run("buildCapabilityPrompt creates study analysis and transcript prompts", () => {
  const analysisPrompt = buildCapabilityPrompt("study_analysis", {
    scope: "current",
    english: "How are you?",
    chinese: "你好吗？",
  });
  assert.match(analysisPrompt, /How are you\?/);

  const transcriptPrompt = buildCapabilityPrompt("transcript_processing", {
    rawText: "hello||你好",
  });
  assert.match(transcriptPrompt, /hello\|\|你好/);
});

run("buildRemoteRequest supports openai-compatible payloads", () => {
  const request = buildRemoteRequest(
    {
      protocol: "openai-compatible",
      baseUrl: "https://example.com/chat/completions",
      model: "gpt-5",
      apiKey: "secret",
    },
    "Prompt body",
  );

  assert.equal(request.url, "https://example.com/chat/completions");
  assert.equal(request.headers.Authorization, "Bearer secret");
  assert.equal(request.body.model, "gpt-5");
});

run("buildRemoteRequest supports gemini payloads", () => {
  const request = buildRemoteRequest(
    {
      protocol: "gemini",
      baseUrl: "https://example.com/generateContent?key=secret",
      model: "gemini-2.5-pro",
      apiKey: "secret",
    },
    "Prompt body",
  );

  assert.equal(request.url, "https://example.com/generateContent?key=secret");
  assert.equal(request.headers.Authorization, undefined);
  assert.equal(request.body.contents[0].parts[0].text, "Prompt body");
});

run("extractRemoteText supports openai-compatible and gemini shapes", () => {
  assert.equal(
    extractRemoteText({
      choices: [{ message: { content: "openai text" } }],
    }),
    "openai text",
  );
  assert.equal(
    extractRemoteText({
      candidates: [{ content: { parts: [{ text: "gemini text" }] } }],
    }),
    "gemini text",
  );
  assert.equal(
    extractRemoteText({
      text: "speech text",
    }),
    "speech text",
  );
});

run("buildLocalCapabilityResult cleans subtitles and produces behavior advice", () => {
  const cleaned = buildLocalCapabilityResult("transcript_processing", {
    rawText: `1
00:00:00,000 --> 00:00:02,000
Hello there.
你好。`,
  });
  assert.match(cleaned, /Hello there\.\s*\|\|\s*你好。/);

  const advice = buildLocalCapabilityResult("behavior_analysis", {
    analytics: {
      totalStudyMinutes: 24,
      continuousStudyDays: 2,
      shadowingCount: 1,
      dueReviewCount: 3,
    },
  });
  assert.match(advice, /待复习/);
});

run("buildMediaCapabilityRequest supports speech_in, speech_out and vision", () => {
  const speechIn = buildMediaCapabilityRequest(
    {
      protocol: "openai-compatible",
      baseUrl: "https://example.com/audio/transcriptions",
      endpointOverrides: { speech_in: "https://example.com/audio/transcriptions" },
      model: "whisper-1",
      apiKey: "secret",
    },
    "speech_in",
    {
      fileName: "sample.webm",
      mimeType: "audio/webm",
      blob: new Blob(["audio"], { type: "audio/webm" }),
    },
  );
  assert.equal(speechIn.responseType, "json");
  assert.ok(speechIn.body instanceof FormData);

  const speechOut = buildMediaCapabilityRequest(
    {
      protocol: "openai-compatible",
      baseUrl: "https://example.com/audio/speech",
      endpointOverrides: { speech_out: "https://example.com/audio/speech" },
      model: "gpt-4o-mini-tts",
      apiKey: "secret",
    },
    "speech_out",
    { text: "Hello there." },
  );
  assert.equal(speechOut.responseType, "audio");
  assert.equal(speechOut.body.input, "Hello there.");

  const vision = buildMediaCapabilityRequest(
    {
      protocol: "openai-compatible",
      baseUrl: "https://example.com/chat/completions",
      model: "gpt-4o-mini",
      apiKey: "secret",
    },
    "vision",
    {
      prompt: "Describe the image",
      imageDataUrl: "data:image/png;base64,abc",
    },
  );
  assert.equal(vision.responseType, "json");
  assert.equal(vision.body.messages[0].content[1].image_url.url, "data:image/png;base64,abc");
});
