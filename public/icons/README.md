# PWA icons

This directory holds the PNG icon set declared by `/manifest.webmanifest` and
the Apple touch icon referenced from `src/layouts/Base.astro`.

Required files (populated in Phase 12 polish):

| File                        | Size     | Purpose                                    |
| --------------------------- | -------- | ------------------------------------------ |
| `icon-192.png`              | 192×192  | Android launcher / desktop PWA icon        |
| `icon-512.png`              | 512×512  | High-resolution PWA icon                   |
| `icon-512-maskable.png`     | 512×512  | Maskable variant for adaptive launchers    |
| `apple-touch-icon.png`      | 180×180  | iOS home-screen icon (REQ-PWA-001 AC 3)    |

ICON_STATUS: generated placeholders expected before Phase 13 deploy.

Do not commit real, non-placeholder binaries before the brand palette is
frozen — the `theme_color` / `background_color` in the manifest and the
Apple status-bar style in `Base.astro` must agree with the final artwork.
