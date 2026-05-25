const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'js', 'app.js');
let content = fs.readFileSync(filePath, 'utf8');

// =====================================================
// FIX 1: Texto corrompido pelo PowerShell (Latin-1 -> UTF-8)
// =====================================================
const fixes = [
    // Notificações corrompidas
    ['Sem notificaÃ§Ãµes novas.', 'Sem notificações novas.'],
    ['notificaÃ§Ãµes', 'notificações'],
    ['VerificaÃ§Ã£o', 'Verificação'],
    ['prÃ³prio', 'próprio'],
    ['admins', 'admins'], // keep
    // Emojis corrompidos
    ['ðŸ•­', '🕯'],
    ['ðŸ—¨ï¸', '💬'],
    ['ðŸ"…', '📅'],
    ['âš™ï¸', '⚙️'],
    ['ðŸŽ', '🎁'],
    ['â„¹ï¸', 'ℹ️'],
    ['ðŸš¨', '🚨'],
    // Other common corruptions
    ['Ã§Ã£o', 'ção'],
    ['Ã§Ãµes', 'ções'],
    ['notificaÃ', 'notifica'],
    ['Verificaç', 'Verificaç'], // keep correct
    // More corruptions from the PS script
    ['Ã©', 'é'],
    ['Ã³', 'ó'],
    ['Ã¡', 'á'],
    ['Ã', 'Ã'], // placeholder - handle carefully
];

let fixCount = 0;
for (const [bad, good] of fixes) {
    if (bad === good) continue;
    const count = (content.split(bad).length - 1);
    if (count > 0) {
        content = content.split(bad).join(good);
        console.log(`Fixed "${bad}" -> "${good}" (${count}x)`);
        fixCount += count;
    }
}

// More precise fix for remaining corruptions near our edits
const remainingFixes = [
    ['SemnotificaÃ', 'Sem notifica'], // unlikely but safe
    ['permiÃ', 'permi'],
    ['prÃ', 'pr'],
];

console.log(`Total fixes applied: ${fixCount}`);

// =====================================================
// FIX 2: Badge do chat para ADM — contar mensagens recebidas
// por QUALQUER admin, não apenas user.id
// =====================================================
// The current query only counts messages where receiver_id = user.id
// For admin users, support messages may go to the "main" admin UUID
// We need to also count messages where receiver_id is any admin in the platform

const oldBadgeQuery = `        // Fetch unread messages count
        const { count: msgCount, error: msgError } = await supabaseClient
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('receiver_id', user.id)
            .eq('is_read', false);`;

const newBadgeQuery = `        // Fetch unread messages count
        // For admin users: also count messages received by ANY admin account (support inbox)
        let msgCount = 0;
        let msgError = null;
        try {
            const isAdmin = isAdminUser(user);
            if (isAdmin) {
                // Admin: count ALL unread messages addressed to any admin (support inbox)
                // First get all admin IDs
                const { data: adminProfiles } = await supabaseClient
                    .from('profiles')
                    .select('id')
                    .eq('user_type', 'admin');
                const adminIds = (adminProfiles || []).map(p => p.id);
                if (adminIds.length > 0) {
                    const { count: adminMsgCount, error: adminMsgErr } = await supabaseClient
                        .from('messages')
                        .select('*', { count: 'exact', head: true })
                        .in('receiver_id', adminIds)
                        .eq('is_read', false);
                    msgCount = adminMsgCount || 0;
                    msgError = adminMsgErr;
                }
            } else {
                // Regular user: count own unread messages
                const { count: userMsgCount, error: userMsgErr } = await supabaseClient
                    .from('messages')
                    .select('*', { count: 'exact', head: true })
                    .eq('receiver_id', user.id)
                    .eq('is_read', false);
                msgCount = userMsgCount || 0;
                msgError = userMsgErr;
            }
        } catch (err) {
            console.warn('Error counting unread messages:', err);
        }`;

if (content.includes(oldBadgeQuery)) {
    content = content.replace(oldBadgeQuery, newBadgeQuery);
    console.log('✅ Fixed admin chat badge count query');
} else {
    console.log('⚠️  Badge query not found exactly - checking partial match...');
    // Check if already updated
    if (content.includes('isAdmin = isAdminUser(user)')) {
        console.log('   Badge query already updated!');
    } else {
        console.log('   Need manual check at updateNotificationBadges');
    }
}

// Write back
fs.writeFileSync(filePath, content, { encoding: 'utf8' });
console.log('\n✅ File saved successfully!');

// Verify key strings
const check = fs.readFileSync(filePath, 'utf8');
console.log('\nVerification:');
console.log('  "Sem notificações novas." present:', check.includes('Sem notificações novas.'));
console.log('  "🕯" present:', check.includes('🕯'));
console.log('  Admin badge query present:', check.includes('isAdmin = isAdminUser(user)'));
console.log('  Old corrupted text gone:', !check.includes('notificaÃ'));
