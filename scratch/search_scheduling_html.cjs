const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

html.split('\n').forEach((line, idx) => {
    if (line.includes('agendamento') || line.includes('Confirmar') || line.includes('confirm-booking') || (idx > 720 && idx < 770)) {
        console.log(`${idx+1}: ${line.trim()}`);
    }
});
