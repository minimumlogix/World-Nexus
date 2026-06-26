import fs from 'fs';
import path from 'path';

const projectRoot = process.cwd();
let issueCount = 0;

function report(message) {
    issueCount += 1;
    console.error(message);
}

function readJson(filePath) {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (err) {
        report(`Invalid JSON: ${filePath} (${err.message})`);
        return null;
    }
}

function checkImports(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            checkImports(fullPath);
        } else if (fullPath.endsWith('.js')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            const importRegex = /import\s+(?:.*?\s+from\s+)?['"](.*?)['"]/g;
            let match;
            while ((match = importRegex.exec(content)) !== null) {
                const importPath = match[1];
                if (importPath.startsWith('.')) {
                    const resolvedPath = path.resolve(dir, importPath);
                    if (!fs.existsSync(resolvedPath)) {
                        report(`Missing import: ${importPath} in ${fullPath}`);
                    }
                }
            }
        }
    });
}

function checkWorldRegistry() {
    const worldsDir = path.join(projectRoot, 'Worlds');
    const registryPath = path.join(worldsDir, 'WorldList.json');
    const registry = readJson(registryPath);
    if (!Array.isArray(registry)) {
        report('Worlds/WorldList.json must be an array of world folder names.');
        return;
    }

    const seenWorlds = new Set();
    registry.forEach(worldName => {
        if (typeof worldName !== 'string' || !worldName.trim()) {
            report(`World registry entry must be a non-empty string: ${JSON.stringify(worldName)}`);
            return;
        }
        if (seenWorlds.has(worldName)) {
            report(`Duplicate world registry entry: ${worldName}`);
        }
        seenWorlds.add(worldName);

        const worldDir = path.join(worldsDir, worldName);
        const worldJsonPath = path.join(worldDir, 'world.json');
        if (!fs.existsSync(worldJsonPath)) {
            report(`Missing world.json for registered world: ${worldName}`);
            return;
        }

        const world = readJson(worldJsonPath);
        if (!world) return;

        ['id', 'title', 'description'].forEach(field => {
            if (!world[field]) report(`World "${worldName}" is missing required field: ${field}`);
        });

        ['coverImage', 'logo', 'theme', 'lore'].forEach(field => {
            if (world[field]) {
                const assetPath = path.join(worldDir, world[field]);
                if (!fs.existsSync(assetPath)) {
                    report(`World "${worldName}" references missing ${field}: ${world[field]}`);
                }
            }
        });

        (world.bots || world.featuredBots || []).forEach(botId => {
            const botJsonPath = path.join(worldDir, 'characters', botId, 'data', `${botId}.json`);
            if (!fs.existsSync(botJsonPath)) {
                report(`World "${worldName}" references missing bot JSON: ${botId}`);
                return;
            }

            const bot = readJson(botJsonPath);
            if (!bot) return;

            ['id', 'name'].forEach(field => {
                if (!bot[field]) report(`Bot "${botId}" in "${worldName}" is missing required field: ${field}`);
            });
            ['cardImage', 'avatar', 'sprite'].forEach(field => {
                if (bot[field]) {
                    const assetPath = path.join(worldDir, 'characters', botId, bot[field]);
                    if (!fs.existsSync(assetPath)) {
                        report(`Bot "${botId}" references missing ${field}: ${bot[field]}`);
                    }
                }
            });
        });

    });
}

function checkToolsRegistry() {
    const tools = readJson(path.join(projectRoot, 'data', 'tools.json'));
    if (!tools) return;
    if (!Array.isArray(tools.tools)) {
        report('data/tools.json must contain a tools array.');
        return;
    }

    tools.tools.forEach(tool => {
        ['id', 'name', 'link', 'intro'].forEach(field => {
            if (!tool[field]) report(`Tool entry is missing required field: ${field}`);
        });
        if (tool.image && !fs.existsSync(path.join(projectRoot, tool.image))) {
            report(`Tool "${tool.id || tool.name}" references missing image: ${tool.image}`);
        }
    });
}

function checkPreloadedHTML() {
    const worldsDir = path.join(projectRoot, 'Worlds');
    const registryPath = path.join(worldsDir, 'WorldList.json');
    const registry = readJson(registryPath);
    if (!Array.isArray(registry)) return;

    registry.forEach(worldName => {
        const htmlPath = path.join(projectRoot, `${worldName.toLowerCase()}.html`);
        if (!fs.existsSync(htmlPath)) {
            report(`Missing preloaded HTML file for world "${worldName}": expected ${worldName.toLowerCase()}.html in root directory.`);
            return;
        }

        const htmlContent = fs.readFileSync(htmlPath, 'utf8');
        if (htmlContent.includes('<!-- PRELOADED_DATA_PLACEHOLDER -->')) {
            report(`Preloaded HTML for world "${worldName}" (${worldName.toLowerCase()}.html) is not compiled: contains PRELOADED_DATA_PLACEHOLDER.`);
        }
        if (!htmlContent.includes('id="preloaded-world-data"')) {
            report(`Preloaded HTML for world "${worldName}" (${worldName.toLowerCase()}.html) is missing preloaded JSON data block.`);
        }
        if (!htmlContent.includes('id="preloaded-world-jsonld"')) {
            report(`Preloaded HTML for world "${worldName}" (${worldName.toLowerCase()}.html) is missing JSON-LD metadata block.`);
        }
    });
}

checkImports(path.join(projectRoot, 'js'));
checkWorldRegistry();
checkToolsRegistry();
checkPreloadedHTML();

if (issueCount > 0) {
    console.error(`Validation failed with ${issueCount} issue(s).`);
    process.exit(1);
}

console.log('Validation passed.');
