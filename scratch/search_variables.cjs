const fs = require('fs');
const css = fs.readFileSync('style.css', 'utf8');

css.split('\n').forEach((line, idx) => {
    if (line.includes(':root') || line.includes('--bg') || line.includes('--text') || idx < 30) {
        console.log(`${idx+1}: ${line.trim()}`);
    }
});
