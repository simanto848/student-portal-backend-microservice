const MS_PER_DAY = 1000 * 60 * 60 * 24;

// Calculate borrowing details (days until due, overdue status, potential fine)
export function calcBorrowingDetails(borrowing, now = new Date()) {
    const dueDate = new Date(borrowing.dueDate);
    const daysUntilDue = Math.ceil((dueDate - now) / MS_PER_DAY);
    const isOverdue = daysUntilDue < 0;
    const finePerDay = borrowing.libraryId?.finePerDay || 0;
    const potentialFine = isOverdue ? Math.abs(daysUntilDue) * finePerDay : 0;

    return { daysUntilDue, isOverdue, potentialFine };
}

// Calculate overdue-specific details (daysOverdue, currentFine)
export function calcOverdueDetails(borrowing, now = new Date()) {
    const dueDate = new Date(borrowing.dueDate);
    const daysOverdue = Math.ceil((now - dueDate) / MS_PER_DAY);
    const finePerDay = borrowing.libraryId?.finePerDay || 0;
    const currentFine = daysOverdue * finePerDay;

    return { daysOverdue, currentFine };
}
