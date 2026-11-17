---
# Token values live in `src/shared/themes.ts` and `src/renderer/src/styles/globals.css`
# (`:root` for light, `.dark` for dark, overridden dynamically via `data-theme`
# and local/external theme files) and are mapped into Tailwind v4 by `@theme`.
# Components consume the resulting utilities (`bg-surface-lowest`, `text-ink-primary`, …).
name: Mirage Studio & Workbench Operations Design System
system: Mirage Operations DS
brand:
  name: mirage
  environment: 3D Workbench, Material Studio, Asset Library, Export & Internal Tools
  tagline: Architectural precision, data density, and operational utility for technical 3D workflows
colors:
  light:
    canvas: '#fcfcfd'
    canvas-subtle: '#f4f6f8'
    canvas-stone: '#eaeef2'
    surface-lowest: '#ffffff'
    surface-low: '#f4f6f8'
    surface-container: '#eaeef2'
    surface-high: '#dde3e9'
    surface-highest: '#cfd7df'
    ink-primary: '#181a1b'
    ink-secondary: '#4a525a'
    ink-tertiary: '#6c747c'
    hairline: 'rgba(24, 26, 27, 0.10)'
    hairline-strong: 'rgba(24, 26, 27, 0.24)'
    action: '#2cb696'
    action-hover: '#239b7f'
    action-active: '#1b7d66'
    action-subtle: 'rgba(65, 201, 180, 0.11)'
    action-ink: '#115e4e'
    on-action: '#0e1715'
  dark:
    canvas: '#1e2123'
    canvas-subtle: '#191c1e'
    canvas-stone: '#282c30'
    surface-lowest: '#24282b'
    surface-low: '#282c30'
    surface-container: '#2f3439'
    surface-high: '#383e44'
    surface-highest: '#434a52'
    ink-primary: '#e7e9eb'
    ink-secondary: '#b6bec5'
    ink-tertiary: '#868f97'
    hairline: 'rgba(255, 255, 255, 0.10)'
    hairline-strong: 'rgba(255, 255, 255, 0.24)'
    action: '#41c9b4'
    action-hover: '#53d6c2'
    action-active: '#2cb696'
    action-subtle: 'rgba(65, 201, 180, 0.14)'
    action-ink: '#9bf0e2'
    on-action: '#0e1715'
typography:
  font-primary: '"Instrument Sans", -apple-system, BlinkMacSystemFont, sans-serif'
  font-body: '"Instrument Sans", -apple-system, BlinkMacSystemFont, sans-serif'
  font-mono: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
geometry:
  radius-default: '0px'
  radius-subtle: '2px'
  hairline-border: '1px solid rgba(24, 26, 27, 0.10)'
  hairline-border-dark: '1px solid rgba(255, 255, 255, 0.10)'
---

# Mirage Operations: Design System for 3D Studio & Workbench Applications

The **Mirage Operations Design System** is the foundation for creating any workspace, inspection console, or operational tool in the Mirage desktop application.

Each module or view (e.g. 3D viewport, PBR material studio, model library, export studio, performance audits, and AI agent console) is free to define its own layout, navigation structure, and content flow. This system provides the shared **tokens, color palette (Light & Dark mode), typography rules, component primitives, and behavioral patterns** that maintain visual and tactile consistency across all operational software.

This document describes the system **as implemented in Mirage** (`src/renderer/src/styles/globals.css` and `src/renderer/src/components/`), and the rules in it are asserted by `src/renderer/src/tests/designSystemCompliance.test.ts`.

---

## 1. Core Principles: Operational Workbench vs. Editorial Web

| Dimension | Editorial Web / Showcase | Operations & 3D Workbench (Mirage) |
| :--- | :--- | :--- |
| **Primary Goal** | Visual storytelling, open browsing | Task completion, metrology accuracy, rapid triage, utility |
| **Layout & Flow** | Long-scroll landing pages, loose media splits | Workspace-specific (split panels, grids, tables, modals) |
| **Typography** | Editorial Serif (`Source Serif 4`) + Display Titles | Sans-serif (`Instrument Sans`) + Tabular Monospace (`JetBrains Mono`) |
| **Themes** | Single daylight canvas | **Swappable Light & Dark Themes** (`Mirage Slate` default, `~/.config/mirage/themes/*.json` files & symlinks with hot-reload) |
| **Pacing** | Slow-scroll reading | Fast keyboard navigation, quick scanning, dense data entry |
| **Density** | Generous whitespace, relaxed margins | Compact, high information density, space efficiency |
| **Imagery** | Atmospheric moodshots, lifestyle photography | High-contrast thumbnails, 1:1 crops, 3D wireframes, inspection views |
| **Geometry** | Unboxed monoliths | Architectural `0px` to `2px` border-framed structural containers |
| **Feedback** | Subtle ambient cues, silent background sync | Inline status banners, explicit progress states, confirm modals |

### The 4 Operational Tenets
1. **Zero Decorative Ambiguity:** Every visual element must convey information or facilitate action. Avoid purely decorative illustrations or animations.
2. **Tabular Numerals Everywhere:** Any numeric value (dimensions in m/cm, polygon counts, vertex counts, file sizes, PBR scalars) must render in `JetBrains Mono` with `font-variant-numeric: tabular-nums`. This is enforced **once**, globally, in `globals.css` — see §2.7.
3. **Architectural Grid Enclosure:** Components are bounded by crisp `1px` hairlines rendered from the `hairline` / `hairline-strong` tokens (`border-hairline`, `border-hairline-strong`), never by shadows. Elevated drop-shadows are reserved strictly for floating overlays.
4. **State Transparency:** Technical asset workflows are multi-stage. Every entity explicitly exposes its lifecycle stage using codified color chips in both light and dark themes.

---

## 2. Token Foundations: Swappable Themes, One Token Layer

Mirage's default main theme (**Mirage Slate**) is derived from the `portfolio` slate-charcoal (`#1e2123` / `#fcfcfd`) and teal-mint (`#41c9b4` / `#2cb696`) palette. Additional themes—including the original **Basalt Crimson** palette—are stored as editable JSON files in `~/.config/mirage/themes/` (which serve as templates for custom user themes, and support symlinks from external theme generators such as Omarchy or Pywal for instant hot-swapping).

### 2.1 The token layer is the mechanism

**This is the single most important rule in this document.** Every structural colour is declared once as a CSS custom property, then mapped into Tailwind v4:

```css
/* src/renderer/src/styles/globals.css */
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));

@theme {
  --font-primary: "Instrument Sans", -apple-system, BlinkMacSystemFont, sans-serif;
  --font-body: "Instrument Sans", -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;

  --color-canvas: var(--canvas);
  --color-surface-lowest: var(--surface-lowest);
  --color-ink-primary: var(--ink-primary);
  --color-hairline: var(--hairline);
  --color-action: var(--action);
  --color-action-ink: var(--action-ink);
  --color-on-action: var(--on-action);
  /* …one mapping per token, see the tables below… */

  --radius-xs: 2px;
}

:root {
  --canvas: #fcfcfd;
  --surface-lowest: #ffffff;
  --ink-primary: #181a1b;
  --hairline: rgba(24, 26, 27, 0.10);
  --action: #2cb696;
  --on-action: #0e1715;
  /* …light values… */
}

.dark {
  --canvas: #1e2123;
  --surface-lowest: #24282b;
  --ink-primary: #e7e9eb;
  --hairline: rgba(255, 255, 255, 0.10);
  --action: #41c9b4;
  --on-action: #0e1715;
  /* …dark values… */
}
```

Because the utility resolves to `var(--surface-lowest)`, **`bg-surface-lowest` is already theme- and mode-aware**. Writing a dark value by hand is not "extra safety" — it is a second source of truth that drifts.

```tsx
// ✅ Correct: one class, correct in every theme and mode.
<div className="bg-surface-lowest border border-hairline text-ink-primary">
<button className="bg-action text-on-action hover:bg-action-hover">Save</button>

// ❌ Forbidden: hardcoded dark hexes or assuming white text on bg-action.
<div className="bg-white dark:bg-[#181816] border-black/10 dark:border-white/10 text-[#161514] dark:text-[#f4f2ee]">
```

`designSystemCompliance.test.ts` asserts **zero** occurrences of `dark:(bg|text|border)-[#…]` in `src/renderer/src/components/**/*.tsx`. The only legal `dark:` colour variants are the non-tokenised semantic state colours of §3.

`useAppStore` applies the active theme (`themeId`, `data-theme`, CSS variables injected from `src/shared/themes.ts`) and polarity (`.dark` class from `themeMode: 'dark' | 'light' | 'system'`, persisted in `settings.json`); `src/renderer/index.html` ships with `class="dark" data-theme="mirage"` so the first paint is already correct. Scrollbar colours are per-mode tokens too (`--scrollbar-track`, `--scrollbar-thumb`, `--scrollbar-thumb-hover`).

### 2.2 Surface & Layering Architecture (Default: Mirage Slate)

| Token | Light Mode Value | Dark Mode Value (Slate Charcoal) | Purpose |
| :--- | :--- | :--- | :--- |
| `canvas` | `#FCFCFD` | `#1E2123` | Base viewport / application canvas |
| `canvas-subtle` | `#F4F6F8` | `#191C1E` | Recessed strips, rail backgrounds |
| `canvas-stone` | `#EAEEF2` | `#282C30` | Thumbnail wells, inert media frames |
| `surface-lowest` | `#FFFFFF` | `#24282B` | Main card, data table, and modal containers |
| `surface-low` | `#F4F6F8` | `#282C30` | Table header, toolbar, and sub-header fills |
| `surface-container` | `#EAEEF2` | `#2F3439` | Form inputs, divider chips, inactive pills |
| `surface-high` | `#DDE3E9` | `#383E44` | Hover state on neutral table rows / list items |
| `surface-highest` | `#CFD7DF` | `#434A52` | Secondary button fills, prominent borders |

Utilities: `bg-canvas`, `bg-canvas-subtle`, `bg-canvas-stone`, `bg-surface-lowest`, `bg-surface-low`, `bg-surface-container`, `bg-surface-high`, `bg-surface-highest` (opacity modifiers such as `bg-surface-low/50` are permitted).

### 2.3 Inks & Hairlines

| Token | Light Mode Value | Dark Mode Value | Purpose |
| :--- | :--- | :--- | :--- |
| `ink-primary` | `#181A1B` | `#E7E9EB` | Primary titles, active values, high-contrast text |
| `ink-secondary` | `#4A525A` | `#B6BEC5` | Secondary text, table cells, descriptive subtitles |
| `ink-tertiary` | `#6C747C` | `#868F97` | Micro-labels, input placeholders, disabled icons |
| `hairline` | `rgba(24, 26, 27, 0.10)` | `rgba(255, 255, 255, 0.10)` | 1px structural table/card dividers |
| `hairline-strong` | `rgba(24, 26, 27, 0.24)` | `rgba(255, 255, 255, 0.24)` | Input borders, card outlines, focused popovers |

Utilities: `text-ink-primary`, `text-ink-secondary`, `text-ink-tertiary`, `border-hairline`, `border-hairline-strong`, `divide-hairline`, `placeholder:text-ink-tertiary`.

### 2.4 Action Engine & Accessible Contrast (`--on-action`)

The default action accent is Teal Mint (`#2CB696` on light, `#41C9B4` on dark), paired with `--on-action` (`#0E1715`) so text and icons inside solid `bg-action` surfaces always exceed WCAG AA/AAA contrast across every swappable theme (dark-accent themes such as **Basalt Crimson** or **Blueprint Cobalt** automatically use `#FFFFFF` for `--on-action`).

| State | Light Mode | Dark Mode | Token Utility |
| :--- | :--- | :--- | :--- |
| **Base Action** | `#2CB696` | `#41C9B4` | `bg-action`, `text-action`, `border-action` |
| **Hover State** | `#239B7F` | `#53D6C2` | `hover:bg-action-hover` |
| **Active State** | `#1B7D66` | `#2CB696` | `active:bg-action-active` |
| **Soft Container** | `rgba(65, 201, 180, 0.11)` | `rgba(65, 201, 180, 0.14)` | `bg-action-subtle` |
| **On-Action Ink** | `#0E1715` | `#0E1715` | `text-on-action` |
| **Surface Accent Ink** | `#115E4E` | `#9BF0E2` | `text-action-ink` |

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
| `--font-primary` | `"Instrument Sans", -apple-system, BlinkMacSystemFont, sans-serif` | All `h1`–`h6` (base layer), headers, labels, buttons (`font-primary`) |
| `--font-body` | `"Instrument Sans", -apple-system, BlinkMacSystemFont, sans-serif` | `<body>` default, tables, descriptive text (`font-body`) |
| `--font-mono` | `"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace` | Identifiers, slugs, dimensions, telemetry (`font-mono`) |

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

### 2.8 Swappable Themes & Brand Icons

- **User Themes (`~/.config/mirage/themes/*.json`):** On startup, `src/main/themeService.ts` seeds `mirage.json`, `basalt.json`, `blueprint.json`, `amber-crt.json`, `_template.json`, and `README.txt` without overwriting user edits. Any `*.json` file or symlink placed in `~/.config/mirage/themes/` is discovered and hot-reloaded (watching resolved symlink targets as well so external generators such as Omarchy or Pywal can swap themes cleanly).
- **Minimal Seeds:** `src/shared/themes.ts` (`normalizePalette`) expands minimal seeds (`canvas`, `inkPrimary`, `action`) into full stepped surfaces, hairlines, WCAG-calibrated `--on-action` contrast ink, and 3D viewport colors.
- **Brand vs. Functional Marks (`UI/MirageLogo.tsx`):**
  - `<MirageLogo />` renders the **M Horizon** brand mark (`TopNav`, `HubView`, `SystemInfoSection`, and `resources/icon.png` / `resources/icon.svg`).
  - `<MetrologyTriadIcon />` renders the **Metrology Triad** 3D workbench & bounds mark (`NavSidebar`, `HubView` Workbench portal, `Canvas3D` empty state, `PieceCard` fallback).

---

## 3. 9-Tier Semantic Palette: Light vs. Dark Mode

Operational states use high-contrast tinting in light mode and luminous dark pills in dark mode. These state colours are **not tokenised** (they are stock Tailwind palette shades), so they are the one place where an explicit `dark:` variant is correct:

| Semantic State | Light Mode Classes | Dark Mode Classes | Meaning / Workflow |
| :--- | :--- | :--- | :--- |
| **Active / Production Ready** | `bg-emerald-50 text-emerald-800 border-emerald-300/60` | `dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-500/30` | Verified active asset, production-ready |
| **Pending / Review** | `bg-amber-50 text-amber-800 border-amber-300/60` | `dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-500/30` | Needs QA review, draft state |
| **Work in Progress (WIP)** | `bg-blue-50 text-blue-800 border-blue-300/60` | `dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-500/30` | Active staging, PBR tuning, optimization |
| **Published** | `bg-indigo-50 text-indigo-800 border-indigo-300/60` | `dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-500/30` | Exported & published downstream |
| **Verified** | `bg-teal-50 text-teal-800 border-teal-300/60` | `dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-500/30` | Export package verified |
| **Approved** | `bg-orange-50 text-orange-800 border-orange-300/60` | `dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-500/30` | Approved for web / AR delivery |
| **Scheduled / Staged** | `bg-purple-50 text-purple-800 border-purple-300/60` | `dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-500/30` | Queued for batch export |
| **Critical / Error** | `bg-rose-50 text-rose-800 border-rose-300/60` | `dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-500/30` | Validation error, drop failed, alert |
| **Neutral / Archived** | `bg-stone-100 text-stone-700 border-stone-300` | `dark:bg-stone-900 dark:text-stone-300 dark:border-stone-700/60` | Archived asset, neutral metadata |

These nine variants are the complete value set of `StatusVariant` in `src/renderer/src/components/UI/StatusBadge.tsx` — never invent a tenth chip colour, and never wrap one of these chips in a hardcoded hex.

---

## 4. Typographic Hierarchy

Strict Rule: **Serif typefaces (`Source Serif 4`) are prohibited in non-webfront systems.** All typography uses sans-serif geometric/grotesque typefaces paired with technical monospace.

```
┌────────────────────────────────────────────────────────────────────────┐
│ App / Screen Title: 24px Instrument Sans Bold, tracking-tight          │
│ Subtitle: 12px Instrument Sans Regular                                 │
├────────────────────────────────────────────────────────────────────────┤
│ Section Header: 14px Instrument Sans Semibold, uppercase               │
│ Field Overline: 10-11px Instrument Sans Semibold, uppercase, wider     │
│ Body & Cells: 12px / 13px Instrument Sans Medium, leading-normal       │
│ Numerals / SKUs: 12px JetBrains Mono, tabular-nums                     │
└────────────────────────────────────────────────────────────────────────┘
```

1. **Screen / View Titles:** `font-primary text-2xl font-bold tracking-tight text-ink-primary`
2. **Card & Section Headers:** `font-primary text-xs font-semibold uppercase tracking-wider text-ink-primary`
3. **Micro-Labels & Overlines:** `text-[10px]` or `text-[11px] font-semibold uppercase tracking-wider text-ink-secondary` — the implementation uses `text-[9px]` / `text-[10px]` / `text-[11px]` for micro-type. Those three sizes are the sanctioned scale (see anti-pattern 10).
4. **Data Grid & Cell Text:** `text-xs font-body text-ink-primary` / `text-ink-secondary`
5. **Technical Numerals:** `font-mono tabular-nums text-ink-primary` (dimensions, slugs, polygon counts, PBR scalars)

---

## 5. UI Component Catalog

All visual elements across the application are componentized into **29 reusable primitives** located in `src/renderer/src/components/UI/` and exported via `index.ts`. Every primitive strictly encapsulates Mirage tokens, 0–2px border radii (`rounded-none` or `rounded-xs`), crisp hairlines, and accessible keyboard interactions.

### 5.1 Buttons & Action Controls (`UI/Button.tsx`, `UI/IconButton.tsx`, `UI/SegmentedControl.tsx`)

```tsx
// Primary Committing Action (Theme Accent + --on-action text)
<Button variant="primary" icon={<Save className="w-4 h-4" />}>
  Save
</Button>

// Secondary Action (Recessed Surface)
<Button variant="secondary" size="sm">
  Cancel
</Button>

// Destructive Action (Rose)
<Button variant="destructive" icon={<Trash2 className="w-4 h-4" />}>
  Delete
</Button>

// Loading State (Replaces any manual Loader2)
<Button variant="primary" isLoading={isSubmitting}>
  Process
</Button>

// Standard Icon Trigger (Top nav, HUD overlays, card action headers)
<IconButton
  icon={<Box className="w-4 h-4" />}
  variant="ghost"
  size="sm"
  title="Toggle 3D view"
  onClick={handleToggle}
/>

// Segmented Control (Pill switcher for modes, units, resolution)
<SegmentedControl
  value={mode}
  onChange={setMode}
  options={[
    { value: 'auto', label: 'Auto-apply' },
    { value: 'confirm', label: 'Ask confirmation' }
  ]}
  variant="action"
  size="sm"
/>
```

### 5.2 Badges & Status Chips (`UI/StatusBadge.tsx`, `UI/Badge.tsx`)

- **`<StatusBadge>`**: Universal lifecycle chip supporting dual-mode. It carries the nine §3 variants (`active`, `pending`, `workshop`, `dispatched`, `delivered`, `madeToOrder`, `preorder`, `critical`, `neutral`), a `size` (`sm` | `md`) and clear English defaults (`Active`, `In Progress`, `Published`, …):
  ```tsx
  <StatusBadge variant="active" size="md">Active</StatusBadge>
  ```
- **`<Badge>`**: Neutral/action metadata pills for finish labels, categories, and counts:
  ```tsx
  <Badge variant="neutral">PBR Metal</Badge>
  <Badge variant="action">In 3D Viewport</Badge>
  ```

### 5.3 Data Tables (`UI/Table.tsx`)

Composable table primitives for technical catalogs and metrology grids:
```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Model</TableHead>
      <TableHead align="right">Dimensions</TableHead>
      <TableHead align="right">Polygons</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow onClick={() => openEntry(slug)}>
      <TableCell className="font-semibold">{entry.title}</TableCell>
      <TableCell align="right" mono>{dimText}</TableCell>
      <TableCell align="right" mono>{triangles.toLocaleString()} △</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

### 5.4 Form Fields & Inputs (`UI/FormField.tsx`, `UI/TextInput.tsx`, `UI/SearchInput.tsx`, `UI/TextArea.tsx`)

- **`<FormField>`**: Container managing label overlines, required asterisks, helper text, and validation error messages.
- **`<TextInput>`**: Clean inputs with `mono`, `hasError`, left/right icon addons (`iconLeft`, `iconRight`), and token focus rings.
- **`<SearchInput>`**: Dedicated search input with search icon and 1-click clear button.
- **`<TextArea>`**: Consistent multiline input for descriptions, release notes, and finishing specifications.
- **`<NumberInput>`**: Fixed unit affix + tabular figures for metrology and financial units (`$`, `m`, `cm`, `mm`, `°`).
- **`<Switch>`**: Real `<button role="switch" aria-checked>` with a `rounded-xs` track (`bg-surface-container border-hairline-strong` off, `bg-action border-action` on).
- **`<Checkbox>`**: Native `sr-only peer` input with a `w-4 h-4 rounded-xs` box painted from tokens with `peer-focus-visible:ring-action`.

### 5.5 Modals & Dialogs (`UI/Modal.tsx`, `UI/ConfirmModal.tsx`)

- **`<Modal>`**: Screen scrim (`fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4`), container surface (`bg-surface-lowest border border-hairline-strong rounded-xs shadow-2xl`), header, scrollable body, and action footer. Dismisses on `Escape` and backdrop clicks.
- **`<ConfirmModal>`**: Pre-configured confirmation dialog with `action` and `destructive` color schemes, custom confirm/cancel text, and auto-loading states.

### 5.5.1 Standard Context Menu System (`UI/ContextMenu.tsx`)

Unified, portaled context menu engine replacing all ad-hoc right-click menus:
- **Portaled to `document.body`**: Immune to parent overflow clipping or container stacking contexts.
- **Boundary Collision & Auto-Flip**: Clamps coordinates to the viewport; automatically detects window boundaries and flips submenus to open leftward or upward when near screen edges.
- **Hover-Delay Submenus**: 150ms hover-leave grace period prevents accidental submenu dismissal when moving diagonally.
- **Centralized Event Handling**: `Escape` dismissal and outside `mousedown` detection.
- **Compound Components**:
  ```tsx
  <ContextMenu isOpen={isOpen} position={{ x, y }} onClose={onClose}>
    <ContextMenuHeader>Mirage 3D Viewport</ContextMenuHeader>
    <ContextMenuSub label="Camera Views" icon={<Camera className="w-3.5 h-3.5" />}>
      <ContextMenuItem shortcut="Ctrl+1" onClick={setIso}>Isometric</ContextMenuItem>
    </ContextMenuSub>
    <ContextMenuSeparator />
    <ContextMenuCheckbox label="Grid" checked={showGrid} onChange={toggleGrid} />
    <ContextMenuItem danger onClick={handleDelete}>Delete</ContextMenuItem>
  </ContextMenu>
  ```

### 5.6 KPI & Metric Tiles (`Audit/PerformanceAudit.tsx`)

- **Tile Root:** `p-2.5 rounded-xs bg-surface-low border border-hairline space-y-1`
- **Label:** `text-[10px] font-semibold uppercase tracking-wider font-primary text-ink-secondary block`
- **Value:** `font-mono tabular-nums font-semibold text-ink-primary`
- **Verdict:** `text-[9px] font-mono tabular-nums text-ink-tertiary block`, with the semantic icon (`CheckCircle2` emerald / `AlertTriangle` amber / rose) carrying the pass-warn-fail state.

### 5.7 Status Feedback & Empty States (`UI/AlertBanner.tsx`, `UI/EmptyState.tsx`, `UI/Spinner.tsx`)

- **`<AlertBanner>`**: Persistent in-panel notifications for `info`, `warning`, `error`, and `success` with optional dismiss button and action triggers. (No floating toasts).
- **`<EmptyState>`**: Framed dashed containers with centered icon, title, description, and action button for zero-data views.
- **`<Spinner>`**: Unified CSS loader (`xs`, `sm`, `md`, `lg`) with `action`, `white`, and `neutral` colorways. `Loader2` is prohibited.

### 5.8 Resizable Sidebars (`hooks/useResizableSidebar.ts`)

Split layouts are the primary navigation pattern (workbench studio, library detail). The rules:

- Panel: `border-l border-hairline bg-surface-lowest flex flex-col shrink-0 min-h-0 relative`; the drag handle is `UI/ResizeHandle.tsx`, positioned on the shared edge.
- Defaults in `WorkbenchView`: **460px** wide, min **340px**, max `min(840, innerWidth - 380)`, collapse threshold **60px**; double-clicking the handle resets to 460px. The library detail sheet defaults to **380px**, min **280px**, max `min(520, 45% of the viewport)`.
- Collapsed panels leave a reveal button: `absolute top-4 right-4 z-20 px-2.5 py-1.5 rounded-xs bg-surface-lowest/90 hover:bg-surface-lowest border border-hairline shadow-md text-ink-secondary hover:text-action`.
- `Ctrl+B` toggles the workbench sidebar (suppressed while a text input has focus). Width and collapsed state are persisted per panel in `localStorage` (`mirage-workbench-sidebar-width`, `mirage-workbench-sidebar-collapsed`).

---

## 6. AI Slop Anti-Patterns & Aesthetic Enforcement

When generative AI tools (Claude, v0, Cursor, GPT) generate interfaces without explicit constraints, they default to the "statistical median" of modern web templates—often referred to in the industry as **"AI Slop"**. This creates homogenous, bloated, uninspired UIs that erode brand identity and degrade operational ergonomics.

All operational tools in the Mirage ecosystem must strictly audit against and eradicate the following **11 AI Slop Anti-Patterns**:

### 1. The "AI Purple-to-Cyan" Gradient & Neon Auras
- ❌ **The Slop:** `bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500`, neon glowing borders (`shadow-[0_0_25px_rgba(147,51,234,0.4)]`), or multi-color glowing aura backdrops behind cards.
- ✅ **Mirage Standard:** Grounded mineral/slate foundation. Flat opaque token surfaces (`bg-surface-lowest` on `bg-canvas`). Action colour comes from the active theme via `bg-action` with `text-on-action`. Gradients and coloured glows are strictly forbidden — the compliance test fails on `bg-gradient-to-*`, `from-purple-*`, `via-indigo-*`, `to-cyan-*`.

### 2. The "Inter / Roboto" Monoculture
- ❌ **The Slop:** Applying generic `font-sans` (Inter or Roboto) to every single label, heading, button, and table cell without intentional pairing or tracking.
- ✅ **Mirage Standard:** Disciplined role-based pairing: `Instrument Sans` (`font-primary` / `font-body`) paired with `JetBrains Mono` (`font-mono`) with tabular numerals for all metrology, dimensions, and asset metrics. Serif faces are prohibited and test-enforced.

### 3. The "Three-Card Triad" & Gratuitous Bento Boxes
- ❌ **The Slop:** Forcing every feature, configuration screen, or setting into an identical 3-column bento grid where each card has a circular icon in a colored pastel background, a bold heading, and 2 lines of generic filler text.
- ✅ **Mirage Standard:** Form strictly follows operational utility. High-density data tables for lists, split master-detail views for workflows (1/3 technical sheet + 2/3 catalogue), and structured card blocks for forms. Never force data into decorative bento boxes.

### 4. Hyper-Pill Rounding & Bubble-Wrap Geometry
- ❌ **The Slop:** Excessive `rounded-2xl`, `rounded-3xl`, or `rounded-full` pills applied to tables, form inputs, dialog boxes, and card containers, turning professional software into a toy.
- ✅ **Mirage Standard:** Uncompromising architectural discipline: `rounded-none` (0px) or `rounded-xs` (2px max). Clean rectilinear geometry with crisp 1px hairline borders. `rounded-lg` and above are hard-failed by the suite; `rounded-full` is ratcheted at 16 legitimate circles.

### 5. Faux Glassmorphism & Blurry Card Stacking
- ❌ **The Slop:** Layering `backdrop-blur-md bg-white/10` with heavy `shadow-2xl` on every card and panel, causing sluggish GPU rendering and muddy text contrast.
- ✅ **Mirage Standard:** Solid, opaque mineral layering (`surface-lowest` over `canvas`). Hierarchy is established via crisp `1px` hairlines (`border-hairline`, `border-hairline-strong`), not fuzzy drop shadows. `backdrop-blur-xs` appears only on the modal scrim; `shadow-2xl` only on surfaces that genuinely float.

### 6. The Sparkle Ticker (`✨ Sparkles`) & Magic Gimmicks
- ❌ **The Slop:** Sprinkling `✨` emoji or `Sparkles` Lucide icons onto standard search inputs, filter buttons, or action triggers to make them appear "AI-powered".
- ✅ **Mirage Standard:** Functional, recognizable tool iconography only (`Search`, `Filter`, `Save`, `Printer`, `Clock`, `Truck`, `Boxes`). The only sanctioned `Sparkles` uses are the AI Agent Studio navigation entry and the AI provider settings headers — surfaces that really are AI. Automated actions are labelled honestly (`Optimize GLB`, `Pack ORM`, `Bake .GLB`).

### 7. Unjustified Spring Physics & Micro-Interaction Jitter
- ❌ **The Slop:** Adding `hover:scale-105 transition-transform duration-300 ease-spring` or bouncy hover cards to table rows, inputs, and primary save buttons.
- ✅ **Mirage Standard:** Rock-solid cursor ergonomics. Zero displacement or scale changes on hover for anything that commits a change. Use subtle, instantaneous colour shifts (`transition-colors`, `duration-150`) that respect mouse precision on dense desktop and tablet touch targets. The only scale transforms in the codebase are three `group-hover:scale-105` uses on poster thumbnails and the collapsed-sidebar disclosure icon; do not add more, and never on a committing control.

### 8. Low-Contrast Accessibility Traps (Grey-on-Grey)
- ❌ **The Slop:** Faint placeholder-style text (`text-gray-400` on white, or `text-zinc-600` on dark grey) masquerading as "minimalism", failing WCAG contrast ratios.
- ✅ **Mirage Standard:** High-contrast text hierarchy from tokens: `text-ink-primary` (`#161514` / `#F4F2EE`) for primary content, `text-ink-secondary` (`#5C5854` / `#A8A39D`) for metadata, `text-ink-tertiary` (`#8E8A84` / `#6E6A64`) reserved for placeholders and disabled icons. Always exceed WCAG AA contrast (minimum 4.5:1).

### 9. Marketing SaaS Filler Copy in Operational Tools
- ❌ **The Slop:** Injecting promotional jargon into internal interfaces (e.g. *"Empower your studio with next-gen 3D productivity"*, *"Unlock seamless pipeline potential"*, *"Your all-in-one asset hub"*).
- ✅ **Mirage Standard:** Direct, factual 3D studio vocabulary in English (*"3D Viewport"*, *"Metrology & Physical Scale"*, *"Asset Library"*, *"Export & Packaging Studio"*, *"AI Agent Studio"*). The renderer is declared `lang="en"`; keep UI strings, log messages, and errors in that register.

### 10. Non-Tabular Number Alignment & Arbitrary Ad-Hoc Utilities
- ❌ **The Slop:** Metrics and counts rendered with variable-width sans fonts (causing table columns to visually wobble and misalign), paired with invented inline classes (`p-[13px]`, `w-[317px]`, `text-[13.5px]`).
- ✅ **Mirage Standard:** Strict metrology alignment: all numeric data uses `font-mono`, which the base layer pins to `tabular-nums`. Spacing and sizing follow the standard Tailwind scale (`p-4`, `p-6`, `gap-3`). The only sanctioned arbitrary values are the micro-type sizes `text-[9px]`, `text-[10px]`, `text-[11px]` and the fixed widths of floating popovers (`w-[230px]`, `w-[320px]`). Arbitrary spacing, one-off font sizes, and hardcoded colours are not allowed.

### 11. The 'Synced' Green Dot & Ambient Cloud SaaS Status Slop (`● Synced` / Live Sync Badges)
- ❌ **The Slop:** Plastering ambient SaaS status indicators such as `● Synced`, green blinking "All changes saved" pills, or artificial cloud-sync dots in operational toolbars. It treats professionals like anxious web users who need constant cosmetic reassurance that their keystrokes aren't lost.
- ✅ **Mirage Standard:** Quiet, high-utility operational software. Display the factual entry name / identifier directly in the header. Auto-saving to the local library is an invariant, silent background certainty—never a decorative status pill. A status dot is legitimate only when it reports real, verifiable state (e.g. "provider has an API key"), and it must be paired with a `title` explaining that state.

### Known tolerances (ratchets)

The compliance suite tracks judgement calls instead of pretending a regex can make them. Current baselines:

| Item | Baseline | Where |
| :--- | :--- | :--- |
| `rounded-full` | 16 | Spinners, colour swatches, status dots |
| Coloured glow shadows | 1 | `Settings/AiProvidersSection.tsx` provider connection dot |
| `group-hover:scale-105` | 3 | Poster thumbnails (2), collapsed-sidebar icon (1) |

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
  - [ ] No marketing filler copy; vocabulary is honest and domain-accurate (English UI).
- [ ] **Apply Color Stack:** Build containers as `bg-surface-lowest border border-hairline` over `bg-canvas`, with `border-hairline-strong` for inputs and floating surfaces.
- [ ] **Elevation Check:** `shadow-xs` for resting cards; `shadow-2xl` only for modals, menus, tooltips, lightboxes. No coloured glows.
- [ ] **Typography Check:** Verify **no serif fonts** are present. `font-primary` for headers/labels, `font-body` for prose, `font-mono` for identifiers.
- [ ] **Tabular Numerals:** Any currency amount, order code, dimension, weight, slug, or polygon count uses `font-mono` (tabular numerals are applied globally).
- [ ] **Status Badges:** Map item statuses to the nine `StatusVariant` cases — do not invent a tenth.
- [ ] **Feedback:** Disable the trigger and show a spinner during mutations; report the outcome in an inline banner, never a floating toast.
- [ ] **Verify:** run `npm test` — `designSystemCompliance.test.ts` fails the build on forbidden rounding, gradients, hardcoded dark hexes, serif faces, and on any ratchet that grew.
