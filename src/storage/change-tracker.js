// ============================================
// CHANGE TRACKER v251231
// Track edit history for HKI inscriptions
// Logs glyph corrections, validations, and other changes
// ============================================

const ChangeTracker = {
    /**
     * Create a change log entry
     * @param {string} type - Type of change: 'correction', 'validation', 'transcription', 'translation', 'note'
     * @param {Object} details - Change details
     * @param {string} userEmail - Email of user making the change
     * @returns {Object} Change log entry
     */
    createEntry: (type, details, userEmail) => {
        return {
            id: `chg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            user: userEmail || 'anonymous',
            type: type,
            ...details
        };
    },

    /**
     * Log a glyph correction (changed from one glyph to another)
     * @param {number} detectionIndex - Index of the detection
     * @param {Object} oldGlyph - Previous glyph object
     * @param {Object} newGlyph - New glyph object
     * @param {string} userEmail - User making the change
     * @returns {Object} Change log entry
     */
    logCorrection: (detectionIndex, oldGlyph, newGlyph, userEmail) => {
        return ChangeTracker.createEntry('correction', {
            detectionIndex: detectionIndex,
            before: {
                glyphId: oldGlyph?.id || null,
                glyphName: oldGlyph?.name || oldGlyph?.transliteration || null,
                arabic: oldGlyph?.arabic || null
            },
            after: {
                glyphId: newGlyph?.id || null,
                glyphName: newGlyph?.name || newGlyph?.transliteration || null,
                arabic: newGlyph?.arabic || null
            }
        }, userEmail);
    },

    /**
     * Log a validation change
     * @param {number} detectionIndex - Index of the detection
     * @param {boolean|null} oldStatus - Previous validation status (true/false/null)
     * @param {boolean} newStatus - New validation status
     * @param {string} userEmail - User making the change
     * @returns {Object} Change log entry
     */
    logValidation: (detectionIndex, oldStatus, newStatus, userEmail) => {
        return ChangeTracker.createEntry('validation', {
            detectionIndex: detectionIndex,
            before: oldStatus,
            after: newStatus
        }, userEmail);
    },

    /**
     * Log a transcription edit
     * @param {string} oldTranscription - Previous transcription
     * @param {string} newTranscription - New transcription
     * @param {string} userEmail - User making the change
     * @returns {Object} Change log entry
     */
    logTranscription: (oldTranscription, newTranscription, userEmail) => {
        return ChangeTracker.createEntry('transcription', {
            before: oldTranscription,
            after: newTranscription
        }, userEmail);
    },

    /**
     * Log a translation edit
     * @param {string} oldTranslation - Previous translation
     * @param {string} newTranslation - New translation
     * @param {string} userEmail - User making the change
     * @returns {Object} Change log entry
     */
    logTranslation: (oldTranslation, newTranslation, userEmail) => {
        return ChangeTracker.createEntry('translation', {
            before: oldTranslation,
            after: newTranslation
        }, userEmail);
    },

    /**
     * Log a note/comment addition
     * @param {string} note - The note content
     * @param {number|null} detectionIndex - Optional detection index if note is for specific glyph
     * @param {string} userEmail - User making the change
     * @returns {Object} Change log entry
     */
    logNote: (note, detectionIndex, userEmail) => {
        return ChangeTracker.createEntry('note', {
            detectionIndex: detectionIndex,
            content: note
        }, userEmail);
    },

    /**
     * Get history for a specific detection
     * @param {Array} changeLog - Full change log array
     * @param {number} detectionIndex - Detection index to filter by
     * @returns {Array} Filtered changes for this detection
     */
    getDetectionHistory: (changeLog, detectionIndex) => {
        if (!changeLog || !Array.isArray(changeLog)) return [];
        return changeLog
            .filter(entry => entry.detectionIndex === detectionIndex)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    },

    /**
     * Get all changes by a specific user
     * @param {Array} changeLog - Full change log array
     * @param {string} userEmail - User email to filter by
     * @returns {Array} Changes by this user
     */
    getUserChanges: (changeLog, userEmail) => {
        if (!changeLog || !Array.isArray(changeLog)) return [];
        return changeLog
            .filter(entry => entry.user === userEmail)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    },

    /**
     * Get recent changes (last N entries)
     * @param {Array} changeLog - Full change log array
     * @param {number} count - Number of entries to return
     * @returns {Array} Recent changes
     */
    getRecentChanges: (changeLog, count = 10) => {
        if (!changeLog || !Array.isArray(changeLog)) return [];
        return [...changeLog]
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, count);
    },

    /**
     * Get summary statistics for a change log
     * @param {Array} changeLog - Full change log array
     * @returns {Object} Statistics
     */
    getStatistics: (changeLog) => {
        if (!changeLog || !Array.isArray(changeLog)) {
            return {
                totalChanges: 0,
                corrections: 0,
                validations: 0,
                contributors: []
            };
        }

        const byType = {};
        const byUser = {};

        changeLog.forEach(entry => {
            byType[entry.type] = (byType[entry.type] || 0) + 1;
            byUser[entry.user] = (byUser[entry.user] || 0) + 1;
        });

        return {
            totalChanges: changeLog.length,
            corrections: byType.correction || 0,
            validations: byType.validation || 0,
            transcriptions: byType.transcription || 0,
            translations: byType.translation || 0,
            notes: byType.note || 0,
            contributors: Object.entries(byUser)
                .map(([user, count]) => ({ user, count }))
                .sort((a, b) => b.count - a.count)
        };
    },

    /**
     * Format a change entry for display
     * @param {Object} entry - Change log entry
     * @returns {string} Human-readable description
     */
    formatEntry: (entry) => {
        const user = entry.user?.split('@')[0] || 'Someone'; // Show just username part
        const time = ChangeTracker.formatRelativeTime(entry.timestamp);

        switch (entry.type) {
            case 'correction':
                return `${user} changed ${entry.before.glyphName || '?'} → ${entry.after.glyphName || '?'} ${time}`;
            case 'validation':
                const status = entry.after === true ? 'correct ✓' : 'incorrect ✗';
                return `${user} marked as ${status} ${time}`;
            case 'transcription':
                return `${user} edited transcription ${time}`;
            case 'translation':
                return `${user} edited translation ${time}`;
            case 'note':
                return `${user} added a note ${time}`;
            default:
                return `${user} made a change ${time}`;
        }
    },

    /**
     * Format timestamp as relative time
     * @param {string} timestamp - ISO timestamp
     * @returns {string} Relative time string
     */
    formatRelativeTime: (timestamp) => {
        const now = new Date();
        const then = new Date(timestamp);
        const diffMs = now - then;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return then.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: then.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
    }
};

// Make globally available
window.ChangeTracker = ChangeTracker;

console.log('✅ ChangeTracker loaded');
