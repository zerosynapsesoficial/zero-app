const fs = require('fs');
const appJs = fs.readFileSync('js/app.js', 'utf8');

appJs.split('\n').forEach((line, idx) => {
    if (line.includes('recent-professionals-content') || line.includes('plus-products-content')) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
