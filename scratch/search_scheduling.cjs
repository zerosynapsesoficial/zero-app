const fs = require('fs');
const content = fs.readFileSync('js/app.js', 'utf8');

const lines = content.split('\n');
console.log("=== Matching lines in js/app.js ===");
lines.forEach((line, index) => {
    if (line.includes('.from(') || line.includes('supabaseClient')) {
        console.log(`${index + 1}: ${line.trim()}`);
    }
});
