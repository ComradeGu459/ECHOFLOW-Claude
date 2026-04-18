# Module 0 Storage Refactor Design

## Goal

Replace the current sample-seeded `localStorage` persistence with a truthful local data foundation for EchoFlow Pro:

- business data in IndexedDB
- UI preferences in `localStorage`
- no sample materials, cards, logs, or fake progress on first load

## Scope

This module does not redesign the full UI. It focuses on the storage boundary, initial state, migration, and honest empty states needed by later modules.

## Problems In The Current Build

- `app/lib/platform-data.js` seeds the app with sample material, sample subtitles, and generated cards.
- `app/platform-store.js` persists the entire workspace into `localStorage`.
- several pages fall back to fake values when there is no real material.

## Design

### Data Split

- IndexedDB stores business state:
  - materials
  - flashcards
  - activity logs
  - workspace meta
  - settings
- `localStorage` stores UI-only preferences:
  - sidebar collapsed state
  - interface language
  - future player layout preferences

### Repository Boundary

Add a small repository layer that:

- opens the IndexedDB database
- reads the full persisted business snapshot
- replaces the full snapshot in one write transaction
- supports legacy migration from the old `localStorage` snapshot

The store keeps the current React-facing API stable so later UI modules can be rewritten incrementally.

### Initial State

The default workspace is empty:

- no materials
- no current cue
- no cards
- no logs
- no fake progress

Built-in local analysis remains available as a real capability, but it does not create data until the user imports material or performs an action.

### Migration

On startup:

1. read business data from IndexedDB
2. if empty, inspect legacy `localStorage`
3. migrate only truthful user data
4. skip the old sample-seeded default snapshot

### Empty-State Honesty

Any screen touched by this module must avoid fake fallback labels such as default difficulty, default learning goal, or fake counts when no material exists.

## Affected Files

- `app/lib/platform-data.js`
- `app/platform-store.js`
- `app/platform-shell.js`
- `app/screens/dashboard-screen.js`
- new storage helpers under `app/lib/`
- new tests under `tests/`

## Verification

- automated tests prove the initial state is empty
- automated tests prove legacy sample snapshots are rejected
- build succeeds after the refactor
