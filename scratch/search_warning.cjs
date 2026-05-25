const fs = require('fs');

const code = fs.readFileSync('js/app.js', 'utf8');
const lines = code.split('\n');

console.log("=== Listing all TIMEOUT occurrences in js/app.js ===");
lines.forEach((line, idx) => {
    if (line.includes('TIMEOUT')) {
        console.log(`L${idx + 1}: ${line.trim()}`);
    }
});
