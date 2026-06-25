import React from "react";
import { useRoom } from "../context/RoomContext.jsx";
import { getGenreSprite } from "../utils/genreSprites.js";

function SpriteVisual({ sprite, genre, className, animationClass }) {
  if (sprite.image) {
    return (
      <img
        key={genre}
        src={sprite.image}
        alt={sprite.label}
        className={`${className} ${animationClass} object-contain`}
      />
    );
  }
  return (
    <span key={genre} className={`${className} ${animationClass} inline-block`}>
      {sprite.emoji}
    </span>
  );
}

function GlowBackdrop({ glow }) {
  const [colorA, colorB] = glow;
  return (
    <div
      className="genre-glow absolute inset-0 -z-10"
      style={{
        background: `radial-gradient(circle, ${colorA} 0%, ${colorB} 45%, transparent 75%)`,
      }}
    />
  );
}

function GenreSprite() {
  const { currentGenre } = useRoom();
  if (!currentGenre) return null;

  const sprite = getGenreSprite(currentGenre);

  return (
    <div className="relative flex items-center gap-2 overflow-hidden rounded-xl bg-neutral-900 px-4 py-3">
      <GlowBackdrop glow={sprite.glow} />
      <div className="relative flex items-center gap-2">
        <SpriteVisual
          sprite={sprite}
          genre={currentGenre}
          className="h-10 w-10 text-3xl drop-shadow-lg"
          animationClass="genre-sprite-bounce"
        />
        <span className="text-sm font-medium text-white drop-shadow">{sprite.label} vibes detected</span>
      </div>
    </div>
  );
}

export default GenreSprite;
