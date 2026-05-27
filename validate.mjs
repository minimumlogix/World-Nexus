import fs from 'fs';
import path from 'path';

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
                        console.log(`Missing import: ${importPath} in ${fullPath}`);
                    }
                }
            }
        }
    });
}
checkImports('./js');
console.log('Done');
