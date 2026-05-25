const fs = require('fs');
const js = fs.readFileSync('js/app.js', 'utf8');

js.split('\n').forEach((line, idx) => {
    if (line.includes('booking') && (line.includes('btn') || line.includes('click') || line.includes('confirm') || line.includes('mobile'))) {
        console.log(`${idx+1}: ${line.trim()}`);
    }
});
