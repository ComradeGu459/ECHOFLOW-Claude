import assert from "node:assert/strict";

import {
  LEGACY_APP_STORAGE_KEY,
  buildInitialPlatformState,
} from "../app/lib/platform-model.js";
import {
  migrateLegacyWorkspaceSnapshot,
} from "../app/lib/platform-storage.js";

function run(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

run("migrateLegacyWorkspaceSnapshot ignores the old seeded sample snapshot", () => {
  const seededLegacySnapshot = {
    ...buildInitialPlatformState(),
    materials: [
      {
        id: "material_sample",
        title: "Shadowing Starter",
        cues: [],
      },
    ],
    cards: [
      {
        id: "card_sample",
        title: "starter",
      },
    ],
    logs: [
      {
        id: "log_sample",
        type: "导入素材",
      },
    ],
  };

  const migrated = migrateLegacyWorkspaceSnapshot(
    LEGACY_APP_STORAGE_KEY,
    JSON.stringify(seededLegacySnapshot),
  );

  assert.equal(migrated, null, "seeded sample data should not be migrated");
});

run("migrateLegacyWorkspaceSnapshot keeps truthful user data", () => {
  const truthfulLegacySnapshot = {
    ...buildInitialPlatformState(),
    importDraft: {
      title: "",
      youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      sourceType: "视频 + 字幕",
      learningGoal: "跟读",
      topic: "daily life",
      difficulty: "四级",
      tags: "",
      rawSubtitles: "",
    },
    materials: [
      {
        id: "material_real",
        title: "Daily English Clip",
        youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        videoId: "dQw4w9WgXcQ",
        cues: [],
        status: "未开始",
      },
    ],
    cards: [],
    logs: [],
    currentMaterialId: "material_real",
    currentCueId: "",
  };

  const migrated = migrateLegacyWorkspaceSnapshot(
    LEGACY_APP_STORAGE_KEY,
    JSON.stringify(truthfulLegacySnapshot),
  );

  assert.ok(migrated, "truthful user data should be migrated");
  assert.equal(migrated.materials.length, 1);
  assert.equal(migrated.materials[0].id, "material_real");
  assert.equal(migrated.currentMaterialId, "material_real");
});
