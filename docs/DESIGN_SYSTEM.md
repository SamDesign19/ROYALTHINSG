# Design system

Direction: a premium technology brand. Quiet white surfaces, near-black type, one red accent used sparingly
(primary actions, price emphasis, focus). Product imagery carries the page; UI chrome stays out of the way.
Original to ROYAL INK — no borrowed brand assets or layouts.

Tokens live in [`design/tokens.css`](../design/tokens.css) and will be mapped into Tailwind's theme in Phase 2.

## Colour

| Token | Light | Dark | Use |
|---|---|---|---|
| `--ri-bg` | `#ffffff` | `#0b0b0c` | Page |
| `--ri-surface` | `#f6f6f7` | `#151517` | Cards on grey sections, inputs |
| `--ri-ink` | `#0d0d0f` | `#f4f4f5` | Primary text |
| `--ri-ink-2` | `#55565c` | `#a7a8ae` | Secondary text |
| `--ri-line` | `#e6e6e9` | `#26262a` | Hairline borders |
| `--ri-red` | `#c8102e` | `#ff3b4f` | Primary action, sale price, focus ring |
| `--ri-red-ink` | `#ffffff` | `#0b0b0c` | Text on red |
| `--ri-success` / `--ri-warning` | `#167c3a` / `#a35b00` | `#3ccf6e` / `#f2a33a` | In stock / low stock |

Red covers well under 10 % of any screen. Never red body text; never red and black large blocks side by side.

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
* **Buttons**: primary (red, white text), secondary (ink outline), quiet (text). 44 px min touch target.
* **Filters**: left rail on desktop, full-height sheet on mobile with sticky "Show N results".
* **Compatibility badge**: green check "Verified compatible with <printer>" on product pages; never shown for unverified links.
* **Forms**: labels above fields, inline validation messages, Algerian phone mask, wilaya → commune dependent selects.

## RTL rules

* Use logical properties only (`ms-*`, `me-*`, `start`, `end`); mirror directional icons (arrows, chevrons), not brand logos or media controls.
* Numbers, prices, SKUs and printer models stay LTR runs inside RTL text.
* Test every component in `ar` and `fr` before merging.
