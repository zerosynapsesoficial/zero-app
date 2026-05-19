const fs = require('fs');
const content = fs.readFileSync('js/app.js', 'utf8');

const lines = content.split('\n');
console.log("=== Matching lines in js/app.js ===");
lines.forEach((line, index) => {
    if (line.includes('setupCustomProfDropdown')) {
        console.log(`${index + 1}: ${line.trim()}`);
        // Print 20 lines around
        const start = Math.max(0, index - 10);
        const end = Math.min(lines.length - 1, index + 10);
        console.log("--- CONTEXT ---");
        for (let i = start; i <= end; i++) {
            console.log(`  ${i + 1}: ${lines[i]}`);
        }
        console.log("===============");
    }
});
