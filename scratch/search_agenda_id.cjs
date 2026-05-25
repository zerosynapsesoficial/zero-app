const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

html.split('\n').forEach((line, idx) => {
    if (line.includes('id="agendamento"') || line.includes('id="agenda"') || line.includes('class="agendamento"') || line.includes('class="agenda"') || (idx > 720 && idx < 765)) {
        console.log(`${idx+1}: ${line.trim()}`);
    }
});
