const fs = require('fs');
const css = fs.readFileSync('style.css', 'utf8');

css.split('\n').forEach((line, idx) => {
    if (line.includes('menu-item') || line.includes('outline-icon')) {
        console.log(`${idx+1}: ${line.trim()}`);
    }
});
