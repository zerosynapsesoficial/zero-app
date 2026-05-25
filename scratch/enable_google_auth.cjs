// Script to enable Google Auth provider in Supabase via Management API
// Supabase Management API: https://api.supabase.com/v1

const PROJECT_REF = 'oryguljbqcphbtiapvwk';
const GOOGLE_CLIENT_ID = '348192418109-gbg9quomppt6upi5bplu7t7nohnah5ue.apps.googleusercontent.com';

const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || '';

if (!ACCESS_TOKEN) {
    console.error('❌ SUPABASE_ACCESS_TOKEN not set.');
    console.error('Get your personal access token from: https://supabase.com/dashboard/account/tokens');
    console.error('Then run: $env:SUPABASE_ACCESS_TOKEN="your_token_here" ; node scratch/enable_google_auth.cjs');
    process.exit(1);
}

async function enableGoogleAuth() {
    console.log('🔍 Fetching current auth config...');
    const getRes = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`, {
        headers: {
            'Authorization': `Bearer ${ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
        }
    });
    
    if (!getRes.ok) {
        const text = await getRes.text();
        console.error(`❌ GET failed (${getRes.status}):`, text);
        process.exit(1);
    }
    
    const config = await getRes.json();
    console.log('Current external_google_enabled:', config.external_google_enabled);
    console.log('Current google_client_id:', config.external_google_client_id || '(empty)');
    
    // Patch to enable Google
    console.log('\n🔧 Enabling Google Auth provider...');
    const patchRes = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            external_google_enabled: true,
            external_google_client_id: GOOGLE_CLIENT_ID,
            external_google_secret: process.env.GOOGLE_CLIENT_SECRET || '',
            external_google_skip_nonce_check: true  // Allow signInWithIdToken without nonce
        })
    });
    
    if (!patchRes.ok) {
        const text = await patchRes.text();
        console.error(`❌ PATCH failed (${patchRes.status}):`, text);
        process.exit(1);
    }
    
    const updated = await patchRes.json();
    console.log('✅ Google Auth enabled!');
    console.log('external_google_enabled:', updated.external_google_enabled);
    console.log('external_google_client_id:', updated.external_google_client_id);
}

enableGoogleAuth().catch(console.error);
