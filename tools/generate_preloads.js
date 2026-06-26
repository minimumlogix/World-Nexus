import fs from 'fs';
import path from 'path';

const projectRoot = process.cwd();
const templatePath = path.join(projectRoot, 'index.html');
const worldsDir = path.join(projectRoot, 'Worlds');
const registryPath = path.join(worldsDir, 'WorldList.json');

if (!fs.existsSync(templatePath)) {
  console.error(`Missing template index.html at ${templatePath}`);
  process.exit(1);
}

if (!fs.existsSync(registryPath)) {
  console.error(`Missing WorldList.json at ${registryPath}`);
  process.exit(1);
}

const templateHtml = fs.readFileSync(templatePath, 'utf8');
const worlds = JSON.parse(fs.readFileSync(registryPath, 'utf8'));

// Helper to escape script tags inside markdown or json
function escapeScriptTags(str) {
  if (!str) return '';
  return str.replace(/<\/script>/gi, '<\\/script>');
}

// Extract accent color from style.css just like WorldService.js
function getAccentColor(worldRefPath, theme) {
  if (!theme) return { accentColor: null, accentColorRgb: null };
  const cssPath = path.join(projectRoot, worldRefPath, theme);
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

worlds.forEach(worldFolder => {
  const worldRefPath = `Worlds/${worldFolder}`;
  const worldDir = path.join(worldsDir, worldFolder);
  const worldJsonPath = path.join(worldDir, 'world.json');
  if (!fs.existsSync(worldJsonPath)) return;

  console.log(`Processing preloads for world: ${worldFolder}`);
  const worldMeta = JSON.parse(fs.readFileSync(worldJsonPath, 'utf8'));
  worldMeta.path = worldRefPath;
  
  // Resolve theme accent colors
  const { accentColor, accentColorRgb } = getAccentColor(worldRefPath, worldMeta.theme);
  if (accentColor) worldMeta.accentColor = accentColor;
  if (accentColorRgb) worldMeta.accentColorRgb = accentColorRgb;

  const botIds = Array.from(new Set([
    ...(worldMeta.bots || []),
    ...(worldMeta.featuredBots || [])
  ]));

  const bots = [];
  const markdownFiles = [];

  // 1. Read main world lore
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

  // 2. Read each bot config and its markdown files
  botIds.forEach(botId => {
    const botDir = path.join(worldDir, 'characters', botId);
    const botJsonPath = path.join(botDir, 'data', `${botId}.json`);
    if (!fs.existsSync(botJsonPath)) {
      console.warn(`Registered bot JSON not found: ${botJsonPath}`);
      return;
    }

    const botData = JSON.parse(fs.readFileSync(botJsonPath, 'utf8'));
    
    // Perform exact path resolutions as in BotService.js
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

    // Read bot lore markdown
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

    // Read bot scenario markdown
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

  // Construct structured metadata JSON block
  const preloadedWorldData = {
    worldId: worldMeta.id,
    worldConfig: worldMeta,
    bots: bots
  };

  // Construct JSON-LD block
  const jsonLdData = {
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

  // Compile all preloaded blocks
  let injectHtml = `\n  <!-- Embedded World Metadata & Lore Content -->\n`;
  
  injectHtml += `  <script type="application/json" id="preloaded-world-data">\n`;
  injectHtml += `  ${escapeScriptTags(JSON.stringify(preloadedWorldData, null, 2))}\n`;
  injectHtml += `  </script>\n`;

  injectHtml += `  <script type="application/ld+json" id="preloaded-world-jsonld">\n`;
  injectHtml += `  ${escapeScriptTags(JSON.stringify(jsonLdData, null, 2))}\n`;
  injectHtml += `  </script>\n`;

  markdownFiles.forEach(file => {
    // Generate unique ID based on file path
    const safeId = 'preloaded-markdown-' + file.path.replace(/[^a-zA-Z0-9_-]/g, '-');
    injectHtml += `  <script type="text/markdown" id="${safeId}" data-path="${file.path}">\n`;
    injectHtml += `${escapeScriptTags(file.content)}\n`;
    injectHtml += `  </script>\n`;
  });

  // Replace placeholder in template index.html
  const outputHtml = templateHtml.replace('<!-- PRELOADED_DATA_PLACEHOLDER -->', injectHtml.trim());

  // Write output file in project root
  const outputPath = path.join(projectRoot, `${worldMeta.id}.html`);
  fs.writeFileSync(outputPath, outputHtml, 'utf8');
  console.log(`Generated preloaded static file: ${worldMeta.id}.html`);
});

console.log('Static preloads generation complete.');
