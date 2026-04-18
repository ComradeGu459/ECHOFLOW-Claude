"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const SAMPLE_URL = "https://www.youtube.com/watch?v=ysz5S6PUM-U";
const SAMPLE_SUBTITLES = `1
00:00:02,000 --> 00:00:06,000
I think speaking clearly takes repeated listening.
我觉得想把英语说清楚，先要反复听。

2
00:00:07,000 --> 00:00:11,500
When you shadow one sentence enough times, the rhythm stays with you.
当你把一句话跟读足够多次，节奏就会留在你身上。

3
00:00:12,000 --> 00:00:16,500
Click any word and turn it into a card you can review later.
点击任意单词，把它变成之后可以复习的卡片。

4
00:00:17,000 --> 00:00:22,000
Then use dictation and recording to test what you really remember.
然后用听写和录音检查你到底记住了什么。`;

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "to", "of", "in", "on", "for", "with", "it",
  "is", "are", "be", "am", "was", "were", "that", "this", "you", "your", "i",
  "we", "they", "he", "she", "them", "our", "my", "me", "his", "her", "their",
  "at", "by", "from", "as", "if", "but", "so", "not", "do", "does", "did",
  "have", "has", "had", "then", "than", "what", "when", "where", "how", "into",
  "can", "could", "will", "would", "should", "really"
]);

function parseYouTubeId(url) {
  if (!url) return "";
  const trimmed = url.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  try {
    const parsed = new URL(trimmed);
    if (parsed.hostname.includes("youtu.be")) {
      return parsed.pathname.slice(1, 12);
    }
    if (parsed.searchParams.get("v")) {
      return parsed.searchParams.get("v").slice(0, 11);
    }
    const parts = parsed.pathname.split("/");
    const embedIndex = parts.findIndex((part) => part === "embed" || part === "shorts");
    if (embedIndex >= 0 && parts[embedIndex + 1]) {
      return parts[embedIndex + 1].slice(0, 11);
    }
  } catch {
    return "";
  }
  return "";
}

function parseTimeToken(token) {
  const clean = token.trim().replace(",", ".");
  const parts = clean.split(":").map(Number);
  if (parts.some(Number.isNaN)) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return Number(clean) || 0;
}

function formatTime(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  const hh = String(Math.floor(total / 3600)).padStart(2, "0");
  const mm = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const ss = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function parseSubtitles(raw) {
  const input = raw.trim();
  if (!input) return [];

  if (input.includes("-->")) {
    return input
      .split(/\n\s*\n/)
      .map((block, index) => {
        const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
        const timing = lines.find((line) => line.includes("-->"));
        if (!timing) return null;
        const [startToken, endToken] = timing.split("-->").map((item) => item.trim());
        const textLines = lines.filter((line) => line !== timing && !/^\d+$/.test(line));
        const english = textLines.find((line) => /[a-zA-Z]/.test(line)) || textLines[0] || "";
        const chinese = textLines.find((line) => /[\u4e00-\u9fff]/.test(line)) || "";
        return {
          id: `${index + 1}`,
          start: parseTimeToken(startToken),
          end: parseTimeToken(endToken),
          english,
          chinese
        };
      })
      .filter(Boolean);
  }

  return input
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [english, chinese = ""] = line.split("||").map((item) => item.trim());
      return {
        id: `${index + 1}`,
        start: index * 5,
        end: index * 5 + 4,
        english,
        chinese
      };
    });
}

function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9'\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text) {
  return normalizeText(text).split(" ").filter(Boolean);
}

function buildCards(cues) {
  const counts = new Map();
  cues.forEach((cue) => {
    tokenize(cue.english).forEach((word) => {
      if (word.length < 3 || STOP_WORDS.has(word)) return;
      counts.set(word, (counts.get(word) || 0) + 1);
    });
  });

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 16)
    .map(([word, count], index) => {
      const sample = cues.find((cue) => normalizeText(cue.english).includes(word));
      return {
        id: `${word}-${index}`,
        front: word,
        back: sample?.english || "",
        note: sample?.chinese || "复习这个词的发音、搭配和使用场景。",
        count
      };
    });
}

function scoreDictation(input, expected) {
  const userWords = tokenize(input);
  const expectedWords = tokenize(expected);
  if (!expectedWords.length) return { score: 0, missing: [], extra: [] };
  const missing = expectedWords.filter((word) => !userWords.includes(word));
  const extra = userWords.filter((word) => !expectedWords.includes(word));
  const matched = expectedWords.length - missing.length;
  return {
    score: Math.round((matched / expectedWords.length) * 100),
    missing,
    extra
  };
}

export default function WorkspaceApp() {
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
  const [apiConfig, setApiConfig] = useState({
    provider: "deepseek",
    endpoint: "",
    apiKey: "",
    model: "",
    prompt: "Explain the current subtitle, give a simpler rewrite and one speaking tip."
  });
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
      if (parsed.cards?.length) setCards(parsed.cards);
      if (parsed.apiConfig) setApiConfig(parsed.apiConfig);
    } catch {
      return;
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      "speakflow-workspace",
      JSON.stringify({ youtubeInput, videoId, rawSubtitles, cues, activeCueId, cards, apiConfig })
    );
  }, [youtubeInput, videoId, rawSubtitles, cues, activeCueId, cards, apiConfig]);

  const activeCue = useMemo(
    () => cues.find((cue) => cue.id === activeCueId) || cues[0] || null,
    [cues, activeCueId]
  );

  const dictation = useMemo(
    () => scoreDictation(dictationInput, activeCue?.english || ""),
    [dictationInput, activeCue]
  );

  const wordInsight = useMemo(() => {
    if (!selectedWord) return null;
    const normalized = selectedWord.toLowerCase();
    const matches = cues.filter((cue) => normalizeText(cue.english).includes(normalized));
    return {
      word: normalized,
      count: matches.length,
      examples: matches.slice(0, 3)
    };
  }, [selectedWord, cues]);

  const iframeSrc = useMemo(() => {
    if (!videoId) return "";
    const start = Math.max(0, Math.floor(activeCue?.start || 0));
    return `https://www.youtube.com/embed/${videoId}?start=${start}&autoplay=0&rel=0`;
  }, [videoId, activeCue]);

  function importVideo() {
    const id = parseYouTubeId(youtubeInput);
    if (!id) {
      setStatus("YouTube 链接无效，或不是标准视频地址。");
      return;
    }
    setVideoId(id);
    setStatus("视频已载入。点击字幕可从对应时间重新打开。");
  }

  function loadSubtitles() {
    const parsed = parseSubtitles(rawSubtitles);
    if (!parsed.length) {
      setStatus("字幕解析失败，请粘贴 SRT/VTT，或每行使用 english || 中文。");
      return;
    }
    setCues(parsed);
    setActiveCueId(parsed[0].id);
    setCards(buildCards(parsed));
    setDictationInput("");
    setSelectedWord("");
    setStatus(`已加载 ${parsed.length} 条字幕。`);
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
          { id: `${Date.now()}`, cue: activeCue?.english || "未选句子", url, createdAt: new Date().toLocaleTimeString() },
          ...prev
        ]);
        setRecordingState("idle");
        setStatus("录音已保存，可立即回放。");
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
      setStatus("请先填写 API endpoint 和 key。");
      return;
    }
    setApiLoading(true);
    setApiResult("");
    try {
      let response;
      if (apiConfig.provider === "gemini") {
        response = await fetch(`${apiConfig.endpoint}${apiConfig.endpoint.includes("?") ? "&" : "?"}key=${apiConfig.apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${apiConfig.prompt}\n\nSubtitle:\n${activeCue.english}\n${activeCue.chinese || ""}` }] }]
          })
        });
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
              { role: "user", content: `${apiConfig.prompt}\n\nSubtitle:\n${activeCue.english}\n${activeCue.chinese || ""}` }
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
      setStatus("API 请求已完成。");
    } catch (error) {
      setApiResult(String(error));
      setStatus("API 请求失败，请检查 endpoint、key 或浏览器跨域限制。");
    } finally {
      setApiLoading(false);
    }
  }

  const currentCard = cards[cardIndex] || null;

  return (
    <div className="workspace-page">
      <aside className="panel sidebar">
        <div className="panel-headline">
          <h1>SpeakFlow</h1>
          <p>直接练，不看介绍。</p>
        </div>

        <section className="stack">
          <label className="field">
            <span>YouTube 链接</span>
            <input value={youtubeInput} onChange={(e) => setYoutubeInput(e.target.value)} placeholder="粘贴链接或 11 位视频 ID" />
          </label>
          <button className="primary-btn" onClick={importVideo}>导入视频</button>
        </section>

        <section className="stack">
          <label className="field">
            <span>字幕</span>
            <textarea value={rawSubtitles} onChange={(e) => setRawSubtitles(e.target.value)} rows={14} />
          </label>
          <button className="secondary-btn" onClick={loadSubtitles}>解析字幕</button>
          <p className="hint">支持 SRT / VTT，或每行 `english || 中文`</p>
        </section>

        <section className="stack compact">
          <div className="status-chip">{status}</div>
          <div className="mini-grid">
            <div><strong>{cues.length}</strong><span>字幕</span></div>
            <div><strong>{cards.length}</strong><span>卡片</span></div>
            <div><strong>{recordings.length}</strong><span>录音</span></div>
          </div>
        </section>
      </aside>

      <main className="panel main-panel">
        <section className="video-shell">
          <div className="video-stage">
            {iframeSrc ? <iframe key={iframeSrc} src={iframeSrc} title="YouTube player" allow="autoplay; encrypted-media" allowFullScreen /> : <div className="empty-state">先导入视频</div>}
          </div>
          <div className="video-tools">
            <button className="secondary-btn" onClick={speakCurrent}>朗读当前句</button>
            <button className={recordingState === "recording" ? "danger-btn" : "primary-btn"} onClick={toggleRecording}>
              {recordingState === "recording" ? "结束录音" : "开始跟读录音"}
            </button>
          </div>
        </section>

        <section className="panel inner-panel subtitles-panel">
          <div className="panel-title-row">
            <h2>字幕与点读</h2>
            <span>{activeCue ? formatTime(activeCue.start) : "--:--:--"}</span>
          </div>
          <div className="subtitle-list">
            {cues.map((cue) => (
              <button key={cue.id} className={`subtitle-item${cue.id === activeCueId ? " active" : ""}`} onClick={() => setActiveCueId(cue.id)}>
                <div className="subtitle-time">{formatTime(cue.start)}</div>
                <div className="subtitle-english">
                  {cue.english.split(" ").map((word, index) => (
                    <span
                      key={`${cue.id}-${word}-${index}`}
                      className={`word-token${selectedWord.toLowerCase() === word.toLowerCase().replace(/[^a-z']/gi, "") ? " selected" : ""}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedWord(word.toLowerCase().replace(/[^a-z']/gi, ""));
                      }}
                    >
                      {word}{" "}
                    </span>
                  ))}
                </div>
                {cue.chinese ? <div className="subtitle-chinese">{cue.chinese}</div> : null}
              </button>
            ))}
          </div>
        </section>
      </main>

      <aside className="panel rightbar">
        <section className="panel inner-panel">
          <div className="panel-title-row"><h2>当前句</h2><span>{activeCue?.english ? "可练习" : "未选择"}</span></div>
          <div className="focus-card">
            <p className="focus-english">{activeCue?.english || "请选择一句字幕"}</p>
            <p className="focus-chinese">{activeCue?.chinese || "如果字幕里有中文，这里会显示。"}</p>
          </div>
        </section>

        <section className="panel inner-panel">
          <div className="panel-title-row"><h2>单词卡</h2><span>{wordInsight ? `${wordInsight.count} 次` : "点词查看"}</span></div>
          {wordInsight ? (
            <div className="word-card">
              <strong>{wordInsight.word}</strong>
              <p>在当前字幕中出现 {wordInsight.count} 次。</p>
              {wordInsight.examples.map((example) => (
                <div className="example-row" key={`${wordInsight.word}-${example.id}`}>
                  <span>{formatTime(example.start)}</span>
                  <p>{example.english}</p>
                </div>
              ))}
            </div>
          ) : <div className="empty-block">点击字幕里的英文单词，直接生成查看卡。</div>}
        </section>

        <section className="panel inner-panel">
          <div className="panel-title-row"><h2>听写</h2><span>{dictation.score}%</span></div>
          <textarea
            className="dictation-box"
            value={dictationInput}
            onChange={(e) => setDictationInput(e.target.value)}
            placeholder="边听边输入当前句，系统会实时比对。"
            rows={4}
          />
          <div className="feedback-grid">
            <div><strong>缺失</strong><p>{dictation.missing.join(", ") || "无"}</p></div>
            <div><strong>多写</strong><p>{dictation.extra.join(", ") || "无"}</p></div>
          </div>
        </section>

        <section className="panel inner-panel">
          <div className="panel-title-row"><h2>跟读录音</h2><span>{recordings.length} 条</span></div>
          <div className="recording-list">
            {recordings.length ? recordings.map((item) => (
              <div className="recording-item" key={item.id}>
                <div>
                  <strong>{item.createdAt}</strong>
                  <p>{item.cue}</p>
                </div>
                <audio controls src={item.url} />
              </div>
            )) : <div className="empty-block">开始录音后，回放会出现在这里。</div>}
          </div>
        </section>

        <section className="panel inner-panel">
          <div className="panel-title-row"><h2>闪卡复习</h2><span>{currentCard ? `${cardIndex + 1}/${cards.length}` : "空"}</span></div>
          {currentCard ? (
            <div className={`flashcard${cardFlipped ? " flipped" : ""}`} onClick={() => setCardFlipped((prev) => !prev)}>
              <strong>{cardFlipped ? currentCard.back : currentCard.front}</strong>
              <p>{cardFlipped ? currentCard.note : `出现 ${currentCard.count} 次，点击翻面`}</p>
            </div>
          ) : <div className="empty-block">解析字幕后会自动生成高频词卡。</div>}
          <div className="flash-actions">
            <button className="secondary-btn" onClick={() => { setCardFlipped(false); setCardIndex((prev) => (prev - 1 + cards.length) % cards.length); }}>上一张</button>
            <button className="secondary-btn" onClick={() => { setCardFlipped(false); setCardIndex((prev) => (prev + 1) % cards.length); }}>下一张</button>
            <button className="ghost-btn" onClick={() => setCards(buildCards(cues))}>重新生成</button>
          </div>
        </section>

        <section className="panel inner-panel">
          <div className="panel-title-row"><h2>API 控制台</h2><span>可直接请求</span></div>
          <div className="api-form">
            <select value={apiConfig.provider} onChange={(e) => setApiConfig((prev) => ({ ...prev, provider: e.target.value }))}>
              <option value="deepseek">DeepSeek / 豆包 / 千问兼容</option>
              <option value="gemini">Gemini</option>
            </select>
            <input placeholder="Endpoint" value={apiConfig.endpoint} onChange={(e) => setApiConfig((prev) => ({ ...prev, endpoint: e.target.value }))} />
            <input placeholder="API Key" value={apiConfig.apiKey} onChange={(e) => setApiConfig((prev) => ({ ...prev, apiKey: e.target.value }))} />
            <input placeholder="Model" value={apiConfig.model} onChange={(e) => setApiConfig((prev) => ({ ...prev, model: e.target.value }))} />
            <textarea rows={3} value={apiConfig.prompt} onChange={(e) => setApiConfig((prev) => ({ ...prev, prompt: e.target.value }))} />
            <button className="primary-btn" onClick={runApi} disabled={apiLoading}>{apiLoading ? "请求中..." : "用当前句发请求"}</button>
            <pre className="api-result">{apiResult || "填写接口后，直接用当前字幕发起请求，结果会显示在这里。"}</pre>
          </div>
        </section>
      </aside>
    </div>
  );
}
