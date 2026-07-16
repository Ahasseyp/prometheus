---
name: Prometheus
description: A sharp, modern, private personal finance PWA.
colors:
  ledger-green: '#264D33'
  ledger-green-light: '#3A6B4C'
  ink: '#171717'
  ink-dark: '#F2F2F2'
  paper: '#FFFFFF'
  void: '#0D0D0D'
  surface: '#F5F5F5'
  surface-dark: '#171717'
  muted-ink: '#737373'
  muted-ink-dark: '#A3A3A3'
  destructive: '#B42318'
  destructive-light: '#F87171'
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
  sm: '0.375rem'
  md: '0.625rem'
  lg: '0.875rem'
  xl: '1rem'
spacing:
  sm: '0.5rem'
  md: '1rem'
  lg: '1.5rem'
  xl: '2rem'
components:
  button-primary:
    backgroundColor: '{colors.ledger-green}'
    textColor: '{colors.paper}'
    rounded: '{rounded.md}'
    padding: '0.75rem 1.25rem'
  button-primary-hover:
    backgroundColor: '{colors.ledger-green-light}'
  button-secondary:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    rounded: '{rounded.md}'
    padding: '0.75rem 1.25rem'
  button-ghost:
    backgroundColor: 'transparent'
    textColor: '{colors.ink}'
    rounded: '{rounded.md}'
    padding: '0.75rem 1.25rem'
  input:
    backgroundColor: 'transparent'
    textColor: '{colors.ink}'
    rounded: '{rounded.md}'
    padding: '0.75rem 1rem'
  card:
    backgroundColor: '{colors.paper}'
    textColor: '{colors.ink}'
    rounded: '{rounded.lg}'
    padding: '1rem'
---

# Design System: Prometheus

## 1. Overview: The Clear Ledger

**Creative North Star: "The Clear Ledger"**

Prometheus is a tool first and an atmosphere second. The interface is built around the idea of a clean, well-kept ledger: every number is legible, every action is explicit, and nothing decorative competes with the user's money. The personality is sharp, modern, and private — direct without being cold, confident without being loud.

The design rejects the clichés of both finance software and AI products. It is not a corporate banking portal, not a spreadsheet with a fresh coat of paint, and not a chat window that happens to do bookkeeping. Surfaces stay flat and orderly; color is used sparingly and purposefully; motion is reserved for feedback and state change.

**Key Characteristics:**

- **Restrained color strategy:** tinted neutrals plus one green accent used on ≤10% of any screen.
- **Dark-first, light-supported:** the primary crafted mode is dark; light mode is a clean, high-contrast inversion.
- **Tactile components:** buttons and inputs have clear boundaries, visible affordances, and immediate feedback.
- **Type-driven hierarchy:** one type family (Inter Variable) carries every role; hierarchy comes from weight, size, and spacing, not from display fonts.
- **Mobile-native spacing:** touch targets, bottom-sheet thinking, and voice-first shortcuts are designed for the phone first.

## 2. Colors

The palette is intentionally small. A single forest-green accent does the heavy lifting for action and focus; everything else is a neutral scale that stays out of the way. The green is user-specified and treated as the brand anchor.

### Primary

- **Ledger Green** (`#264D33`): the brand anchor. Used for primary buttons, active selection, focus rings, and the most important status indicators. In dark mode, lift to **Ledger Green Light** (`#3A6B4C`) so it does not sink into near-black backgrounds.

### Neutral

- **Paper** (`#FFFFFF`): the light-mode canvas. Pure white keeps the interface crisp and avoids the warm-cream AI default.
- **Void** (`#0D0D0D`): the dark-mode canvas. Near-black with no hue tint.
- **Ink** (`#171717`): primary text and strong UI elements in light mode.
- **Ink Dark** (`#F2F2F2`): primary text in dark mode.
- **Surface** (`#F5F5F5`): secondary backgrounds, hover states, and subtle grouping in light mode.
- **Surface Dark** (`#171717`): elevated cards, sheets, and panels in dark mode.
- **Muted Ink** (`#737373`) / **Muted Ink Dark** (`#A3A3A3`): secondary labels, placeholders, and helper text.

### Semantic

- **Destructive** (`#B42318` light / `#F87171` dark): errors, deletion, and irreversible actions.

### Named Rules

**The Green Sparingly Rule.** Ledger green appears on no more than 10% of any given screen. Its rarity is what makes it signal action; if it is everywhere, it is nowhere.

**The Pure Surface Rule.** Backgrounds are pure white in light mode and pure near-black in dark mode. No warm cream, no tinted gray "for personality" — the brand lives in the green accent and the typography, not in the surface.

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

Elevation is communicated through subtle tonal shifts first and soft shadows second. Cards and panels sit on slightly different background values; shadows are used sparingly to lift modals, bottom sheets, and floating actions above the content layer.

### Shadow Vocabulary

- **Card shadow** (`0 1px 3px rgba(0, 0, 0, 0.07), 0 1px 2px rgba(0, 0, 0, 0.05)`): the default shadow for cards and grouped content in light mode. In dark mode, shadow is reduced because tonal separation already provides hierarchy.
- **Overlay shadow** (`0 10px 30px rgba(0, 0, 0, 0.12), 0 4px 8px rgba(0, 0, 0, 0.08)`): modals, bottom sheets, and dropdowns. In dark mode, use a denser black shadow (`0 10px 30px rgba(0, 0, 0, 0.5)`).

### Named Rules

**The Shadow-As-Response Rule.** Shadows appear as a response to elevation or interaction, not as a default texture. Flat at rest, lifted on demand.

## 5. Components

Every interactive component ships with default, hover, focus, active, disabled, and loading states.

### Buttons

- **Shape:** rounded-md (`0.625rem`), padding `0.75rem 1.25rem`, font-weight 500, label size.
- **Primary:** Ledger Green fill (`#264D33`), white text, no border. Hover darkens slightly or lifts to Ledger Green Light on dark surfaces.
- **Secondary:** Surface fill (`#F5F5F5`), Ink text, no border in light mode; in dark mode, use a subtle border on a transparent fill.
- **Ghost:** transparent fill, Ink text, hover uses Surface background.
- **Focus:** a 2px ring in Ledger Green with 2px offset.
- **Disabled:** reduced opacity (0.5), no hover lift, cursor not-allowed.

### Inputs / Fields

- **Style:** transparent background, 1px border in `rgba(23,23,23,0.16)` (light) / `rgba(242,242,242,0.15)` (dark), rounded-md.
- **Focus:** border color transitions to Ledger Green; ring appears outside the border.
- **Error:** border and ring switch to Destructive; helper text below uses Destructive color.
- **Disabled:** muted border, muted text, no focus ring.

### Cards / Containers

- **Corner Style:** rounded-lg (`0.875rem`).
- **Background:** Paper in light mode, Surface Dark in dark mode.
- **Shadow Strategy:** Card shadow by default; remove shadow when the card is inside another elevated surface.
- **Border:** optional 1px border in subtle neutral; use it when the card sits on a surface of the same color.
- **Internal Padding:** `1rem` default, `1.5rem` for feature cards.

### Navigation

- **Mobile:** a bottom tab bar with tactile 48×48 touch targets, label size text, and Ledger Green for the active item.
- **Desktop:** a collapsible side rail or top bar with the same active-state treatment; inactive items use Muted Ink.
- **Hover:** background shifts to Surface (light) or a lightened Surface Dark (dark).

### Status Chips

- **Shape:** rounded-full, padding `0.25rem 0.75rem`, label size.
- **Default:** Surface fill, Ink text.
- **Positive:** very light green tint fill (`#EAF3EE`), Ledger Green text.
- **Destructive:** very light red tint fill, Destructive text.

## 6. Do's and Don'ts

### Do:

- **Do** use Ledger Green only for primary actions, active navigation, focus rings, and the most important status indicators.
- **Do** keep light-mode backgrounds pure white (`#FFFFFF`) and dark-mode backgrounds near-black (`#0D0D0D`).
- **Do** design every screen so it works without voice or chat — traditional forms and buttons are the baseline.
- **Do** show currency explicitly next to every monetary value; never rely on context alone.
- **Do** respect `prefers-reduced-motion` by disabling non-essential transitions and animations.
- **Do** cap body prose at 65–75ch for readability.

### Don't:

- **Don't** use a chat-only AI widget pattern; every voice/text feature must also be reachable through forms and buttons.
- **Don't** use side-stripe borders greater than 1px as colored accents on cards or list items.
- **Don't** use gradient text, glassmorphism as a default, or decorative blur for atmosphere.
- **Don't** rely on color alone to communicate status, budget health, or required fields.
- **Don't** use warm cream, sand, or beige as the default background "for warmth."
- **Don't** ship components with missing hover, focus, active, disabled, or loading states.
