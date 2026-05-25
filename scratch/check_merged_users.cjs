const fs = require('fs');
const content = fs.readFileSync('js/app.js', 'utf8');

const lines = content.split('\n');
console.log("=== Lines 4440 to 4480 in js/app.js ===");
for (let i = 4435; i <= 4485; i++) {
    console.log(`${i + 1}: ${lines[i]}`);
}
