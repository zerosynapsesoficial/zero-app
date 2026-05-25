const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

html.split('\n').forEach((line, idx) => {
    if (line.includes('Confirmar Agendamento') || line.includes('confirmar-agendamento') || line.includes('btn-confirm')) {
        console.log(`${idx+1}: ${line.trim()}`);
    }
});
