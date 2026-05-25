const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

html.split('\n').forEach((line, idx) => {
    if (line.includes('id="perfil"') || (idx > 1050 && idx < 1140)) {
        console.log(`${idx+1}: ${line.trim()}`);
    }
});
