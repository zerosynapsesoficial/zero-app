// Migrate DB: add rating, cancelled_count, completed_count to profiles
// and add 'completed'/'no_show' statuses support

const PROJECT_REF = 'oryguljbqcphbtiapvwk';
const ACCESS_TOKEN = 'sbp_68b654db48c25eaab31721e7547b9f68453e919d';

async function runSQL(sql) {
    const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: sql })
    });
    const text = await res.text();
    if (!res.ok) {
        throw new Error(`SQL failed (${res.status}): ${text}`);
    }
    return JSON.parse(text);
}

async function main() {
    console.log('=== Migrating Database for Rating System ===\n');

    // 1. Add rating columns to profiles
    console.log('1. Adding rating columns to profiles...');
    await runSQL(`
        ALTER TABLE public.profiles 
        ADD COLUMN IF NOT EXISTS rating NUMERIC(3,1) DEFAULT 4.7,
        ADD COLUMN IF NOT EXISTS cancelled_count INT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS completed_count INT DEFAULT 0;
    `);
    console.log('✅ Columns added');

    // 2. Set default rating 4.7 for all existing users without a rating
    console.log('2. Setting default rating 4.7 for existing users...');
    await runSQL(`
        UPDATE public.profiles SET rating = 4.7 WHERE rating IS NULL;
        UPDATE public.profiles SET cancelled_count = 0 WHERE cancelled_count IS NULL;
        UPDATE public.profiles SET completed_count = 0 WHERE completed_count IS NULL;
    `);
    console.log('✅ Default ratings set');

    // 3. Verify
    console.log('3. Verifying...');
    const result = await runSQL(`SELECT id, full_name, user_type, rating, cancelled_count, completed_count FROM public.profiles LIMIT 5;`);
    console.log('Sample profiles after migration:');
    console.log(JSON.stringify(result, null, 2));

    console.log('\n✅ Migration complete!');
}

main().catch(console.error);
