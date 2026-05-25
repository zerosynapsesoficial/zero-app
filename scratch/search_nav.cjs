const fs = require('fs');
const css = fs.readFileSync('style.css', 'utf8');

css.split('\n').forEach((line, idx) => {
    if (line.includes('bottom') || line.includes('menu') || line.includes('bar')) {
        if (idx < 500) { // check first 500 lines
            console.log(`${idx+1}: ${line.trim()}`);
        }
    }
});
