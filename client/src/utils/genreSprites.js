// Placeholder emoji sprites. Drop real sprite images into
// client/src/assets/sprites/<genre>.png (or .gif) and swap the `emoji` field
// below for an `image` field pointing at the imported asset.
// `glow` colors drive the gradient/glow behind the sprite.
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
  return GENRE_SPRITES[genre] || GENRE_SPRITES.other;
}

export { GENRE_SPRITES, getGenreSprite };
