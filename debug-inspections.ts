
import { InspectionService } from './lib/services/inspections';

async function test() {
    console.log('--- Testing getInspections with no type ---');
    const r1 = await InspectionService.getInspections({ page: 1, pageSize: 5 });
    console.log('No Type - Data length:', r1.data?.length, 'Error:', r1.error);

    console.log('\n--- Testing getInspections with type="technical" ---');
    const r2 = await InspectionService.getInspections({ page: 1, pageSize: 5, type: 'technical' });
    console.log('Type technical - Data length:', r2.data?.length, 'Error:', r2.error);

    if (r2.data && r2.data.length > 0) {
        console.log('Sample ID:', r2.data[0].id);
    }
}

test().catch(console.error);
