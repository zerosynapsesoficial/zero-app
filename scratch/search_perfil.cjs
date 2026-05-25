const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const startIdx = html.indexOf('id="perfil"');
const endIdx = html.indexOf('id="notificacoes"');
const section = html.slice(startIdx, endIdx);

section.split('\n').forEach((line, idx) => {
    if (idx < 60) {
        console.log(`${idx+1}: ${line.trim()}`);
    }
});
