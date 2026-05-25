const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');

const lines = content.split('\n');
console.log("=== Matching lines in index.html ===");
lines.forEach((line, index) => {
    if (line.includes('search-sort-toggle') || line.includes('category-filter')) {
        console.log(`${index + 1}: ${line.trim()}`);
        // Print 10 lines around
        const start = Math.max(0, index - 8);
        const end = Math.min(lines.length - 1, index + 8);
        console.log("--- CONTEXT ---");
        for (let i = start; i <= end; i++) {
            console.log(`  ${i + 1}: ${lines[i]}`);
        }
        console.log("===============");
    }
});
