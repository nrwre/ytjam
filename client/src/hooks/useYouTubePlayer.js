import { useEffect, useRef, useState } from "react";

let apiLoadPromise = null;

function loadYouTubeApi() {
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (apiLoadPromise) return apiLoadPromise;

  apiLoadPromise = new Promise((resolve) => {
    const prevCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (prevCallback) prevCallback();
      resolve(window.YT);
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(script);
  });
  return apiLoadPromise;
}

function useYouTubePlayer(elementId, onStateChange) {
  const playerRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const onStateChangeRef = useRef(onStateChange);
  onStateChangeRef.current = onStateChange;

  useEffect(() => {
    let destroyed = false;
    loadYouTubeApi().then((YT) => {
      if (destroyed) return;
      playerRef.current = new YT.Player(elementId, {
        height: "100%",
        width: "100%",
        playerVars: { autoplay: 0, controls: 1, modestbranding: 1, rel: 0 },
        events: {
          onReady: () => setIsReady(true),
          onStateChange: (event) => onStateChangeRef.current?.(event),
        },
      });
    });
    return () => {
      destroyed = true;
      playerRef.current?.destroy?.();
    };
  }, [elementId]);

  return { playerRef, isReady };
}

export { useYouTubePlayer };
