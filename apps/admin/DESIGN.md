# Admin Portal Design — Steep-inspired light, editorial, data-first

The portal uses a **light** editorial system (Tailwind v3). Tokens live in
`tailwind.config.ts`; base in `src/app/globals.css`. Fonts: **Inter** (UI,
`font-sans`), **Newsreader** (serif headings ≥26px, `font-display`), **Geist
Mono** (`font-mono`, tabular/time readouts only).

## Tailwind tokens (use these — never raw dark hex)

Colors: `ink` #17191c (primary text), `ash` #4c4c4c (secondary text),
`graphite` #777b86 (muted/labels/icons), `dove` #a3a6af (input borders,
placeholders), `fog` #f7f7f8 (page canvas, hovers), `card` #ffffff (surfaces),
`hair` #ececee (subtle hairlines/table separators), `rust` #5d2a1a (warm chart
voice), `apricot` #fbe1d1 (warm data card bg), `sky` #d3e3fc (cool data card bg).
Status: `success`/`success-bg`, `warning`/`warning-bg`, `error`/`error-bg`,
`info`/`info-bg`. Chart blue voice: `#4a90e2`.

Radius: `rounded-card` (24px primary cards), `rounded-field` (16px inputs/selects),
`rounded-full` (buttons, badges, avatars). Shadows: `shadow-card` (elevated white
cards), `shadow-subtle`, `shadow-modal`. Borders are 1px only.

## Component patterns

- **Card:** `rounded-card bg-card p-6 shadow-card` (no border — shadow contains it).
- **Page title:** use `<PageHeader>` (already serif). Inline card titles:
  `text-[15px] font-medium text-ink`. Never use `font-mono` for headings.
- **Primary button:** `rounded-full bg-ink px-5 py-2 text-[15px] text-white hover:bg-ink/90`.
- **Secondary:** text link — `text-[15px] text-ink`. **Ghost:** `rounded-full border border-dove px-4 py-2 text-ink hover:bg-black/[0.03]`.
- **Destructive:** `rounded-full bg-error px-5 py-2 text-white` (modals only).
- **Input/select:** `rounded-field border border-dove bg-card px-4 py-2.5 text-[15px] text-ink placeholder:text-graphite focus:border-ink outline-none`.
- **Label:** `text-[14px] font-medium text-ink` (6px above field).
- **Table:** prefer `<DataTable>`. Hand-rolled: white `rounded-card shadow-card`
  wrapper, header `text-[13px] font-medium uppercase tracking-[0.04em] text-graphite`,
  rows `text-[14px] text-ink`, separators `border-hair`, hover `hover:bg-fog`.
- **Badge:** `<StatusBadge>` or `rounded-full px-2.5 py-0.5 text-xs font-medium` with a status bg/text pair.
- **Avatar:** `<Avatar>` (pastel tint + ink monogram).
- **Modal:** `<Modal>` (white, 24px, shadow-modal, 0.32 overlay).
- **Charts:** two voices only — blue `#4a90e2` (current/primary) and `rust`
  (previous/negative). Gridlines `rgba(23,25,28,0.08)` horizontal only; axis
  labels graphite; tooltip white `rounded-xl` shadow. Cool card bg `sky`, warm `apricot`.

## Dark → light replacement map (for converting existing classes)

| Old (dark) | New (light) |
|---|---|
| `bg-[#0A0A0A]` / `bg-bg-base` (surface) | `bg-card` or `bg-fog` |
| `bg-[#111111]` / `bg-bg-surface` (card) | `bg-card` + `rounded-card shadow-card` |
| `bg-[#1A1A1A]` (hover/elevated/chip) | `hover:bg-fog` / `bg-fog` |
| `border-[#2A2A2A]` / `border-border` | `border-hair` (or `border-dove` on inputs) |
| `border-[#1F1F1F]` | `border-hair` |
| `text-white` / `#FFFFFF` (text) | `text-ink` |
| `bg-white text-black` (button) | `bg-ink text-white` (rounded-full) |
| `text-[#A1A1A1]` | `text-ash` |
| `text-[#666666]` / `#555` | `text-graphite` |
| `text-[#444]` (faint) | `text-dove` |
| `text-[#22c55e]` / green | `text-success` |
| `text-[#ef4444]` / red | `text-error` |
| `text-[#eab308]` / yellow | `text-warning` |
| input `bg-[#0A0A0A] border-[#2A2A2A]` | `bg-card border border-dove rounded-field` |

Convert **styling only** — never change logic, props, data wiring, or behavior.
