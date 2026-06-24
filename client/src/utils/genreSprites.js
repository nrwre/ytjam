// Placeholder emoji sprites. Drop real sprite images into
// client/src/assets/sprites/<genre>.png (or .gif) and swap the `emoji` field
// below for an `image` field pointing at the imported asset.
const GENRE_SPRITES = {
  rap: { emoji: "🎤", label: "Rap" },
  edm: { emoji: "🎧", label: "EDM" },
  classical: { emoji: "🎻", label: "Classical" },
  devotional: { emoji: "🛕", label: "Devotional" },
  pop: { emoji: "🎤", label: "Pop" },
  lofi: { emoji: "🌙", label: "Lo-fi" },
  other: { emoji: "🎵", label: "Music" },
};

function getGenreSprite(genre) {
  return GENRE_SPRITES[genre] || GENRE_SPRITES.other;
}

export { GENRE_SPRITES, getGenreSprite };
