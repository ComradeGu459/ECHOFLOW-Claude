import { getServiceProtocol } from "./ai-registry.js";
import { parseSubtitles } from "./platform-model.js";

function resolveCapabilityUrl(service, capabilityId) {
  return service.endpointOverrides?.[capabilityId] || service.baseUrl;
}

export function buildCapabilityPrompt(capabilityId, payload) {
  if (capabilityId === "study_analysis") {
    return `你是英语口语学习助手。请面向中文学习者分析下面内容，并输出：1. 简明解释 2. 口语表达要点 3. 一个改写建议。\n\n${
      payload.scope === "material"
        ? payload.text
        : `英文：${payload.english}\n中文：${payload.chinese || "无"}`
    }`;
  }

  if (capabilityId === "transcript_processing") {
    return `请清洗以下字幕文本，要求：1. 保留原有语言内容 2. 去掉多余空行和无意义噪声 3. 优先按 "english || 中文" 的逐行格式返回 4. 不要补造不存在的句子。\n\n${payload.rawText}`;
  }

  if (capabilityId === "behavior_analysis") {
    return `你是英语学习数据分析助手。请基于以下真实本地学习记录，给出 3 条简洁可执行的学习建议，禁止编造不存在的数据。\n\n${payload.summary}`;
  }

  return payload.prompt || "";
}

export function buildRemoteRequest(service, prompt) {
  const protocol = getServiceProtocol(service);

  if (protocol === "gemini") {
    const url = service.baseUrl.includes("key=")
      ? service.baseUrl
      : `${service.baseUrl}${service.baseUrl.includes("?") ? "&" : "?"}key=${service.apiKey}`;
    return {
      url,
      headers: {
        "Content-Type": "application/json",
      },
      body: {
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
      },
    };
  }

  return {
    url: service.baseUrl,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${service.apiKey}`,
    },
    body: {
      model: service.model || "default-model",
      messages: [
        { role: "system", content: "You are a helpful English learning assistant." },
        { role: "user", content: prompt },
      ],
    },
  };
}

export function buildMediaCapabilityRequest(service, capabilityId, payload) {
  const protocol = getServiceProtocol(service);
  const url = resolveCapabilityUrl(service, capabilityId);

  if (capabilityId === "speech_in" && protocol === "openai-compatible") {
    const body = new FormData();
    body.append("model", service.model || "whisper-1");
    body.append("file", payload.blob, payload.fileName || "audio.webm");
    return {
      url,
      headers: {
        Authorization: `Bearer ${service.apiKey}`,
      },
      body,
      responseType: "json",
    };
  }

  if (capabilityId === "speech_out" && protocol === "openai-compatible") {
    return {
      url,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${service.apiKey}`,
      },
      body: {
        model: service.model || "gpt-4o-mini-tts",
        input: payload.text,
      },
      responseType: "audio",
    };
  }

  if (capabilityId === "vision") {
    if (protocol === "gemini") {
      return {
        url: service.baseUrl.includes("key=")
          ? service.baseUrl
          : `${service.baseUrl}${service.baseUrl.includes("?") ? "&" : "?"}key=${service.apiKey}`,
        headers: {
          "Content-Type": "application/json",
        },
        body: {
          contents: [
            {
              parts: [
                { text: payload.prompt },
                {
                  inline_data: {
                    mime_type: payload.mimeType,
                    data: payload.base64,
                  },
                },
              ],
            },
          ],
        },
        responseType: "json",
      };
    }

    return {
      url,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${service.apiKey}`,
      },
      body: {
        model: service.model || "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: payload.prompt },
              {
                type: "image_url",
                image_url: { url: payload.imageDataUrl },
              },
            ],
          },
        ],
      },
      responseType: "json",
    };
  }

  return null;
}

export function extractRemoteText(data) {
  return (
    data?.text ||
    data?.choices?.[0]?.message?.content ||
    data?.candidates?.[0]?.content?.parts?.map((part) => part.text).join("\n") ||
    data?.output_text ||
    ""
  );
}

export function buildLocalCapabilityResult(capabilityId, payload) {
  if (capabilityId === "transcript_processing") {
    const cues = parseSubtitles(payload.rawText || "");
    return cues
      .map((cue) => `${cue.english}${cue.chinese ? ` || ${cue.chinese}` : ""}`)
      .join("\n");
  }

  if (capabilityId === "behavior_analysis") {
    const analytics = payload.analytics || {};
    const lines = [];

    if ((analytics.dueReviewCount || 0) > 0) {
      lines.push(`待复习还有 ${analytics.dueReviewCount} 项，优先清空复习队列。`);
    }
    if ((analytics.shadowingCount || 0) < 3) {
      lines.push("最近跟读次数偏少，可以增加跟读比例来强化语音输出。");
    }
    if ((analytics.continuousStudyDays || 0) < 3) {
      lines.push("连续学习天数还在建立中，建议保持每天都有短时学习记录。");
    } else {
      lines.push(`你已经连续学习 ${analytics.continuousStudyDays} 天，适合继续保持稳定节奏。`);
    }

    return lines.join("\n");
  }

  return payload.localText || "";
}
