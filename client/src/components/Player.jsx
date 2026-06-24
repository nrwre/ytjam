import React, { useEffect, useRef } from "react";
import { useYouTubePlayer } from "../hooks/useYouTubePlayer.js";
import { useRoom } from "../context/RoomContext.jsx";

const SYNC_INTERVAL_MS = 2000;
const DRIFT_THRESHOLD_S = 2;

function Player() {
  const { socket, isHost, queue, currentIndex } = useRoom();
  const { playerRef, isReady } = useYouTubePlayer("yt-player");
  const currentVideoId = currentIndex >= 0 ? queue[currentIndex]?.videoId : null;
  const loadedVideoIdRef = useRef(null);

  useEffect(() => {
    if (!isReady || !currentVideoId) return;
    if (loadedVideoIdRef.current === currentVideoId) return;
    loadedVideoIdRef.current = currentVideoId;
    playerRef.current.loadVideoById(currentVideoId);
  }, [isReady, currentVideoId, playerRef]);

  useEffect(() => {
    function onPlay({ videoId, startAt }) {
      if (!isReady) return;
      loadedVideoIdRef.current = videoId;
      playerRef.current.loadVideoById(videoId, startAt || 0);
    }
    socket.on("playback:play", onPlay);
    return () => socket.off("playback:play", onPlay);
  }, [socket, isReady, playerRef]);

  useEffect(() => {
    if (!isReady || !isHost) return;
    const interval = setInterval(() => {
      const player = playerRef.current;
      if (!player?.getCurrentTime) return;
      const state = player.getPlayerState();
      socket.emit("playback:sync", {
        videoId: currentVideoId,
        currentTime: player.getCurrentTime(),
        isPlaying: state === 1,
      });
    }, SYNC_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isReady, isHost, socket, playerRef, currentVideoId]);

  useEffect(() => {
    if (!isReady || isHost) return;
    function onState({ currentTime, isPlaying }) {
      const player = playerRef.current;
      if (!player?.getCurrentTime) return;
      const drift = Math.abs(player.getCurrentTime() - currentTime);
      if (drift > DRIFT_THRESHOLD_S) {
        player.seekTo(currentTime, true);
      }
      if (isPlaying && player.getPlayerState() !== 1) player.playVideo();
      if (!isPlaying && player.getPlayerState() === 1) player.pauseVideo();
    }
    socket.on("playback:state", onState);
    return () => socket.off("playback:state", onState);
  }, [socket, isReady, isHost, playerRef]);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
      <div id="yt-player" className="h-full w-full" />
      {!currentVideoId && (
        <div className="absolute inset-0 flex items-center justify-center text-neutral-500">
          Add a song to start the jam
        </div>
      )}
    </div>
  );
}

export default Player;
