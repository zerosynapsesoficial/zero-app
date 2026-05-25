const fs = require('fs');
const js = fs.readFileSync('js/app.js', 'utf8');

js.split('\n').forEach((line, idx) => {
    if (line.includes('appointments') && (line.includes('localStorage') || line.includes('local') || line.includes('setItem') || line.includes('getItem'))) {
        console.log(`${idx+1}: ${line.trim()}`);
    }
});
