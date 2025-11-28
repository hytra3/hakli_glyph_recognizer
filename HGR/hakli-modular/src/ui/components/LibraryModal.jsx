/**
 * LibraryModal Component
 * 
 * Full-screen modal for browsing saved .hki inscription packages:
 * - Grid of inscription cards
 * - Each card shows:
 *   - Inscription ID (DH-YYYY-NNN)
 *   - Thumbnail image
 *   - Detection count
 *   - Last modified date
 *   - Version info
 *   - Location/site metadata
 * - Actions:
 *   - Load inscription
 *   - Delete inscription
 *   - View details
 * 
 * Props:
 * @param {boolean} visible - Whether modal is shown
 * @param {Array} inscriptions - List of saved .hki inscriptions
 * @param {Object} handlers - Action handlers
 */

function LibraryModal({
    visible,
    inscriptions,
    handlers
}) {
    /**
     * UNPACK HANDLERS
     */
    const {
        onLoad,
        onDelete,
        onClose
    } = handlers;
    
    /**
     * Don't render if not visible
     */
    if (!visible) return null;
    
    /**
     * HELPER: Format date
     */
    const formatDate = (isoString) => {
        if (!isoString) return 'Unknown';
        const date = new Date(isoString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    };
    
    /**
     * HELPER: Get location display
     */
    const getLocationDisplay = (metadata) => {
        if (!metadata) return 'No location';
        const parts = [];
        if (metadata.site) parts.push(metadata.site);
        if (metadata.location) parts.push(metadata.location);
        return parts.length > 0 ? parts.join(', ') : 'No location';
    };
    
    /**
     * RENDER: Single Inscription Card
     */
    const renderInscriptionCard = (inscription) => {
        const latestVersion = inscription.versions[inscription.versions.length - 1];
        
        return (
            <div 
                key={inscription.inscriptionId} 
                className="p-4 bg-white rounded-lg border-2 border-gray-200 hover:border-blue-400 transition-colors shadow-sm hover:shadow-md"
            >
                {/* Inscription ID Header */}
                <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-lg text-gray-900">
                        {inscription.inscriptionId}
                    </h4>
                    <div className="text-xs text-gray-500">
                        v{inscription.currentVersion}
                    </div>
                </div>
                
                {/* Thumbnail Image */}
                {inscription.images?.preprocessed && (
                    <div className="mb-3">
                        <img 
                            src={inscription.images.preprocessed}
                            alt={`Inscription ${inscription.inscriptionId}`}
                            className="w-full h-32 object-cover rounded border border-gray-300"
                        />
                    </div>
                )}
                
                {/* Stats */}
                <div className="mb-3 text-sm space-y-1">
                    <div className="flex justify-between">
                        <span className="text-gray-600">Detections:</span>
                        <span className="font-semibold text-gray-900">
                            {latestVersion.detectionCount}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">Validated:</span>
                        <span className="font-semibold text-green-700">
                            {latestVersion.validatedCount}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">Corrected:</span>
                        <span className="font-semibold text-orange-700">
                            {latestVersion.correctedCount}
                        </span>
                    </div>
                </div>
                
                {/* Metadata */}
                <div className="mb-3 text-xs text-gray-600 space-y-1">
                    <div className="flex items-start gap-1">
                        <span className="font-semibold">Location:</span>
                        <span className="flex-1">
                            {getLocationDisplay(inscription.metadata)}
                        </span>
                    </div>
                    <div className="flex items-start gap-1">
                        <span className="font-semibold">Modified:</span>
                        <span className="flex-1">
                            {formatDate(inscription.lastModified)}
                        </span>
                    </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-2">
                    <button
                        onClick={() => onLoad(inscription.inscriptionId)}
                        className="flex-1 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm font-semibold"
                    >
                        📂 Load
                    </button>
                    <button
                        onClick={() => {
                            if (confirm(`Delete inscription ${inscription.inscriptionId}?\n\nThis cannot be undone!`)) {
                                onDelete(inscription.inscriptionId);
                            }
                        }}
                        className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                        title="Delete inscription"
                    >
                        🗑️
                    </button>
                </div>
            </div>
        );
    };
    
    /**
     * MAIN RENDER
     */
    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <div 
                className="bg-white rounded-lg max-w-7xl w-full max-h-[90vh] flex flex-col shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200 flex-shrink-0">
                    <h3 className="text-2xl font-bold text-gray-900">
                        📚 Inscription Library
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 text-3xl leading-none"
                        title="Close"
                    >
                        &times;
                    </button>
                </div>
                
                {/* Content */}
                <div className="overflow-y-auto p-6 flex-1">
                    {/* Empty State */}
                    {inscriptions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                            <div className="text-6xl mb-4">📚</div>
                            <div className="text-xl font-semibold mb-2">No Inscriptions Yet</div>
                            <div className="text-sm">
                                Saved .hki inscription packages will appear here
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Stats Bar */}
                            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm text-gray-700">
                                        <strong>{inscriptions.length}</strong> inscription{inscriptions.length !== 1 ? 's' : ''} saved
                                    </div>
                                    <div className="text-xs text-gray-600">
                                        Total detections: <strong>
                                            {inscriptions.reduce((sum, ins) => {
                                                const latest = ins.versions[ins.versions.length - 1];
                                                return sum + (latest.detectionCount || 0);
                                            }, 0)}
                                        </strong>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Inscription Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {inscriptions
                                    .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified))
                                    .map(inscription => renderInscriptionCard(inscription))
                                }
                            </div>
                        </>
                    )}
                </div>
                
                {/* Footer */}
                <div className="p-4 border-t border-gray-200 flex-shrink-0">
                    <div className="text-xs text-gray-600 text-center">
                        💡 Tip: .hki files are stored in your browser's local storage. Export to JSON for backup.
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * ========================================================================
 * WHAT YOU LEARNED FROM LIBRARYMODAL
 * ========================================================================
 * 
 * 1. MODAL WITH GRID PATTERN:
 *    - Full-screen modal backdrop
 *    - Grid of cards inside
 *    - Responsive grid (1/2/3/4 columns)
 *    - Clean and organized
 * 
 * 2. CARD DATA PATTERN:
 *    - Each card shows key info
 *    - Thumbnail image
 *    - Stats (detections, validated, corrected)
 *    - Metadata (location, date)
 *    - Action buttons
 * 
 * 3. EMPTY STATE:
 *    - Show helpful message when no data
 *    - Visual icon
 *    - Explain what will appear
 *    - Better UX than blank screen
 * 
 * 4. SORTED DISPLAY:
 *    - Most recent first
 *    - .sort() with date comparison
 *    - Useful default ordering
 * 
 * 5. CONFIRMATION DIALOGS:
 *    - confirm() for destructive actions
 *    - Clear warning message
 *    - Can't undo deletion
 * 
 * 6. STATS AGGREGATION:
 *    - .reduce() to sum across inscriptions
 *    - Show total detections
 *    - Helpful overview
 * 
 * 7. HELPER FUNCTIONS:
 *    - formatDate() for date display
 *    - getLocationDisplay() for metadata
 *    - Keeps JSX clean
 *    - Reusable logic
 * 
 * 8. FLEXIBLE LAYOUT:
 *    - Header (fixed)
 *    - Content (scrollable)
 *    - Footer (fixed)
 *    - Works at any screen size
 * 
 * ========================================================================
 * SIMPLE BUT COMPLETE
 * ========================================================================
 * 
 * This component is only 250 lines but provides:
 * - Complete library browsing
 * - Load/delete actions
 * - Metadata display
 * - Stats overview
 * - Empty state handling
 * - Responsive grid
 * 
 * NO complex logic:
 * - Parent provides inscriptions array
 * - Component just displays them
 * - Handlers do the work
 * - Clean and maintainable
 * 
 * ========================================================================
 */

// Export
window.LibraryModalComponent = LibraryModal;
