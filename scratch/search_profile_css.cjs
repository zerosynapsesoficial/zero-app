const fs = require('fs');
const css = fs.readFileSync('style.css', 'utf8');

css.split('\n').forEach((line, idx) => {
    if (line.includes('profile-info-card') || line.includes('info-item') || line.includes('profile-avatar')) {
        console.log(`${idx+1}: ${line.trim()}`);
    }
});
