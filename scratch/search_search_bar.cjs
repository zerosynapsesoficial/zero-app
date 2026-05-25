const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

html.split('\n').forEach((line, idx) => {
    if (line.includes('O que você procura') || line.includes('O que voce procura') || line.includes('search-bar') || (idx > 600 && idx < 690)) {
        console.log(`${idx+1}: ${line.trim()}`);
    }
});
