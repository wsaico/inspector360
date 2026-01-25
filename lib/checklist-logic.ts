export const MOTORIZED_PREFIXES = ['FT', 'PM', 'PE', 'ASU', 'TR', 'AR', 'EM'];
export const MANUAL_PREFIXES = ['EN'];

export function getEquipmentTypeDetails(code: string | undefined): { isMotorized: boolean; isManual: boolean; prefix: string } {
    if (!code) return { isMotorized: false, isManual: false, prefix: '' };

    const upperCode = code.toUpperCase().trim();
    // Extract prefix (first 2 or 3 letters usually, but we match against list)
    // Logic: Check if the string STARTS with any of the prefixes

    const motorizedMatch = MOTORIZED_PREFIXES.find(p => upperCode.startsWith(p));
    const manualMatch = MANUAL_PREFIXES.find(p => upperCode.startsWith(p));

    return {
        isMotorized: !!motorizedMatch,
        isManual: !!manualMatch,
        prefix: motorizedMatch || manualMatch || '',
    };
}

export function isChecklistItemApplicable(itemCode: string, equipmentTypeInput: string): boolean {
    // equipmentTypeInput comes from the user input "Type" field OR the Code prefix?
    // The user instructions mentioned strictly the CODES (FT, PM...). 
    // Usually these are in the equipment CODE (e.g. FT-01), but the prompt discussed "Tipo de Equipo" free text previously.
    // HOWEVER, the latest prompt 1002 specificied "FT, PM... son motorizadas". These look like prefixes of the CODE or the TYPE.
    // Given the context of "FT-01", it's likely the Equipment CODE prefix.
    // BUT the form field is "Type" (Input).
    // "si es una EN" usually refers to the ID/Code prefix in aviation contexts (Equipment Number).
    // Let's check against BOTH the "Code" and the "Type" string just to be safe and robust.

    const type = equipmentTypeInput.toUpperCase();

    const isMotorized = MOTORIZED_PREFIXES.some(p => type.startsWith(p) || type.includes(p)); // Loose matching for free text
    const isManual = MANUAL_PREFIXES.some(p => type.startsWith(p) || type.includes(p));

    // Specific Item Logic
    switch (itemCode) {
        case 'CHK-05': // Nivel de combustible (Motorized only)
            if (isManual) return false;
            return true;

        case 'CHK-13': // Bumpers
            // User 1065: "CLARISIMO QUE APLICA SOLO A FT Y EM" (Context: Motorized group).
            // User 1002: "si es una EN ... 13 y 14" (Context: Manual group).
            // Logic: Show ONLY for FT, EM, and EN. Hide for TR, PM, PE, ASU, AR.

            // Check for specific substrings
            if (type.includes('FT') || type.includes('EM') || type.includes('EN')) return true;

            return false; // Hide for everyone else (TR, PM, etc.)

        case 'CHK-14': // Solo Escaleras (EN)
            // User 1002: "si es una EN ... 14"
            // User 1002: "para los motorizados solo hasta 13" (Hide 14)
            if (isManual || type.includes('EN')) return true;
            if (isMotorized) return false;
            return false; // Default hidden if not EN

        default:
            // Items 1-12 are generally for Motorized equipment (Engine, Tires, Lights, etc.)
            // User 1160: "EN ... SOLO EL 13 Y 14".
            if (isManual || type.includes('EN')) return false;

            return true; // Show for Motorized (and others by default)
    }
}
