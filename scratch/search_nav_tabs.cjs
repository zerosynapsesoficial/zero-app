const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

html.split('\n').forEach((line, idx) => {
    if (line.toLowerCase().includes('nav-item') || line.toLowerCase().includes('top-tab-bar') || line.toLowerCase().includes('bottom-nav') || line.toLowerCase().includes('menu-item')) {
        console.log(`${idx+1}: ${line.trim()}`);
    }
});
