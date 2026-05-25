const { createClient } = require('@supabase/supabase-js');

const url = "https://oryguljbqcphbtiapvwk.supabase.co";
const key = "sb_publishable_WaiQI8T9aLg9iJkV3nEZBg_C5M24-Z5";

const supabase = createClient(url, key);

async function testMockInsert() {
    console.log("=== Testing Insert with Mock Profile UUID ===");
    
    // Marcos Silva (mock professional) ID which does NOT exist in auth.users
    const mockSenderId = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';
    // ZeroZynapses (admin) ID
    const adminId = 'e33bdd17-f6bc-4c72-82cf-c3f76124aca0';

    const { data, error } = await supabase.from('messages').insert([{
        sender_id: mockSenderId,
        receiver_id: adminId,
        content: 'Teste de mensagem de perfil mock de profissional para o admin! 🚀'
    }]).select().single();

    if (error) {
        console.error("❌ Test FAILED! Foreign key constraint might still be present:", error.message);
        console.error("   Details:", error.details);
    } else {
        console.log("✅ Test SUCCESS! Message inserted successfully:", data.id);
        
        // Clean up
        await supabase.from('messages').delete().eq('id', data.id);
        console.log("   Test message cleaned up successfully.");
    }
}

testMockInsert().catch(console.error);
