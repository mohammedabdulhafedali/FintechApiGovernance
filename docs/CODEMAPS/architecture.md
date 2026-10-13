# Project Architecture & Token-Lean Cache Map
<!-- Generated: 2026-10-13T08:59:38.429Z | Token Estimate: ~450 -->

## Quick Overview
- **Project:** Enterprise FinTech API Governance
- **Stack:** React 19 + TypeScript + Vite (Frontend) | Node.js + Express (Backend)

## Key Entry Points
- **Frontend Entry:** `platform-1-documentation/frontend/src/App.tsx`
- **Backend Entry:** `platform-1-documentation/backend/src/infrastructure/server.ts`
- **Main Style System:** `platform-1-documentation/frontend/src/styles/theme.css`

## Component Hierarchy & Locations
| Component | Path | Description |
|-----------|------|-------------|
| **Header** | `frontend/src/components/layout/Header.tsx` | Top bar, search, environment badge |
| **Sidebar** | `frontend/src/components/layout/Sidebar.tsx` | Main nav links, collapse state |
| **DashboardView** | `frontend/src/components/catalog/DashboardView.tsx` | API metrics & governance overview |
| **EndpointsRibbon** | `frontend/src/components/catalog/EndpointsRibbon.tsx` | Endpoint category & status filters |
| **SpecViewer** | `frontend/src/components/catalog/SpecViewer.tsx` | OpenAPI documentation viewer |
| **ExportStudioView** | `frontend/src/components/export/ExportStudioView.tsx` | Exporting Postman/OpenAPI specs |
| **Schema Types** | `frontend/src/types/schema.ts` | Core data contracts & TypeScript models |

## Style Tokens & Slicing Rule
- `frontend/src/styles/theme.css` has ~3,300 lines. **Never read the entire file**.
- Lines 1-300: CSS Variables & Color tokens
- Lines 300-900: Dark mode & theme overrides
- Lines 900-2000: Component utilities & glassmorphism
- Lines 2000+: Responsive media queries
