const fs = require('fs');
const js = fs.readFileSync('js/app.js', 'utf8');

js.split('\n').forEach((line, idx) => {
    if (line.includes('top-tab') || line.includes('active') && line.includes('classList') && line.includes('add')) {
        if (idx > 1000 && idx < 5000) {
            console.log(`${idx+1}: ${line.trim()}`);
        }
    }
});
