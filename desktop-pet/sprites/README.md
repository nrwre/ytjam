# Sprite images

Drop image files in this folder named exactly as below (`.png`, `.gif`, or
`.webp`). The companion app automatically tries to load `sprites/<genre>.png`
first, then `.gif`, then `.webp`, falling back to the emoji placeholder if
none exist.

```
rap.png / rap.gif / rap.webp
edm.png / edm.gif / edm.webp
classical.png / classical.gif / classical.webp
devotional.png / devotional.gif / devotional.webp
pop.png / pop.gif / pop.webp
lofi.png / lofi.gif / lofi.webp
other.png / other.gif / other.webp
```

No code changes or rebuild needed -- just drop the files in and relaunch the
app (or rebuild the .exe with `npm run package` if you want the packaged
version to include them).
