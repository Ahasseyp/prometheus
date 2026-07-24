---
name: Prometheus
description: A sharp, modern, private personal finance PWA.
colors:
  soft-paper: 'oklch(0.995 0.006 85)'
  soft-background: 'oklch(0.98 0.005 85)'
  soft-ink: 'oklch(0.18 0.02 90)'
  soft-primary: 'oklch(0.42 0.09 150)'
  soft-primary-dark: 'oklch(0.55 0.11 145)'
  soft-sidebar: 'oklch(0.96 0.008 85)'
  soft-card-dark: 'oklch(0.12 0.015 85)'
  soft-foreground-dark: 'oklch(0.93 0.01 85)'
  soft-muted: 'oklch(0.52 0.02 90)'
  soft-destructive: 'oklch(0.55 0.17 25)'
typography:
  display:
    fontFamily: 'Inter Variable, system-ui, -apple-system, BlinkMacSystemFont, sans-serif'
    fontSize: '2.5rem'
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: '-0.02em'
  headline:
    fontFamily: 'Inter Variable, system-ui, -apple-system, BlinkMacSystemFont, sans-serif'
    fontSize: '1.5rem'
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: '-0.01em'
  title:
    fontFamily: 'Inter Variable, system-ui, -apple-system, BlinkMacSystemFont, sans-serif'
    fontSize: '1.125rem'
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: 'Inter Variable, system-ui, -apple-system, BlinkMacSystemFont, sans-serif'
    fontSize: '1rem'
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: 'Inter Variable, system-ui, -apple-system, BlinkMacSystemFont, sans-serif'
    fontSize: '0.875rem'
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: '0'
rounded:
  sm: '0.6rem'
  md: '0.8rem'
  lg: '1rem'
  xl: '1.4rem'
  2xl: '1.8rem'
spacing:
  sm: '0.5rem'
  md: '1rem'
  lg: '1.5rem'
  xl: '2rem'
components:
  button-primary:
    backgroundColor: '{colors.soft-primary}'
    textColor: '{colors.soft-paper}'
    rounded: '{rounded.md}'
    padding: '0.75rem 1.25rem'
  button-primary-hover:
    backgroundColor: '{colors.soft-primary-dark}'
  button-secondary:
    backgroundColor: '{colors.soft-sidebar}'
    textColor: '{colors.soft-ink}'
    rounded: '{rounded.md}'
    padding: '0.75rem 1.25rem'
  button-ghost:
    backgroundColor: 'transparent'
    textColor: '{colors.soft-ink}'
    rounded: '{rounded.md}'
    padding: '0.75rem 1.25rem'
  input:
    backgroundColor: 'transparent'
    textColor: '{colors.soft-ink}'
    rounded: '{rounded.md}'
    padding: '0.75rem 1rem'
  card:
    backgroundColor: '{colors.soft-paper}'
    textColor: '{colors.soft-ink}'
    rounded: '{rounded.lg}'
    padding: '1rem'
---

# Design System: Prometheus

## 1. Overview: The Calm Ledger

**Creative North Star: "The Calm Ledger"**

Prometheus is built around the idea of a ledger that feels calm before it feels clever. The interface is soft, rounded, and warm without drifting into decorative pastels. Color is restrained, type is clear, and every interactive surface responds with a small, purposeful lift. The personality is still sharp, modern, and private — but the visual translation is now warmer and more tactile than the earlier high-contrast system.

The design rejects the clichés of both finance software and AI products. It is not a corporate banking portal, not a spreadsheet with a fresh coat of paint, and not a chat window that happens to do bookkeeping. Surfaces are layered gently; color is used sparingly and purposefully; motion is reserved for feedback and state change.

**Key Characteristics:**

- **Locked Soft preset:** the active visual system is the `soft` preset for both light and dark modes. Other preset configs (`sharp`, `glow`, `midnight`) remain in the codebase but are dormant; `contrast` has been removed.
- **Warm tinted neutrals:** backgrounds carry a whisper of warm-neutral hue (OKLCH hue ~85); the surface never reads as cold gray or generic cream.
- **Tactile components:** buttons have internal gradient and glow; cards always have borders and shadows; the selected sidebar item sits in primary color with a harder lift shadow.
- **Internal glows, not outer auras:** glow and gradient effects live inside components (`glow-internal`) rather than as outer decorative shadows.
- **Type-driven hierarchy:** one type family (Inter Variable) carries every role; hierarchy comes from weight, size, and spacing.
- **Mobile-native spacing:** touch targets, bottom-sheet thinking, and voice-first shortcuts are designed for the phone first.

## 2. Colors

The palette is small and warm. A single sage-green accent does the heavy lifting for action and focus; everything else is a warm neutral scale that stays out of the way. OKLCH is the canonical token format; values below match `apps/web/src/index.css` under the `.preset-soft` blocks.

### Primary

- **Soft Sage** (`oklch(0.42 0.09 150)`): the brand anchor in light mode. Used for primary buttons, active sidebar selection, focus rings, and the most important status indicators.
- **Soft Sage Bright** (`oklch(0.55 0.11 145)`): the lifted dark-mode primary. Same role as Soft Sage, but chroma and lightness are raised so it does not sink into near-black backgrounds.

### Neutral

- **Soft Paper** (`oklch(0.995 0.006 85)`): the light-mode card and popover surface. Slightly warmer and lighter than the body.
- **Soft Background** (`oklch(0.98 0.005 85)`): the light-mode body canvas. Warm tinted, but still crisp.
- **Soft Ink** (`oklch(0.18 0.02 90)`): primary text and strong UI elements in light mode.
- **Soft Foreground Dark** (`oklch(0.93 0.01 85)`): primary text in dark mode.
- **Soft Sidebar** (`oklch(0.96 0.008 85)`): the light-mode sidebar panel — slightly deeper than the body for subtle separation.
- **Soft Card Dark** (`oklch(0.12 0.015 85)`): elevated cards, sheets, and panels in dark mode.
- **Soft Muted** (`oklch(0.52 0.02 90)`): secondary labels, placeholders, and helper text in light mode; dark mode muted is `oklch(0.65 0.015 85)`.

### Semantic

- **Destructive** (`oklch(0.55 0.17 25)` light / `oklch(0.7 0.16 25)` dark): errors, deletion, and irreversible actions.

### Named Rules

**The Soft-Default Rule.** The `soft` preset is the only active visual preset. Preset configs for `sharp`, `glow`, and `midnight` remain in code for future use but must not be surfaced to users.

**The Green Sparingly Rule.** Soft Sage appears on no more than 10% of any given screen. Its rarity is what makes it signal action; if it is everywhere, it is nowhere.

**The Warm-Not-Cream Rule.** Backgrounds are warm-tinted neutrals, not pure white or beige cream. The warmth is subtle (OKLCH chroma < 0.02) and consistent across surfaces.

## 3. Typography

**Font Family:** Inter Variable, system-ui, -apple-system, BlinkMacSystemFont, sans-serif  
**Character:** A single, highly legible sans-serif family used across every role. It is neutral, engineered, and readable at small sizes — the right voice for a private financial tool.

### Hierarchy

- **Display** (600, 2.5rem / 40px, line-height 1.1, -0.02em tracking): empty-state heroes, welcome screens, and large confirmation moments.
- **Headline** (600, 1.5rem / 24px, line-height 1.2, -0.01em tracking): page titles, modal headers, and major section heads.
- **Title** (600, 1.125rem / 18px, line-height 1.3): card titles, list section headers, and form group labels.
- **Body** (400, 1rem / 16px, line-height 1.5): primary reading text. Keep line length between 65–75ch for long prose.
- **Label** (500, 0.875rem / 14px, line-height 1.4): buttons, input labels, badges, and tab labels. No uppercase / wide-tracking default; use sentence case.

### Named Rules

**The One Family Rule.** Inter Variable carries every typographic role. No secondary display font, no mono for decoration, no mixing of similar sans-serifs.

**The Fixed Step Rule.** Type sizes are fixed rem values, not fluid clamps. Product UI is viewed at consistent device sizes; fluid scaling makes sidebars and dense screens unpredictable.

## 4. Elevation

Elevation is communicated through a combination of warm shadows, tonal separation, and inset glows. Cards and panels sit on slightly different background values; shadows are soft and warm in light mode, denser and blacker in dark mode. Glow is always internal (`inset`) to keep the effect inside the component boundary.

### Shadow Vocabulary

All shadow values are stored as CSS custom properties and referenced via `shadow-[var(--shadow-*)]`.

- **Card shadow** (`0 2px 8px oklch(0.2 0.02 85 / 0.08), 0 1px 2px oklch(0.2 0.02 85 / 0.05)`): the default shadow for cards and grouped content in light mode.
- **Elevated shadow** (`0 8px 24px oklch(0.2 0.02 85 / 0.1), 0 4px 8px oklch(0.2 0.02 85 / 0.06)`): dropdowns, sheets, and floating panels.
- **Float shadow** (`0 18px 48px oklch(0.2 0.02 85 / 0.14), 0 8px 16px oklch(0.2 0.02 85 / 0.08)`): modals and bottom sheets.
- **Button shadow** (`0 1px 2px oklch(0.2 0.02 85 / 0.14), inset 0 1px 0 oklch(1 0 0 / 0.2)`): resting primary button.
- **Button hover shadow** (`0 2px 4px oklch(0.2 0.02 85 / 0.18), inset 0 1px 0 oklch(1 0 0 / 0.24)`): primary button hover.
- **Sidebar active shadow** (`0 2px 2px oklch(0.2 0.02 85 / 0.22), inset 0 1px 0 oklch(1 0 0 / 0.2)`): selected sidebar item in light mode.
- **Sidebar active hover shadow** (`0 2px 3px oklch(0.2 0.02 85 / 0.28), inset 0 1px 0 oklch(1 0 0 / 0.24)`): selected sidebar item hover — harder than the resting selected state.

In dark mode, warm tinted shadow colors are replaced with near-black shadows and primary-tinted button/sidebar glows. Button and sidebar active shadows use `oklch(from var(--primary) l c h / ...)` so they glow with the primary hue.

### Named Rules

**The Internal-Glow Rule.** Glow effects are inset (`box-shadow: inset ...`) or carried by internal gradients. Never cast a colored outer glow as a decorative atmosphere.

**The Shadow-As-Response Rule.** Shadows appear as a response to elevation or interaction, not as a default texture. Flat at rest, lifted on demand.

## 5. Components

Every interactive component ships with default, hover, focus, active, disabled, and loading states.

### Buttons

- **Shape:** `rounded-md` (`0.8rem` under Soft), padding `0.75rem 1.25rem`, font-weight 500, label size.
- **Primary:** borderless (`border-0`), Soft Sage gradient fill (`bg-gradient-button`), white text, `shadow-[var(--shadow-button)]`.
- **Hover / Focus:** internal `glow-internal`, stronger `shadow-[var(--shadow-button-hover)]`, and a 2px ring in Soft Sage with 2px offset.
- **Secondary:** Soft Sidebar fill (`oklch(0.96 0.008 85)`), Ink text, no border in light mode; in dark mode, use a subtle border on a transparent fill.
- **Ghost:** transparent fill, Ink text, hover uses muted background.
- **Disabled:** reduced opacity (0.5), no hover lift, cursor not-allowed.

### Inputs / Fields

- **Style:** transparent background, 1px border in `oklch(0.88 0.015 85)` (light) / `oklch(1 0 0 / 8%)` (dark), `rounded-md`.
- **Focus:** border color transitions to Soft Sage; ring appears outside the border.
- **Error:** border and ring switch to Destructive; helper text below uses Destructive color.
- **Disabled:** muted border, muted text, no focus ring.

### Cards / Containers

- **Corner Style:** `rounded-lg` (`1rem` under Soft).
- **Background:** Soft Paper in light mode, Soft Card Dark in dark mode.
- **Shadow Strategy:** Card shadow is mandatory. Use `shadow-[var(--shadow-card)]` on every card.
- **Border:** mandatory 1px border in `border` color (`oklch(0.88 0.015 85)` light / `oklch(1 0 0 / 8%)` dark).
- **Internal Padding:** `1rem` default, `1.5rem` for feature cards.

### Navigation

- **Mobile:** a bottom tab bar with tactile touch targets, label size text, and Soft Sage for the active item.
- **Desktop:** a collapsible side rail (`variant="inset"`) with the same active-state treatment.
- **Default / Hover:** background shifts to the muted/accent surface (`bg-sidebar-accent`).
- **Selected:** primary fill (`bg-primary text-primary-foreground`), gradient overlay (`data-active:before:bg-gradient-button` at 40% opacity), and `shadow-[var(--shadow-sidebar-active)]`.
- **Selected hover:** brighter (`brightness-105`), overlay opacity rises to 50%, and shadow switches to `var(--shadow-sidebar-active-hover)` for a harder lift. The selected state must never look identical to the unselected hover state.

### Status Chips

- **Shape:** `rounded-full`, padding `0.25rem 0.75rem`, label size.
- **Default:** muted fill, Ink text.
- **Positive:** very light sage tint fill, Soft Sage text.
- **Destructive:** very light red tint fill, Destructive text.

## 6. Do's and Don'ts

### Do:

- **Do** keep the active visual preset locked to `soft` for both light and dark modes.
- **Do** use Soft Sage only for primary actions, active navigation, focus rings, and the most important status indicators.
- **Do** give every card a border and a shadow.
- **Do** make primary buttons borderless (`border-0`) with an internal gradient fill and internal glow on hover.
- **Do** design every screen so it works without voice or chat — traditional forms and buttons are the baseline.
- **Do** show currency explicitly next to every monetary value; never rely on context alone.
- **Do** respect `prefers-reduced-motion` by disabling non-essential transitions and animations.
- **Do** cap body prose at 65–75ch for readability.
- **Do** make the selected sidebar item visually distinct from hover, using primary fill, gradient overlay, and a harder shadow on selected-hover.

### Don't:

- **Don't** expose preset switching in the UI; the `PresetSwitcher` component is currently unused.
- **Don't** use a chat-only AI widget pattern; every voice/text feature must also be reachable through forms and buttons.
- **Don't** use side-stripe borders greater than 1px as colored accents on cards or list items.
- **Don't** use gradient text, glassmorphism as a default, or decorative blur for atmosphere.
- **Don't** rely on color alone to communicate status, budget health, or required fields.
- **Don't** cast colored outer glows as decorative shadows.
- **Don't** let hover on a selected item look identical to hover on an unselected item.
- **Don't** ship components with missing hover, focus, active, disabled, or loading states.
