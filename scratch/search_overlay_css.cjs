const fs = require('fs');
const css = fs.readFileSync('style.css', 'utf8');

css.split('\n').forEach((line, idx) => {
    if (line.includes('.overlay') || line.includes('overlay')) {
        console.log(`${idx+1}: ${line.trim()}`);
    }
});
