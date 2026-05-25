const fs = require('fs');
const js = fs.readFileSync('js/app.js', 'utf8');

js.split('\n').forEach((line, idx) => {
    const l = line.toLowerCase();
    if (l.includes('appointments') && (l.includes('local') || l.includes('set') || l.includes('push') || l.includes('save'))) {
        console.log(`${idx+1}: ${line.trim()}`);
    }
});
