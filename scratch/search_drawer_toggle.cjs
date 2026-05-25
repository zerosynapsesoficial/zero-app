const fs = require('fs');
const js = fs.readFileSync('js/app.js', 'utf8');

js.split('\n').forEach((line, idx) => {
    if (line.includes('btn-toggle-recent') || line.includes('btn-toggle-products') || line.includes('Novo por aqui') || line.includes('Vitrine de')) {
        console.log(`${idx+1}: ${line.trim()}`);
    }
});
