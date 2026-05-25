const fs = require('fs');
const content = fs.readFileSync('js/app.js', 'utf8');

const lines = content.split('\n');
console.log("=== Matching lines for client-agenda-date ===");
lines.forEach((line, index) => {
    if (line.includes('client-agenda-date')) {
        console.log(`${index + 1}: ${line.trim()}`);
        // Print context
        const start = Math.max(0, index - 15);
        const end = Math.min(lines.length - 1, index + 15);
        console.log("--- CONTEXT ---");
        for (let i = start; i <= end; i++) {
            console.log(`  ${i + 1}: ${lines[i]}`);
        }
        console.log("===============");
    }
});
