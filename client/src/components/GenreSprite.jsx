import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRoom } from "../context/RoomContext.jsx";
import { getGenreSprite } from "../utils/genreSprites.js";

const supportsPiP = typeof window !== "undefined" && "documentPictureInPicture" in window;

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

function SpriteContent({ sprite, genre }) {
  return (
    <div className="relative flex h-full flex-col items-center justify-center gap-2 overflow-hidden bg-transparent text-white">
      <GlowBackdrop glow={sprite.glow} />
      <span key={genre} className="genre-sprite-bounce text-6xl drop-shadow-lg">
        {sprite.emoji}
      </span>
      <span className="text-sm font-medium drop-shadow">{sprite.label} vibes</span>
    </div>
  );
}

function GenreSprite() {
  const { currentGenre } = useRoom();
  const [pipWindow, setPipWindow] = useState(null);

  useEffect(() => {
    if (!pipWindow) return;
    function onPageHide() {
      setPipWindow(null);
    }
    pipWindow.addEventListener("pagehide", onPageHide);
    return () => pipWindow.removeEventListener("pagehide", onPageHide);
  }, [pipWindow]);

  async function openPiP() {
    if (!supportsPiP || pipWindow) return;
    const pip = await window.documentPictureInPicture.requestWindow({ width: 220, height: 160 });

    const reset = pip.document.createElement("style");
    reset.textContent = "html, body { margin: 0; height: 100%; background: transparent; }";
    pip.document.head.appendChild(reset);

    for (const styleSheet of document.styleSheets) {
      try {
        const css = [...styleSheet.cssRules].map((rule) => rule.cssText).join("\n");
        const style = pip.document.createElement("style");
        style.textContent = css;
        pip.document.head.appendChild(style);
      } catch {
        // cross-origin stylesheets can't be read; skip
      }
    }

    setPipWindow(pip);
  }

  function closePiP() {
    pipWindow?.close();
    setPipWindow(null);
  }

  if (!currentGenre) return null;

  const sprite = getGenreSprite(currentGenre);

  return (
    <div className="relative flex items-center justify-between gap-2 overflow-hidden rounded-xl bg-neutral-900 px-4 py-3">
      <GlowBackdrop glow={sprite.glow} />
      <div className="relative flex items-center gap-2">
        <span key={currentGenre} className="genre-sprite-bounce text-3xl drop-shadow-lg">
          {sprite.emoji}
        </span>
        <span className="text-sm font-medium text-white drop-shadow">{sprite.label} vibes detected</span>
      </div>
      {supportsPiP && (
        <button
          onClick={pipWindow ? closePiP : openPiP}
          className="relative rounded-lg bg-neutral-800/80 px-3 py-1 text-xs font-medium text-neutral-300 hover:bg-neutral-700"
        >
          {pipWindow ? "Close pop-out" : "Pop out sprite"}
        </button>
      )}
      {pipWindow && createPortal(<SpriteContent sprite={sprite} genre={currentGenre} />, pipWindow.document.body)}
    </div>
  );
}

export default GenreSprite;
