import React from "react";
import { useRoom } from "../context/RoomContext.jsx";
import { getGenreSprite } from "../utils/genreSprites.js";

function GenreSprite() {
  const { currentGenre } = useRoom();
  if (!currentGenre) return null;

  const sprite = getGenreSprite(currentGenre);

  return (
    <div className="flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-3">
      <span key={currentGenre} className="genre-sprite-bounce text-3xl">
        {sprite.emoji}
      </span>
      <span className="text-sm text-neutral-400">{sprite.label} vibes detected</span>
    </div>
  );
}

export default GenreSprite;
