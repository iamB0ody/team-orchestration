# icons/

Master source: `icon.svg` (1024×1024). **All platform-specific icons derive from this file.**

## Pipeline (runs at package time in wave 7)

```
icon.svg   ─►  rsvg-convert / sharp / Inkscape
              │
              ├──►  mac/icon.icns  (macOS, multi-size .icns bundle: 1024, 512, 256, 128, 64, 32, 16)
              ├──►  win/icon.ico   (Windows, multi-size .ico: 256, 128, 64, 48, 32, 16)
              └──►  linux/*.png    (Linux, separate files per size)
```

`electron-builder` can do this automatically if pointed at `icon.svg` (newer versions) — otherwise we pre-generate and commit the raster outputs.

## Design spec

- **Dimensions:** 1024×1024 master SVG
- **Background:** `#000000` (matches `--bg-0` from the hacker theme)
- **Primary glyph:** λ (lambda) in `#00ff41` (`--accent`)
- **Accent frame:** 2%-inset rounded rectangle in `#00a028` (`--accent-dim`) at 50% opacity for small-size readability
- **Corner markers:** 4 L-shaped accent clips (hacker-theme "viewport" motif)
- **Corner radius:** 12% (macOS applies its own squircle on top; Win/Linux use filled-square style)

## What NOT to change without review

- Bg color (must match `--bg-0` for window-to-icon visual continuity)
- Glyph color (must match `--accent`)
- The λ glyph itself (brand identity — matches Google-Fonts-loaded JetBrains Mono lambda the app renders elsewhere)

## Favicon parity

The browser favicon at `apps/dashboard/public/favicon.svg` mirrors this design at 32×32. Keep both in sync.
