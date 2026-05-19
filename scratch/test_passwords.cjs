const { createClient } = require('@supabase/supabase-js');

const url = "https://oryguljbqcphbtiapvwk.supabase.co";
const key = "sb_publishable_WaiQI8T9aLg9iJkV3nEZBg_C5M24-Z5";

const supabase = createClient(url, key);

async function testPasswords() {
    const emails = ['lara.cabeleireira@teste.com', 'admin@zerosynapses.com'];
    const passwords = ['ZP@147896325@ZP', 'senha123'];

    for (const email of emails) {
        for (const password of passwords) {
            console.log(`Testing ${email} with password: ${password}`);
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                console.log(`  ❌ FAILED: ${error.message} (status: ${error.status})`);
            } else {
                console.log(`  ✅ SUCCESS! User ID: ${data.user.id}`);
                await supabase.auth.signOut();
            }
        }
    }
}

testPasswords().catch(console.error);
