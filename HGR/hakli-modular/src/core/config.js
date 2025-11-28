// ============================================
// CORE CONFIGURATION
// Constants and settings for Hakli Glyph Recognizer
// ============================================

const CONFIG = {
    // Application Info
    APP_NAME: 'Hakli Glyph Recognizer',
    APP_VERSION: 'v251126',
    APP_AUTHOR: '©marty heaton',
    
    // GitHub Repository
    GITHUB_BASE_URL: 'https://raw.githubusercontent.com/hytra3/hakli_glyph_recognizer/main/',
    GLYPH_CHART_URL: 'https://raw.githubusercontent.com/hytra3/hakli_glyph_recognizer/main/Hakli_glyphs.JSON',
    
    // OpenCV
    OPENCV_URL: 'https://docs.opencv.org/4.5.0/opencv.js',
    
    // Recognition Settings
    RECOGNITION: {
        MIN_CONFIDENCE: 0.30,
        IOU_THRESHOLD: 0.3,
        SCALES: [1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 1.1, 1.2],
        ROTATIONS: [-10, -5, 0, 5, 10],
        CONFIDENCE_WEIGHTS: {
            PRIMARY: 1.0,
            VARIANT: 0.95,
            EXAMPLE: 0.90
        },
        SHAPE_WEIGHTS: {
            SHAPE: 0.70,
            ASPECT: 0.15,
            TEMPLATE: 0.15
        }
    },
    
    // Isolation Settings
    ISOLATION: {
        MIN_AREA_RATIO: 0.002,
        MAX_AREA_RATIO: 0.05,
        MIN_ASPECT_RATIO: 0.2,
        MAX_ASPECT_RATIO: 5.0,
        MIN_SOLIDITY: 0.3,
        PADDING: 5
    },
    
    // Preprocessing Defaults
    PREPROCESSING: {
        ROTATION: 0,
        USE_ADAPTIVE_THRESHOLD: false,
        BLOCK_SIZE: 11,
        CONSTANT_OFFSET: 2,
        GAUSSIAN_BLUR: 0,
        MORPHOLOGY_OPERATION: 'none',
        INVERT_COLORS: false
    },
    
    // Storage Settings
    STORAGE: {
        INSCRIPTION_KEY: 'hakliInscriptions',
        CORRECTIONS_KEY: 'hakliCorrections',
        RECENT_EXPORTS_KEY: 'hakliRecentExports',
        MAX_RECENT_EXPORTS: 10,
        CACHE_HISTORY_LIMIT: 50,
        STATE_HISTORY_LIMIT: 50
    },
    
    // Inscription ID Format
    ID_FORMAT: {
        PREFIX: 'DH',
        YEAR_DIGITS: 4,
        SEQUENCE_DIGITS: 3,
        SEPARATOR: '-'
    },
    
    // UI Settings
    UI: {
        MAX_PROGRESS_UPDATES: 20,
        INITIAL_EXAMPLES_TO_LOAD: 3,
        TOTAL_GLYPHS_TO_SHOW: 8
    }
};

// Make globally available
window.CONFIG = CONFIG;
