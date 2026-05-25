const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const homeStartIndex = html.indexOf('id="home"');
const homeEndIndex = html.indexOf('id="busca"');
const homeSection = html.slice(homeStartIndex, homeEndIndex);

homeSection.split('\n').forEach((line, idx) => {
    if (line.includes('<header') || line.includes('class="') || line.includes('intro')) {
        console.log(`${idx+1}: ${line.trim()}`);
    }
});
