const fs = require('fs');
const js = fs.readFileSync('js/app.js', 'utf8');

js.split('\n').forEach((line, idx) => {
    if (line.includes('supabaseClient.auth.user') || line.includes('supabaseClient.auth.session') || (line.includes('user') && line.includes('localStorage.getItem'))) {
        console.log(`${idx+1}: ${line.trim()}`);
    }
});
