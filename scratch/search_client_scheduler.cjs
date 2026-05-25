const fs = require('fs');
const js = fs.readFileSync('js/app.js', 'utf8');

js.split('\n').forEach((line, idx) => {
    if (line.includes('VISÃO DO CLIENTE') || line.includes('Agendar Novo') || line.includes('confirmBooking') || line.includes('Confirmar Agendamento')) {
        console.log(`${idx+1}: ${line.trim()}`);
    }
});
