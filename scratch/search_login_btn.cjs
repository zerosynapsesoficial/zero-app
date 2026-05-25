const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const loginStartIndex = html.indexOf('id="login"');
const loginEndIndex = html.indexOf('id="perfil"'); // since Perfil is next or similar
const loginSection = html.slice(loginStartIndex, loginStartIndex + 3000);

loginSection.split('\n').forEach((line, idx) => {
    if (line.includes('<button') || line.includes('class="btn') || line.includes('Entrar') || line.includes('Começar')) {
        console.log(`${idx+1}: ${line.trim()}`);
    }
});
