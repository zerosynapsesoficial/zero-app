const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');
html.split('\n').forEach((line, idx) => {
    if (line.includes('screen-header')) {
        console.log(`index.html:${idx+1} - ${line.trim()}`);
    }
});

const css = fs.readFileSync('style.css', 'utf8');
css.split('\n').forEach((line, idx) => {
    if (line.includes('screen-header')) {
        console.log(`style.css:${idx+1} - ${line.trim()}`);
    }
});
