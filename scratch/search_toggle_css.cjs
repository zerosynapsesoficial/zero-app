const fs = require('fs');
const css = fs.readFileSync('style.css', 'utf8');

css.split('\n').forEach((line, idx) => {
    if (line.includes('btn-toggle-recent') || line.includes('btn-toggle-products')) {
        console.log(`${idx+1}: ${line.trim()}`);
    }
});
