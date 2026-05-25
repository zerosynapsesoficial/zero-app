const fs = require('fs');
const c = fs.readFileSync('js/app.js', 'utf8');

// Check for remaining Latin-1 corruption patterns
const badPatterns = ['Ã§', 'Ã£', 'Ã©', 'Ã³', 'Ã¡', 'ÃŸ', 'Ã±', 'Ã¼', 'Ã¶', 'Ã¤', 'ðŸ', 'âš', 'â„', 'â€'];
let total = 0;
for (const p of badPatterns) {
    const count = c.split(p).length - 1;
    if (count > 0) {
        console.log(`"${p}" found ${count}x`);
        total += count;
    }
}
if (total === 0) {
    console.log('✅ No corrupted characters found!');
} else {
    console.log(`Total remaining: ${total}`);
}

// Verify key fixes
console.log('\nKey verifications:');
console.log('  notificações:', c.includes('Sem notificações novas.'));
console.log('  admin badge:', c.includes('isAdmin = isAdminUser(user)'));
console.log('  syntax OK (no literal backslash-n):', !c.includes('getCurrentUser();\\n'));
