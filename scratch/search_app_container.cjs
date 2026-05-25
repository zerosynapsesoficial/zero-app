const fs = require('fs');
const css = fs.readFileSync('style.css', 'utf8');

css.split('\n').forEach((line, idx) => {
    if (line.includes('body') || line.includes('html') || line.includes('#app-container') || line.includes('main-container')) {
        console.log(`${idx+1}: ${line.trim()}`);
    }
});
