// ============================================
// useHistory Hook
// Manages undo/redo state history
// ============================================

const useHistory = (appState, setters) => {
    const { useState, useCallback, useRef } = React;
    
    const [actionHistory, setActionHistory] = useState([]);
    const [stateHistory, setStateHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    
    // Keep track of whether we're in the middle of an undo/redo
    const isUndoRedoRef = useRef(false);
    
    /**
     * Record an action for the action log
     * @param {string} actionType - Type of action performed
     * @param {Object} actionData - Data associated with the action
     */
    const recordAction = useCallback((actionType, actionData) => {
        const record = {
            type: actionType,
            data: actionData,
            timestamp: new Date().toISOString(),
            resultCount: appState.recognition?.results?.length || 0
        };
        
        setActionHistory(prev => [...prev, record]);
        console.log(`📝 Action: ${actionType}`, actionData);
    }, [appState.recognition?.results?.length]);
    
    /**
     * Take a snapshot of current state before making changes
     * Call this BEFORE modifying state that should be undoable
     */
    const takeSnapshot = useCallback(() => {
        if (isUndoRedoRef.current) return; // Don't snapshot during undo/redo
        
        const snapshot = {
            results: appState.recognition?.results ? [...appState.recognition.results] : [],
            validations: appState.recognition?.validations ? { ...appState.recognition.validations } : {},
            readingOrder: appState.reading?.order ? [...appState.reading.order] : [],
            wordBoundaries: appState.reading?.wordBoundaries ? new Set(appState.reading.wordBoundaries) : new Set(),
            lineBreaks: appState.reading?.lineBreaks ? new Set(appState.reading.lineBreaks) : new Set(),
            columnBreaks: appState.reading?.columnBreaks ? new Set(appState.reading.columnBreaks) : new Set(),
            timestamp: Date.now()
        };
        
        setStateHistory(prev => {
            // If we're not at the end, truncate future states
            const newHistory = prev.slice(0, historyIndex + 1);
            return [...newHistory, snapshot];
        });
        
        setHistoryIndex(prev => prev + 1);
        
        console.log('📸 State snapshot taken');
    }, [
        appState.recognition?.results,
        appState.recognition?.validations,
        appState.reading?.order,
        appState.reading?.wordBoundaries,
        appState.reading?.lineBreaks,
        appState.reading?.columnBreaks,
        historyIndex
    ]);
    
    /**
     * Restore state from a snapshot
     * @param {Object} snapshot - The state snapshot to restore
     */
    const restoreSnapshot = useCallback((snapshot) => {
        if (!snapshot || !setters) return;
        
        isUndoRedoRef.current = true;
        
        if (setters.setRecognitionResults && snapshot.results) {
            setters.setRecognitionResults(snapshot.results);
        }
        if (setters.setValidations && snapshot.validations) {
            setters.setValidations(snapshot.validations);
        }
        if (setters.setReadingOrder && snapshot.readingOrder) {
            setters.setReadingOrder(snapshot.readingOrder);
        }
        if (setters.setWordBoundaries && snapshot.wordBoundaries) {
            setters.setWordBoundaries(Array.from(snapshot.wordBoundaries));
        }
        if (setters.setLineBreaks && snapshot.lineBreaks) {
            setters.setLineBreaks(Array.from(snapshot.lineBreaks));
        }
        if (setters.setColumnBreaks && snapshot.columnBreaks) {
            setters.setColumnBreaks(Array.from(snapshot.columnBreaks));
        }
        
        // Reset flag after state updates
        setTimeout(() => {
            isUndoRedoRef.current = false;
        }, 0);
    }, [setters]);
    
    /**
     * Undo the last action
     */
    const undo = useCallback(() => {
        if (historyIndex <= 0) {
            console.log('⚠️ Nothing to undo');
            return false;
        }
        
        const previousState = stateHistory[historyIndex - 1];
        if (!previousState) return false;
        
        restoreSnapshot(previousState);
        setHistoryIndex(prev => prev - 1);
        
        recordAction('undo', { toIndex: historyIndex - 1 });
        console.log('↩️ Undo successful');
        return true;
    }, [historyIndex, stateHistory, restoreSnapshot, recordAction]);
    
    /**
     * Redo the previously undone action
     */
    const redo = useCallback(() => {
        if (historyIndex >= stateHistory.length - 1) {
            console.log('⚠️ Nothing to redo');
            return false;
        }
        
        const nextState = stateHistory[historyIndex + 1];
        if (!nextState) return false;
        
        restoreSnapshot(nextState);
        setHistoryIndex(prev => prev + 1);
        
        recordAction('redo', { toIndex: historyIndex + 1 });
        console.log('↪️ Redo successful');
        return true;
    }, [historyIndex, stateHistory, restoreSnapshot, recordAction]);
    
    /**
     * Clear all history
     */
    const clearHistory = useCallback(() => {
        setActionHistory([]);
        setStateHistory([]);
        setHistoryIndex(-1);
        console.log('🗑️ History cleared');
    }, []);
    
    /**
     * Get history statistics
     */
    const getHistoryStats = useCallback(() => {
        return {
            totalActions: actionHistory.length,
            totalSnapshots: stateHistory.length,
            currentIndex: historyIndex,
            canUndo: historyIndex > 0,
            canRedo: historyIndex < stateHistory.length - 1,
            recentActions: actionHistory.slice(-10)
        };
    }, [actionHistory, stateHistory, historyIndex]);
    
    /**
     * Export history for debugging or saving
     */
    const exportHistory = useCallback(() => {
        return {
            actions: actionHistory,
            snapshots: stateHistory.map(s => ({
                ...s,
                wordBoundaries: Array.from(s.wordBoundaries || []),
                lineBreaks: Array.from(s.lineBreaks || []),
                columnBreaks: Array.from(s.columnBreaks || [])
            })),
            currentIndex: historyIndex
        };
    }, [actionHistory, stateHistory, historyIndex]);
    
    return {
        // State
        actionHistory,
        stateHistory,
        historyIndex,
        
        // Actions
        recordAction,
        takeSnapshot,
        undo,
        redo,
        clearHistory,
        
        // Queries
        getHistoryStats,
        exportHistory,
        canUndo: historyIndex > 0,
        canRedo: historyIndex < stateHistory.length - 1
    };
};

// Make globally available
window.useHistory = useHistory;
