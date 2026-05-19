const fs = require('fs');
const content = fs.readFileSync('style.css', 'utf8');

const lines = content.split('\n');
console.log("=== Matching lines in style.css ===");
lines.forEach((line, index) => {
    if (line.includes('category-filter') || line.includes('search-input-wrapper')) {
        console.log(`${index + 1}: ${line.trim()}`);
        // Print 5 lines around
        const start = Math.max(0, index - 5);
        const end = Math.min(lines.length - 1, index + 5);
        console.log("--- CONTEXT ---");
        for (let i = start; i <= end; i++) {
            console.log(`  ${i + 1}: ${lines[i]}`);
        }
        console.log("===============");
    }
});
