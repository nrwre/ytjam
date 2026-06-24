const API_BASE = "https://www.googleapis.com/youtube/v3";
const searchCache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000;

function parseDuration(iso) {
  const match = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso || "");
  if (!match) return "";
  const [, h, m, s] = match;
  const parts = [h, m, s].map((v) => v || "0");
  if (h) return `${h}:${m?.padStart(2, "0") || "00"}:${s?.padStart(2, "0") || "00"}`;
  return `${m || "0"}:${(s || "0").padStart(2, "0")}`;
}

async function searchVideos(query) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error("YOUTUBE_API_KEY is not configured");

  const cacheKey = query.toLowerCase().trim();
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.data;
  }

  const searchUrl = new URL(`${API_BASE}/search`);
  searchUrl.searchParams.set("part", "snippet");
  searchUrl.searchParams.set("type", "video");
  searchUrl.searchParams.set("maxResults", "8");
  searchUrl.searchParams.set("q", query);
  searchUrl.searchParams.set("key", apiKey);

  const searchRes = await fetch(searchUrl);
  if (!searchRes.ok) throw new Error(`YouTube search failed: ${searchRes.status}`);
  const searchData = await searchRes.json();
  const videoIds = searchData.items.map((item) => item.id.videoId).filter(Boolean);

  if (videoIds.length === 0) return [];

  const detailsUrl = new URL(`${API_BASE}/videos`);
  detailsUrl.searchParams.set("part", "contentDetails");
  detailsUrl.searchParams.set("id", videoIds.join(","));
  detailsUrl.searchParams.set("key", apiKey);

  const detailsRes = await fetch(detailsUrl);
  const detailsData = detailsRes.ok ? await detailsRes.json() : { items: [] };
  const durationMap = new Map(
    detailsData.items.map((item) => [item.id, parseDuration(item.contentDetails?.duration)])
  );

  const results = searchData.items.map((item) => ({
    videoId: item.id.videoId,
    title: item.snippet.title,
    thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
    channel: item.snippet.channelTitle,
    duration: durationMap.get(item.id.videoId) || "",
  }));

  searchCache.set(cacheKey, { ts: Date.now(), data: results });
  return results;
}

export { searchVideos };
