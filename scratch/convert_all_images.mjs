import { optimizeImage } from 'wasm-image-optimization';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const projectRoot = process.cwd();

// Find files recursively
function getFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    // Ignore node_modules, .git, and scratch directories
    if (file === 'node_modules' || file === '.git' || file === 'scratch') {
      continue;
    }
    
    if (stat.isDirectory()) {
      getFiles(filePath, fileList);
    } else {
      fileList.push(filePath);
    }
  }
  return fileList;
}

async function run() {
  console.log('--- Starting PNG to AVIF Image Conversion Process ---');
  
  // 1. Find all PNG files
  const allFiles = getFiles(projectRoot);
  const pngFiles = allFiles.filter(f => f.endsWith('.png'));
  console.log(`Found ${pngFiles.length} PNG files to convert.`);

  // 2. Convert PNG to AVIF
  let convertedCount = 0;
  for (const pngPath of pngFiles) {
    const relativePngPath = path.relative(projectRoot, pngPath);
    const avifPath = pngPath.substring(0, pngPath.length - 4) + '.avif';
    const relativeAvifPath = path.relative(projectRoot, avifPath);
    
    console.log(`Converting [${convertedCount + 1}/${pngFiles.length}]: ${relativePngPath} -> ${relativeAvifPath}`);
    
    try {
      const inputBuffer = fs.readFileSync(pngPath);
      const result = await optimizeImage({
        image: inputBuffer,
        format: 'avif',
        quality: 80
      });
      
      if (result && result.data) {
        fs.writeFileSync(avifPath, Buffer.from(result.data));
        console.log(`  Success! Size: ${inputBuffer.length} bytes -> ${result.data.length} bytes`);
        convertedCount++;
        
        // Add new AVIF file to git
        execSync(`git add "${avifPath}"`);
        
        // Remove old PNG file from git and filesystem
        execSync(`git rm -f "${pngPath}"`);
      } else {
        console.error(`  Failed (no data in response): ${relativePngPath}`);
      }
    } catch (err) {
      console.error(`  Error converting ${relativePngPath}:`, err);
    }
  }
  
  console.log(`Converted ${convertedCount} of ${pngFiles.length} files successfully.`);

  // 3. Update references in code and configurations
  console.log('\nUpdating file references...');
  const textExtensions = ['.json', '.md', '.html', '.css', '.js', '.mjs'];
  
  // We scan the workspace again (including scratch directory files like scratch/server.js but excluding node_modules/git)
  const allTextFiles = [];
  function getTextFiles(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (file === 'node_modules' || file === '.git' || filePath.includes('convert_all_images.mjs')) {
        continue;
      }
      
      if (stat.isDirectory()) {
        getTextFiles(filePath);
      } else {
        const ext = path.extname(filePath).toLowerCase();
        if (textExtensions.includes(ext)) {
          allTextFiles.push(filePath);
        }
      }
    }
  }
  getTextFiles(projectRoot);
  
  let filesUpdated = 0;
  for (const filePath of allTextFiles) {
    const relativePath = path.relative(projectRoot, filePath);
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // We look for references to ".png" case-insensitively and replace them with ".avif"
      // But we must be careful with some references, so we do it globally
      const pngRegex = /\.png/gi;
      if (pngRegex.test(content)) {
        console.log(`Updating references in: ${relativePath}`);
        // Perform replacement
        const updatedContent = content.replace(pngRegex, '.avif');
        fs.writeFileSync(filePath, updatedContent, 'utf8');
        filesUpdated++;
      }
    } catch (err) {
      console.error(`Error processing file ${relativePath}:`, err);
    }
  }
  
  console.log(`Updated references in ${filesUpdated} files.`);
  console.log('--- PNG to AVIF Image Conversion Process Finished ---');
}

run().catch(err => {
  console.error('Fatal error running conversion:', err);
});
