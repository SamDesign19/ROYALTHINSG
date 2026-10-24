# Design system

Direction: a bold, graphic brand built on three colours — **lime `#cefb06`, ink `#1a1a1a`, paper `#f4f4ef`**
(shared with the owner's design studio). Paper pages, ink type, lime for the few things that must stand out
(primary actions, the hero block, highlights). Product imagery carries the page; UI chrome stays out of the way.
Original to ROYAL INK — no borrowed brand assets or layouts.

Tokens live in [`design/tokens.css`](../design/tokens.css) and are mapped into Tailwind's theme in
[`src/app/globals.css`](../src/app/globals.css) (`bg-bg`, `bg-surface`, `text-ink`, `text-ink-2`, `border-line`,
`bg-accent` / `text-accent-ink` for the lime, `text-danger`, `text-success`, `text-warning`, `rounded-control|card|media`,
`shadow-1|2`). Primitives are in `src/components/ui`, store components in `src/components/store`.

## Colour

| Token | Light | Dark | Use |
|---|---|---|---|
| `--ri-bg` | `#f4f4ef` | `#1a1a1a` | Page (paper / ink) |
| `--ri-surface` | `#e9e9e2` | `#242424` | Cards on grey sections, inputs, image placeholders |
| `--ri-ink` | `#1a1a1a` | `#f4f4ef` | Primary text, focus ring |
| `--ri-ink-2` | `#5c5c57` | `#a3a39d` | Secondary text |
| `--ri-line` | `#d9d9d0` | `#333333` | Hairline borders |
| `--ri-accent` | `#cefb06` | `#cefb06` | Primary action, hero block, discount badge, highlights |
| `--ri-accent-ink` | `#1a1a1a` | `#1a1a1a` | Text on lime; ink tiles (logo, hero art) |
| `--ri-danger` | `#c8102e` | `#ff5a5f` | Errors, alerts, negative stock moves |
| `--ri-success` / `--ri-warning` | `#167c3a` / `#a35b00` | `#3ccf6e` / `#f2a33a` | In stock / low stock |

Lime is a **fill, never a text colour** on paper (contrast too low): use `bg-accent text-accent-ink`. Errors use
`text-danger`. The footer is an ink block: `.ri-dark` applies the dark palette to any element.

## Typography

* Latin: **Inter** (variable). Arabic: **IBM Plex Sans Arabic**. Both self-hosted via `next/font`.
* Scale (rem): 0.75 · 0.875 · 1 · 1.125 · 1.375 · 1.75 · 2.25 · 3 · 4 (hero). Line height 1.5 body, 1.1 display.
* Display headings: weight 600, tracking −0.02em (Latin only; Arabic keeps 0).
* Product codes (`057H`, `TN-2420`) use tabular figures and `dir="ltr"` inside Arabic text.

## Space, shape, depth

* 4 px base grid; section rhythm 64 / 96 / 128 px (mobile / tablet / desktop).
* Content width 1280 px; reading width 68ch.
* Radius: 10 px controls, 16 px cards, 24 px hero media, full for chips.
* Shadows: `--ri-shadow-1` (cards on hover), `--ri-shadow-2` (popovers, cart drawer). Default cards are flat with a hairline border.

## Motion

* 150 ms (hover, press), 250 ms (drawers, menus), 400 ms (hero reveal). Easing `cubic-bezier(.2,.7,.2,1)`.
* Only `opacity` and `transform`. All motion is disabled under `prefers-reduced-motion`.

## Components (specs for Phase 2)

* **Header**: sticky, 64 px, white with backdrop blur after scroll. Logo · category menu · search field (expands to a
  command-style overlay on mobile) · language · account · cart with count. Mobile: bottom-sheet menu.
* **Product card**: 1:1 image on `--ri-surface`, brand + code line, name (2 lines max), origin badge
  (Original / Compatible), yield or volume, price in DZD (`18 000 DA`), availability dot, add-to-cart on hover/focus
  (always visible on touch).
* **Buttons**: primary (lime, ink text), inverse (ink, lime text — on lime blocks), secondary (ink outline), quiet (text). 44 px min touch target.
* **Filters**: left rail on desktop, full-height sheet on mobile with sticky "Show N results".
* **Compatibility badge**: green check "Verified compatible with <printer>" on product pages; never shown for unverified links.
* **Forms**: labels above fields, inline validation messages, Algerian phone mask, wilaya → commune dependent selects.

## RTL rules

* Use logical properties only (`ms-*`, `me-*`, `start`, `end`); mirror directional icons (arrows, chevrons), not brand logos or media controls.
* Numbers, prices, SKUs and printer models stay LTR runs inside RTL text.
* Test every component in `ar` and `fr` before merging.
