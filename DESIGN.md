---
# Token values live in exactly one place: src/renderer/src/styles/globals.css
# (`:root` for light, `.dark` for dark) and are mapped into Tailwind v4 by `@theme`.
# Components consume the resulting utilities (`bg-surface-lowest`, `text-ink-primary`, …).
name: Sera Atelier Operations & Back-Office Design System
system: Sera Operations DS (Non-Webfront)
brand:
  name: sera
  environment: Atelier, Workshop, Back-Office, Inventory, Logistics, POS & Internal Tools
  tagline: Precisión arquitectónica, densidad de datos y utilidad operativa para artesanos y administradores
colors:
  light:
    canvas: '#fdfdfd'
    canvas-subtle: '#f7f5f2'
    canvas-stone: '#efece6'
    surface-lowest: '#ffffff'
    surface-low: '#f7f5f2'
    surface-container: '#efece6'
    surface-high: '#ded9d1'
    surface-highest: '#d5cfc5'
    ink-primary: '#161514'
    ink-secondary: '#5c5854'
    ink-tertiary: '#8e8a84'
    hairline: 'rgba(22, 21, 20, 0.10)'
    hairline-strong: 'rgba(22, 21, 20, 0.20)'
    action: '#9a2716'
    action-hover: '#801f10'
    action-active: '#6b190d'
    action-subtle: 'rgba(154, 39, 22, 0.08)'
  dark:
    canvas: '#111110'
    canvas-subtle: '#141412'
    canvas-stone: '#1a1917'
    surface-lowest: '#181816'
    surface-low: '#1f1e1c'
    surface-container: '#272523'
    surface-high: '#32302c'
    surface-highest: '#3e3b37'
    ink-primary: '#f4f2ee'
    ink-secondary: '#a8a39d'
    ink-tertiary: '#6e6a64'
    hairline: 'rgba(244, 242, 238, 0.08)'
    hairline-strong: 'rgba(244, 242, 238, 0.16)'
    action: '#b53420'
    action-hover: '#c83e28'
    action-active: '#9a2716'
    action-subtle: 'rgba(181, 52, 32, 0.18)'
typography:
  font-primary: '"Montserrat", -apple-system, BlinkMacSystemFont, sans-serif'
  font-body: '"Manrope", -apple-system, BlinkMacSystemFont, sans-serif'
  font-mono: '"JetBrains Mono", monospace'
geometry:
  radius-default: '0px'
  radius-subtle: '2px'
  hairline-border: '1px solid rgba(22, 21, 20, 0.10)'
  hairline-border-dark: '1px solid rgba(244, 242, 238, 0.08)'
---

# Sera Operations: Design System for Non-Webfront Applications

The **Sera Operations Design System** is the foundation for creating any application, internal tool, console, or screen that is **not part of the public storefront**.

Each application or tool (e.g. workshop floor tablets, barcode scanners, warehouse terminals, showroom POS, material lab tools, partner portals, or administrative dashboards) is free to define its own layout, navigation structure, and content flow. This system provides the shared **tokens, color palette (Light & Dark mode), typography rules, component primitives, and behavioral patterns** that maintain visual and tactile consistency across all operational software.

This document describes the system **as implemented in Mirage** (`src/renderer/src/styles/globals.css` and `src/renderer/src/components/`), and the rules in it are asserted by `src/renderer/src/tests/designSystemCompliance.test.ts`.

---

## 1. Core Principles: Operations vs. Webfront

| Dimension | Public Storefront (Webfront) | Operations & Tools (Non-Webfront) |
| :--- | :--- | :--- |
| **Primary Goal** | Brand desire, cultural curation, luxury storytelling | Task completion, data accuracy, rapid triage, utility |
| **Layout & Flow** | Pinned editorial monograph, 80vh visual media splits | Application-specific (kiosks, split panels, grids, modals) |
| **Typography** | Editorial Serif (`Source Serif 4`) + Monumental Titles | Sans-serif (`Montserrat` / `Manrope`) + Tabular Monospace |
| **Themes** | Light-ambient mineral daylight foundation | **Dual Light & Dark Mode from one token set** (`.dark` class + CSS custom properties) |
| **Pacing** | Contemplative, slow-scroll reading | Fast keyboard navigation, quick scanning, dense data entry |
| **Density** | Generous whitespace, relaxed margins | Compact, high information density, space efficiency |
| **Imagery** | Atmospheric moodshots, natural daylight styling | High-contrast thumbnails, 1:1 crops, 3D wireframes, inspection views |
| **Geometry** | Strictly `0px` unboxed monoliths | Architectural `0px` to `2px` border-framed structural containers |
| **Feedback** | Subtle ambient cues, silent background sync | Inline status banners, explicit progress states, confirm modals |

### The 4 Operational Tenets
1. **Zero Decorative Ambiguity:** Every visual element must convey information or facilitate action. Avoid purely decorative illustrations or animations.
2. **Tabular Numerals Everywhere:** Any numeric value (ARS currency, dimensions in cm, stock counts, batch IDs, order numbers, weights, polygon counts) must render in `JetBrains Mono` with `font-variant-numeric: tabular-nums`. This is enforced **once**, globally, in `globals.css` — see §2.7.
3. **Architectural Grid Enclosure:** Components are bounded by crisp `1px` hairlines rendered from the `hairline` / `hairline-strong` tokens (`border-hairline`, `border-hairline-strong`), never by shadows. Elevated drop-shadows are reserved strictly for floating overlays.
4. **State Transparency:** In an artisan atelier with made-to-order manufacturing, states are multi-stage. Every entity explicitly exposes its lifecycle stage using codified color chips in both light and dark themes.

---

## 2. Token Foundations: One Definition, Two Modes

Dark mode in the Sera Atelier is inspired by **volcanic basalt, smoked charcoal, cast iron, and dark patinated oak**. It rejects harsh `#000000` (which causes glare and severe eye fatigue in workshop lighting) and avoids generic cold blue-greys, preserving the organic, tactile warmth of the brand.

### 2.1 The token layer is the mechanism

**This is the single most important rule in this document.** Every structural colour is declared once as a CSS custom property, then mapped into Tailwind v4:

```css
/* src/renderer/src/styles/globals.css */
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));

@theme {
  --font-primary: "Montserrat", -apple-system, BlinkMacSystemFont, sans-serif;
  --font-body: "Manrope", -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: "JetBrains Mono", monospace;

  --color-canvas: var(--canvas);
  --color-surface-lowest: var(--surface-lowest);
  --color-ink-primary: var(--ink-primary);
  --color-hairline: var(--hairline);
  --color-action: var(--action);
  /* …one mapping per token, see the tables below… */

  --radius-xs: 2px;
}

:root {
  --canvas: #fdfdfd;
  --surface-lowest: #ffffff;
  --ink-primary: #161514;
  --hairline: rgba(22, 21, 20, 0.10);
  --action: #9a2716;
  /* …light values… */
}

.dark {
  --canvas: #111110;
  --surface-lowest: #181816;
  --ink-primary: #f4f2ee;
  --hairline: rgba(244, 242, 238, 0.08);
  --action: #b53420;
  /* …dark values… */
}
```

Because the utility resolves to `var(--surface-lowest)`, **`bg-surface-lowest` is already mode-aware**. Writing a dark value by hand is not "extra safety" — it is a second source of truth that drifts.

```tsx
// ✅ Correct: one class, correct in both modes.
<div className="bg-surface-lowest border border-hairline text-ink-primary">

// ❌ Forbidden: hardcoded dark hexes duplicated onto every class.
<div className="bg-white dark:bg-[#181816] border-black/10 dark:border-white/10 text-[#161514] dark:text-[#f4f2ee]">
```

`designSystemCompliance.test.ts` asserts **zero** occurrences of `dark:(bg|text|border)-[#…]` in `src/renderer/src/components/**/*.tsx`. The only legal `dark:` colour variants are the non-tokenised semantic state colours of §3.

The `.dark` class is applied to `<html>` by `useAppStore` (`themeMode: 'dark' | 'light' | 'system'`, persisted in `settings.json`); `src/renderer/index.html` ships with `class="dark"` so the first paint is already correct. Scrollbar colours are per-mode tokens too (`--scrollbar-track`, `--scrollbar-thumb`, `--scrollbar-thumb-hover`).

### 2.2 Surface & Layering Architecture

| Token | Light Mode Value | Dark Mode Value (Basalt/Charcoal) | Purpose |
| :--- | :--- | :--- | :--- |
| `canvas` | `#FDFDFD` | `#111110` | Base viewport / application canvas |
| `canvas-subtle` | `#F7F5F2` | `#141412` | Recessed strips, rail backgrounds |
| `canvas-stone` | `#EFECE6` | `#1A1917` | Thumbnail wells, inert media frames |
| `surface-lowest` | `#FFFFFF` | `#181816` | Main card, data table, and modal containers |
| `surface-low` | `#F7F5F2` | `#1F1E1C` | Table header, toolbar, and sub-header fills |
| `surface-container` | `#EFECE6` | `#272523` | Form inputs, divider chips, inactive pills |
| `surface-high` | `#DED9D1` | `#32302C` | Hover state on neutral table rows / list items |
| `surface-highest` | `#D5CFC5` | `#3E3B37` | Secondary button fills, prominent borders |

Utilities: `bg-canvas`, `bg-canvas-subtle`, `bg-canvas-stone`, `bg-surface-lowest`, `bg-surface-low`, `bg-surface-container`, `bg-surface-high`, `bg-surface-highest` (opacity modifiers such as `bg-surface-low/50` are permitted).

> `canvas-subtle` and `surface-highest` are defined and mapped but not yet used by any component. Reach for them for the purposes listed above instead of inventing a new grey.

### 2.3 Inks & Hairlines

| Token | Light Mode Value | Dark Mode Value | Purpose |
| :--- | :--- | :--- | :--- |
| `ink-primary` | `#161514` | `#F4F2EE` | Primary titles, active values, high-contrast text |
| `ink-secondary` | `#5C5854` | `#A8A39D` | Secondary text, table cells, descriptive subtitles |
| `ink-tertiary` | `#8E8A84` | `#6E6A64` | Micro-labels, input placeholders, disabled icons |
| `hairline` | `rgba(22, 21, 20, 0.10)` | `rgba(244, 242, 238, 0.08)` | 1px structural table/card dividers |
| `hairline-strong` | `rgba(22, 21, 20, 0.20)` | `rgba(244, 242, 238, 0.16)` | Input borders, card outlines, focused popovers |

Utilities: `text-ink-primary`, `text-ink-secondary`, `text-ink-tertiary`, `border-hairline`, `border-hairline-strong`, `divide-hairline`, `placeholder:text-ink-tertiary`.

### 2.4 Action Engine: Carmín Ladrillo

The action red is calibrated per mode: `#9A2716` on the light canvas, `#B53420` on dark basalt (slightly lighter and more luminous, to hold contrast against dark surfaces).

| State | Light Mode | Dark Mode | Token Utility |
| :--- | :--- | :--- | :--- |
| **Base Action** | `#9A2716` | `#B53420` | `bg-action`, `text-action`, `border-action` |
| **Hover State** | `#801F10` | `#C83E28` | `hover:bg-action-hover` |
| **Active State** | `#6B190D` | `#9A2716` | `active:bg-action-active` |
| **Soft Container** | `rgba(154, 39, 22, 0.08)` | `rgba(181, 52, 32, 0.18)` | `bg-action-subtle` |
| **Icon / Label Accent** | `#9A2716` | `#B53420` | `text-action` |

> **Superseded:** `@theme` still declares `--color-terracotta`, `--color-terracotta-hover` and `--color-terracotta-active` (light values only, no dark pair). They are referenced **nowhere** in `src/renderer/src` and must not be used in new work — they do not respond to dark mode. `action` is the real action colour (≈390 usages).

### 2.5 Geometry & Radii

- `rounded-none` — `0px`, the default for structural frames.
- `rounded-xs` — **`2px`**, mapped to `--radius-xs: 2px` in `@theme`. This is the maximum radius for structural containers: cards, modals, tables, inputs, toolbars, buttons.
- `rounded-lg` and above are **banned** for containers and enforced at zero violations by the compliance test.
- `rounded-full` is allowed **only for genuinely circular things** — loading spinners (`animate-spin` rings), colour swatches, and 2–2.5px status dots. It is ratcheted: the known count is 16, and new usages fail the suite.

```tsx
// ✅ Spinner — a real circle
<div className="w-3.5 h-3.5 rounded-full border-2 border-action border-t-transparent animate-spin" />
```

### 2.6 Elevation & Glow Policy

| Level | Utility | Sanctioned use |
| :--- | :--- | :--- |
| Resting | `shadow-xs` | Cards, tiles, table wrappers, inputs with a raised affordance |
| Floating | `shadow-md` / `shadow-lg` | Collapsed-panel reveal button, dropdowns |
| Overlay | `shadow-2xl` | **Permitted and expected** for modal surfaces, context menus, tooltips, lightbox |

Solid, opaque token layering (`surface-lowest` over `canvas`) plus a `1px` hairline is what establishes hierarchy — shadows are for elements that genuinely float above the document.

Coloured glow shadows (`shadow-emerald-500/50`, neon auras, `shadow-[0_0_25px_…]`) are **banned**; the test hard-fails `shadow-3xl` and arbitrary `shadow-[0_0_…]` glows. There is exactly **one** known exception, ratcheted at 1: the provider connection dot in `Settings/AiProvidersSection.tsx` (`bg-emerald-500 shadow-xs shadow-emerald-500/50`).

### 2.7 Typography Tokens & Enforced Metrology

| Token | Stack | Applied to |
| :--- | :--- | :--- |
| `--font-primary` | `"Montserrat", -apple-system, BlinkMacSystemFont, sans-serif` | All `h1`–`h6` (base layer), headers, labels, buttons (`font-primary`) |
| `--font-body` | `"Manrope", -apple-system, BlinkMacSystemFont, sans-serif` | `<body>` default, tables, descriptive text (`font-body`) |
| `--font-mono` | `"JetBrains Mono", monospace` | Identifiers, slugs, dimensions, currency (`font-mono`) |

The base layer turns tabular numerals on for every monospace readout, so a component only has to declare `font-mono`:

```css
/* globals.css — enforced once, not per component */
.font-mono,
[data-tabular-nums] {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
}
```

Serif faces (`Source Serif`, `font-serif`) are prohibited in non-webfront surfaces and the test fails on any occurrence.

---

## 3. 9-Tier Semantic Palette: Light vs. Dark Mode

Operational states use high-contrast tinting in light mode and luminous dark pills in dark mode. These state colours are **not tokenised** (they are stock Tailwind palette shades), so they are the one place where an explicit `dark:` variant is correct:

| Semantic State | Light Mode Classes | Dark Mode Classes | Meaning / Workflow |
| :--- | :--- | :--- | :--- |
| **Paid / In Stock / Active** | `bg-emerald-50 text-emerald-800 border-emerald-300/60` | `dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-500/30` | Paid orders, stock available, active pieces |
| **Pending / Review** | `bg-amber-50 text-amber-800 border-amber-300/60` | `dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-500/30` | Awaiting payment, review required, draft mode |
| **In Workshop (Taller)** | `bg-blue-50 text-blue-800 border-blue-300/60` | `dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-500/30` | Carpentry, upholstery, sanding, assembly |
| **Dispatched (En Camino)** | `bg-indigo-50 text-indigo-800 border-indigo-300/60` | `dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-500/30` | Freight transit, carrier assigned, tracking active |
| **Delivered (Entregado)** | `bg-teal-50 text-teal-800 border-teal-300/60` | `dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-500/30` | Customer receipt verified, order finalized |
| **Made-to-Order** | `bg-orange-50 text-orange-800 border-orange-300/60` | `dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-500/30` | Custom on-demand manufacturing run (4-6 weeks) |
| **Preorder (Preventa)** | `bg-purple-50 text-purple-800 border-purple-300/60` | `dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-500/30` | Batch launch reservation |
| **Critical / Cancelled** | `bg-rose-50 text-rose-800 border-rose-300/60` | `dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-500/30` | Cancelled order, validation error, drop, alert |
| **Neutral / Archived** | `bg-stone-100 text-stone-700 border-stone-300` | `dark:bg-stone-900 dark:text-stone-300 dark:border-stone-700/60` | Discontinued line, archived record, refund |

These nine variants are the complete value set of `StatusVariant` in `src/renderer/src/components/UI/StatusBadge.tsx` — never invent a tenth chip colour, and never wrap one of these chips in a hardcoded hex.

---

## 4. Typographic Hierarchy

Strict Rule: **Serif typefaces (`Source Serif 4`) are prohibited in non-webfront systems.** All typography uses sans-serif geometric/grotesque typefaces paired with technical monospace.

```
┌────────────────────────────────────────────────────────────────────────┐
│ App / Screen Title: 24px Montserrat Bold, tracking-tight               │
│ Subtitle: 12px Manrope Regular                                         │
├────────────────────────────────────────────────────────────────────────┤
│ Section Header: 14px Montserrat Semibold, uppercase                    │
│ Field Overline: 10-11px Montserrat Semibold, uppercase, tracking-wider │
│ Body & Cells: 12px / 13px Manrope Medium, leading-normal               │
│ Numerals / SKUs: 12px JetBrains Mono, tabular-nums                     │
└────────────────────────────────────────────────────────────────────────┘
```

1. **Screen / View Titles:** `font-primary text-2xl font-bold tracking-tight text-ink-primary`
2. **Card & Section Headers:** `font-primary text-xs font-semibold uppercase tracking-wider text-ink-primary`
3. **Micro-Labels & Overlines:** `text-[10px]` or `text-[11px] font-semibold uppercase tracking-wider text-ink-secondary` — the implementation uses `text-[9px]` / `text-[10px]` / `text-[11px]` for micro-type. Those three sizes are the sanctioned scale (see anti-pattern 10).
4. **Data Grid & Cell Text:** `text-xs font-body text-ink-primary` / `text-ink-secondary`
5. **Technical Numerals:** `font-mono tabular-nums text-ink-primary` (ARS currency, dimensions, slugs, polygon counts)

---

## 5. UI Component Catalog

Use these modular primitives across any layout or screen structure. Every class string below is token-based and taken from — or assembled directly out of — the shipped implementation.

### 5.1 Buttons & Action Controls

```tsx
// Primary Action (Carmín Ladrillo)
// Used by GlbExportPanel, PosterCapturePanel, OrmPackerModal, TexturePipelinePanel…
<button className="px-4 py-2 bg-action hover:bg-action-hover text-white text-xs font-semibold uppercase tracking-wider transition-colors rounded-xs shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer">
  <Save className="w-4 h-4" />
  <span>Guardar</span>
</button>

// Secondary Action (Recessed Surface)
<button className="h-7 px-3 rounded-xs border border-hairline-strong bg-surface-low hover:bg-surface-high text-[11px] font-mono font-semibold uppercase tracking-wider text-ink-primary transition-colors cursor-pointer disabled:opacity-50">
  <span>Cancelar</span>
</button>

// Destructive Action (Rose)
<button className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xs text-xs font-primary font-semibold uppercase tracking-wider shadow-xs transition-colors cursor-pointer">
  <Trash2 className="w-4 h-4" />
  <span>Eliminar</span>
</button>

// Icon Toggle (Top navigation)
<button className={`p-1.5 rounded-xs transition-colors cursor-pointer ${
  isActive
    ? 'bg-surface-lowest text-action shadow-xs border border-hairline'
    : 'text-ink-secondary hover:text-ink-primary hover:bg-surface-container'
}`}>
  <Box className="w-4 h-4" />
</button>

// Segmented Control (permission mode, units, export options)
<div className="flex items-center bg-surface-container rounded-xs p-0.5 border border-hairline text-xs">
  <button className={`px-2.5 py-1 rounded-xs text-[11px] font-medium transition-colors cursor-pointer ${
    isActive ? 'bg-action text-white shadow-xs' : 'text-ink-secondary hover:text-ink-primary'
  }`}>Auto-aplicar</button>
</div>
```

### 5.2 Status Badges & Pills (`UI/StatusBadge.tsx`)

Universal status chip supporting dual-mode. It carries the nine §3 variants, a `size` (`sm` | `md`) and sensible Spanish defaults (`En Stock`, `En Taller`, `En Camino`, …):

```tsx
<span className="inline-flex items-center font-body font-medium uppercase tracking-wider border rounded-xs select-none px-2 py-0.5 text-[10px] bg-emerald-50 text-emerald-800 border-emerald-300/60 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-500/30">
  En Stock
</span>
```

### 5.3 Data Tables (`Library/LibraryView.tsx`)

The technical library table is the reference grid: a `surface-lowest` wrapper with a `surface-low` header strip, hairline row dividers, and monospace numeric cells.

- **Wrapper:** `bg-surface-lowest border border-hairline rounded-xs shadow-xs overflow-hidden`
- **Header Row:** `bg-surface-low border-b border-hairline text-[11px] font-primary font-semibold uppercase tracking-wider text-ink-secondary`
- **Header Cells:** `px-4 py-3`
- **Body:** `divide-y divide-hairline font-body`
- **Rows:** `hover:bg-surface-container/40 transition-colors cursor-pointer`
- **Selected Row:** `bg-action-subtle/30`
- **Cells:** `px-4 py-3 text-xs text-ink-primary`
- **Numeric / Identifier Cells:** `px-4 py-3 font-mono tabular-nums text-ink-primary`

### 5.4 Form Cards & Input Controls

- **Card Container:** `bg-surface-lowest border border-hairline rounded-xs shadow-xs`
- **Card Header:** `p-3.5 border-b border-hairline bg-surface-low flex items-center justify-between`
- **Field Labels:** `text-[10px] font-semibold uppercase tracking-wider font-primary text-ink-secondary`
- **Text & Numeric Inputs:** `w-full h-7 px-2.5 rounded-xs bg-surface-lowest border border-hairline-strong text-xs font-mono tabular-nums text-ink-primary placeholder:text-ink-tertiary focus:outline-none focus:border-action disabled:opacity-50`
- **Selects:** `w-full px-3 py-2 bg-surface-low border border-hairline text-xs font-body text-ink-primary focus:outline-none focus:border-action rounded-xs`
- **Currency & Metric Inputs:** fixed unit affix + tabular figure (`UI/NumberInput.tsx`):
  ```tsx
  <div className="flex items-center h-7 bg-surface-lowest border border-hairline-strong rounded-xs overflow-hidden">
    <span className="w-5 text-center text-[10px] font-mono font-bold text-ink-tertiary border-r border-hairline bg-surface-low/60 h-full flex items-center justify-center">$</span>
    <input type="number" className="w-full bg-transparent px-2 py-0.5 text-right font-mono tabular-nums text-xs text-ink-primary focus:outline-none" />
  </div>
  ```
- **Switches / Checkboxes:** `UI/Switch.tsx` is a real `<button role="switch" aria-checked>` with a `rounded-xs` track that reads `bg-surface-container border-hairline-strong` off and `bg-action border-action` on. `UI/Checkbox.tsx` keeps a native `sr-only peer` input and paints a `w-4 h-4 rounded-xs` box from the same tokens, with `peer-focus-visible:ring-action`. Never replace either with a bare coloured div.
- **Helper Callouts:** framed information banners:
  ```tsx
  <div className="p-3 rounded-xs bg-action-subtle border border-action/20 flex items-start gap-2.5 text-xs text-ink-secondary">
    <Info className="w-4 h-4 text-action shrink-0 mt-0.5" />
    <p>Nota técnica o regla operativa.</p>
  </div>
  ```

### 5.5 Modals, Menus & Overlays (`UI/Modal.tsx`)

- **Scrim:** `fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 select-none`
- **Surface:** `bg-surface-lowest border border-hairline-strong rounded-xs shadow-2xl w-full overflow-hidden flex flex-col`
- **Sizes:** `max-w-sm` | `max-w-md` | `max-w-lg` | `max-w-xl`
- **Header:** `px-5 py-3.5 border-b border-hairline bg-surface-low flex items-center justify-between`
- **Title:** `font-primary font-bold text-sm tracking-wide uppercase text-ink-primary`
- **Footer:** `px-5 py-3 border-t border-hairline bg-surface-low flex items-center justify-end gap-2`
- **Behaviour:** `Escape` closes (`onClose`), backdrop click closes unless `closeOnBackdrop={false}`, body scrolls inside a `max-h-[75vh]` container. Context menus, tooltips, and the image lightbox reuse the same surface recipe with `shadow-2xl`.

### 5.6 KPI & Metric Tiles (`Audit/PerformanceAudit.tsx`)

- **Tile Root:** `p-2.5 rounded-xs bg-surface-low border border-hairline space-y-1`
- **Label:** `text-[10px] font-semibold uppercase tracking-wider font-primary text-ink-secondary block`
- **Value:** `font-mono tabular-nums font-semibold text-ink-primary`
- **Verdict:** `text-[9px] font-mono tabular-nums text-ink-tertiary block`, with the semantic icon (`CheckCircle2` emerald / `AlertTriangle` amber / rose) carrying the pass-warn-fail state.
- **Section Card:** `p-3.5 rounded-xs bg-surface-lowest border border-hairline space-y-3.5 shadow-xs`

### 5.7 Inline Status Banners (no toast layer)

Feedback is **in-panel and persistent**, not a floating toast stack — an operator must still see the outcome of a long Sharp or export job after looking away.

```tsx
<div className={`p-3 rounded-xs text-xs flex items-center gap-2 border ${
  isSuccess
    ? 'bg-emerald-50 text-emerald-800 border-emerald-300/60 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-500/30'
    : 'bg-rose-50 text-rose-800 border-rose-300/60 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-500/30'
}`}>
  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
  <span className="truncate font-mono tabular-nums">{message}</span>
</div>
```

Long operations show a spinner and disable their trigger (`disabled:opacity-50`) until the promise settles. Empty states are a single quiet line: `p-4 rounded-xs bg-surface-lowest border border-hairline text-center text-xs text-ink-tertiary`.

### 5.8 Resizable Sidebars (`hooks/useResizableSidebar.ts`)

Split layouts are the primary navigation pattern (workbench studio, library detail). The rules:

- Panel: `border-l border-hairline bg-surface-lowest flex flex-col shrink-0 min-h-0 relative`; the drag handle is `UI/ResizeHandle.tsx`, positioned on the shared edge.
- Defaults in `WorkbenchView`: **460px** wide, min **340px**, max `min(840, innerWidth - 380)`, collapse threshold **60px**; double-clicking the handle resets to 460px. The library detail sheet defaults to **380px**, min **280px**, max `min(520, 45% of the viewport)`.
- Collapsed panels leave a reveal button: `absolute top-4 right-4 z-20 px-2.5 py-1.5 rounded-xs bg-surface-lowest/90 hover:bg-surface-lowest border border-hairline shadow-md text-ink-secondary hover:text-action`.
- `Ctrl+B` toggles the workbench sidebar (suppressed while a text input has focus). Width and collapsed state are persisted per panel in `localStorage` (`mirage-workbench-sidebar-width`, `mirage-workbench-sidebar-collapsed`).

---

## 6. AI Slop Anti-Patterns & Aesthetic Enforcement

When generative AI tools (Claude, v0, Cursor, GPT) generate interfaces without explicit constraints, they default to the "statistical median" of modern web templates—often referred to in the industry as **"AI Slop"**. This creates homogenous, bloated, uninspired UIs that erode brand identity and degrade operational ergonomics.

All non-webfront tools in the Sera ecosystem must strictly audit against and eradicate the following **11 AI Slop Anti-Patterns**:

### 1. The "AI Purple-to-Cyan" Gradient & Neon Auras
- ❌ **The Slop:** `bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500`, neon glowing borders (`shadow-[0_0_25px_rgba(147,51,234,0.4)]`), or multi-color glowing aura backdrops behind cards.
- ✅ **Sera Standard:** Grounded mineral foundation. Flat opaque token surfaces (`bg-surface-lowest` on `bg-canvas`, which resolve to `#FFFFFF`/`#181816` and `#FDFDFD`/`#111110`). Action is strictly Carmín Ladrillo via `bg-action`. Gradients and coloured glows are strictly forbidden — the compliance test fails on `bg-gradient-to-*`, `from-purple-*`, `via-indigo-*`, `to-cyan-*`.

### 2. The "Inter / Roboto" Monoculture
- ❌ **The Slop:** Applying generic `font-sans` (Inter or Roboto) to every single label, heading, button, and table cell without intentional pairing or tracking.
- ✅ **Sera Standard:** Disciplined role-based pairing: tracked uppercase `Montserrat` (`font-primary`) for structural headers and micro-labels, `Manrope` (`font-body`) for readable body/table text, and `JetBrains Mono` (`font-mono`) with tabular numerals for all metrology, dimensions, and financial data. Serif faces are prohibited and test-enforced.

### 3. The "Three-Card Triad" & Gratuitous Bento Boxes
- ❌ **The Slop:** Forcing every feature, configuration screen, or setting into an identical 3-column bento grid where each card has a circular icon in a colored pastel background, a bold heading, and 2 lines of generic filler text.
- ✅ **Sera Standard:** Form strictly follows operational utility. High-density data tables for lists, split master-detail views for workflows (1/3 technical sheet + 2/3 catalogue), and structured card blocks for forms. Never force data into decorative bento boxes.

### 4. Hyper-Pill Rounding & Bubble-Wrap Geometry
- ❌ **The Slop:** Excessive `rounded-2xl`, `rounded-3xl`, or `rounded-full` pills applied to tables, form inputs, dialog boxes, and card containers, turning professional software into a toy.
- ✅ **Sera Standard:** Uncompromising architectural discipline: `rounded-none` (0px) or `rounded-xs` (2px max). Clean rectilinear geometry with crisp 1px hairline borders. `rounded-lg` and above are hard-failed by the suite; `rounded-full` is ratcheted at 16 legitimate circles.

### 5. Faux Glassmorphism & Blurry Card Stacking
- ❌ **The Slop:** Layering `backdrop-blur-md bg-white/10` with heavy `shadow-2xl` on every card and panel, causing sluggish GPU rendering and muddy text contrast.
- ✅ **Sera Standard:** Solid, opaque mineral layering (`surface-lowest` over `canvas`). Hierarchy is established via crisp `1px` hairlines (`border-hairline`, `border-hairline-strong`), not fuzzy drop shadows. `backdrop-blur-xs` appears only on the modal scrim; `shadow-2xl` only on surfaces that genuinely float.

### 6. The Sparkle Ticker (`✨ Sparkles`) & Magic Gimmicks
- ❌ **The Slop:** Sprinkling `✨` emoji or `Sparkles` Lucide icons onto standard search inputs, filter buttons, or action triggers to make them appear "AI-powered".
- ✅ **Sera Standard:** Functional, recognizable tool iconography only (`Search`, `Filter`, `Save`, `Printer`, `Clock`, `Truck`, `Boxes`). The only sanctioned `Sparkles` uses are the AI Agent Studio navigation entry and the AI provider settings headers — surfaces that really are AI. Automated actions are labelled honestly (`Optimizar GLB`, `Empaquetar ORM`, `Hornear .GLB`).

### 7. Unjustified Spring Physics & Micro-Interaction Jitter
- ❌ **The Slop:** Adding `hover:scale-105 transition-transform duration-300 ease-spring` or bouncy hover cards to table rows, inputs, and primary save buttons.
- ✅ **Sera Standard:** Rock-solid cursor ergonomics. Zero displacement or scale changes on hover for anything that commits a change. Use subtle, instantaneous colour shifts (`transition-colors`, `duration-150`) that respect mouse precision on dense desktop and tablet touch targets. The only scale transforms in the codebase are three `group-hover:scale-105` uses on poster thumbnails and the collapsed-sidebar disclosure icon; do not add more, and never on a committing control.

### 8. Low-Contrast Accessibility Traps (Grey-on-Grey)
- ❌ **The Slop:** Faint placeholder-style text (`text-gray-400` on white, or `text-zinc-600` on dark grey) masquerading as "minimalism", failing WCAG contrast ratios.
- ✅ **Sera Standard:** High-contrast text hierarchy from tokens: `text-ink-primary` (`#161514` / `#F4F2EE`) for primary content, `text-ink-secondary` (`#5C5854` / `#A8A39D`) for metadata, `text-ink-tertiary` (`#8E8A84` / `#6E6A64`) reserved for placeholders and disabled icons. Always exceed WCAG AA contrast (minimum 4.5:1).

### 9. Marketing SaaS Filler Copy in Operational Tools
- ❌ **The Slop:** Injecting promotional jargon into internal interfaces (e.g. *"Empower your atelier with next-gen artisan productivity"*, *"Unlock seamless workshop potential"*, *"Your all-in-one furniture hub"*).
- ✅ **Sera Standard:** Direct, factual atelier vocabulary in Spanish (*"Órdenes en Taller"*, *"Metrología & Escala Física"*, *"Biblioteca Técnica"*, *"Centro de Exportación & Entrega"*, *"Estudio IA"*). The renderer is declared `lang="es"`; keep UI strings, log messages, and errors in that register.

### 10. Non-Tabular Number Alignment & Arbitrary Ad-Hoc Utilities
- ❌ **The Slop:** Prices and stock counts rendered with variable-width sans fonts (causing table columns to visually wobble and misalign), paired with invented inline classes (`p-[13px]`, `w-[317px]`, `text-[13.5px]`).
- ✅ **Sera Standard:** Strict metrology alignment: all numeric data uses `font-mono`, which the base layer pins to `tabular-nums`. Spacing and sizing follow the standard Tailwind scale (`p-4`, `p-6`, `gap-3`). The only sanctioned arbitrary values are the micro-type sizes `text-[9px]`, `text-[10px]`, `text-[11px]` and the fixed widths of floating popovers (`w-[230px]`, `w-[320px]`). Arbitrary spacing, one-off font sizes, and hardcoded colours are not allowed.

### 11. The 'Synced' Green Dot & Ambient Cloud SaaS Status Slop (`● Sincronizado` / Live Sync Badges)
- ❌ **The Slop:** Plastering ambient SaaS status indicators such as `● Sincronizado`, green blinking "All changes saved" pills, or artificial cloud-sync dots in operational toolbars. It treats professionals like anxious web users who need constant cosmetic reassurance that their keystrokes aren't lost.
- ✅ **Sera Standard:** Quiet, high-utility operational software. Display the factual entry name / identifier directly in the header. Auto-saving to the local library is an invariant, silent background certainty—never a decorative status pill. A status dot is legitimate only when it reports real, verifiable state (e.g. "provider has an API key"), and it must be paired with a `title` explaining that state.

### Known tolerances (ratchets)

The compliance suite tracks judgement calls instead of pretending a regex can make them. Current baselines:

| Item | Baseline | Where |
| :--- | :--- | :--- |
| `rounded-full` | 16 | Spinners, colour swatches, status dots |
| Coloured glow shadows | 1 | `Settings/AiProvidersSection.tsx` provider connection dot |
| `group-hover:scale-105` | 3 | Poster thumbnails (2), collapsed-sidebar icon (1) |
| Hardcoded backdrop hexes | 2 | `Viewport/Canvas3D.tsx` — the 3D canvas backdrop (`#111110` / `#f7f5f2`) tracks the **viewport** theme, which can differ from the app theme |
| `--color-terracotta*` | defined, unused | `globals.css` `@theme`; superseded by the `action` family |

The first two rows are enforced as ratchets by `designSystemCompliance.test.ts` — fixing an entry lowers its number, adding a new one fails the suite. The last three are conventions held by review, not by the test: treat them as ceilings, not as licence.

---

## 7. Implementation Checklist for New Applications & Pages

When building any new app, tool, or screen, audit against both functionality and anti-slop rules:

- [ ] **Define App Layout:** Choose the layout that fits your application's domain (e.g. tablet split-view, fullscreen kiosk, multi-step modal, or drawer console).
- [ ] **Token Discipline:**
  - [ ] Structural colours come from tokens (`bg-canvas`, `bg-surface-*`, `text-ink-*`, `border-hairline*`) — **never** a hardcoded hex, and never a `dark:bg-[#…]` override.
  - [ ] Action colour is `bg-action` / `hover:bg-action-hover` / `text-action`. Not `terracotta`, not a blue "brand" button.
  - [ ] `dark:` variants appear only on the nine semantic state colours of §3.
- [ ] **Anti-Slop Audit:**
  - [ ] No purple/cyan gradients or glowing aura borders.
  - [ ] No `rounded-lg`+ on containers, no bubble pills (`rounded-none` or `rounded-xs` only); new `rounded-full` only for real circles.
  - [ ] No decorative `✨ Sparkles` icons on non-AI features.
  - [ ] No scale/bounce hover animations on operational controls.
  - [ ] No marketing filler copy; vocabulary is honest and atelier-specific (Spanish UI).
- [ ] **Apply Color Stack:** Build containers as `bg-surface-lowest border border-hairline` over `bg-canvas`, with `border-hairline-strong` for inputs and floating surfaces.
- [ ] **Elevation Check:** `shadow-xs` for resting cards; `shadow-2xl` only for modals, menus, tooltips, lightboxes. No coloured glows.
- [ ] **Typography Check:** Verify **no serif fonts** are present. `font-primary` for headers/labels, `font-body` for prose, `font-mono` for identifiers.
- [ ] **Tabular Numerals:** Any currency amount, order code, dimension, weight, slug, or polygon count uses `font-mono` (tabular numerals are applied globally).
- [ ] **Status Badges:** Map item statuses to the nine `StatusVariant` cases — do not invent a tenth.
- [ ] **Feedback:** Disable the trigger and show a spinner during mutations; report the outcome in an inline banner, never a floating toast.
- [ ] **Verify:** run `npm test` — `designSystemCompliance.test.ts` fails the build on forbidden rounding, gradients, hardcoded dark hexes, serif faces, and on any ratchet that grew.
