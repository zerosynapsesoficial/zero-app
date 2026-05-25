const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');
html.split('\n').forEach((line, idx) => {
    if (line.includes('Proximidade') || line.includes('Estrela') || line.includes('Preço') || line.includes('Preco')) {
        console.log(`HTML ${idx+1}: ${line.trim()}`);
    }
});

const js = fs.readFileSync('js/app.js', 'utf8');
js.split('\n').forEach((line, idx) => {
    if (line.includes('toggleSearchSortMode') || line.includes('search-sort-toggle') || line.includes('search-sort-badge')) {
        console.log(`JS ${idx+1}: ${line.trim()}`);
    }
});
