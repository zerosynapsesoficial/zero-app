const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

html.split('\n').forEach((line, idx) => {
    if (line.includes('id="user-type-selection"') || line.includes('user-type-selection')) {
        console.log(`${idx+1}: ${line.trim()}`);
    }
});
