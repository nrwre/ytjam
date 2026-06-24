import React, { useEffect, useRef, useState } from "react";
import { useRoom } from "../context/RoomContext.jsx";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";
const YOUTUBE_URL_RE = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

function SearchBar() {
  const { socket } = useRoom();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    const urlMatch = YOUTUBE_URL_RE.exec(query);
    if (urlMatch) {
      setResults([]);
      return;
    }
    if (!query.trim()) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`${SERVER_URL}/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.results || []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  function addToQueue(track) {
    socket.emit("queue:add", track);
    setQuery("");
    setResults([]);
  }

  function handleSubmit(e) {
    e.preventDefault();
    const urlMatch = YOUTUBE_URL_RE.exec(query);
    if (urlMatch) {
      addToQueue({ videoId: urlMatch[1], title: "YouTube video", thumbnail: `https://img.youtube.com/vi/${urlMatch[1]}/mqdefault.jpg`, channel: "", duration: "" });
    } else if (results[0]) {
      addToQueue(results[0]);
    }
  }

  return (
    <div className="relative">
      <form onSubmit={handleSubmit}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Paste a YouTube link or search for a song..."
          className="w-full rounded-lg bg-neutral-800 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-600"
        />
      </form>
      {(results.length > 0 || loading) && (
        <div className="absolute z-10 mt-1 w-full max-h-80 overflow-y-auto rounded-lg bg-neutral-800 shadow-lg">
          {loading && <div className="px-4 py-2 text-sm text-neutral-400">Searching...</div>}
          {results.map((track) => (
            <button
              key={track.videoId}
              onClick={() => addToQueue(track)}
              className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-neutral-700"
            >
              <img src={track.thumbnail} alt="" className="h-10 w-16 rounded object-cover" />
              <div className="flex-1 overflow-hidden">
                <p className="truncate font-medium">{track.title}</p>
                <p className="truncate text-xs text-neutral-400">{track.channel}</p>
              </div>
              <span className="text-xs text-neutral-500">{track.duration}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default SearchBar;
