const fs = require('fs');
const js = fs.readFileSync('js/app.js', 'utf8');

js.split('\n').forEach((line, idx) => {
    if (line.includes('hashchange') || line.includes('location.hash') || line.includes('showScreen')) {
        console.log(`${idx+1}: ${line.trim()}`);
    }
});
