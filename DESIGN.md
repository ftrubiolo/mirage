---
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

---

## 1. Core Principles: Operations vs. Webfront

| Dimension | Public Storefront (Webfront) | Operations & Tools (Non-Webfront) |
| :--- | :--- | :--- |
| **Primary Goal** | Brand desire, cultural curation, luxury storytelling | Task completion, data accuracy, rapid triage, utility |
| **Layout & Flow** | Pinned editorial monograph, 80vh visual media splits | Application-specific (kiosks, split panels, grids, modals) |
| **Typography** | Editorial Serif (`Source Serif 4`) + Monumental Titles | Sans-serif (`Montserrat` / `Manrope`) + Tabular Monospace |
| **Themes** | Light-ambient mineral daylight foundation | **Dual Light & Dark Mode** (for night shifts, low-light workshops, tablet kiosks) |
| **Pacing** | Contemplative, slow-scroll reading | Fast keyboard navigation, quick scanning, dense data entry |
| **Density** | Generous whitespace, relaxed margins | Compact, high information density, space efficiency |
| **Imagery** | Atmospheric moodshots, natural daylight styling | High-contrast thumbnails, 1:1 crops, 3D wireframes, inspection views |
| **Geometry** | Strictly `0px` unboxed monoliths | Architectural `0px` to `2px` border-framed structural containers |
| **Feedback** | Subtle ambient cues, silent background sync | Explicit status badges, progress toasts, confirm modals |

### The 4 Operational Tenets
1. **Zero Decorative Ambiguity:** Every visual element must convey information or facilitate action. Avoid purely decorative illustrations or animations.
2. **Tabular Numerals Everywhere:** Any numeric value (ARS currency, dimensions in cm, stock counts, batch IDs, order numbers, weights) must render in `JetBrains Mono` with `font-variant-numeric: tabular-nums`.
3. **Architectural Grid Enclosure:** Components are bounded by crisp `1px` hairlines (`border-outline/10` in light mode, `border-white/10` in dark mode). Elevated drop-shadows are reserved strictly for overlays.
4. **State Transparency:** In an artisan atelier with made-to-order manufacturing, states are multi-stage. Every entity explicitly exposes its lifecycle stage using codified color chips in both light and dark themes.

---

## 2. Token Foundations: Light & Dark Modes

Dark mode in the Sera Atelier is inspired by **volcanic basalt, smoked charcoal, cast iron, and dark patinated oak**. It rejects harsh `#000000` (which causes glare and severe eye fatigue in workshop lighting) and avoids generic cold blue-greys, preserving the organic, tactile warmth of the brand.

### 2.1 Surface & Layering Architecture

| Token | Light Mode Value | Dark Mode Value (Basalt/Charcoal) | Purpose |
| :--- | :--- | :--- | :--- |
| `canvas` | `#FDFDFD` | `#111110` | Base viewport / application canvas |
| `surface-lowest` | `#FFFFFF` | `#181816` | Main card, data table, and modal containers |
| `surface-low` | `#F7F5F2` | `#1F1E1C` | Table header, toolbar, and sub-header fills |
| `surface-container` | `#EFECE6` | `#272523` | Form inputs, divider chips, inactive pills |
| `surface-high` | `#DED9D1` | `#32302C` | Hover state on neutral table rows / list items |
| `surface-highest` | `#D5CFC5` | `#3E3B37` | Secondary button fills, prominent borders |

### 2.2 Inks & Hairlines

| Token | Light Mode Value | Dark Mode Value | Purpose |
| :--- | :--- | :--- | :--- |
| `ink-primary` | `#161514` | `#F4F2EE` | Primary titles, active values, high-contrast text |
| `ink-secondary` | `#5C5854` | `#A8A39D` | Secondary text, table cells, descriptive subtitles |
| `ink-tertiary` | `#8E8A84` | `#6E6A64` | Micro-labels, input placeholders, disabled icons |
| `hairline` | `rgba(22, 21, 20, 0.10)` | `rgba(244, 242, 238, 0.08)` | 1px structural table/card dividers |
| `hairline-strong` | `rgba(22, 21, 20, 0.20)` | `rgba(244, 242, 238, 0.16)` | Input borders, card outlines |

### 2.3 Action Engine: Carmín Ladrillo (Terracotta)

In dark mode, the action red is calibrated to `#B53420` (slightly lighter and more luminous than the light mode `#9A2716`) to maintain WCAG AAA contrast against dark basalt:

| State | Light Mode | Dark Mode | Tailwind Class Example |
| :--- | :--- | :--- | :--- |
| **Base Action** | `#9A2716` | `#B53420` | `bg-terracotta dark:bg-[#B53420]` |
| **Hover State** | `#801F10` | `#C83E28` | `hover:bg-terracotta/90 dark:hover:bg-[#C83E28]` |
| **Active State** | `#6B190D` | `#9A2716` | `active:bg-[#6B190D] dark:active:bg-[#9A2716]` |
| **Soft Container** | `rgba(154, 39, 22, 0.08)` | `rgba(181, 52, 32, 0.20)` | `bg-terracotta/10 dark:bg-[#B53420]/20` |
| **Selection Text** | `selection:bg-terracotta/20` | `dark:selection:bg-[#B53420]/40` | Highlight selection |

---

## 3. 9-Tier Semantic Palette: Light vs. Dark Mode

Operational states use high-contrast tinting in light mode and luminous dark pills in dark mode:

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

---

## 4. Typographic Hierarchy

Strict Rule: **Serif typefaces (`Source Serif 4`) are prohibited in non-webfront systems.** All typography uses sans-serif geometric/grotesque typefaces paired with technical monospace.

```
┌────────────────────────────────────────────────────────────────────────┐
│ App / Screen Title: 24px Montserrat Bold, tracking-tight               │
│ Subtitle: 12px Manrope Regular                                         │
├────────────────────────────────────────────────────────────────────────┤
│ Section Header: 14px Montserrat Semibold, uppercase                    │
│ Field Overline: 11px Montserrat Semibold, uppercase, tracking-wider    │
│ Body & Cells: 12px / 13px Manrope Medium, leading-normal               │
│ Numerals / SKUs: 12px JetBrains Mono Bold, tabular-nums                │
└────────────────────────────────────────────────────────────────────────┘
```

1. **Screen / View Titles:** `font-figtree text-2xl font-bold tracking-tight text-on-surface dark:text-[#F4F2EE]`
2. **Card & Section Headers:** `font-figtree text-sm font-semibold text-on-surface dark:text-[#F4F2EE]`
3. **Micro-Labels & Overlines:** `text-[10px]` or `text-xs font-semibold uppercase tracking-wider text-on-surface-variant dark:text-[#A8A39D]`
4. **Data Grid & Cell Text:** `text-xs text-on-surface dark:text-[#F4F2EE] font-manrope`
5. **Technical Numerals:** `font-mono tabular-nums text-on-surface dark:text-[#F4F2EE]` (ARS currency, dimensions, hex codes)

---

## 5. UI Component Catalog with Dark Mode Variations

Use these modular primitives across any layout or screen structure:

### 5.1 Buttons & Action Controls
```tsx
// Primary Action (Terracotta)
<button className="px-4 py-2 bg-terracotta hover:bg-terracotta/90 dark:bg-[#B53420] dark:hover:bg-[#C83E28] text-white text-xs font-semibold uppercase tracking-wider transition-colors rounded-xs shadow-xs flex items-center gap-2 disabled:opacity-50">
  <Save className="w-4 h-4" />
  <span>Guardar</span>
</button>

// Secondary Action (Surface Container)
<button className="px-4 py-2 bg-surface-container-highest dark:bg-[#272523] hover:bg-surface-dim dark:hover:bg-[#32302C] text-on-surface dark:text-[#F4F2EE] text-xs font-semibold uppercase tracking-wider transition-colors rounded-xs border border-outline/20 dark:border-white/10 flex items-center gap-2 disabled:opacity-50">
  <Eye className="w-4 h-4" />
  <span>Vista Previa</span>
</button>

// Destructive Action (Rose)
<button className="px-4 py-2 bg-rose-600 hover:bg-rose-700 dark:bg-rose-700 dark:hover:bg-rose-600 text-white text-xs font-semibold uppercase tracking-wider transition-colors rounded-xs shadow-xs flex items-center gap-2 disabled:opacity-50">
  <Trash2 className="w-4 h-4" />
  <span>Eliminar</span>
</button>

// Ghost Action (Subtle Outline)
<button className="px-3 py-1.5 border border-outline/20 dark:border-white/15 hover:bg-surface-container-high dark:hover:bg-[#272523] text-on-surface dark:text-[#F4F2EE] text-xs font-medium uppercase tracking-wider transition-colors">
  <span>Cancelar</span>
</button>
```

### 5.2 Status Badges & Pills (`AdminStatusBadge`)
Universal status chips supporting dual-mode:

```tsx
<span className="inline-flex items-center px-2 py-0.5 text-[10px] font-manrope font-medium uppercase tracking-wider border rounded-xs bg-emerald-50 text-emerald-800 border-emerald-300/60 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-500/30">
  En Stock
</span>
```

### 5.3 Data Tables (`AdminDataTable`)
Embeddable tabular grid component with complete dark mode support:
- **Table Wrapper:** `bg-surface-container-lowest dark:bg-[#181816] border border-outline/10 dark:border-white/10 shadow-xs overflow-hidden`
- **Control Bar:** `p-4 border-b border-outline/10 dark:border-white/10 flex items-center justify-between bg-surface-container-low/40 dark:bg-[#1F1E1C]/60`
- **Header Cells:** `px-4 py-3 font-semibold text-[11px] bg-surface-container-low/80 dark:bg-[#1F1E1C] text-on-surface-variant dark:text-[#A8A39D] uppercase tracking-wider`
- **Rows:** `hover:bg-surface-container-low/50 dark:hover:bg-[#272523]/50 transition-colors divide-y divide-outline/5 dark:divide-white/5`
- **Cells:** `px-4 py-3.5 text-xs text-on-surface dark:text-[#F4F2EE]`
- **Pagination Bar:** `px-4 py-3 border-t border-outline/10 dark:border-white/10 flex items-center justify-between text-xs text-on-surface-variant dark:text-[#A8A39D] bg-surface-container-low/20 dark:bg-[#1F1E1C]/30`

### 5.4 Form Cards & Input Controls
- **Card Container:** `bg-surface-container-lowest dark:bg-[#181816] border border-outline/10 dark:border-white/10 shadow-xs`
- **Card Header:** `p-5 border-b border-outline/10 dark:border-white/10 bg-surface-container-low/40 dark:bg-[#1F1E1C]/60 flex items-center justify-between`
- **Field Labels:** `text-xs font-semibold uppercase tracking-wider text-on-surface dark:text-[#F4F2EE] mb-1`
- **Text & Numeric Inputs:** `w-full bg-surface-container-lowest dark:bg-[#1F1E1C] border border-outline/20 dark:border-white/15 px-3 py-2 text-xs text-on-surface dark:text-[#F4F2EE] placeholder:text-on-surface-variant/60 dark:placeholder:text-[#6E6A64] focus:outline-none focus:border-terracotta dark:focus:border-[#B53420] rounded-none`
- **Currency & Metric Inputs:** Tabular numerals with fixed currency symbol:
  ```tsx
  <div className="relative">
    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-on-surface-variant dark:text-[#A8A39D] font-bold">$</span>
    <input type="number" className="w-full pl-7 pr-3 py-2 bg-surface-container-lowest dark:bg-[#1F1E1C] border border-outline/20 dark:border-white/15 text-xs font-mono font-bold text-on-surface dark:text-[#F4F2EE] focus:outline-none focus:border-terracotta rounded-none" />
  </div>
  ```
- **Helper Callouts:** Framed information banners:
  ```tsx
  <div className="p-3.5 bg-terracotta/5 dark:bg-[#B53420]/10 border border-terracotta/20 dark:border-[#B53420]/30 rounded-xs flex items-start gap-2.5 text-xs text-on-surface-variant dark:text-[#A8A39D]">
    <Info className="w-4 h-4 text-terracotta dark:text-[#B53420] shrink-0 mt-0.5" />
    <p>Nota técnica o regla operativa.</p>
  </div>
  ```

### 5.5 Modals & Overlays (`AdminModal`, `AdminConfirmDialog`)
- **Scrim:** `fixed inset-0 z-50 bg-black/40 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center p-4`
- **Surface:** `bg-surface-container-lowest dark:bg-[#181816] border border-outline/20 dark:border-white/15 shadow-2xl rounded-xs overflow-hidden`
- **Modal Header:** `px-6 py-4 border-b border-outline/10 dark:border-white/10 flex items-center justify-between bg-surface-container-low dark:bg-[#1F1E1C]`

### 5.6 KPI & Metric Cards
- **Card Root:** `p-5 bg-surface-container-lowest dark:bg-[#181816] border border-outline/10 dark:border-white/10 shadow-xs flex flex-col justify-between`
- **Header:** Micro-caps label + semantic icon pill (`bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300`).
- **Value:** Bold tabular figure (`font-figtree text-2xl font-bold text-on-surface dark:text-[#F4F2EE] mt-4`).
- **Trend:** Indicator pill (`text-emerald-700 dark:text-emerald-400 font-medium`).

### 5.7 Toast Feedback (`AdminToastContainer`)
- **Card:** `bg-surface-container-lowest dark:bg-[#181816] border shadow-lg px-4 py-3 flex items-start gap-3`
- **Semantic Glow Borders:**
  - Success: `border-emerald-500/30 dark:border-emerald-500/50`
  - Warning: `border-amber-500/30 dark:border-amber-500/50`
  - Error: `border-rose-500/30 dark:border-rose-500/50`
  - Info: `border-stone-400/30 dark:border-stone-600/50`

---

## 6. AI Slop Anti-Patterns & Aesthetic Enforcement

When generative AI tools (Claude, v0, Cursor, GPT) generate interfaces without explicit constraints, they default to the "statistical median" of modern web templates—often referred to in the industry as **"AI Slop"**. This creates homogenous, bloated, uninspired UIs that erode brand identity and degrade operational ergonomics.

All non-webfront tools in the Sera ecosystem must strictly audit against and eradicate the following **11 AI Slop Anti-Patterns**:

### 1. The "AI Purple-to-Cyan" Gradient & Neon Auras
- ❌ **The Slop:** `bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500`, neon glowing borders (`shadow-[0_0_25px_rgba(147,51,234,0.4)]`), or multi-color glowing aura backdrops behind cards.
- ✅ **Sera Standard:** Grounded mineral foundation. Flat opaque surfaces (`#FFFFFF` or basalt `#181816`). Action is strictly Carmín Ladrillo Terracotta (`#9A2716` / `#B53420`). Gradients and glowing borders are strictly forbidden.

### 2. The "Inter / Roboto" Monoculture
- ❌ **The Slop:** Applying generic `font-sans` (Inter or Roboto) to every single label, heading, button, and table cell without intentional pairing or tracking.
- ✅ **Sera Standard:** Disciplined dual-typeface pairing: tracked uppercase `Montserrat` for structural headers and micro-labels, `Manrope` for readable body/table text, and `JetBrains Mono` with `tabular-nums` for all metrology, dimensions, and financial data.

### 3. The "Three-Card Triad" & Gratuitous Bento Boxes
- ❌ **The Slop:** Forcing every feature, configuration screen, or setting into an identical 3-column bento grid where each card has a circular icon in a colored pastel background, a bold heading, and 2 lines of generic filler text.
- ✅ **Sera Standard:** Form strictly follows operational utility. High-density data tables for lists, split master-detail views for workflows, and structured card blocks for forms. Never force data into decorative bento boxes.

### 4. Hyper-Pill Rounding & Bubble-Wrap Geometry
- ❌ **The Slop:** Excessive `rounded-2xl`, `rounded-3xl`, or `rounded-full` pills applied to tables, form inputs, dialog boxes, and card containers, turning professional software into a toy.
- ✅ **Sera Standard:** Uncompromising architectural discipline: `rounded-none` (0px) or `rounded-xs` (2px max). Clean rectilinear geometry with crisp 1px borders.

### 5. Faux Glassmorphism & Blurry Card Stacking
- ❌ **The Slop:** Layering `backdrop-blur-md bg-white/10` with heavy `shadow-2xl` on every card and panel, causing sluggish GPU rendering and muddy text contrast.
- ✅ **Sera Standard:** Solid, opaque mineral layering (`surface-lowest` over `canvas`). Hierarchy is established via crisp `1px` hairlines (`border-outline/10` or `dark:border-white/10`), not fuzzy drop shadows. Drop shadows are reserved exclusively for floating overlays (modals, dropdowns, toasts).

### 6. The Sparkle Ticker (`✨ Sparkles`) & Magic Gimmicks
- ❌ **The Slop:** Sprinkling `✨` emoji or `Sparkles` Lucide icons onto standard search inputs, filter buttons, or action triggers to make them appear "AI-powered".
- ✅ **Sera Standard:** Functional, recognizable tool iconography only (`Search`, `Filter`, `Save`, `Printer`, `Clock`, `Truck`, `Boxes`). If an actual automated action occurs, label it clearly with honest technical terms (e.g. `Optimizar GLB`, `Calcular Flete`).

### 7. Unjustified Spring Physics & Micro-Interaction Jitter
- ❌ **The Slop:** Adding `hover:scale-105 transition-transform duration-300 ease-spring` or bouncy hover cards to table rows, inputs, and primary save buttons.
- ✅ **Sera Standard:** Rock-solid cursor ergonomics. Zero displacement or scale changes on hover. Use subtle, instantaneous color shifts (`transition-colors duration-150`) that respect mouse precision on dense desktop and tablet touch targets.

### 8. Low-Contrast Accessibility Traps (Grey-on-Grey)
- ❌ **The Slop:** Faint placeholder-style text (`text-gray-400` on white, or `text-zinc-600` on dark grey) masquerading as "minimalism", failing WCAG contrast ratios.
- ✅ **Sera Standard:** High-contrast text hierarchy: `text-on-surface` (`#161514`) / `dark:text-[#F4F2EE]` for primary content, and `text-on-surface-variant` (`#5C5854`) / `dark:text-[#A8A39D]` for secondary metadata. Always exceed WCAG AA contrast (minimum 4.5:1).

### 9. Marketing SaaS Filler Copy in Operational Tools
- ❌ **The Slop:** Injecting promotional jargon into internal interfaces (e.g. *"Empower your atelier with next-gen artisan productivity"*, *"Unlock seamless workshop potential"*, *"Your all-in-one furniture hub"*).
- ✅ **Sera Standard:** Direct, factual atelier vocabulary (*"Órdenes en Taller"*, *"Facturación ARS"*, *"Biblioteca de Acabados"*, *"Tiempos de Fabricación"*).

### 10. Non-Tabular Number Alignment & Arbitrary Ad-Hoc Utilities
- ❌ **The Slop:** Prices and stock counts rendered with variable-width sans fonts (causing table columns to visually wobble and misalign), paired with invented inline classes (`p-[13px]`, `w-[317px]`, `text-[13.5px]`).
- ✅ **Sera Standard:** Strict metrology alignment: all numeric data must use `font-mono tabular-nums`. Spacing and sizing must strictly adhere to the standard Tailwind scale (`p-4`, `p-6`, `gap-3`).

### 11. The 'Synced' Green Dot & Ambient Cloud SaaS Status Slop (`● Sincronizado` / Live Sync Badges)
- ❌ **The Slop:** Plastering ambient SaaS status indicators such as `● Sincronizado`, green blinking "All changes saved" pills, or artificial cloud-sync dots in operational toolbars. It treats professionals like anxious web users who need constant cosmetic reassurance that their keystrokes aren't lost.
- ✅ **Sera Standard:** Quiet, high-utility operational software. Display the factual entry name / identifier directly in the header. Auto-saving to local disk is an invariant, silent background certainty—never a decorative status pill.

---

## 7. Implementation Checklist for New Applications & Pages

When building any new app, tool, or screen, audit against both functionality and anti-slop rules:

- [ ] **Define App Layout:** Choose the layout that fits your application's domain (e.g., tablet split-view, fullscreen kiosk, multi-step modal, or drawer console).
- [ ] **Anti-Slop Audit:**
  - [ ] No purple/cyan gradients or glowing aura borders.
  - [ ] No `rounded-2xl` or bubble pills (strictly `rounded-none` or `rounded-xs`).
  - [ ] No decorative `✨ Sparkles` icons on non-AI features.
  - [ ] No scale/bounce hover animations (`hover:scale-*` banned on operational controls).
  - [ ] No marketing filler copy; vocabulary is honest and atelier-specific.
- [ ] **Dual-Mode Foundation:** Ensure every component includes both light and `dark:` Tailwind classes.
- [ ] **Apply Color Stack:** Build containers using `surface-container-lowest dark:bg-[#181816]` over `canvas dark:bg-[#111110]`, with `1px` hairlines (`border-outline/10 dark:border-white/10`).
- [ ] **Typography Check:** Verify **no serif fonts** are present. Use `Montserrat` for headers/labels and `Manrope` for body text.
- [ ] **Tabular Numerals:** Ensure all currency amounts, order codes, dimensions, and weights use `font-mono tabular-nums`.
- [ ] **Action Styling:** Primary triggers use Terracotta (`bg-terracotta dark:bg-[#B53420]`). Destructive actions use Rose (`bg-rose-600 dark:bg-rose-700`).
- [ ] **Status Badges:** Map item statuses to the 9-tier semantic palette using dual-mode badge classes.
- [ ] **Feedback:** Provide spinner states during mutations and trigger toast notifications upon completion.
