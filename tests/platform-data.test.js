import assert from "node:assert/strict";

import {
  APP_STORAGE_KEY,
  buildDefaultApiServices,
  buildInitialPlatformState,
} from "../app/lib/platform-model.js";

function run(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

run("buildInitialPlatformState starts with no sample business data", () => {
  const state = buildInitialPlatformState();

  assert.equal(state.materials.length, 0, "materials should start empty");
  assert.equal(state.cards.length, 0, "cards should start empty");
  assert.equal(state.logs.length, 0, "logs should start empty");
  assert.equal(state.currentMaterialId, "", "no active material should be preselected");
  assert.equal(state.currentCueId, "", "no active cue should be preselected");
});

run("buildInitialPlatformState keeps only real defaults needed for future work", () => {
  const state = buildInitialPlatformState();
  const normalizedServices = state.settings.apiServices.map(({ lastCheckedAt, ...rest }) => rest);
  const expectedServices = buildDefaultApiServices().map(({ lastCheckedAt, ...rest }) => rest);

  assert.equal(state.status, "等待导入素材", "status should reflect an empty workspace");
  assert.deepEqual(normalizedServices, expectedServices, "only the real built-in analysis service should exist by default");
  assert.equal(APP_STORAGE_KEY, "echoflow-pro-workspace", "storage key should be product-specific");
});
