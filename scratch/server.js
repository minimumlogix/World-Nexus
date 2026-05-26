// scratch/server.js
import http from 'http';
import fs from 'fs';
import path from 'path';

const PORT = 3000;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.md': 'text/markdown',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);
  
  // Parse URL to avoid directory traversal
  let safeUrl = req.url.split('?')[0].split('#')[0];
  if (safeUrl === '/') {
    safeUrl = '/index.html';
  }
  
  // Resolve path
  let filePath = path.join(process.cwd(), safeUrl);
  
  // Check if file exists
  fs.stat(filePath, (err, stats) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }
    
    // If it's a directory, return a mock listing (or look for index.html if applicable)
    if (stats.isDirectory()) {
      // In this app, directory listings are fetched for Worlds/ and Worlds/worldId/ to discover folders/bots dynamically.
      // So we should return a simple HTML directory listing if requested!
      fs.readdir(filePath, (readErr, files) => {
        if (readErr) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('500 Internal Server Error');
          return;
        }
        
        // Build simple HTML directory listing
        res.writeHead(200, { 'Content-Type': 'text/html' });
        let html = `<!DOCTYPE html><html><head><title>Listing of ${safeUrl}</title></head><body><ul>`;
        // Add parent directory link if not root
        if (safeUrl !== '/') {
          html += `<li><a href="../">../</a></li>`;
        }
        files.forEach(file => {
          // If it's a directory, append a slash
          const isDir = fs.statSync(path.join(filePath, file)).isDirectory();
          const suffix = isDir ? '/' : '';
          html += `<li><a href="${file}${suffix}">${file}${suffix}</a></li>`;
        });
        html += `</ul></body></html>`;
        res.end(html);
      });
      return;
    }
    
    // Read and serve file
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    
    fs.readFile(filePath, (readErr, data) => {
      if (readErr) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Internal Server Error');
        return;
      }
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Server is running at http://127.0.0.1:${PORT}`);
});
