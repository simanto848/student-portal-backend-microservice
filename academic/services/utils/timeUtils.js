/**
 * Shared time utility functions used by scheduling services.
 * Provides memoized time parsing and formatting helpers.
 */

const _timeCache = new Map();

/**
 * Convert "HH:MM" time string to total minutes (memoized).
 * @param {string} timeStr - Time in "HH:MM" format
 * @returns {number} Total minutes
 */
export function timeToMinutes(timeStr) {
    if (_timeCache.has(timeStr)) return _timeCache.get(timeStr);
    const [hours, minutes] = timeStr.split(':').map(Number);
    const total = hours * 60 + minutes;
    _timeCache.set(timeStr, total);
    return total;
}

/**
 * Format hours and minutes into "HH:MM" string.
 * @param {number} hours
 * @param {number} minutes
 * @returns {string}
 */
export function formatTime(hours, minutes) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Convert total minutes to "HH:MM" string.
 * @param {number} totalMinutes
 * @returns {string}
 */
export function minutesToTime(totalMinutes) {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return formatTime(h, m);
}

/**
 * Clear the memoization cache. Call at the start of each scheduling run.
 */
export function clearTimeCache() {
    _timeCache.clear();
}
