async function main() {
    const url = "https://zero-delta-one.vercel.app/api/supabase/rest/v1/profiles?select=count";
    const headers = {
        'apikey': "sb_publishable_WaiQI8T9aLg9iJkV3nEZBg_C5M24-Z5",
        'Authorization': "Bearer sb_publishable_WaiQI8T9aLg9iJkV3nEZBg_C5M24-Z5"
    };

    console.log("Fetching from Vercel proxy using native fetch:", url);
    try {
        const resp = await fetch(url, { headers });
        console.log("Status:", resp.status);
        console.log("Status text:", resp.statusText);
        const text = await resp.text();
        console.log("Response text:", text.substring(0, 500));
    } catch (e) {
        console.error("Fetch failed:", e);
    }
}

main().catch(console.error);
