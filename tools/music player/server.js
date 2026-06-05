#!/usr/bin/env node
/**
 * Nexus Player – yt-dlp extraction backend (Node.js)
 * Run:  node server.js
 * API:  GET http://localhost:7171/extract?v=<youtube-id>
 *       GET http://localhost:7171/health
 *
 * Requires yt-dlp on PATH:
 *   winget install yt-dlp.yt-dlp
 *   -- or --
 *   Download binary from https://github.com/yt-dlp/yt-dlp/releases
 *   and place yt-dlp.exe in this folder (or anywhere on PATH)
 */

const http        = require('http');
const { URL }     = require('url');
const { execFile } = require('child_process');
const path        = require('path');

// ── Config ────────────────────────────────────────────────────────────────────
const PORT      = 7171;
const HOST      = '127.0.0.1';
const CACHE_TTL = 4 * 60 * 60 * 1000;  // 4 hours in ms

// ── In-memory cache ───────────────────────────────────────────────────────────
const cache = new Map();   // videoId → { data, ts }

function cacheGet(vid) {
    const entry = cache.get(vid);
    if (entry && (Date.now() - entry.ts) < CACHE_TTL) return entry.data;
    return null;
}
function cacheSet(vid, data) {
    cache.set(vid, { data, ts: Date.now() });
}

// ── yt-dlp extraction ─────────────────────────────────────────────────────────
function extractStream(videoId) {
    return new Promise((resolve, reject) => {
        const cached = cacheGet(videoId);
        if (cached) {
            console.log(`[cache hit] ${videoId}`);
            return resolve(cached);
        }

        console.log(`[extract]   ${videoId} ...`);
        const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;

        // Look for yt-dlp in the same directory as this script first
        const localBin = path.join(__dirname, 'yt-dlp.exe');
        const ytdlp    = process.platform === 'win32' ? (require('fs').existsSync(localBin) ? localBin : 'yt-dlp') : 'yt-dlp';

        const args = [
            '--dump-json',
            '--no-playlist',
            '--quiet',
            '-f', 'bestaudio[ext=m4a]/bestaudio/best',
            ytUrl,
        ];

        execFile(ytdlp, args, { timeout: 30000, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
            if (err) {
                if (err.code === 'ENOENT') {
                    return reject(new Error(
                        'yt-dlp not found. Download yt-dlp.exe from https://github.com/yt-dlp/yt-dlp/releases ' +
                        'and place it in the same folder as server.js, or install via: winget install yt-dlp.yt-dlp'
                    ));
                }
                return reject(new Error(`yt-dlp exited ${err.code}: ${stderr.trim() || err.message}`));
            }

            let meta;
            try { meta = JSON.parse(stdout); }
            catch { return reject(new Error('yt-dlp returned invalid JSON')); }

            const streamUrl = meta.url
                || (meta.requested_downloads && meta.requested_downloads[0] && meta.requested_downloads[0].url)
                || '';

            if (!streamUrl) {
                return reject(new Error('Could not find stream URL in yt-dlp output'));
            }

            const data = {
                url:      streamUrl,
                title:    meta.title   || '',
                artist:   meta.uploader || meta.channel || '',
                thumb:    meta.thumbnail || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
                duration: Math.floor(meta.duration || 0),
                video_id: videoId,
            };

            cacheSet(videoId, data);
            console.log(`[done]      ${videoId} — ${data.title.slice(0, 60)}`);
            resolve(data);
        });
    });
}

// ── HTTP Server ───────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
    const parsed = new URL(req.url, `http://${HOST}:${PORT}`);

    // CORS preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(200, corsHeaders());
        res.end();
        return;
    }

    if (req.method !== 'GET') {
        sendJson(res, 405, { error: 'Method not allowed' });
        return;
    }

    // /health
    if (parsed.pathname === '/health') {
        sendJson(res, 200, { status: 'ok', port: PORT });
        return;
    }

    // /extract?v=<id>
    if (parsed.pathname === '/extract') {
        const videoId = (parsed.searchParams.get('v') || parsed.searchParams.get('id') || '').trim();
        if (!videoId) {
            sendJson(res, 400, { error: 'Missing ?v= parameter' });
            return;
        }

        try {
            const data = await extractStream(videoId);
            sendJson(res, 200, data);
        } catch (err) {
            console.error('[error]    ', err.message);
            sendJson(res, 500, { error: err.message });
        }
        return;
    }

    sendJson(res, 404, { error: 'Not found', endpoints: ['/extract?v=ID', '/health'] });
});

function corsHeaders() {
    return {
        'Access-Control-Allow-Origin':  '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };
}

function sendJson(res, code, obj) {
    const body = JSON.stringify(obj);
    res.writeHead(code, {
        'Content-Type':   'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(body),
        ...corsHeaders(),
    });
    res.end(body);
}

// ── Boot ──────────────────────────────────────────────────────────────────────
const { execFileSync } = require('child_process');

// Quick yt-dlp check
const localBin = path.join(__dirname, 'yt-dlp.exe');
const ytdlpBin = (process.platform === 'win32' && require('fs').existsSync(localBin)) ? localBin : 'yt-dlp';

try {
    const v = execFileSync(ytdlpBin, ['--version'], { timeout: 5000 }).toString().trim();
    console.log(`  yt-dlp ${v} found`);
} catch {
    console.warn('  WARNING: yt-dlp not found in PATH or local directory.');
    console.warn('  Download yt-dlp.exe → https://github.com/yt-dlp/yt-dlp/releases');
    console.warn('  Place yt-dlp.exe next to server.js  OR  run: winget install yt-dlp.yt-dlp\n');
}

server.listen(PORT, HOST, () => {
    console.log(`  Nexus extraction backend running`);
    console.log(`  http://${HOST}:${PORT}/extract?v=dQw4w9WgXcQ`);
    console.log(`  Press Ctrl+C to stop.\n`);
});
