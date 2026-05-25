const { createClient } = require('@supabase/supabase-js');

const url = "https://oryguljbqcphbtiapvwk.supabase.co";
const key = "sb_publishable_WaiQI8T9aLg9iJkV3nEZBg_C5M24-Z5";

const supabase = createClient(url, key);

async function testInsert() {
    console.log("=== STEP 1: Fetching a Professional Profile ===");
    const { data: profs, error: profErr } = await supabase
        .from('profiles')
        .select('id, full_name, user_type')
        .eq('user_type', 'professional')
        .limit(1);

    if (profErr) {
        console.error("❌ Error fetching professionals:", profErr.message);
        return;
    }
    
    if (!profs || proffsLength() === 0) {
        console.log("⚠️ No professional profile found in profiles table.");
    }
    const profId = profs && profs.length > 0 ? profs[0].id : null;
    const profName = profs && profs.length > 0 ? profs[0].full_name : 'Mock Professional';
    console.log(`✅ Professional: ${profName} (${profId})`);

    console.log("=== STEP 2: Fetching a Client Profile ===");
    const { data: clients, error: clientErr } = await supabase
        .from('profiles')
        .select('id, full_name, user_type')
        .eq('user_type', 'client')
        .limit(1);

    if (clientErr) {
        console.error("❌ Error fetching clients:", clientErr.message);
        return;
    }
    const clientId = clients && clients.length > 0 ? clients[0].id : 'e33bdd17-f6bc-4c72-82cf-c3f76124aca0'; // Fallback to Admin ID
    const clientName = clients && clients.length > 0 ? clients[0].full_name : 'Admin Client';
    console.log(`✅ Client: ${clientName} (${clientId})`);

    if (!profId) {
        console.error("❌ Cannot proceed without a valid professional ID.");
        return;
    }

    console.log("=== STEP 3: Testing duplicateQuery ===");
    const { data: dupData, error: dupErr } = await supabase
        .from('appointments')
        .select('id')
        .eq('professional_id', profId)
        .eq('date', '2026-05-25')
        .eq('time', '14:30')
        .neq('status', 'cancelled')
        .limit(1);

    if (dupErr) {
        console.error("❌ duplicateQuery FAILED:", dupErr.message, dupErr.details);
    } else {
        console.log("✅ duplicateQuery Succeeded:", dupData);
    }

    console.log("=== STEP 4: Testing insertQuery ===");
    let insertData = {
        professional_id: profId,
        client_id: clientId,
        date: '2026-05-25',
        time: '14:30',
        status: 'pending',
        service_name: 'Corte Social',
        price: 45.00
    };

    const { data: insData, error: insErr } = await supabase
        .from('appointments')
        .insert([insertData])
        .select();

    if (insErr) {
        console.error("❌ insertQuery FAILED:", insErr.message);
        console.error("   Code:", insErr.code);
        console.error("   Details:", insErr.details);
        console.error("   Hint:", insErr.hint);
    } else {
        console.log("✅ insertQuery Succeeded! ID:", insData[0].id);
        // Clean it up
        await supabase.from('appointments').delete().eq('id', insData[0].id);
        console.log("   Cleaned up test insertion successfully.");
    }
}

function proffsLength() {
    return 0; // simple helper
}

testInsert().catch(console.error);
