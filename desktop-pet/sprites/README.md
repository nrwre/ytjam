# Sprite images

Drop image files in this folder named exactly as below. The companion app
tries extensions in this order: `.png`, `.gif`, `.webp`, `.jpg`, `.jpeg` --
falling back to the emoji placeholder if none exist for a genre.

```
rap.{png,gif,webp,jpg,jpeg}
edm.{png,gif,webp,jpg,jpeg}
classical.{png,gif,webp,jpg,jpeg}
devotional.{png,gif,webp,jpg,jpeg}
pop.{png,gif,webp,jpg,jpeg}
lofi.{png,gif,webp,jpg,jpeg}
other.{png,gif,webp,jpg,jpeg}
```

No code changes or rebuild needed -- just drop the files in and relaunch the
app (or rebuild the .exe with `npm run package` if you want the packaged
version to include them).
