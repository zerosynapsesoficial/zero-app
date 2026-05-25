const fs = require('fs');
const js = fs.readFileSync('js/app.js', 'utf8');

js.split('\n').forEach((line, idx) => {
    if (line.includes("hash.startsWith('#agendar')") || line.includes("hash.startsWith('#agendar") || line.includes("hash.includes('#agendar")) {
        console.log(`${idx+1}: ${line.trim()}`);
    }
});
