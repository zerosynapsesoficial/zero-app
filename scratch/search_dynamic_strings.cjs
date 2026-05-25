const fs = require('fs');
const js = fs.readFileSync('js/app.js', 'utf8');

js.split('\n').forEach((line, idx) => {
    if (line.toLowerCase().includes('novo por') || line.toLowerCase().includes('vitrine de')) {
        console.log(`${idx+1}: ${line.trim()}`);
    }
});
