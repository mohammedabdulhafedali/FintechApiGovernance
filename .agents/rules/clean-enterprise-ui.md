# 🏛️ Clean Sovereign UI Rule (قاعدة الواجهات المؤسسية النظيفة ومنع الحشو)

> **Mandatory Rule for All UI Work in this Workspace:**  
> Strictly enforce the visual identity, layouts, and anti-clutter principles defined in `CLEAN_ENTERPRISE_UI_CONSTITUTION.md`.

## 1. Zero-Clutter / Anti-AI Policy
- NEVER add decorative placeholder widgets, unnecessary dashboard metrics, random stats cards, or unrequested charts.
- Maintain generous negative space (breathing room). If a view only has 3 items, render only those 3 items calmly. Do NOT try to fill the screen artificially.
- Avoid loud neon glows, rainbow borders, and cheesy animations. All micro-interactions must be understated and professional (`transition: all 0.2s ease`).

## 2. Color System
- Canvas background: Deep Sovereign Navy (`#1a2d45` to `#162238`).
- Header/Sidebar panels: `#243d5c`.
- Elevated Cards: `#2b4870` (hover: `#345882`).
- Inputs & Code boxes: `#1c3250`.
- Borders: Subtle translucent `rgba(255, 255, 255, 0.10)`.
- Status indicators:
  - Primary Active: Indigo `#6366f1` / `#4f46e5`
  - Success / 200 OK: Emerald `#10b981`
  - Error / 422: Soft Rose `#f43f5e`
  - Links / Code badges: Cyan `#38bdf8`

## 3. Typography & RTL
- Arabic Font: `Cairo` (Google Fonts), balanced weights (700 for headings, 600 for body/labels).
- Latin, Endpoints, Numbers & Code: `Outfit` or `Consolas / Monospace`.
- English endpoints and JSON snippets MUST always be encapsulated in LTR blocks (`direction: ltr; text-align: left;`).

## 4. Upgrades & Refactoring Gate
When importing or upgrading features from new repositories or frameworks (e.g. React 19 / TypeScript updates):
- Strip away any extra/unrequested components or clutter.
- Maintain this exact spatial layout, color tokens, and clean institutional structure.
