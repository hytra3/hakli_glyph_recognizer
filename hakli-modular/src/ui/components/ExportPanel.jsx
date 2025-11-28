/**
 * ExportPanel Component
 * 
 * Collapsible panel with all export/download options:
 * - Save to cache + download
 * - Export JSON
 * - Export HTML report
 * - Export annotated image
 * - Export transcription (in reading mode)
 * - Export correction memory
 * - Analyze corrections
 * - Open JSON viewer
 * 
 * This is a SIMPLE component - just a group of export buttons
 * No complex logic, just calls handler functions
 * 
 * Props:
 * @param {boolean} visible - Whether to show (has recognition results)
 * @param {string} viewMode - 'detection' or 'reading'
 * @param {boolean} isCollapsed - Panel collapse state
 * @param {Object} handlers - All export/action handlers
 */

function ExportPanel({
    visible,
    viewMode,
    isCollapsed,
    handlers
}) {
    /**
     * UNPACK HANDLERS
     */
    const {
        onSaveToCache,
        onExportJSON,
        onExportHTML,
        onExportImage,
        onExportTranscription,
        onExportCorrectionMemory,
        onAnalyzeCorrections,
        onOpenJSONViewer,
        onToggleCollapse
    } = handlers;
    
    /**
     * Don't render if no results yet
     */
    if (!visible) return null;
    
    return (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
            {/* Collapsible Header */}
            <button
                onClick={onToggleCollapse}
                className="flex items-center gap-2 font-semibold text-gray-900 hover:text-gray-700 mb-3"
            >
                <span>{isCollapsed ? '▶' : '▼'}</span>
                <h3>Export Options</h3>
            </button>
            
            {!isCollapsed && (
                <>
                    {/* Export Buttons Grid */}
                    <div className="flex flex-wrap gap-3">
                        {/* Save to Cache + Download */}
                        <button 
                            onClick={onSaveToCache}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2 font-semibold transition-colors"
                            title="Saves to local cache + downloads JSON backup"
                        >
                            💾 Save to Cache + Download
                        </button>
                        
                        {/* Export JSON */}
                        <button 
                            onClick={onExportJSON}
                            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 flex items-center gap-2 transition-colors"
                        >
                            📊 Export JSON (Download)
                        </button>
                        
                        {/* Open JSON Viewer */}
                        <button
                            onClick={onOpenJSONViewer}
                            className="px-4 py-2 bg-teal-500 text-white rounded hover:bg-teal-600 flex items-center gap-2 transition-colors"
                            title="Open JSON viewer to load exported data"
                        >
                            👁️ Open JSON Viewer
                        </button>
                        
                        {/* Export HTML Report */}
                        <button
                            onClick={onExportHTML}
                            className="px-4 py-2 bg-emerald-500 text-white rounded hover:bg-emerald-600 flex items-center gap-2 transition-colors"
                        >
                            📄 Export HTML Report
                        </button>
                        
                        {/* Export Annotated Image */}
                        <button 
                            onClick={onExportImage}
                            className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 flex items-center gap-2 transition-colors"
                        >
                            🖼️ Export Annotated Image
                        </button>
                        
                        {/* Export Transcription (only in reading mode) */}
                        {viewMode === 'reading' && (
                            <button 
                                onClick={onExportTranscription}
                                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 flex items-center gap-2 transition-colors"
                            >
                                📝 Export Transcription (TXT)
                            </button>
                        )}
                        
                        {/* Export Correction Memory */}
                        <button
                            onClick={onExportCorrectionMemory}
                            className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 flex items-center gap-2 transition-colors"
                        >
                            🧠 Export Correction Memory
                        </button>
                        
                        {/* Analyze Corrections */}
                        <button
                            onClick={onAnalyzeCorrections}
                            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 flex items-center gap-2 transition-colors"
                        >
                            📊 Analyze Corrections
                        </button>
                    </div>
                    
                    {/* Workflow Help Text */}
                    <div className="mt-3 text-xs text-gray-600">
                        <strong>Workflow:</strong> Export JSON with translations → Open JSON Viewer → Load JSON → View beautiful bilingual report! Also available: HTML reports, annotated images, and plain text transcriptions.
                    </div>
                </>
            )}
        </div>
    );
}

/**
 * ========================================================================
 * WHAT YOU LEARNED FROM EXPORTPANEL
 * ========================================================================
 * 
 * 1. BUTTON GROUP PATTERN (AGAIN):
 *    - Multiple related buttons
 *    - Flexbox with flex-wrap
 *    - Consistent styling
 *    - Simple and clean
 * 
 * 2. COLOR CODING:
 *    - Different colors for different actions
 *    - bg-blue-600 for primary action (save)
 *    - bg-purple-500 for data exports
 *    - bg-green-500 for text export
 *    - bg-yellow-500 for memory
 *    - Visual differentiation
 * 
 * 3. CONDITIONAL BUTTONS:
 *    - {viewMode === 'reading' && <TranscriptionButton />}
 *    - Only show relevant buttons
 *    - Clean conditional logic
 * 
 * 4. ICON + TEXT BUTTONS:
 *    - Emoji icons for visual appeal
 *    - Clear text labels
 *    - Both informative and pretty
 * 
 * 5. TOOLTIP TITLES:
 *    - title attribute for extra context
 *    - Hover to see more info
 *    - Helpful without cluttering UI
 * 
 * 6. HELP TEXT:
 *    - Guide users on workflow
 *    - Suggest best practices
 *    - Small text, non-intrusive
 * 
 * 7. HANDLER DELEGATION:
 *    - Component just calls handlers
 *    - All logic in parent
 *    - Super clean separation
 * 
 * 8. SIMPLICITY:
 *    - Just 120 lines
 *    - No state
 *    - No complex logic
 *    - Just UI
 * 
 * ========================================================================
 * PATTERN RECOGNITION
 * ========================================================================
 * 
 * Notice the similarity to ReadingModePanel:
 * - Collapsible header
 * - Button group
 * - flex flex-wrap gap-3
 * - Conditional sections
 * - Help text
 * 
 * THIS IS THE PATTERN FOR CONTROL PANELS!
 * 
 * You can reuse this structure for:
 * - Settings panels
 * - Action panels
 * - Tool palettes
 * - Menu groups
 * 
 * ========================================================================
 * WHY THIS IS EASY
 * ========================================================================
 * 
 * Compare to DetectionCanvas:
 * - No coordinate math
 * - No mouse events
 * - No z-index
 * - No IIFE
 * - No complex conditionals
 * 
 * This is just:
 * - Buttons
 * - onClick handlers
 * - Conditional display
 * 
 * SIMPLE! 🎉
 * 
 * ========================================================================
 */

// Export
window.ExportPanelComponent = ExportPanel;
