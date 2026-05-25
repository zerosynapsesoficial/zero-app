const fs = require('fs');
const js = fs.readFileSync('js/app.js', 'utf8');

js.split('\n').forEach((line, idx) => {
    if (line.includes("from('products')") || line.includes("from('user_products')")) {
        console.log(`${idx+1}: ${line.trim()}`);
    }
});
