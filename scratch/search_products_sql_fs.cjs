const fs = require('fs');
const path = require('path');

const files = fs.readdirSync('.');
files.forEach(file => {
    if (file.endsWith('.sql')) {
        const content = fs.readFileSync(file, 'utf8');
        content.split('\n').forEach((line, idx) => {
            if (line.toLowerCase().includes('products') || line.toLowerCase().includes('produto')) {
                console.log(`${file} L${idx+1}: ${line.trim()}`);
            }
        });
    }
});
