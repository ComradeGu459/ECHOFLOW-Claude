# Module 0 Storage Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace sample-seeded `localStorage` persistence with IndexedDB business storage and honest empty defaults for EchoFlow Pro.

**Architecture:** Keep the current React store entrypoint, but move business persistence behind an IndexedDB repository and isolate UI preferences in `localStorage`. Preserve existing route structure so later modules can rewrite screens incrementally without losing working behavior.

**Tech Stack:** Next.js App Router, React 19, browser IndexedDB, browser localStorage, Node test runner

---

### Task 1: Add Red Tests For Truthful Empty State

**Files:**
- Create: `D:\EchoFlow\tests\platform-data.test.mjs`
- Modify: `D:\EchoFlow\package.json`

- [ ] **Step 1: Write the failing test**

Assert that `buildInitialPlatformState()` returns empty materials, cards, and logs.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL because the current implementation seeds sample data.

- [ ] **Step 3: Add a test runner script**

Use Node's built-in test runner so no new dependency download is required.

- [ ] **Step 4: Run test to verify the failure is real**

Run: `npm test`
Expected: FAIL with seeded sample data assertions.

### Task 2: Add Red Tests For Legacy Migration Rules

**Files:**
- Create: `D:\EchoFlow\tests\platform-migration.test.mjs`
- Create: `D:\EchoFlow\app\lib\platform-storage.js`

- [ ] **Step 1: Write failing migration tests**

Cover:
- sample legacy snapshots are rejected
- non-sample legacy snapshots are normalized into the new business shape

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL because migration helpers do not exist yet.

### Task 3: Implement Empty Initial State And Repository Helpers

**Files:**
- Modify: `D:\EchoFlow\app\lib\platform-data.js`
- Create: `D:\EchoFlow\app\lib\platform-storage.js`

- [ ] **Step 1: Implement empty initial state**

Remove sample material creation and return an empty business state with a truthful status message.

- [ ] **Step 2: Implement local UI preference helpers**

Create helpers to read and write UI-only preferences via `localStorage`.

- [ ] **Step 3: Implement IndexedDB repository**

Create helpers to:
- open the DB
- read the workspace snapshot
- replace the workspace snapshot
- migrate legacy `localStorage`

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS for the new unit tests.

### Task 4: Rewire The React Store

**Files:**
- Modify: `D:\EchoFlow\app\platform-store.js`

- [ ] **Step 1: Write a failing store-focused test or integration assertion if feasible**

If direct store testing is too coupled to React, cover the logic through storage helper tests and then update the store minimally.

- [ ] **Step 2: Load business data from IndexedDB**

Startup order:
- load UI prefs from `localStorage`
- load business data from IndexedDB
- migrate legacy snapshot if needed

- [ ] **Step 3: Persist business data back to IndexedDB**

Do not write business data to `localStorage`.

- [ ] **Step 4: Persist UI prefs separately**

Only UI preferences should go to `localStorage`.

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: PASS.

### Task 5: Remove Fake UI Fallbacks And Rename The Product

**Files:**
- Modify: `D:\EchoFlow\app\layout.js`
- Modify: `D:\EchoFlow\app\platform-shell.js`
- Modify: `D:\EchoFlow\app\screens\dashboard-screen.js`

- [ ] **Step 1: Replace `SpeakFlow` with `EchoFlow Pro`**

- [ ] **Step 2: Remove fake fallback chips and labels**

When no material exists, show empty-state copy instead of fake difficulty or learning-goal tags.

- [ ] **Step 3: Run tests and build**

Run:
- `npm test`
- `npm run build`

Expected:
- tests pass
- build exits 0

