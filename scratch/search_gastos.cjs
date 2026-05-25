const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const startIdx = html.indexOf('id="gastos"');
const endIdx = html.indexOf('id="cupons-overlay"');
const section = html.slice(startIdx, startIdx + 3000);

section.split('\n').forEach((line, idx) => {
    if (idx < 60) {
        console.log(`${idx+1}: ${line.trim()}`);
    }
});
