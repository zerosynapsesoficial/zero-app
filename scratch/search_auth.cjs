const fs = require('fs');
const js = fs.readFileSync('js/app.js', 'utf8');

js.split('\n').forEach((line, idx) => {
    if (line.includes('supabaseClient.auth') || line.includes('getSession') || line.includes('getCurrentUser')) {
        console.log(`${idx+1}: ${line.trim()}`);
    }
});
