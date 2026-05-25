const fs = require('fs');
const js = fs.readFileSync('js/app.js', 'utf8');

js.split('\n').forEach((line, idx) => {
    if (line.includes('avatar_url') || line.includes('avatar') || line.includes('photoURL') || line.includes('google') && line.includes('picture')) {
        console.log(`${idx+1}: ${line.trim()}`);
    }
});
