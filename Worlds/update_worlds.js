import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const worldsDir = __dirname;
const worldListPath = path.join(worldsDir, 'WorldList.json');

function main() {
    console.log('Scanning worlds directory:', worldsDir);
    
    // 1. Read all entries in worldsDir
    const entries = fs.readdirSync(worldsDir);
    const worldNames = [];
    
    for (const entry of entries) {
        const fullPath = path.join(worldsDir, entry);
        if (fs.statSync(fullPath).isDirectory()) {
            // Filter out system folders or hidden folders
            if (!entry.startsWith('.') && entry !== 'node_modules') {
                worldNames.push(entry);
            }
        }
    }
    
    // Sort world names alphabetically
    worldNames.sort();
    
    console.log('Found worlds:', worldNames);
    
    // 2. Update WorldList.json
    fs.writeFileSync(worldListPath, JSON.stringify(worldNames, null, 2) + '\n', 'utf8');
    console.log('Updated WorldList.json');
    
    // 3. For each world, update world.json
    for (const worldName of worldNames) {
        const worldPath = path.join(worldsDir, worldName);
        const worldJsonPath = path.join(worldPath, 'world.json');
        
        let worldData = {};
        
        if (fs.existsSync(worldJsonPath)) {
            try {
                const content = fs.readFileSync(worldJsonPath, 'utf8');
                worldData = JSON.parse(content);
            } catch (err) {
                console.error(`Error parsing ${worldJsonPath}:`, err.message);
                continue;
            }
        } else {
            console.log(`world.json not found for ${worldName}. Creating a template.`);
            worldData = {
                id: worldName,
                title: worldName.charAt(0).toUpperCase() + worldName.slice(1),
                description: `Auto-generated description for ${worldName}`,
                genres: [],
                featuredBots: []
            };
        }
        
        // Ensure featuredBots is an array
        if (!Array.isArray(worldData.featuredBots)) {
            worldData.featuredBots = [];
        }
        
        // Scan characters folder
        const charactersDir = path.join(worldPath, 'characters');
        if (fs.existsSync(charactersDir) && fs.statSync(charactersDir).isDirectory()) {
            const charEntries = fs.readdirSync(charactersDir);
            for (const charEntry of charEntries) {
                const charPath = path.join(charactersDir, charEntry);
                if (fs.statSync(charPath).isDirectory() && !charEntry.startsWith('.')) {
                    // Check if character ID is already in featuredBots
                    if (!worldData.featuredBots.includes(charEntry)) {
                        worldData.featuredBots.push(charEntry);
                        console.log(`Added character "${charEntry}" to featuredBots in ${worldName}`);
                    }
                }
            }
        }
        
        // Write back world.json
        fs.writeFileSync(worldJsonPath, JSON.stringify(worldData, null, 2) + '\n', 'utf8');
        console.log(`Saved world.json for ${worldName}`);
    }
    
    console.log('Update complete!');
}

main();
