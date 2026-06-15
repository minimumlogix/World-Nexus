import fs from 'fs';
import path from 'path';

const stylesDir = 'd:/Hobby/Websites/Projects/World Nexus/tools/intro-editor/styles';

const files = fs.readdirSync(stylesDir).filter(f => f.startsWith('vn_') && f.endsWith('.css'));

files.forEach(file => {
    const filePath = path.join(stylesDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Helper to insert or update margin: 0 in a block
    function updateBlockMargin(selector) {
        // Find selector block
        // Escaping selector for regex
        const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Match group 1 is the inner content of the block
        const regex = new RegExp(`(${escapedSelector}\\s*\\{)([^}]+)(\\})`, 'g');

        if (regex.test(content)) {
            content = content.replace(regex, (match, p1, p2, p3) => {
                // Check if margin is defined
                if (p2.includes('margin:')) {
                    // Replace existing margin definition
                    p2 = p2.replace(/margin\s*:[^;]+;/g, 'margin: 0;');
                } else {
                    // Add margin: 0 at the start of the block
                    // Extract leading indentation from the first property if possible
                    const matchIndent = p2.match(/^\s+/);
                    const indent = matchIndent ? matchIndent[0] : '\n  ';
                    p2 = indent + 'margin: 0;' + p2;
                }
                modified = true;
                return p1 + p2 + p3;
            });
        }
    }

    // Update targets
    updateBlockMargin('.vn-image-wrapper');
    updateBlockMargin('.vn-dialogue-box.vn-dialogue-style-nvl');
    updateBlockMargin('.vn-music-wrapper.vn-music-style-default');

    if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated margins in ${file}`);
    }
});
