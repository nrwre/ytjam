# pulls a bunch of video titles per genre via youtube search, labels them by
# which query they came from (not perfectly clean but good enough for tfidf).
# run: python build_dataset.py  (reads YOUTUBE_API_KEY from ../server/.env)

import csv
import json
import os
import time
import urllib.parse
import urllib.request

GENRE_QUERIES = {
    "rap": ["rap song", "hip hop song", "rap music 2025", "freestyle rap"],
    "edm": ["edm mix", "electronic dance music", "house music mix", "dubstep song"],
    "classical": ["classical music", "orchestra symphony", "piano classical music", "violin classical"],
    "devotional": ["bhajan", "devotional song", "kirtan", "aarti song"],
    "pop": ["pop song", "pop music 2025", "pop hits", "top pop songs"],
    "lofi": ["lofi beats", "lofi hip hop", "chill lofi music", "study lofi"],
}

API_BASE = "https://www.googleapis.com/youtube/v3/search"


def load_api_key():
    env_path = os.path.join(os.path.dirname(__file__), "..", "server", ".env")
    with open(env_path, encoding="utf-8") as f:
        for line in f:
            if line.startswith("YOUTUBE_API_KEY="):
                return line.strip().split("=", 1)[1]
    raise RuntimeError("YOUTUBE_API_KEY not found in server/.env")


def search(api_key, query, max_results=50):
    params = {
        "part": "snippet",
        "type": "video",
        "maxResults": max_results,
        "q": query,
        "key": api_key,
    }
    url = f"{API_BASE}?{urllib.parse.urlencode(params)}"
    with urllib.request.urlopen(url) as resp:
        data = json.load(resp)
    return [
        {"title": item["snippet"]["title"], "channel": item["snippet"]["channelTitle"]}
        for item in data.get("items", [])
    ]


def main():
    api_key = load_api_key()
    rows = []
    seen_titles = set()

    for genre, queries in GENRE_QUERIES.items():
        for query in queries:
            print(f"Fetching '{query}' -> {genre}")
            try:
                results = search(api_key, query)
            except Exception as e:
                print(f"  failed: {e}")
                continue
            for r in results:
                if r["title"] in seen_titles:
                    continue
                seen_titles.add(r["title"])
                rows.append({"title": r["title"], "channel": r["channel"], "genre": genre})
            time.sleep(0.2)

    out_path = os.path.join(os.path.dirname(__file__), "data", "dataset.csv")
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["title", "channel", "genre"])
        writer.writeheader()
        writer.writerows(rows)

    print(f"\nWrote {len(rows)} rows to {out_path}")
    counts = {}
    for r in rows:
        counts[r["genre"]] = counts.get(r["genre"], 0) + 1
    for genre, count in counts.items():
        print(f"  {genre}: {count}")


if __name__ == "__main__":
    main()
