
function getDateRange(filters?: { startDate?: string; endDate?: string; month?: string }, mockNow?: Date) {
    const now = mockNow || new Date();

    if (filters?.startDate && filters?.endDate) {
        const [sy, sm, sd] = filters.startDate.split('-').map(Number);
        const start = new Date(sy, sm - 1, sd);

        const [ey, em, ed] = filters.endDate.split('-').map(Number);
        const end = new Date(ey, em - 1, ed);
        end.setHours(23, 59, 59, 999);

        const diffTime = Math.abs(end.getTime() - start.getTime());
        const daysInMonth = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

        let effectiveEnd = end < endOfDay ? end : endOfDay;

        let daysElapsed = 0;
        if (start <= endOfDay) {
            const diffTimeElapsed = Math.abs(effectiveEnd.getTime() - start.getTime());
            daysElapsed = Math.ceil(diffTimeElapsed / (1000 * 60 * 60 * 24));
        }

        return {
            start: start.toISOString(),
            end: end.toISOString(),
            daysInMonth,
            daysElapsed: Math.max(0, daysElapsed),
            effectiveEnd: effectiveEnd.toISOString(),
            now: now.toISOString()
        };
    }
    return null;
}

// Scenario: Range 12/11 to 27/11. Today is 28/11.
// Expected: daysInMonth = 16 (12 to 27 inclusive is 16 days: 27-12+1 = 16)
// daysElapsed should also be 16 because the range is in the past.

const mockNow = new Date(2023, 10, 28, 10, 0, 0); // Nov 28
const result = getDateRange({ startDate: '2023-11-12', endDate: '2023-11-27' }, mockNow);

console.log("Scenario 1: Range entirely in past");
console.log(result);

// Scenario 2: Range 12/11 to 27/11. Today is 20/11.
// Expected: daysInMonth = 16.
// daysElapsed should be 12 to 20 inclusive = 9 days.

const mockNow2 = new Date(2023, 10, 20, 10, 0, 0); // Nov 20
const result2 = getDateRange({ startDate: '2023-11-12', endDate: '2023-11-27' }, mockNow2);

console.log("Scenario 2: Range partially in future");
console.log(result2);
