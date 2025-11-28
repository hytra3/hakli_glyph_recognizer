// ============================================
// MAIN APP COMPONENT
// Clean state management and component orchestration
// ============================================

const { useState, useEffect, useRef } = React;

function HakliGlyphRecognizer() {
    // ============================================
    // STATE: Image & Display
    // ============================================
    const [image, setImage] = useState(null);
    const [displayImage, setDisplayImage] = useState(null);
    const [imageRotation, setImageRotation] = useState(0);
    const [rotatedImageDimensions, setRotatedImageDimensions] = useState(null);
    const [isImageLoading, setIsImageLoading] = useState(false);
    
    // ============================================
    // STATE: Recognition & Processing
    // ============================================
    const [recognitionResults, setRecognitionResults] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0 });
    const [isolatedGlyphs, setIsolatedGlyphs] = useState([]);
    const [confidenceThreshold, setConfidenceThreshold] = useState(0);
    const [useConfidenceFilter, setUseConfidenceFilter] = useState(false);
    
    // ============================================
    // STATE: Glyph Chart
    // ============================================
    const [equivalenceChart, setEquivalenceChart] = useState(null);
    const [chartLoadStatus, setChartLoadStatus] = useState('not-loaded');
    const [loadedGlyphImages, setLoadedGlyphImages] = useState({});
    const [imageLoadingProgress, setImageLoadingProgress] = useState({ loaded: 0, total: 0 });
    
    // ============================================
    // STATE: Preprocessing
    // ============================================
    const [preprocessing, setPreprocessing] = useState({
        rotation: 0,
        useAdaptiveThreshold: false,
        blockSize: 11,
        constantOffset: 2,
        gaussianBlur: 0,
        morphologyOperation: 'none',
        invertColors: false
    });
    const [originalMat, setOriginalMat] = useState(null);
    const [preprocessedMat, setPreprocessedMat] = useState(null);
    const [adjustmentsApplied, setAdjustmentsApplied] = useState(false);
    const [showPreprocessPreview, setShowPreprocessPreview] = useState(true);
    
    // ============================================
    // STATE: Validation & Editing
    // ============================================
    const [validations, setValidations] = useState({});
    const [correctionMode, setCorrectionMode] = useState(null);
    const [adjustMode, setAdjustMode] = useState(null);
    const [trimMode, setTrimMode] = useState(null);
    const [excludeMode, setExcludeMode] = useState(null);
    const [excludeRegions, setExcludeRegions] = useState([]);
    const [eraserMode, setEraserMode] = useState(false);
    const [brushSize, setBrushSize] = useState(15);
    const [isErasing, setIsErasing] = useState(false);
    const [eraserHistory, setEraserHistory] = useState([]);
    
    // ============================================
    // STATE: Manual Detection
    // ============================================
    const [manualDetectionMode, setManualDetectionMode] = useState(false);
    const [isDrawing, setIsDrawing] = useState(false);
    const [drawStart, setDrawStart] = useState(null);
    const [drawCurrent, setDrawCurrent] = useState(null);
    const [selectedRegions, setSelectedRegions] = useState(new Set());
    const [selectedIsolatedRegion, setSelectedIsolatedRegion] = useState(null);
    const [templateTrainingMode, setTemplateTrainingMode] = useState(false);
    const [selectedForTemplate, setSelectedForTemplate] = useState(null);
    
    // ============================================
    // STATE: Corner Adjustment
    // ============================================
    const [draggingCorner, setDraggingCorner] = useState(null);
    const [dragStartPos, setDragStartPos] = useState(null);
    
    // ============================================
    // STATE: Reading Mode
    // ============================================
    const [viewMode, setViewMode] = useState('detection');
    const [readingDirection, setReadingDirection] = useState('detection');
    const [wordBoundaries, setWordBoundaries] = useState(new Set());
    const [columnBreaks, setColumnBreaks] = useState(new Set());
    const [lineBreaks, setLineBreaks] = useState(new Set());
    const [readingOrder, setReadingOrder] = useState([]);
    const [draggedItem, setDraggedItem] = useState(null);
    
    // ============================================
    // STATE: Transcription
    // ============================================
    const [showTranscription, setShowTranscription] = useState(true);
    const [transcriptionPosition, setTranscriptionPosition] = useState({ x: 0, y: 0 });
    const [isDraggingTranscription, setIsDraggingTranscription] = useState(false);
    const [transcriptionDragStart, setTranscriptionDragStart] = useState({ x: 0, y: 0 });
    const [translationEnglish, setTranslationEnglish] = useState('');
    const [translationArabic, setTranslationArabic] = useState('');
    
    // ============================================
    // STATE: UI Display Options
    // ============================================
    const [showRegionBoundaries, setShowRegionBoundaries] = useState(false);
    const [showArabicLabels, setShowArabicLabels] = useState(false);
    const [showChartViewer, setShowChartViewer] = useState(false);
    const [showCorrectionAnalysis, setShowCorrectionAnalysis] = useState(false);
    const [showConfidenceFilter, setShowConfidenceFilter] = useState(false);
    const [showCloudSyncModal, setShowCloudSyncModal] = useState(false);
    const [mergeIndicator, setMergeIndicator] = useState(null);
    
    // ============================================
    // STATE: Collapsed Sections
    // ============================================
    const [isChartStatusCollapsed, setIsChartStatusCollapsed] = useState(false);
    const [isRotationCollapsed, setIsRotationCollapsed] = useState(true);
    const [isControlsCollapsed, setIsControlsCollapsed] = useState(true);
    const [isViewModeCollapsed, setIsViewModeCollapsed] = useState(false);
    const [isCorrectionMemoryCollapsed, setIsCorrectionMemoryCollapsed] = useState(true);
    const [isExportOptionsCollapsed, setIsExportOptionsCollapsed] = useState(true);
    const [isPreprocessingCollapsed, setIsPreprocessingCollapsed] = useState(false);
    
    // ============================================
    // STATE: History & Undo
    // ============================================
    const [actionHistory, setActionHistory] = useState([]);
    const [stateHistory, setStateHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    
    // ============================================
    // STATE: Cloud Sync
    // ============================================
    const [customGistUrl, setCustomGistUrl] = useState('');
    
    // ============================================
    // STATE: HKI System (from modular backend)
    // ============================================
    const [currentInscriptionId, setCurrentInscriptionId] = useState(null);
    const [inscriptionLibrary, setInscriptionLibrary] = useState({});
    const [showLibraryModal, setShowLibraryModal] = useState(false);
    
    // ============================================
    // REFS
    // ============================================
    const imageRef = useRef(null);
    const imageContainerRef = useRef(null);
    const eraserCanvasRef = useRef(null);
    const preprocessCanvasRef = useRef(null);
    const originalCanvasRef = useRef(null);
    
    // ============================================
    // EFFECTS
    // ============================================
    
    // Load HKI library on mount
    useEffect(() => {
        if (typeof HKIStorage !== 'undefined') {
            const library = HKIStorage.getLibrary();
            setInscriptionLibrary(library);
        }
    }, []);
    
    // Auto-generate ID on first recognition
    useEffect(() => {
        if (recognitionResults.length > 0 && !currentInscriptionId && typeof HKIStorage !== 'undefined') {
            const id = HKIStorage.generateInscriptionId();
            setCurrentInscriptionId(id);
        }
    }, [recognitionResults, currentInscriptionId]);
    
    // ============================================
    // COMPUTED VALUES
    // ============================================
    
    const getFilteredResults = () => {
        if (!useConfidenceFilter) {
            return recognitionResults;
        }
        return recognitionResults.filter(r => r.confidence >= (confidenceThreshold / 100));
    };
    
    const getReadingOrderedResults = () => {
        if (readingOrder.length === 0) {
            return recognitionResults;
        }
        return readingOrder.map(index => recognitionResults[index]).filter(r => r !== undefined);
    };
    
    // ============================================
    // UTILITY FUNCTIONS
    // ============================================
    
    const recordAction = (actionType, actionData) => {
        const action = {
            type: actionType,
            data: actionData,
            timestamp: new Date().toISOString(),
            id: Date.now()
        };
        setActionHistory(prev => [...prev, action].slice(-50));
        
        const modifyingActions = ['validation', 'delete_detection', 'merge_detections', 
                                'add_manual_detection', 'correct_glyph', 'reorder_reading', 
                                'toggle_word_boundary'];
        if (modifyingActions.includes(actionType)) {
            setTimeout(takeSnapshot, 0);
        }
    };
    
    const takeSnapshot = () => {
        const snapshot = {
            recognitionResults: [...recognitionResults],
            validations: { ...validations },
            selectedRegions: new Set(selectedRegions),
            wordBoundaries: new Set(wordBoundaries),
            readingOrder: [...readingOrder],
            isolatedGlyphs: [...isolatedGlyphs]
        };
        
        const newHistory = stateHistory.slice(0, historyIndex + 1);
        newHistory.push(snapshot);
        const trimmedHistory = newHistory.slice(-50);
        
        setStateHistory(trimmedHistory);
        setHistoryIndex(trimmedHistory.length - 1);
    };
    
    // ============================================
    // COMPONENT PROPS BUNDLES
    // ============================================
    
    const imageProps = {
        image, setImage,
        displayImage, setDisplayImage,
        imageRotation, setImageRotation,
        isImageLoading, setIsImageLoading,
        imageRef, imageContainerRef
    };
    
    const recognitionProps = {
        recognitionResults, setRecognitionResults,
        isProcessing, setIsProcessing,
        processingProgress, setProcessingProgress,
        equivalenceChart, chartLoadStatus,
        loadedGlyphImages,
        recordAction
    };
    
    const preprocessingProps = {
        preprocessing, setPreprocessing,
        originalMat, setOriginalMat,
        preprocessedMat, setPreprocessedMat,
        adjustmentsApplied, setAdjustmentsApplied,
        showPreprocessPreview, setShowPreprocessPreview,
        originalCanvasRef, preprocessCanvasRef
    };
    
    const validationProps = {
        validations, setValidations,
        selectedRegions, setSelectedRegions,
        correctionMode, setCorrectionMode,
        adjustMode, setAdjustMode,
        recordAction
    };
    
    const readingProps = {
        viewMode, setViewMode,
        readingDirection, setReadingDirection,
        readingOrder, setReadingOrder,
        wordBoundaries, setWordBoundaries,
        lineBreaks, setLineBreaks,
        columnBreaks, setColumnBreaks,
        getReadingOrderedResults
    };
    
    const hkiProps = {
        currentInscriptionId, setCurrentInscriptionId,
        inscriptionLibrary, setInscriptionLibrary,
        showLibraryModal, setShowLibraryModal
    };
    
    // Component will continue with render logic...
    // This will be in the main JSX file
    
    return null; // Placeholder - actual JSX in main.jsx
}

// Export for use in main app
window.HakliGlyphRecognizer = HakliGlyphRecognizer;
