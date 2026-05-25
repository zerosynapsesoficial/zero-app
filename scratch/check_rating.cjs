const fs = require('fs');
const content = fs.readFileSync('js/app.js', 'utf8');

const lines = content.split('\n');
console.log("=== References to '.rating' or 'rating' in js/app.js ===");
lines.forEach((line, index) => {
    if (line.includes('rating') || line.includes('Rating')) {
        console.log(`${index + 1}: ${line.trim()}`);
    }
});
