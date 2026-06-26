/* server.js */
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 8000;
const ROOT = __dirname;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.avif': 'image/avif',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon'
};

// Helper to escape script tags inside markdown or json
function escapeScriptTags(str) {
  if (!str) return '';
  return str.replace(/<\/script>/gi, '<\\/script>');
}

// Extract accent color from style.css just like WorldService.js
function getAccentColor(worldRefPath, theme) {
  if (!theme) return { accentColor: null, accentColorRgb: null };
  const cssPath = path.join(ROOT, worldRefPath, theme);
  if (!fs.existsSync(cssPath)) return { accentColor: null, accentColorRgb: null };
  
  try {
    const cssText = fs.readFileSync(cssPath, 'utf8');
    let accentColor = null;
    let accentColorRgb = null;
    
    const accentMatch = cssText.match(/--(?:primary-)?accent\s*:\s*([^;/\n]+)/);
    if (accentMatch) {
      accentColor = accentMatch[1].trim();
    }
    
    const rgbMatch = cssText.match(/--(?:primary-)?accent-rgb\s*:\s*([^;/\n]+)/);
    if (rgbMatch) {
      accentColorRgb = rgbMatch[1].trim();
    } else if (accentColor && accentColor.startsWith('#')) {
      const hex = accentColor.replace('#', '');
      let r, g, b;
      if (hex.length === 3) {
        r = parseInt(hex.charAt(0) + hex.charAt(0), 16);
        g = parseInt(hex.charAt(1) + hex.charAt(1), 16);
        b = parseInt(hex.charAt(2) + hex.charAt(2), 16);
      } else if (hex.length === 6) {
        r = parseInt(hex.substring(0, 2), 16);
        g = parseInt(hex.substring(2, 4), 16);
        b = parseInt(hex.substring(4, 6), 16);
      }
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        accentColorRgb = `${r}, ${g}, ${b}`;
      }
    }
    return { accentColor, accentColorRgb };
  } catch (err) {
    console.warn(`Could not parse theme variables:`, err);
    return { accentColor: null, accentColorRgb: null };
  }
}

// Find parent world for a given bot ID
function findWorldForBot(botId) {
  try {
    const registryPath = path.join(ROOT, 'Worlds', 'WorldList.json');
    if (!fs.existsSync(registryPath)) return null;
    const worlds = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    
    for (const wFolder of worlds) {
      const wJsonPath = path.join(ROOT, 'Worlds', wFolder, 'world.json');
      if (fs.existsSync(wJsonPath)) {
        const wMeta = JSON.parse(fs.readFileSync(wJsonPath, 'utf8'));
        const bots = Array.from(new Set([
          ...(wMeta.bots || []),
          ...(wMeta.featuredBots || [])
        ]));
        if (bots.includes(botId)) {
          return wMeta.id;
        }
      }
    }
  } catch (err) {
    console.error('Error finding world for bot:', err);
  }
  return null;
}

// Injects preloaded data into template HTML
function injectPreloads(templateHtml, worldId, activeBotId = null) {
  const worldsDir = path.join(ROOT, 'Worlds');
  const worldDir = path.join(worldsDir, worldId);
  const worldJsonPath = path.join(worldDir, 'world.json');
  
  if (!fs.existsSync(worldJsonPath)) {
    return templateHtml;
  }

  try {
    const worldRefPath = `Worlds/${worldId}`;
    const worldMeta = JSON.parse(fs.readFileSync(worldJsonPath, 'utf8'));
    worldMeta.path = worldRefPath;

    const { accentColor, accentColorRgb } = getAccentColor(worldRefPath, worldMeta.theme);
    if (accentColor) worldMeta.accentColor = accentColor;
    if (accentColorRgb) worldMeta.accentColorRgb = accentColorRgb;

    const botIds = Array.from(new Set([
      ...(worldMeta.bots || []),
      ...(worldMeta.featuredBots || [])
    ]));

    const bots = [];
    const markdownFiles = [];

    // 1. World Lore Markdown
    if (worldMeta.lore) {
      const worldLorePath = path.join(worldDir, worldMeta.lore);
      if (fs.existsSync(worldLorePath)) {
        const markdown = fs.readFileSync(worldLorePath, 'utf8');
        markdownFiles.push({
          path: `${worldRefPath}/${worldMeta.lore}`,
          content: markdown
        });
      }
    }

    // 2. Characters
    botIds.forEach(botId => {
      const botDir = path.join(worldDir, 'characters', botId);
      const botJsonPath = path.join(botDir, 'data', `${botId}.json`);
      if (!fs.existsSync(botJsonPath)) return;

      const botData = JSON.parse(fs.readFileSync(botJsonPath, 'utf8'));
      
      botData.worldId = worldMeta.id;
      botData.worldTitle = worldMeta.title;
      botData.worldAuthor = worldMeta.author || null;
      botData.worldAccent = worldMeta.accentColor || null;
      botData.worldAccentRgb = worldMeta.accentColorRgb || null;
      botData.cardImage = botData.cardImage ? `${worldRefPath}/characters/${botId}/${botData.cardImage}` : null;
      botData.avatar = botData.avatar ? `${worldRefPath}/characters/${botId}/${botData.avatar}` : null;
      botData.sprite = botData.sprite ? `${worldRefPath}/characters/${botId}/${botData.sprite}` : null;
      
      const originalLore = botData.lore;
      const originalScenario = botData.scenario;
      
      botData.lore = botData.lore ? `characters/${botId}/${botData.lore}` : null;
      botData.scenario = botData.scenario ? `characters/${botId}/${botData.scenario}` : null;

      bots.push(botData);

      if (originalLore) {
        const botLorePath = path.join(botDir, originalLore);
        if (fs.existsSync(botLorePath)) {
          const markdown = fs.readFileSync(botLorePath, 'utf8');
          markdownFiles.push({
            path: `${worldRefPath}/characters/${botId}/${originalLore}`,
            content: markdown
          });
        }
      }

      if (originalScenario) {
        const botScenarioPath = path.join(botDir, originalScenario);
        if (fs.existsSync(botScenarioPath)) {
          const markdown = fs.readFileSync(botScenarioPath, 'utf8');
          markdownFiles.push({
            path: `${worldRefPath}/characters/${botId}/${originalScenario}`,
            content: markdown
          });
        }
      }
    });

    const preloadedWorldData = {
      worldId: worldMeta.id,
      worldConfig: worldMeta,
      bots: bots
    };

    // Compile script tags
    let injectHtml = `\n  <!-- Embedded World Metadata & Lore Content -->\n`;
    injectHtml += `  <script type="application/json" id="preloaded-world-data">\n`;
    injectHtml += `  ${escapeScriptTags(JSON.stringify(preloadedWorldData, null, 2))}\n`;
    injectHtml += `  </script>\n`;

    const activeBot = activeBotId ? bots.find(b => b.id === activeBotId) : null;
    const isBotPage = !!activeBot;
    
    const pageTitle = isBotPage 
      ? `${activeBot.name} - ${worldMeta.title} - World Nexus`
      : `${worldMeta.title} - World Nexus`;
      
    const pageDesc = isBotPage 
      ? (activeBot.description || `Read historical chronicles and lore about ${activeBot.name} in ${worldMeta.title}.`)
      : worldMeta.description;

    const jsonLdData = isBotPage ? {
      "@context": "https://schema.org",
      "@type": "Person",
      "name": activeBot.name,
      "description": pageDesc,
      "memberOf": {
        "@type": "CreativeWork",
        "name": worldMeta.title
      }
    } : {
      "@context": "https://schema.org",
      "@type": "CreativeWork",
      "name": worldMeta.title,
      "description": worldMeta.description,
      "genre": worldMeta.genres || [],
      "author": worldMeta.author ? {
        "@type": "Person",
        "name": worldMeta.author
      } : null,
      "character": bots.map(b => ({
        "@type": "Person",
        "name": b.name,
        "description": b.description
      }))
    };

    injectHtml += `  <script type="application/ld+json" id="preloaded-world-jsonld">\n`;
    injectHtml += `  ${escapeScriptTags(JSON.stringify(jsonLdData, null, 2))}\n`;
    injectHtml += `  </script>\n`;

    markdownFiles.forEach(file => {
      const safeId = 'preloaded-markdown-' + file.path.replace(/[^a-zA-Z0-9_-]/g, '-');
      injectHtml += `  <script type="text/markdown" id="${safeId}" data-path="${file.path}">\n`;
      injectHtml += `${escapeScriptTags(file.content)}\n`;
      injectHtml += `  </script>\n`;
    });

    let resHtml = templateHtml.replace('<!-- PRELOADED_DATA_PLACEHOLDER -->', injectHtml.trim());

    // Generate sitemap links
    let sitemapHtml = `\n    <nav>\n`;
    sitemapHtml += `      <a href="index.html">Nexus Core</a>\n`;
    sitemapHtml += `      <a href="${worldMeta.id}.html">${worldMeta.title} Chronicles</a>\n`;
    bots.forEach(b => {
      sitemapHtml += `      <a href="bot-${b.id}.html">${b.name} Profile</a>\n`;
    });
    sitemapHtml += `    </nav>\n`;

    resHtml = resHtml.replace('<!-- SEO_LINKS_PLACEHOLDER -->', sitemapHtml.trim());
    
    // Update Title tag dynamically
    resHtml = resHtml.replace(/<title>[^<]*<\/title>/i, `<title>${pageTitle}</title>`);
    
    // Update Meta Description tag dynamically
    const descMeta = `<meta name="description" content="${pageDesc.replace(/"/g, '&quot;')}">`;
    if (resHtml.match(/<meta\s+name="description"\s+content="[^"]*"/i)) {
      resHtml = resHtml.replace(/<meta\s+name="description"\s+content="[^"]*"/i, descMeta);
    } else {
      resHtml = resHtml.replace(/<\/head>/i, `  ${descMeta}\n</head>`);
    }

    return resHtml;
  } catch (err) {
    console.error(`Failed to inject world data:`, err);
    return templateHtml;
  }
}

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);
  
  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
  let safeUrl = path.normalize(parsedUrl.pathname).replace(/^(\.\.[\/\\])+/, '');
  
  if (safeUrl === '\\' || safeUrl === '/') {
    safeUrl = '/index.html';
  }

  // 1. Intercept index.html requests
  if (safeUrl === '/index.html') {
    let worldId = parsedUrl.searchParams.get('world');
    let botId = parsedUrl.searchParams.get('bot');
    
    if (!worldId && botId) {
      worldId = findWorldForBot(botId);
    }

    const filePath = path.join(ROOT, 'index.html');
    fs.readFile(filePath, 'utf8', (err, content) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Internal Server Error');
        return;
      }

      if (worldId) {
        content = injectPreloads(content, worldId, botId);
      }
      
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(content);
    });
    return;
  }

  // 2. Intercept virtual URL pathnames or custom html requests
  // Check if pathname matches /world/<worldId>
  const worldPathMatch = parsedUrl.pathname.match(/^\/world\/([^/]+)/);
  // Check if pathname matches /bot/<botId>
  const botPathMatch = parsedUrl.pathname.match(/^\/bot\/([^/]+)/);
  // Check if pathname matches /bot-([^/]+).html
  const botHtmlMatch = parsedUrl.pathname.match(/^\/bot-([^/]+)\.html$/);
  // Check if pathname matches /<worldId>.html
  const worldHtmlMatch = parsedUrl.pathname.match(/^\/([^/]+)\.html$/);
  
  let targetWorldId = null;
  let targetBotId = null;

  if (worldPathMatch) {
    targetWorldId = worldPathMatch[1];
  } else if (botPathMatch) {
    targetBotId = botPathMatch[1];
    targetWorldId = findWorldForBot(targetBotId);
  } else if (botHtmlMatch) {
    targetBotId = botHtmlMatch[1];
    targetWorldId = findWorldForBot(targetBotId);
  } else if (worldHtmlMatch && !['index', 'world', 'bot', 'profile', 'settings'].includes(worldHtmlMatch[1])) {
    targetWorldId = worldHtmlMatch[1];
  }

  if (targetWorldId) {
    const worldDir = path.join(ROOT, 'Worlds', targetWorldId);
    if (fs.existsSync(worldDir)) {
      const filePath = path.join(ROOT, 'index.html');
      fs.readFile(filePath, 'utf8', (err, content) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('500 Internal Server Error');
          return;
        }
        content = injectPreloads(content, targetWorldId, targetBotId);
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(content);
      });
      return;
    }
  }

  // 3. Default: Serve physical static files
  const filePath = path.join(ROOT, safeUrl);
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }
    
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    
    res.writeHead(200, { 'Content-Type': contentType });
    
    const stream = fs.createReadStream(filePath);
    stream.on('error', (streamErr) => {
      console.error(streamErr);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Internal Server Error');
      }
    });
    stream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`Preloading Server running at http://localhost:${PORT}/`);
});
export default server;
