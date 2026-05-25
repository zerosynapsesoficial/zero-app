const fs = require('fs');
const js = fs.readFileSync('js/app.js', 'utf8');

js.split('\n').forEach((line, idx) => {
    if (line.includes('gastos-total') || line.includes('lucros') || line.includes('Total Gasto')) {
        console.log(`${idx+1}: ${line.trim()}`);
    }
});
