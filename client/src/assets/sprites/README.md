# Sprite images

Drop image files in this folder named exactly as below (`.png`, `.gif`, `.webp`,
`.jpg`, or `.svg` all work). The app automatically picks up any file that
matches one of these names — no code changes needed.

```
rap.png
edm.png
classical.png
devotional.png
pop.png
lofi.png
other.png
```

If a genre's image is missing, the app falls back to its placeholder emoji
automatically. Recommended size: a square image, at least 128x128, with a
transparent background (PNG) for the cleanest look against the colored glow
backdrop.

GIFs/animated WebP work too and will animate as-is (no CSS bounce animation
is applied on top of an image, to avoid fighting any built-in animation).
