# Austin Zani Redesign - Dark Theme Reference

## Intent

The light Claude artifact establishes a zine/collage direction: paper texture, dot-grid structure, dashed outlines, serif display type, grotesk UI type, mono labels, and a user-selectable accent. The dark theme keeps that same printed-object language while avoiding a pure-black app shell.

## Palette

Use these values as CSS custom properties in the token layer.

| Token | Light | Dark | Notes |
| --- | --- | --- | --- |
| `--color-paper` | `#fffaf0` | `#15120f` | Main page background; warm paper, never pure white/black. |
| `--color-paper-muted` | `#f4ead8` | `#221d18` | Secondary bands and quiet card fills. |
| `--color-ink` | `#19130d` | `#f6efe3` | Primary text. |
| `--color-ink-muted` | `#675d50` | `#b9aa96` | Body-support text and helper labels. |
| `--color-line` | `#2a2117` | `#d8c9b4` | High-contrast dashed borders. |
| `--color-line-muted` | `#d8c9b4` | `#40372e` | Dividers, inactive controls, and low-emphasis outlines. |
| `--color-surface` | `#fff6e6` | `#1c1814` | Cards, popovers, modals. |
| `--color-surface-raised` | `#fffdf8` | `#272019` | Active/raised cards. |
| `--color-grid-dot` | `rgba(25, 19, 13, 0.16)` | `rgba(246, 239, 227, 0.12)` | Dot-grid background. |

## Accent Swatches

The default accent is the existing brand orange, `#ff8200`. The same accent variables are shared across light and dark modes, with separate soft backgrounds for contrast.

| Accent | Base | Soft Light | Soft Dark |
| --- | --- | --- | --- |
| Orange | `#ff8200` | `#ffe1bd` | `#4a2a0a` |
| Blue | `#2f80ed` | `#d6e8ff` | `#17345e` |
| Green | `#1aa36f` | `#cff4e4` | `#123f30` |
| Pink | `#e84a8a` | `#ffd8e8` | `#5b1834` |

## Usage Rules

- Body backgrounds use `--color-paper` with the dot-grid pattern.
- Primary surfaces use dashed `--color-line` borders and no large shadow unless the element is a modal/popover.
- Supporting surfaces use `--color-paper-muted` or `--color-surface`; avoid stacked card-in-card layouts.
- Active controls use `--color-accent` for foreground/border and `--color-accent-soft` for fills.
- Typography maps to Instrument Serif for display, Space Grotesk for body/UI, and IBM Plex Mono for labels/metadata.
- Dark mode keeps border contrast visible; inactive dashed borders use `--color-line-muted`, not low-alpha accent colors.
