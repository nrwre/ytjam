// Drop image files into client/src/assets/sprites/<genre>.{png,gif,webp,jpg,svg}
// and they're picked up automatically -- no code changes needed. See the
// README in that folder for exact filenames. Falls back to an emoji
// placeholder for any genre without an image.
const spriteImages = import.meta.glob("../assets/sprites/*.{png,gif,webp,jpg,jpeg,svg}", {
  eager: true,
  import: "default",
});

function findImage(genre) {
  for (const path in spriteImages) {
    const filename = path.split("/").pop().replace(/\.[^.]+$/, "");
    if (filename === genre) return spriteImages[path];
  }
  return null;
}

const GENRE_SPRITES = {
  rap: { emoji: "🎤", label: "Rap", glow: ["#a855f7", "#ec4899"] },
  edm: { emoji: "🎧", label: "EDM", glow: ["#22d3ee", "#84cc16"] },
  classical: { emoji: "🎻", label: "Classical", glow: ["#facc15", "#f97316"] },
  devotional: { emoji: "🛕", label: "Devotional", glow: ["#fb923c", "#f43f5e"] },
  pop: { emoji: "🎤", label: "Pop", glow: ["#f472b6", "#fbbf24"] },
  lofi: { emoji: "🌙", label: "Lo-fi", glow: ["#818cf8", "#a78bfa"] },
  other: { emoji: "🎵", label: "Music", glow: ["#94a3b8", "#64748b"] },
};

function getGenreSprite(genre) {
  const key = GENRE_SPRITES[genre] ? genre : "other";
  return { ...GENRE_SPRITES[key], image: findImage(key) };
}

export { GENRE_SPRITES, getGenreSprite };
