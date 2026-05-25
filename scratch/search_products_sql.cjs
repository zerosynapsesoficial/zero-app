const fs = require('fs');
const glob = require('glob');

const sqlFiles = glob.sync('*.sql');
sqlFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    content.split('\n').forEach((line, idx) => {
        if (line.toLowerCase().includes('products') || line.toLowerCase().includes('produto')) {
            console.log(`${file} L${idx+1}: ${line.trim()}`);
        }
    });
});
