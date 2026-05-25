const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

html.split('\n').forEach((line, idx) => {
    if (line.includes('fixed') || line.includes('nav') || line.includes('menu') || line.includes('bottom')) {
        console.log(`${idx+1}: ${line.trim()}`);
    }
});
