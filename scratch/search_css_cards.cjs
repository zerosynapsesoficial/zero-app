const fs = require('fs');
const css = fs.readFileSync('style.css', 'utf8');

css.split('\n').forEach((line, idx) => {
    if (line.includes('user-type') || line.includes('type-card') || line.includes('cards')) {
        console.log(`${idx+1}: ${line.trim()}`);
    }
});
