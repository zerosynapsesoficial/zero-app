const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

html.split('\n').forEach((line, idx) => {
    if (line.includes('class="menu"') || line.includes('class="top-tabs"') || line.includes('id="menu"') || (idx > 540 && idx < 590)) {
        console.log(`${idx+1}: ${line.trim()}`);
    }
});
