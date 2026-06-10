import fs from 'fs';
import path from 'path';

const projectRoot = process.cwd();
const worldsDir = path.join(projectRoot, 'Worlds');
const registryPath = path.join(worldsDir, 'WorldList.json');

if (!fs.existsSync(registryPath)) {
  console.error(`Missing WorldList.json at ${registryPath}`);
  process.exit(1);
}

const worlds = JSON.parse(fs.readFileSync(registryPath, 'utf8'));

worlds.forEach(worldFolder => {
  const worldDir = path.join(worldsDir, worldFolder);
  const worldJsonPath = path.join(worldDir, 'world.json');
  if (!fs.existsSync(worldJsonPath)) return;

  const worldMeta = JSON.parse(fs.readFileSync(worldJsonPath, 'utf8'));
  const botIds = Array.from(new Set([
    ...(worldMeta.bots || []),
    ...(worldMeta.featuredBots || [])
  ]));

  botIds.forEach(botId => {
    const botDir = path.join(worldDir, botId);
    const botJsonPath = path.join(botDir, 'data', `${botId}.json`);
    if (!fs.existsSync(botJsonPath)) {
      console.warn(`Registered bot JSON not found: ${botJsonPath}`);
      return;
    }

    const botJson = JSON.parse(fs.readFileSync(botJsonPath, 'utf8'));
    let jsonModified = false;

    const abilities = botJson.metadata?.abilities;
    const relations = botJson.metadata?.relations;

    if (abilities || relations) {
      const lorePath = path.join(botDir, botJson.lore);
      if (fs.existsSync(lorePath)) {
        let loreMarkdown = fs.readFileSync(lorePath, 'utf8');
        let loreModified = false;

        // Migrate Abilities
        if (abilities && abilities.length > 0 && !loreMarkdown.includes('## Abilities')) {
          let abilitiesBlock = '\n\n## Abilities\n';
          abilities.forEach(ability => {
            abilitiesBlock += `- ${ability}\n`;
          });
          loreMarkdown = loreMarkdown.trim() + abilitiesBlock;
          loreModified = true;
          console.log(`Migrated Abilities for ${botId}`);
        }

        // Migrate Relations
        if (relations && Object.keys(relations).length > 0 && !loreMarkdown.includes('## Relations')) {
          let relationsBlock = '\n\n## Relations\n';
          Object.entries(relations).forEach(([name, desc]) => {
            relationsBlock += `- ${name}: ${desc}\n`;
          });
          loreMarkdown = loreMarkdown.trim() + relationsBlock;
          loreModified = true;
          console.log(`Migrated Relations for ${botId}`);
        }

        if (loreModified) {
          fs.writeFileSync(lorePath, loreMarkdown.trim() + '\n', 'utf8');
        }
      } else {
        console.warn(`Lore markdown file not found for ${botId}: ${lorePath}`);
      }

      // Remove migrated fields from JSON metadata
      if (botJson.metadata) {
        if (botJson.metadata.abilities) {
          delete botJson.metadata.abilities;
          jsonModified = true;
        }
        if (botJson.metadata.relations) {
          delete botJson.metadata.relations;
          jsonModified = true;
        }
        // If metadata is empty, delete it
        if (Object.keys(botJson.metadata).length === 0) {
          delete botJson.metadata;
          jsonModified = true;
        }
      }
    }

    if (jsonModified) {
      fs.writeFileSync(botJsonPath, JSON.stringify(botJson, null, 2) + '\n', 'utf8');
      console.log(`Cleaned up JSON for ${botId}`);
    }
  });
});

console.log('Migration completed successfully.');
