const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'js', 'app.js');

// Read raw bytes as UTF-8
let content = fs.readFileSync(filePath, 'utf8');

// Count occurrences before fix
const badStr = "const me = await getCurrentUser();\\n            if (!me) return null;";
const goodStr = "const me = await getCurrentUser();\n            if (!me) return null;";

const countBefore = (content.match(new RegExp(badStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
console.log(`Found ${countBefore} occurrence(s) of the bad string.`);

if (countBefore === 0) {
    // Check if it's already fixed
    const alreadyFixed = content.includes(goodStr);
    console.log('Already fixed?', alreadyFixed);
    
    // Try to find anything near line 3040
    const lines = content.split('\n');
    const badLine = lines.find(l => l.includes('getCurrentUser();\\n'));
    console.log('Bad line found:', badLine ? JSON.stringify(badLine) : 'NOT FOUND');
    process.exit(0);
}

// Fix: replace the literal backslash-n with actual newline
content = content.replace(
    /const me = await getCurrentUser\(\);\\n(\s+)if \(!me\) return null;/g,
    (match, spaces) => `const me = await getCurrentUser();\n${spaces}if (!me) return null;`
);

// Write back with same encoding (no BOM)
fs.writeFileSync(filePath, content, { encoding: 'utf8' });
console.log('Fixed and saved successfully!');

// Verify
const newContent = fs.readFileSync(filePath, 'utf8');
const stillBad = newContent.includes("getCurrentUser();\\n");
console.log('Still has bad string?', stillBad);
console.log('Has good string?', newContent.includes("getCurrentUser();\n            if (!me) return null;"));
