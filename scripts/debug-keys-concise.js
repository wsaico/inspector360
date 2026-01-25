
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function main() {
    const { data: equipment } = await supabase
        .from('equipment')
        .select('code, checklist_data')
        .eq('inspection_id', '7c50d2bb-7895-4388-b496-e7b3f073bc15');

    if (!equipment) return console.log('No data');

    equipment.forEach(eq => {
        const keys = eq.checklist_data ? Object.keys(eq.checklist_data) : [];
        console.log(`${eq.code}: [${keys.slice(0, 3).join(',')} ... ${keys.slice(-2).join(',')}] (Total: ${keys.length})`);

        // Check specific items and formats
        console.log('CHK-01:', eq.checklist_data['CHK-01']);
        console.log('chk-01:', eq.checklist_data['chk-01']);
        console.log('CHK-1:', eq.checklist_data['CHK-1']);

        console.log('CHK-13:', eq.checklist_data['CHK-13']);
        console.log('chk-13:', eq.checklist_data['chk-13']);
    });
}

main();
