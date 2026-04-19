# Project Hand-off: English Learning Studio (AI-Powered)

## Project Goal
A high-end, AI-driven English learning platform focused on "Input-to-Output" conversion. Users import video content (YouTube/Local), and the system provides AI-powered transcription, bilingual alignment, expression extraction, and a "Studio" for shadowing/echoing practice.

## Tech Stack
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS.
- **Animations:** Motion (framer-motion).
- **Icons:** Lucide-react.
- **Charts:** Recharts.
- **State Management:** Centralized state in `App.tsx` (React Hooks).

## Running Commands
- `npm run dev`: Start development server on port 3000.
- `npm run build`: Build for production.
- `npm run lint`: Run TypeScript type checking.

## Directory Structure
- `/src/App.tsx`: Central state hub and view routing.
- `/src/types.ts`: Data models and interfaces.
- `/src/data.ts`: Mock data and initial state.
- `/src/components/`:
    - `Library.tsx`: Video asset management.
    - `Studio.tsx`: Core training environment (Shadowing/Echoing).
    - `Flashcards.tsx`: Spaced repetition system (SRS) for expressions.
    - `Analytics.tsx`: Learning data visualization.
    - `ImportModal.tsx`: Content ingestion UI.

## Module Status & Mocking
| Module | Completion | Status | Notes |
| --- | --- | --- | --- |
| **Library** | 90% | UI/State Ready | Needs real video processing backend. |
| **Studio** | 80% | UI/State Ready | Needs real AI explanation API & Pronunciation API. |
| **Flashcards** | 85% | UI/State Ready | Needs real SRS algorithm (currently simple mastery map). |
| **Analytics** | 95% | UI/State Ready | Fully data-driven from `learningLogs`. |
| **Import** | 70% | UI Ready | Needs real YouTube/Local file parsing logic. |

## Key Linkages (Critical)
1. **Import -> Library:** Adding a video must update the `videos` state in `App.tsx`.
2. **Library -> Studio:** Selecting a video passes the `VideoMeta` to `StudioView`.
3. **Studio -> Flashcards:** Extracting an expression in Studio must call `onAddFlashcard` in `App.tsx`.
4. **Studio -> Library:** Progress in Studio must update `progress` in `VideoMeta`.
5. **Studio/Flashcards -> Analytics:** Actions must be logged to `learningLogs` for the dashboard to update.

## Design Principles (Do Not Break)
- **Editorial/Magazine Aesthetic:** Large typography, generous whitespace, refined borders (`border-slate-200/60`).
- **Soft Interactions:** Use `motion` for all view transitions and hover states.
- **Data Density:** Maintain the professional "Mission Control" feel in Analytics and Studio.
- **Consistent Palette:** Stick to `slate`, `brand` (indigo/violet), and semantic colors (`emerald`, `amber`, `ef4444`).
