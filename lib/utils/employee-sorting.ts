import { Employee } from '@/types/safety-talks';

// Priority Map: Lower number = Higher Priority
const ROLE_PRIORITY: Record<string, number> = {
    'jefe': 1,
    'gerente': 1,
    'superintendente': 1,
    'coordinator': 2,
    'coordinador': 2,
    'supervisor': 2,
    'lider': 3,
    'lead': 3,
    'inspector': 4,
    'asistente': 5,
    'assistant': 5,
    'practicante': 9,
    'intern': 9
};

/**
 * Sorts employees by "Authority" (Position/Rank).
 * 1. Matches position against priority keywords.
 * 2. Alphabetical fallback.
 */
export function sortEmployeesByHierarchy(employees: Employee[]): Employee[] {
    return [...employees].sort((a, b) => {
        const priorityA = getPriority(a.position);
        const priorityB = getPriority(b.position);

        if (priorityA !== priorityB) {
            return priorityA - priorityB; // Ascending (1 is top)
        }
        return a.full_name.localeCompare(b.full_name);
    });
}

function getPriority(position?: string): number {
    if (!position) return 10; // Lowest priority
    const lowerPos = position.toLowerCase();

    // Check for keywords
    for (const [key, priority] of Object.entries(ROLE_PRIORITY)) {
        if (lowerPos.includes(key)) return priority;
    }

    return 6; // Default active employee
}
