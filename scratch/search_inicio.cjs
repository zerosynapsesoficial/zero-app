const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

html.split('\n').forEach((line, idx) => {
    if (line.toLowerCase().includes('início') || line.toLowerCase().includes('inicio')) {
        console.log(`${idx+1}: ${line.trim()}`);
    }
});
