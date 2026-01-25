
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const id = '7c50d2bb-7895-4388-b496-e7b3f073bc15';
    console.log('Fetching inspection:', id);

    const { data: equipment, error } = await supabase
        .from('equipment')
        .select('code, checklist_data')
        .eq('inspection_id', id);

    if (error) {
        console.error(error); return;
    }

    equipment.forEach(eq => {
        console.log(`\nEQ: ${eq.code}`);
        if (!eq.checklist_data) {
            console.log('  -> No checklist_data');
            return;
        }
        const keys = Object.keys(eq.checklist_data);
        console.log('  -> Keys:', keys.join(', '));
        console.log('  -> Sample (Item 1):', JSON.stringify(eq.checklist_data[keys[0]]));

        // Check key formats
        keys.forEach(k => {
            if (!k.startsWith('CHK-')) console.log(`  -> Weird Key: ${k}`);
        });
    });
}

main();
