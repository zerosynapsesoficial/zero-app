const fs = require('fs');
const path = require('path');

function searchDir(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            if (file !== 'node_modules' && file !== '.git' && file !== '.gemini' && file !== 'dist') {
                searchDir(fullPath);
            }
        } else if (file.endsWith('.js') || file.endsWith('.html') || file.endsWith('.ts')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes('handleCredentialResponse')) {
                console.log(`Found in: ${fullPath}`);
                content.split('\n').forEach((line, idx) => {
                    if (line.includes('handleCredentialResponse')) {
                        console.log(`  ${idx+1}: ${line.trim()}`);
                    }
                });
            }
        }
    });
}

searchDir('.');
