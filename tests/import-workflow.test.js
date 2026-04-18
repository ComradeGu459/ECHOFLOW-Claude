import assert from "node:assert/strict";

import {
  buildMaterialFromImport,
  buildSourceDescriptor,
  buildSubtitlePayload,
  findDuplicateMaterial,
} from "../app/lib/import-workflow.js";

function run(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

run("buildSourceDescriptor accepts a youtube link and creates a stable source key", () => {
  const source = buildSourceDescriptor({
    youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    videoFile: null,
  });

  assert.equal(source.kind, "youtube");
  assert.equal(source.videoId, "dQw4w9WgXcQ");
  assert.equal(source.sourceKey, "youtube:dQw4w9WgXcQ");
});

run("buildSourceDescriptor accepts a local video file fingerprint", () => {
  const source = buildSourceDescriptor({
    youtubeUrl: "",
    videoFile: {
      name: "lesson.mp4",
      size: 1024,
      lastModified: 1710000000000,
      type: "video/mp4",
    },
  });

  assert.equal(source.kind, "local-video");
  assert.equal(source.sourceKey, "file:lesson.mp4:1024:1710000000000");
  assert.equal(source.fileName, "lesson.mp4");
});

run("buildSubtitlePayload parses subtitle text into cues", () => {
  const subtitles = buildSubtitlePayload({
    subtitleText: `1
00:00:00,000 --> 00:00:02,000
Hello there.
你好。`,
    subtitleFileName: "hello.srt",
  });

  assert.equal(subtitles.cues.length, 1);
  assert.equal(subtitles.cues[0].english, "Hello there.");
  assert.equal(subtitles.subtitleFileName, "hello.srt");
});

run("findDuplicateMaterial matches by source key", () => {
  const existing = findDuplicateMaterial(
    [{ id: "material_1", sourceKey: "youtube:dQw4w9WgXcQ" }],
    "youtube:dQw4w9WgXcQ",
  );

  assert.equal(existing?.id, "material_1");
});

run("buildMaterialFromImport creates a real material record", () => {
  const material = buildMaterialFromImport({
    draft: {
      title: "Daily Clip",
      learningGoal: "跟读",
      topic: "daily life",
      difficulty: "四级",
      tags: "daily, speaking",
    },
    source: {
      kind: "youtube",
      sourceKey: "youtube:dQw4w9WgXcQ",
      youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      videoId: "dQw4w9WgXcQ",
    },
    subtitles: {
      rawSubtitles: `1
00:00:00,000 --> 00:00:02,000
Hello there.
你好。`,
      subtitleFileName: "hello.srt",
      cues: [
        {
          id: "1",
          start: 0,
          end: 2,
          english: "Hello there.",
          chinese: "你好。",
          difficultyTag: "基础",
          analysis: { summary: "", highlights: [], grammar: [], pronunciation: "" },
        },
      ],
    },
    mode: "链接导入",
    now: "2026-03-25T02:00:00.000Z",
    createId: () => "material_1",
  });

  assert.equal(material.id, "material_1");
  assert.equal(material.title, "Daily Clip");
  assert.equal(material.sourceKey, "youtube:dQw4w9WgXcQ");
  assert.equal(material.cues.length, 1);
  assert.equal(material.subtitleFileName, "hello.srt");
});
