
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const id = '7c50d2bb-7895-4388-b496-e7b3f073bc15';
    console.log('Fetching inspection:', id);

    const { data: equipment, error } = await supabase
        .from('equipment')
        .select('code, type, checklist_data')
        .eq('inspection_id', id);

    if (error) {
        console.error('Error:', error);
        return;
    }

    equipment.forEach(eq => {
        console.log(`\nEquipment: ${eq.code} (${eq.type})`);
        console.log('Checklist Data Keys:', Object.keys(eq.checklist_data));
        console.log('Item 13:', eq.checklist_data['CHK-13']);
        console.log('Item 14:', eq.checklist_data['CHK-14']);
        // Print all to be safe
        console.log('Full Data:', JSON.stringify(eq.checklist_data, null, 2));
    });
}

main();
