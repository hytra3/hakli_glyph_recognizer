// ============================================
// CENTRALIZED STATE MANAGEMENT
// Replaces 75+ useState calls with organized reducer pattern
// ============================================

const AppState = {
    // Initial state organized by domain
    initialState: {
        // === IMAGE STATE ===
        image: {
            original: null,           // Original uploaded image
            display: null,            // Currently displayed image (may be processed)
            rotation: 0,              // Current rotation in degrees
            rotatedDimensions: null,  // { width, height } after rotation
            isLoading: false
        },
        
        // === PREPROCESSING STATE ===
        preprocessing: {
            rotation: 0,
            useAdaptiveThreshold: false,
            blockSize: 11,
            constantOffset: 2,
            gaussianBlur: 0,
            morphologyOperation: 'none',
            invertColors: false,
            showPreview: true,
            isCollapsed: false
        },
        
        // === GLYPH CHART STATE ===
        chart: {
            data: null,               // The equivalence chart JSON
            loadStatus: 'not-loaded', // 'not-loaded' | 'loading' | 'loaded' | 'error'
            loadedImages: {},         // Cached Image objects keyed by glyph ID
            thumbnails: {},           // Thumbnail data URLs keyed by glyph ID
            imageLoadProgress: { loaded: 0, total: 0 }
        },
        
        // === RECOGNITION STATE ===
        recognition: {
            results: [],              // Array of detection results
            isolatedGlyphs: [],       // Isolated glyph regions before matching
            validations: {},          // { index: { isCorrect, timestamp, detectionData } }
            isProcessing: false,
            progress: { current: 0, total: 0 },
            confidenceThreshold: 0,
            useConfidenceFilter: false
        },
        
        // === READING & TRANSCRIPTION STATE ===
        reading: {
            viewMode: 'detection',        // 'detection' | 'reading'
            direction: 'detection',       // 'detection' | 'ltr' | 'rtl' | 'ttb'
            order: [],                    // Manual reading order (array of indices)
            wordBoundaries: new Set(),    // Set of indices marking word ends
            lineBreaks: new Set(),        // Set of indices marking line ends
            columnBreaks: new Set(),      // Set of indices marking column ends
            showTranscription: true,
            transcriptionPosition: { x: 0, y: 0 }
        },
        
        // === TRANSLATION STATE ===
        translation: {
            english: '',
            arabic: ''
        },
        
        // === SELECTION & INTERACTION STATE ===
        interaction: {
            selectedRegions: new Set(),
            selectedIsolatedRegion: null,
            correctionMode: null,         // Index of detection being corrected
            trimMode: null,               // Index of detection being trimmed
            excludeMode: null,            // Index of detection for exclusion
            adjustMode: null,             // Index of detection being adjusted
            draggingCorner: null,         // 'tl' | 'tr' | 'bl' | 'br'
            dragStartPos: null,
            manualDetectionMode: false,
            isDrawing: false,
            drawStart: null,
            drawCurrent: null,
            mergeIndicator: null,
            templateTrainingMode: false,
            selectedForTemplate: null
        },
        
        // === ERASER STATE ===
        eraser: {
            mode: false,
            brushSize: 15,
            excludeBrushSize: 20,
            isErasing: false,
            isErasingExclude: false,
            history: [],
            cursorStyle: 'crosshair',
            excludeCursorStyle: 'crosshair'
        },
        
        // === EXCLUSION STATE ===
        exclusion: {
            regions: [],                  // Array of exclusion boxes
            excludedDetections: new Set(),
            excludeEraserMode: false
        },
        
        // === HISTORY STATE (Undo/Redo) ===
        history: {
            actions: [],                  // Array of action records
            states: [],                   // Array of state snapshots
            index: -1                     // Current position in history
        },
        
        // === UI STATE ===
        ui: {
            // Panel collapse states
            collapsed: {
                chartStatus: false,
                rotation: true,
                blur: true,
                threshold: false,
                morph: true,
                controls: true,
                viewMode: false,
                correctionMemory: true,
                exportOptions: true,
                preprocessing: false
            },
            // Modal states
            modals: {
                chartViewer: false,
                glyphEditor: null,        // { mode: 'add'|'edit', glyph?: {...} }
                cloudSync: false,
                community: false,
                filePicker: null,         // { files: [], isLoading: boolean }
                correctionAnalysis: false,
                library: false
            },
            // Display options
            showArabicLabels: false,
            showRegionBoundaries: false,
            showTopMatches: false,
            showConfidenceFilter: false,
            // Update banner
            updateAvailable: false,
            newVersion: null,
            showUpdateBanner: false,
            // Dismissed tips
            dismissedTips: {}
        },
        
        // === INSCRIPTION STATE ===
        inscription: {
            currentId: null,
            title: '',
            complete: false,
            metadata: {
                location: '',
                site: '',
                date_photographed: '',
                stone_type: '',
                condition: '',
                notes: ''
            }
        },
        
        // === CLOUD SYNC STATE ===
        cloud: {
            driveAuthStatus: 0,           // Counter to force re-render on auth change
            customGistUrl: ''
        }
    },

    // Action types organized by domain
    actions: {
        // Image actions
        SET_IMAGE: 'SET_IMAGE',
        SET_DISPLAY_IMAGE: 'SET_DISPLAY_IMAGE',
        SET_IMAGE_ROTATION: 'SET_IMAGE_ROTATION',
        SET_IMAGE_LOADING: 'SET_IMAGE_LOADING',
        
        // Preprocessing actions
        SET_PREPROCESSING: 'SET_PREPROCESSING',
        UPDATE_PREPROCESSING: 'UPDATE_PREPROCESSING',
        RESET_PREPROCESSING: 'RESET_PREPROCESSING',
        
        // Chart actions
        SET_CHART: 'SET_CHART',
        SET_CHART_STATUS: 'SET_CHART_STATUS',
        SET_LOADED_GLYPH_IMAGE: 'SET_LOADED_GLYPH_IMAGE',
        SET_GLYPH_THUMBNAIL: 'SET_GLYPH_THUMBNAIL',
        SET_IMAGE_LOAD_PROGRESS: 'SET_IMAGE_LOAD_PROGRESS',
        
        // Recognition actions
        SET_RECOGNITION_RESULTS: 'SET_RECOGNITION_RESULTS',
        ADD_DETECTION: 'ADD_DETECTION',
        UPDATE_DETECTION: 'UPDATE_DETECTION',
        DELETE_DETECTION: 'DELETE_DETECTION',
        SET_ISOLATED_GLYPHS: 'SET_ISOLATED_GLYPHS',
        SET_VALIDATION: 'SET_VALIDATION',
        SET_VALIDATIONS: 'SET_VALIDATIONS',
        SET_PROCESSING: 'SET_PROCESSING',
        SET_PROCESSING_PROGRESS: 'SET_PROCESSING_PROGRESS',
        SET_CONFIDENCE_THRESHOLD: 'SET_CONFIDENCE_THRESHOLD',
        TOGGLE_CONFIDENCE_FILTER: 'TOGGLE_CONFIDENCE_FILTER',
        
        // Reading actions
        SET_VIEW_MODE: 'SET_VIEW_MODE',
        SET_READING_DIRECTION: 'SET_READING_DIRECTION',
        SET_READING_ORDER: 'SET_READING_ORDER',
        TOGGLE_WORD_BOUNDARY: 'TOGGLE_WORD_BOUNDARY',
        TOGGLE_LINE_BREAK: 'TOGGLE_LINE_BREAK',
        TOGGLE_COLUMN_BREAK: 'TOGGLE_COLUMN_BREAK',
        SET_WORD_BOUNDARIES: 'SET_WORD_BOUNDARIES',
        SET_LINE_BREAKS: 'SET_LINE_BREAKS',
        SET_COLUMN_BREAKS: 'SET_COLUMN_BREAKS',
        
        // Translation actions
        SET_TRANSLATION_ENGLISH: 'SET_TRANSLATION_ENGLISH',
        SET_TRANSLATION_ARABIC: 'SET_TRANSLATION_ARABIC',
        
        // Interaction actions
        SET_SELECTED_REGIONS: 'SET_SELECTED_REGIONS',
        TOGGLE_REGION_SELECTION: 'TOGGLE_REGION_SELECTION',
        CLEAR_SELECTION: 'CLEAR_SELECTION',
        SET_CORRECTION_MODE: 'SET_CORRECTION_MODE',
        SET_TRIM_MODE: 'SET_TRIM_MODE',
        SET_EXCLUDE_MODE: 'SET_EXCLUDE_MODE',
        SET_ADJUST_MODE: 'SET_ADJUST_MODE',
        SET_MANUAL_DETECTION_MODE: 'SET_MANUAL_DETECTION_MODE',
        SET_DRAWING_STATE: 'SET_DRAWING_STATE',
        SET_MERGE_INDICATOR: 'SET_MERGE_INDICATOR',
        
        // Eraser actions
        SET_ERASER_MODE: 'SET_ERASER_MODE',
        SET_BRUSH_SIZE: 'SET_BRUSH_SIZE',
        SET_ERASER_HISTORY: 'SET_ERASER_HISTORY',
        
        // Exclusion actions
        SET_EXCLUDE_REGIONS: 'SET_EXCLUDE_REGIONS',
        ADD_EXCLUDE_REGION: 'ADD_EXCLUDE_REGION',
        TOGGLE_EXCLUDED_DETECTION: 'TOGGLE_EXCLUDED_DETECTION',
        
        // History actions
        RECORD_ACTION: 'RECORD_ACTION',
        PUSH_STATE: 'PUSH_STATE',
        UNDO: 'UNDO',
        REDO: 'REDO',
        
        // UI actions
        TOGGLE_PANEL: 'TOGGLE_PANEL',
        SET_MODAL: 'SET_MODAL',
        DISMISS_TIP: 'DISMISS_TIP',
        RESET_TIPS: 'RESET_TIPS',
        SET_UPDATE_AVAILABLE: 'SET_UPDATE_AVAILABLE',
        
        // Inscription actions
        SET_INSCRIPTION_ID: 'SET_INSCRIPTION_ID',
        SET_INSCRIPTION_TITLE: 'SET_INSCRIPTION_TITLE',
        SET_INSCRIPTION_COMPLETE: 'SET_INSCRIPTION_COMPLETE',
        SET_INSCRIPTION_METADATA: 'SET_INSCRIPTION_METADATA',
        
        // Cloud actions
        SET_DRIVE_AUTH_STATUS: 'SET_DRIVE_AUTH_STATUS',
        SET_CUSTOM_GIST_URL: 'SET_CUSTOM_GIST_URL',
        
        // Bulk actions
        LOAD_HKI_FILE: 'LOAD_HKI_FILE',
        RESET_STATE: 'RESET_STATE'
    },

    // Main reducer function
    reducer: (state, action) => {
        switch (action.type) {
            // === IMAGE ACTIONS ===
            case 'SET_IMAGE':
                return {
                    ...state,
                    image: { ...state.image, original: action.payload, display: action.payload }
                };
            
            case 'SET_DISPLAY_IMAGE':
                return {
                    ...state,
                    image: { ...state.image, display: action.payload }
                };
            
            case 'SET_IMAGE_ROTATION':
                return {
                    ...state,
                    image: { 
                        ...state.image, 
                        rotation: action.payload.rotation,
                        rotatedDimensions: action.payload.dimensions || state.image.rotatedDimensions
                    }
                };
            
            case 'SET_IMAGE_LOADING':
                return {
                    ...state,
                    image: { ...state.image, isLoading: action.payload }
                };
            
            // === PREPROCESSING ACTIONS ===
            case 'SET_PREPROCESSING':
                return {
                    ...state,
                    preprocessing: { ...state.preprocessing, ...action.payload }
                };
            
            case 'UPDATE_PREPROCESSING':
                return {
                    ...state,
                    preprocessing: { 
                        ...state.preprocessing, 
                        [action.key]: action.value 
                    }
                };
            
            case 'RESET_PREPROCESSING':
                return {
                    ...state,
                    preprocessing: { ...AppState.initialState.preprocessing }
                };
            
            // === CHART ACTIONS ===
            case 'SET_CHART':
                return {
                    ...state,
                    chart: { ...state.chart, data: action.payload, loadStatus: 'loaded' }
                };
            
            case 'SET_CHART_STATUS':
                return {
                    ...state,
                    chart: { ...state.chart, loadStatus: action.payload }
                };
            
            case 'SET_LOADED_GLYPH_IMAGE':
                return {
                    ...state,
                    chart: {
                        ...state.chart,
                        loadedImages: { ...state.chart.loadedImages, [action.id]: action.image }
                    }
                };
            
            case 'SET_GLYPH_THUMBNAIL':
                return {
                    ...state,
                    chart: {
                        ...state.chart,
                        thumbnails: { ...state.chart.thumbnails, [action.id]: action.thumbnail }
                    }
                };
            
            case 'SET_IMAGE_LOAD_PROGRESS':
                return {
                    ...state,
                    chart: { ...state.chart, imageLoadProgress: action.payload }
                };
            
            // === RECOGNITION ACTIONS ===
            case 'SET_RECOGNITION_RESULTS':
                return {
                    ...state,
                    recognition: { ...state.recognition, results: action.payload }
                };
            
            case 'ADD_DETECTION':
                return {
                    ...state,
                    recognition: {
                        ...state.recognition,
                        results: [...state.recognition.results, action.payload]
                    }
                };
            
            case 'UPDATE_DETECTION':
                return {
                    ...state,
                    recognition: {
                        ...state.recognition,
                        results: state.recognition.results.map((r, i) => 
                            i === action.index ? { ...r, ...action.payload } : r
                        )
                    }
                };
            
            case 'DELETE_DETECTION':
                return {
                    ...state,
                    recognition: {
                        ...state.recognition,
                        results: state.recognition.results.filter((_, i) => i !== action.index)
                    }
                };
            
            case 'SET_ISOLATED_GLYPHS':
                return {
                    ...state,
                    recognition: { ...state.recognition, isolatedGlyphs: action.payload }
                };
            
            case 'SET_VALIDATION':
                return {
                    ...state,
                    recognition: {
                        ...state.recognition,
                        validations: { 
                            ...state.recognition.validations, 
                            [action.index]: action.payload 
                        }
                    }
                };
            
            case 'SET_VALIDATIONS':
                return {
                    ...state,
                    recognition: { ...state.recognition, validations: action.payload }
                };
            
            case 'SET_PROCESSING':
                return {
                    ...state,
                    recognition: { ...state.recognition, isProcessing: action.payload }
                };
            
            case 'SET_PROCESSING_PROGRESS':
                return {
                    ...state,
                    recognition: { ...state.recognition, progress: action.payload }
                };
            
            // === READING ACTIONS ===
            case 'SET_VIEW_MODE':
                return {
                    ...state,
                    reading: { ...state.reading, viewMode: action.payload }
                };
            
            case 'SET_READING_DIRECTION':
                return {
                    ...state,
                    reading: { ...state.reading, direction: action.payload }
                };
            
            case 'SET_READING_ORDER':
                return {
                    ...state,
                    reading: { ...state.reading, order: action.payload }
                };
            
            case 'TOGGLE_WORD_BOUNDARY': {
                const newBoundaries = new Set(state.reading.wordBoundaries);
                if (newBoundaries.has(action.index)) {
                    newBoundaries.delete(action.index);
                } else {
                    newBoundaries.add(action.index);
                }
                return {
                    ...state,
                    reading: { ...state.reading, wordBoundaries: newBoundaries }
                };
            }
            
            case 'SET_WORD_BOUNDARIES':
                return {
                    ...state,
                    reading: { ...state.reading, wordBoundaries: new Set(action.payload) }
                };
            
            case 'SET_LINE_BREAKS':
                return {
                    ...state,
                    reading: { ...state.reading, lineBreaks: new Set(action.payload) }
                };
            
            case 'SET_COLUMN_BREAKS':
                return {
                    ...state,
                    reading: { ...state.reading, columnBreaks: new Set(action.payload) }
                };
            
            // === TRANSLATION ACTIONS ===
            case 'SET_TRANSLATION_ENGLISH':
                return {
                    ...state,
                    translation: { ...state.translation, english: action.payload }
                };
            
            case 'SET_TRANSLATION_ARABIC':
                return {
                    ...state,
                    translation: { ...state.translation, arabic: action.payload }
                };
            
            // === INTERACTION ACTIONS ===
            case 'SET_SELECTED_REGIONS':
                return {
                    ...state,
                    interaction: { ...state.interaction, selectedRegions: new Set(action.payload) }
                };
            
            case 'TOGGLE_REGION_SELECTION': {
                const newSelected = new Set(state.interaction.selectedRegions);
                if (newSelected.has(action.index)) {
                    newSelected.delete(action.index);
                } else {
                    newSelected.add(action.index);
                }
                return {
                    ...state,
                    interaction: { ...state.interaction, selectedRegions: newSelected }
                };
            }
            
            case 'CLEAR_SELECTION':
                return {
                    ...state,
                    interaction: { ...state.interaction, selectedRegions: new Set() }
                };
            
            case 'SET_CORRECTION_MODE':
                return {
                    ...state,
                    interaction: { ...state.interaction, correctionMode: action.payload }
                };
            
            case 'SET_TRIM_MODE':
                return {
                    ...state,
                    interaction: { ...state.interaction, trimMode: action.payload }
                };
            
            case 'SET_EXCLUDE_MODE':
                return {
                    ...state,
                    interaction: { ...state.interaction, excludeMode: action.payload }
                };
            
            case 'SET_ADJUST_MODE':
                return {
                    ...state,
                    interaction: { ...state.interaction, adjustMode: action.payload }
                };
            
            case 'SET_MANUAL_DETECTION_MODE':
                return {
                    ...state,
                    interaction: { ...state.interaction, manualDetectionMode: action.payload }
                };
            
            case 'SET_DRAWING_STATE':
                return {
                    ...state,
                    interaction: {
                        ...state.interaction,
                        isDrawing: action.payload.isDrawing,
                        drawStart: action.payload.drawStart,
                        drawCurrent: action.payload.drawCurrent
                    }
                };
            
            // === UI ACTIONS ===
            case 'TOGGLE_PANEL':
                return {
                    ...state,
                    ui: {
                        ...state.ui,
                        collapsed: {
                            ...state.ui.collapsed,
                            [action.panel]: !state.ui.collapsed[action.panel]
                        }
                    }
                };
            
            case 'SET_MODAL':
                return {
                    ...state,
                    ui: {
                        ...state.ui,
                        modals: {
                            ...state.ui.modals,
                            [action.modal]: action.payload
                        }
                    }
                };
            
            case 'DISMISS_TIP':
                return {
                    ...state,
                    ui: {
                        ...state.ui,
                        dismissedTips: { ...state.ui.dismissedTips, [action.tipId]: true }
                    }
                };
            
            case 'RESET_TIPS':
                return {
                    ...state,
                    ui: { ...state.ui, dismissedTips: {} }
                };
            
            // === INSCRIPTION ACTIONS ===
            case 'SET_INSCRIPTION_ID':
                return {
                    ...state,
                    inscription: { ...state.inscription, currentId: action.payload }
                };
            
            case 'SET_INSCRIPTION_TITLE':
                return {
                    ...state,
                    inscription: { ...state.inscription, title: action.payload }
                };
            
            case 'SET_INSCRIPTION_COMPLETE':
                return {
                    ...state,
                    inscription: { ...state.inscription, complete: action.payload }
                };
            
            // === BULK ACTIONS ===
            case 'LOAD_HKI_FILE':
                return {
                    ...state,
                    image: {
                        ...state.image,
                        original: action.payload.images.original,
                        display: action.payload.images.preprocessed
                    },
                    recognition: {
                        ...state.recognition,
                        results: action.payload.detections.map(d => ({
                            glyph: d.glyph,
                            confidence: d.confidence,
                            position: d.position,
                            corners: d.corners,
                            thumbnail: d.thumbnail,
                            matchType: d.matchType,
                            isManual: d.isManual,
                            isMerged: d.isMerged,
                            isAdjusted: d.isAdjusted,
                            corrected: d.corrected,
                            originalGlyph: d.originalGlyph,
                            regionIndex: d.index
                        })),
                        validations: action.payload.detections.reduce((acc, d, i) => {
                            if (d.validated) {
                                acc[i] = {
                                    isCorrect: d.validated.isCorrect,
                                    timestamp: d.validated.timestamp,
                                    detectionData: d
                                };
                            }
                            return acc;
                        }, {})
                    },
                    reading: {
                        ...state.reading,
                        viewMode: action.payload.readingData.viewMode,
                        direction: action.payload.readingData.readingDirection,
                        order: action.payload.readingData.readingOrder || [],
                        wordBoundaries: new Set(action.payload.readingData.wordBoundaries || []),
                        lineBreaks: new Set(action.payload.readingData.lineBreaks || []),
                        columnBreaks: new Set(action.payload.readingData.columnBreaks || [])
                    },
                    translation: {
                        english: action.payload.translations.english || '',
                        arabic: action.payload.translations.arabic || ''
                    },
                    inscription: {
                        currentId: action.payload.inscriptionId,
                        title: action.payload.inscriptionTitle || '',
                        complete: action.payload.complete || false,
                        metadata: action.payload.metadata || state.inscription.metadata
                    },
                    preprocessing: action.payload.images.preprocessingSettings || state.preprocessing
                };
            
            case 'RESET_STATE':
                return { ...AppState.initialState };
            
            default:
                console.warn('Unknown action type:', action.type);
                return state;
        }
    },

    // Action creators for convenience
    createAction: (type, payload) => ({ type, ...payload })
};

// Make globally available
window.AppState = AppState;
