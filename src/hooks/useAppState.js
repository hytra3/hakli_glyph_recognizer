// ============================================
// useAppState Hook
// Wraps the AppState reducer with convenience methods
// ============================================

const useAppState = () => {
    const { useReducer, useCallback, useMemo } = React;
    
    // Initialize state from localStorage where applicable
    const getInitialState = () => {
        const state = { ...AppState.initialState };
        
        // Load dismissed tips from localStorage
        try {
            const savedTips = localStorage.getItem('hakli_dismissed_tips');
            if (savedTips) {
                state.ui.dismissedTips = JSON.parse(savedTips);
            }
        } catch (e) {
            console.warn('Could not load dismissed tips:', e);
        }
        
        return state;
    };
    
    const [state, dispatch] = useReducer(AppState.reducer, null, getInitialState);
    
    // === IMAGE ACTIONS ===
    const setImage = useCallback((image) => {
        dispatch({ type: 'SET_IMAGE', payload: image });
    }, []);
    
    const setDisplayImage = useCallback((image) => {
        dispatch({ type: 'SET_DISPLAY_IMAGE', payload: image });
    }, []);
    
    const setImageRotation = useCallback((rotation, dimensions = null) => {
        dispatch({ type: 'SET_IMAGE_ROTATION', payload: { rotation, dimensions } });
    }, []);
    
    const setImageLoading = useCallback((isLoading) => {
        dispatch({ type: 'SET_IMAGE_LOADING', payload: isLoading });
    }, []);
    
    // === PREPROCESSING ACTIONS ===
    const setPreprocessing = useCallback((settings) => {
        dispatch({ type: 'SET_PREPROCESSING', payload: settings });
    }, []);
    
    const updatePreprocessing = useCallback((key, value) => {
        dispatch({ type: 'UPDATE_PREPROCESSING', key, value });
    }, []);
    
    const resetPreprocessing = useCallback(() => {
        dispatch({ type: 'RESET_PREPROCESSING' });
    }, []);
    
    // === CHART ACTIONS ===
    const setChart = useCallback((chart) => {
        dispatch({ type: 'SET_CHART', payload: chart });
    }, []);
    
    const setChartStatus = useCallback((status) => {
        dispatch({ type: 'SET_CHART_STATUS', payload: status });
    }, []);
    
    const setLoadedGlyphImage = useCallback((id, image) => {
        dispatch({ type: 'SET_LOADED_GLYPH_IMAGE', id, image });
    }, []);
    
    const setGlyphThumbnail = useCallback((id, thumbnail) => {
        dispatch({ type: 'SET_GLYPH_THUMBNAIL', id, thumbnail });
    }, []);
    
    const setImageLoadProgress = useCallback((progress) => {
        dispatch({ type: 'SET_IMAGE_LOAD_PROGRESS', payload: progress });
    }, []);
    
    // === RECOGNITION ACTIONS ===
    const setRecognitionResults = useCallback((results) => {
        dispatch({ type: 'SET_RECOGNITION_RESULTS', payload: results });
    }, []);
    
    const addDetection = useCallback((detection) => {
        dispatch({ type: 'ADD_DETECTION', payload: detection });
    }, []);
    
    const updateDetection = useCallback((index, updates) => {
        dispatch({ type: 'UPDATE_DETECTION', index, payload: updates });
    }, []);
    
    const deleteDetection = useCallback((index) => {
        dispatch({ type: 'DELETE_DETECTION', index });
    }, []);
    
    const setIsolatedGlyphs = useCallback((glyphs) => {
        dispatch({ type: 'SET_ISOLATED_GLYPHS', payload: glyphs });
    }, []);
    
    const setValidation = useCallback((index, validation) => {
        dispatch({ type: 'SET_VALIDATION', index, payload: validation });
    }, []);
    
    const setValidations = useCallback((validations) => {
        dispatch({ type: 'SET_VALIDATIONS', payload: validations });
    }, []);
    
    const setProcessing = useCallback((isProcessing) => {
        dispatch({ type: 'SET_PROCESSING', payload: isProcessing });
    }, []);
    
    const setProcessingProgress = useCallback((progress) => {
        dispatch({ type: 'SET_PROCESSING_PROGRESS', payload: progress });
    }, []);
    
    const setConfidenceThreshold = useCallback((threshold) => {
        dispatch({ type: 'SET_CONFIDENCE_THRESHOLD', payload: threshold });
    }, []);
    
    const toggleConfidenceFilter = useCallback(() => {
        dispatch({ type: 'TOGGLE_CONFIDENCE_FILTER' });
    }, []);
    
    // === READING ACTIONS ===
    const setViewMode = useCallback((mode) => {
        dispatch({ type: 'SET_VIEW_MODE', payload: mode });
    }, []);
    
    const setReadingDirection = useCallback((direction) => {
        dispatch({ type: 'SET_READING_DIRECTION', payload: direction });
    }, []);
    
    const setReadingOrder = useCallback((order) => {
        dispatch({ type: 'SET_READING_ORDER', payload: order });
    }, []);
    
    const toggleWordBoundary = useCallback((index) => {
        dispatch({ type: 'TOGGLE_WORD_BOUNDARY', index });
    }, []);
    
    const setWordBoundaries = useCallback((boundaries) => {
        dispatch({ type: 'SET_WORD_BOUNDARIES', payload: boundaries });
    }, []);
    
    const setLineBreaks = useCallback((breaks) => {
        dispatch({ type: 'SET_LINE_BREAKS', payload: breaks });
    }, []);
    
    const setColumnBreaks = useCallback((breaks) => {
        dispatch({ type: 'SET_COLUMN_BREAKS', payload: breaks });
    }, []);
    
    // === TRANSLATION ACTIONS ===
    const setTranslationEnglish = useCallback((text) => {
        dispatch({ type: 'SET_TRANSLATION_ENGLISH', payload: text });
    }, []);
    
    const setTranslationArabic = useCallback((text) => {
        dispatch({ type: 'SET_TRANSLATION_ARABIC', payload: text });
    }, []);
    
    // === INTERACTION ACTIONS ===
    const setSelectedRegions = useCallback((regions) => {
        dispatch({ type: 'SET_SELECTED_REGIONS', payload: regions });
    }, []);
    
    const toggleRegionSelection = useCallback((index) => {
        dispatch({ type: 'TOGGLE_REGION_SELECTION', index });
    }, []);
    
    const clearSelection = useCallback(() => {
        dispatch({ type: 'CLEAR_SELECTION' });
    }, []);
    
    const setCorrectionMode = useCallback((index) => {
        dispatch({ type: 'SET_CORRECTION_MODE', payload: index });
    }, []);
    
    const setTrimMode = useCallback((index) => {
        dispatch({ type: 'SET_TRIM_MODE', payload: index });
    }, []);
    
    const setExcludeMode = useCallback((index) => {
        dispatch({ type: 'SET_EXCLUDE_MODE', payload: index });
    }, []);
    
    const setAdjustMode = useCallback((index) => {
        dispatch({ type: 'SET_ADJUST_MODE', payload: index });
    }, []);
    
    const setManualDetectionMode = useCallback((enabled) => {
        dispatch({ type: 'SET_MANUAL_DETECTION_MODE', payload: enabled });
    }, []);
    
    const setDrawingState = useCallback((isDrawing, drawStart = null, drawCurrent = null) => {
        dispatch({ type: 'SET_DRAWING_STATE', payload: { isDrawing, drawStart, drawCurrent } });
    }, []);
    
    // === UI ACTIONS ===
    const togglePanel = useCallback((panel) => {
        dispatch({ type: 'TOGGLE_PANEL', panel });
    }, []);
    
    const setModal = useCallback((modal, value) => {
        dispatch({ type: 'SET_MODAL', modal, payload: value });
    }, []);
    
    const dismissTip = useCallback((tipId) => {
        dispatch({ type: 'DISMISS_TIP', tipId });
        // Also persist to localStorage
        try {
            const current = JSON.parse(localStorage.getItem('hakli_dismissed_tips') || '{}');
            current[tipId] = true;
            localStorage.setItem('hakli_dismissed_tips', JSON.stringify(current));
        } catch (e) {
            console.warn('Could not save dismissed tip:', e);
        }
    }, []);
    
    const resetTips = useCallback(() => {
        dispatch({ type: 'RESET_TIPS' });
        localStorage.removeItem('hakli_dismissed_tips');
    }, []);
    
    // === INSCRIPTION ACTIONS ===
    const setInscriptionId = useCallback((id) => {
        dispatch({ type: 'SET_INSCRIPTION_ID', payload: id });
    }, []);
    
    const setInscriptionTitle = useCallback((title) => {
        dispatch({ type: 'SET_INSCRIPTION_TITLE', payload: title });
    }, []);
    
    const setInscriptionComplete = useCallback((complete) => {
        dispatch({ type: 'SET_INSCRIPTION_COMPLETE', payload: complete });
    }, []);
    
    // === BULK ACTIONS ===
    const loadHkiFile = useCallback((hkiData) => {
        dispatch({ type: 'LOAD_HKI_FILE', payload: hkiData });
    }, []);
    
    const resetState = useCallback(() => {
        dispatch({ type: 'RESET_STATE' });
    }, []);
    
    // === COMPUTED VALUES ===
    const filteredResults = useMemo(() => {
        if (!state.recognition.useConfidenceFilter) {
            return state.recognition.results;
        }
        return state.recognition.results.filter(
            r => r.confidence >= state.recognition.confidenceThreshold / 100
        );
    }, [state.recognition.results, state.recognition.useConfidenceFilter, state.recognition.confidenceThreshold]);
    
    const orderedResults = useMemo(() => {
        const results = filteredResults;
        if (state.reading.order.length === 0) return results;
        
        return state.reading.order
            .filter(i => i < results.length)
            .map(i => results[i]);
    }, [filteredResults, state.reading.order]);
    
    // Return state and all action creators
    return {
        state,
        dispatch,
        
        // Computed
        filteredResults,
        orderedResults,
        
        // Image
        setImage,
        setDisplayImage,
        setImageRotation,
        setImageLoading,
        
        // Preprocessing
        setPreprocessing,
        updatePreprocessing,
        resetPreprocessing,
        
        // Chart
        setChart,
        setChartStatus,
        setLoadedGlyphImage,
        setGlyphThumbnail,
        setImageLoadProgress,
        
        // Recognition
        setRecognitionResults,
        addDetection,
        updateDetection,
        deleteDetection,
        setIsolatedGlyphs,
        setValidation,
        setValidations,
        setProcessing,
        setProcessingProgress,
        setConfidenceThreshold,
        toggleConfidenceFilter,
        
        // Reading
        setViewMode,
        setReadingDirection,
        setReadingOrder,
        toggleWordBoundary,
        setWordBoundaries,
        setLineBreaks,
        setColumnBreaks,
        
        // Translation
        setTranslationEnglish,
        setTranslationArabic,
        
        // Interaction
        setSelectedRegions,
        toggleRegionSelection,
        clearSelection,
        setCorrectionMode,
        setTrimMode,
        setExcludeMode,
        setAdjustMode,
        setManualDetectionMode,
        setDrawingState,
        
        // UI
        togglePanel,
        setModal,
        dismissTip,
        resetTips,
        
        // Inscription
        setInscriptionId,
        setInscriptionTitle,
        setInscriptionComplete,
        
        // Bulk
        loadHkiFile,
        resetState
    };
};

// Make globally available
window.useAppState = useAppState;
