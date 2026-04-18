import {
  APP_STORAGE_KEY,
  LEGACY_APP_STORAGE_KEY,
  UI_STORAGE_KEY,
  buildDefaultUiState,
  buildInitialPlatformState,
  buildPersistedSnapshot,
  buildDefaultAiRouting,
  buildDefaultApiServices,
} from "./platform-model.js";
import { normalizeCapabilities } from "./ai-registry.js";

const DATABASE_NAME = APP_STORAGE_KEY;
const DATABASE_VERSION = 1;
const WORKSPACE_STORE = "workspace";
const WORKSPACE_RECORD_ID = "workspace";

function hasBrowserStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function hasIndexedDb() {
  return typeof indexedDB !== "undefined";
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function mergeStoredState(stored) {
  const base = buildInitialPlatformState();

  return {
    ...base,
    ...(stored || {}),
    ui: {
      ...base.ui,
      ...(stored?.ui || {}),
      player: {
        ...base.ui.player,
        ...(stored?.ui?.player || {}),
      },
    },
    importDraft: { ...base.importDraft, ...(stored?.importDraft || {}) },
    practice: { ...base.practice, ...(stored?.practice || {}) },
    analytics: { ...base.analytics, ...(stored?.analytics || {}) },
    settings: {
      ...base.settings,
      ...(stored?.settings || {}),
      apiServices: stored?.settings?.apiServices?.length
        ? stored.settings.apiServices.map((service) => ({
            ...service,
            protocol: service.protocol || service.providerType || "openai-compatible",
            vendor: service.vendor || service.providerType || "custom",
            endpointOverrides: service.endpointOverrides || {},
            capabilities: normalizeCapabilities(service.capabilities),
          }))
        : buildDefaultApiServices(),
      aiRouting: { ...buildDefaultAiRouting(), ...(stored?.settings?.aiRouting || {}) },
      preferences: { ...base.settings.preferences, ...(stored?.settings?.preferences || {}) },
      storage: { ...base.settings.storage, ...(stored?.settings?.storage || {}) },
    },
    materials: Array.isArray(stored?.materials) ? stored.materials : base.materials,
    cards: Array.isArray(stored?.cards) ? stored.cards : base.cards,
    logs: Array.isArray(stored?.logs) ? stored.logs : base.logs,
  };
}

function readRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function openDatabase() {
  if (!hasIndexedDb()) return Promise.resolve(null);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(WORKSPACE_STORE)) {
        database.createObjectStore(WORKSPACE_STORE, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readWorkspaceRecord() {
  const database = await openDatabase();
  if (!database) return null;

  try {
    const transaction = database.transaction(WORKSPACE_STORE, "readonly");
    const store = transaction.objectStore(WORKSPACE_STORE);
    return await readRequest(store.get(WORKSPACE_RECORD_ID));
  } finally {
    database.close();
  }
}

async function writeWorkspaceRecord(snapshot) {
  const database = await openDatabase();
  if (!database) return;

  await new Promise((resolve, reject) => {
    const transaction = database.transaction(WORKSPACE_STORE, "readwrite");
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    const store = transaction.objectStore(WORKSPACE_STORE);
    store.put({
      id: WORKSPACE_RECORD_ID,
      snapshot,
      savedAt: new Date().toISOString(),
    });
  });

  database.close();
}

export function isSeededSampleSnapshot(snapshot) {
  const materials = Array.isArray(snapshot?.materials) ? snapshot.materials : [];
  const cards = Array.isArray(snapshot?.cards) ? snapshot.cards : [];
  const logs = Array.isArray(snapshot?.logs) ? snapshot.logs : [];

  const hasSampleMaterial = materials.some(
    (material) =>
      material?.id === "material_sample" ||
      material?.title === "Shadowing Starter" ||
      material?.sourceTitle === "YouTube 示例素材",
  );
  const hasSampleCards = cards.some((card) => String(card?.id || "").includes("card_") || card?.id === "card_sample");
  const hasSampleLogs = logs.some((log) => log?.id === "log_sample");

  return hasSampleMaterial || (hasSampleCards && hasSampleMaterial) || hasSampleLogs;
}

export function migrateLegacyWorkspaceSnapshot(storageKey, rawValue) {
  if (storageKey !== LEGACY_APP_STORAGE_KEY || !rawValue) return null;

  try {
    const parsed = JSON.parse(rawValue);
    if (!isObject(parsed) || isSeededSampleSnapshot(parsed)) return null;

    const merged = mergeStoredState(parsed);
    return buildPersistedSnapshot(merged);
  } catch {
    return null;
  }
}

export async function loadPlatformWorkspace() {
  const record = await readWorkspaceRecord();
  if (isObject(record?.snapshot)) {
    return mergeStoredState(record.snapshot);
  }

  if (!hasBrowserStorage()) return null;

  const legacyRawValue = window.localStorage.getItem(LEGACY_APP_STORAGE_KEY);
  const migrated = migrateLegacyWorkspaceSnapshot(LEGACY_APP_STORAGE_KEY, legacyRawValue);

  if (migrated) {
    await writeWorkspaceRecord(migrated);
    window.localStorage.removeItem(LEGACY_APP_STORAGE_KEY);
    return mergeStoredState(migrated);
  }

  return null;
}

export async function persistPlatformWorkspace(state) {
  await writeWorkspaceRecord(buildPersistedSnapshot(state));
}

export function loadUiPreferences() {
  if (!hasBrowserStorage()) return buildDefaultUiState();

  try {
    const rawValue = window.localStorage.getItem(UI_STORAGE_KEY);
    if (!rawValue) return buildDefaultUiState();
    const parsed = JSON.parse(rawValue);
    return {
      ...buildDefaultUiState(),
      ...parsed,
      player: {
        ...buildDefaultUiState().player,
        ...(parsed?.player || {}),
      },
    };
  } catch {
    return buildDefaultUiState();
  }
}

export function persistUiPreferences(uiState) {
  if (!hasBrowserStorage()) return;
  window.localStorage.setItem(
    UI_STORAGE_KEY,
    JSON.stringify({
      ...buildDefaultUiState(),
      ...uiState,
      player: {
        ...buildDefaultUiState().player,
        ...(uiState?.player || {}),
      },
    }),
  );
}
