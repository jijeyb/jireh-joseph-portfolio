# Jireh Joseph — Design System (v2)

Bold, clean, confident. Monochrome frame so the work brings the colour.
Plain HTML/CSS/JS, no build step. Tokens live at the top of `site.css`.

## Color
| Token | Value | Use |
| --- | --- | --- |
| `--paper` | `#F3F3F3` | Page background |
| `--ink` | `#0A0A0A` | Text, primary buttons, the Book section background |
| `--graphite` | `#545454` | Secondary text (6.9:1 on paper) |
| `--line` | ink at 14% | Hairline rules and borders |
| `--wash` | ink at 6% | Hover fills |

Inside `.ink` (About and Process) the tokens are swapped: paper `#0A0A0A`, ink `#F3F3F3`, graphite `#A6A6A6`, and light lines.

No accent color. Error text in the dark Book section uses `#FFB4A8`, and only for errors.

## Type
One family: **Poppins**, self-hosted (`assets/fonts`, latin subset, `font-display: swap`; 800/500/400 are preloaded).
Contrast comes from weight: 800 filled vs 600 outlined (`.outline`, transparent fill + `-webkit-text-stroke`).

| Role | Size | Weight |
| --- | --- | --- |
| Hero name | `clamp(76px, 14.5vw, 280px)` | 800 filled / 600 outlined |
| Section title | `clamp(40px, 5.5vw, 88px)` | 800 + 600 outlined word |
| Subheading | `clamp(22px, 2vw, 30px)` | 600 |
| Lead | `clamp(18px, 1.35vw, 21px)` | 400 |
| Body | 17px / 1.6 | 400 |
| Label (uppercase, .06em) | 13px | 500 |

Nothing renders below 12px (rail labels). Outlined text is used for one word per heading, never as decoration.

## Space and layout
- 4px base scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 144 (`--s-1` … `--s-10`).
- Sections alternate generous (144px) and compact spacing; content always clears the rail via `--rail-clear`.
- Square image edges, hairline rules, pills only for controls (buttons, filters, chips).
- Desktop: a horizontal nav pill fixed top-right, and equal page margins on both sides (`--rail-clear` = `--gutter-right`). Below 1024px: the same four links as a bottom bar.

## Motion
| Rule | Value |
| --- | --- |
| Entering / UI ease | `--ease-out: cubic-bezier(.23, 1, .32, 1)` |
| On-screen movement | `--ease-in-out: cubic-bezier(.77, 0, .175, 1)` |
| Press feedback | `scale(.97)`, 140ms |
| Hovers, toggles, menus | 220ms, gated behind `(hover: hover) and (pointer: fine)` |
| Scroll reveal | opacity + 16px rise, 700ms, once |
| Pointer parallax | one spring (stiffness 150, damping 21), `translate` property so entry animations keep `transform` |

The one authored moment is the hero:
1. The portrait rises (1s).
2. Each name line (all caps, tight leading, open tracking) rises from its mask while a feathered mask "writes" it left to right; the first name then floods with ink.
3. On desktop the hero is pinned for 75% of a screen: scrolling grows the portrait toward the viewer while the name falls back (driven in `site.js`, works in every browser).

The ink drop opens About. A pinned stage 290svh tall is driven by scroll in `site.js`:
1. A drop falls and splashes.
2. Three ripples spread.
3. Ink floods out with a liquid edge until the screen is black.
4. "About me." writes in with the hero's mask.

From there `.ink` swaps the color tokens, so About and Process sit on ink and run straight into Book. The About stage (desktop) is pinned for the whole section:
1. The portrait starts centred and zoomed.
2. The five statements (plain text, no panels) float around it in 3D. The three stats sit together on one solid band low over the portrait. They fly in from depth, bob gently, drift by depth and tilt with the mouse.
3. Approaching "What I do", the cards scatter toward the viewer and the portrait glides into the left column, where it stays beside "What I do" and "Tools I use".

Each card is placed with `--x` / `--y` (0–1) and `data-float="z,order"`. Phones get a simple stacked version. Under reduced motion the cards fade in place without flying, bobbing or tilting.

The second scroll moment is the work rail: vertical scroll becomes sideways travel. It moves only while you scroll, so it stays on under reduced motion, without easing or drift. The project viewer slides in sideways to match, and previous/next slide the content left or right.

`prefers-reduced-motion: reduce` gets fades only: no pinning, parallax, writing or ticker.

## Components
- **Nav**: horizontal pill (icon + label); a black sliding indicator marks the current section (scroll spy).
- **Buttons**: `.button--primary` (ink) and `.button--light` (paper, on dark); `.text-link` for secondary actions.
- **Work rail (home)**: on desktop the section pins and vertical scroll moves the cards sideways (eased, with each picture drifting inside its frame). It includes a `01 / 10` counter, a progress line, and focus-follows for keyboard users. Below 1024px it is a swipe carousel with scroll snap.
- **Work card**: index + kind label, cover, title, tagline. Hover: the name rolls up to its outlined copy, the caption line draws in, and the tool tags rise one by one (300ms, 70ms stagger). Cover types are picked from the data:
  - `case`: automation/AI work. Ink panel, headline result (`results[0]`), and the numbered flow (`cover.diagram`) or a screenshot.
  - `board`: tall presentation sheets on a grey mat. Hover scrolls through the sheet.
  - `video`: poster with a muted preview that plays on hover (`cover.video`).
  - `image`: everything else.
- **Archive grid**: the same cards in a wide/narrow/narrow/wide rhythm.
- **Project viewer**: native `<dialog>`; previous/next/close, ← → and Esc, deep links via `#project-id`.
- **Ticker**: client logos, the only marquee; pauses on hover, off-screen, or with its Pause button.
- **Contact form**: inline errors in plain language. Set `data-endpoint` on the form to a Formspree/Web3Forms URL to send directly; empty opens the visitor's email app with the message filled in.

## Content
All project text lives in `projects-data.js` (shared by the home page and `projects.html`).
`featured: true` puts a project on the home page; every project appears in the archive.
