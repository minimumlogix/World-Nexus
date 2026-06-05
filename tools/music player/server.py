#!/usr/bin/env python3
"""
Nexus Player – yt-dlp extraction backend
Run: python server.py
API: GET http://localhost:7171/extract?v=<youtube-id>
     GET http://localhost:7171/health
"""

import json
import subprocess
import sys
import time
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs

# ── Config ─────────────────────────────────────────────────────────────────────
PORT       = 7171
CACHE_TTL  = 4 * 60 * 60   # 4 hours (stream URLs expire ~6 h from YouTube)
HOST       = "127.0.0.1"

# ── In-memory cache ────────────────────────────────────────────────────────────
_cache: dict[str, dict] = {}   # { video_id: { "data": {...}, "ts": float } }
_cache_lock = threading.Lock()


def cache_get(vid: str):
    with _cache_lock:
        entry = _cache.get(vid)
        if entry and (time.time() - entry["ts"]) < CACHE_TTL:
            return entry["data"]
        return None


def cache_set(vid: str, data: dict):
    with _cache_lock:
        _cache[vid] = {"data": data, "ts": time.time()}


# ── yt-dlp extraction ──────────────────────────────────────────────────────────
def extract(video_id: str) -> dict:
    """Run yt-dlp and return {url, title, artist, thumb, duration}."""
    cached = cache_get(video_id)
    if cached:
        print(f"[cache hit] {video_id}")
        return cached

    print(f"[extract]   {video_id} ...")
    yt_url = f"https://www.youtube.com/watch?v={video_id}"

    # Fetch JSON metadata
    meta_cmd = [
        "yt-dlp",
        "--dump-json",
        "--no-playlist",
        "--quiet",
        "-f", "bestaudio[ext=m4a]/bestaudio/best",
        yt_url,
    ]
    try:
        meta_proc = subprocess.run(
            meta_cmd,
            capture_output=True, text=True, timeout=30
        )
    except FileNotFoundError:
        raise RuntimeError(
            "yt-dlp not found. Install it: pip install yt-dlp  (or download binary)"
        )
    except subprocess.TimeoutExpired:
        raise RuntimeError("yt-dlp timed out while fetching metadata")

    if meta_proc.returncode != 0:
        err = meta_proc.stderr.strip() or "Unknown yt-dlp error"
        raise RuntimeError(f"yt-dlp error: {err}")

    try:
        meta = json.loads(meta_proc.stdout)
    except json.JSONDecodeError:
        raise RuntimeError("yt-dlp returned invalid JSON")

    # Pull best audio URL from the chosen format's url field
    stream_url = meta.get("url") or meta.get("requested_downloads", [{}])[0].get("url", "")

    if not stream_url:
        # Fallback: use -g to get direct URL
        g_proc = subprocess.run(
            ["yt-dlp", "-f", "bestaudio[ext=m4a]/bestaudio/best", "-g", "--no-playlist", yt_url],
            capture_output=True, text=True, timeout=30
        )
        stream_url = g_proc.stdout.strip().splitlines()[0] if g_proc.returncode == 0 else ""

    if not stream_url:
        raise RuntimeError("Could not extract stream URL")

    # Thumbnail: prefer maxresdefault, fallback to hqdefault
    thumb = (
        meta.get("thumbnail")
        or f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg"
    )

    data = {
        "url":      stream_url,
        "title":    meta.get("title", ""),
        "artist":   meta.get("uploader") or meta.get("channel") or "",
        "thumb":    thumb,
        "duration": int(meta.get("duration") or 0),
        "video_id": video_id,
    }

    cache_set(video_id, data)
    print(f"[done]      {video_id} — {data['title'][:60]}")
    return data


# ── HTTP Handler ───────────────────────────────────────────────────────────────
class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        # Suppress default access log; we print our own
        pass

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin",  "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def do_OPTIONS(self):
        self.send_response(200)
        self._cors()
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        qs     = parse_qs(parsed.query)

        # ── /health ────────────────────────────────────────────────────────────
        if parsed.path == "/health":
            self._json(200, {"status": "ok", "port": PORT})
            return

        # ── /extract?v=<id> ────────────────────────────────────────────────────
        if parsed.path == "/extract":
            v_list = qs.get("v") or qs.get("id")
            if not v_list:
                self._json(400, {"error": "Missing ?v= parameter"})
                return
            video_id = v_list[0].strip()
            if not video_id:
                self._json(400, {"error": "Empty video ID"})
                return

            try:
                data = extract(video_id)
                self._json(200, data)
            except RuntimeError as e:
                self._json(500, {"error": str(e)})
            except Exception as e:
                self._json(500, {"error": f"Unexpected error: {e}"})
            return

        self._json(404, {"error": "Not found", "endpoints": ["/extract?v=ID", "/health"]})

    def _json(self, code: int, obj: dict):
        body = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type",   "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self._cors()
        self.end_headers()
        self.wfile.write(body)


# ── Main ───────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    # Quick yt-dlp check
    try:
        r = subprocess.run(["yt-dlp", "--version"], capture_output=True, text=True, timeout=5)
        version = r.stdout.strip()
        print(f"  yt-dlp {version} found")
    except FileNotFoundError:
        print("  ERROR: yt-dlp not found in PATH.")
        print("  Install with:  pip install yt-dlp")
        sys.exit(1)

    server = HTTPServer((HOST, PORT), Handler)
    print(f"  Nexus extraction backend running")
    print(f"  http://{HOST}:{PORT}/extract?v=dQw4w9WgXcQ")
    print(f"  Press Ctrl+C to stop.\n")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n  Stopped.")
        server.server_close()
