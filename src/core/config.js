// ============================================
// APPLICATION CONFIGURATION
// Central configuration for the Hakli Glyph Recognizer
// ============================================

const CONFIG = {
    // App info
    APP_VERSION: 'v251224',
    APP_NAME: 'Hakli Glyph Recognizer',
    APP_AUTHOR: 'Marty Heyman',
    
    // GitHub repository
    REPO: {
        OWNER: 'hytra3',
        NAME: 'hakli_glyph_recognizer',
        BRANCH: 'main',
        CHART_PATH: 'Hakli_glyphs.JSON',
        BASE_URL: 'https://raw.githubusercontent.com/hytra3/hakli_glyph_recognizer/main/'
    },
    
    // Isolation settings (for glyph detection)
    ISOLATION: {
        MIN_AREA_RATIO: 0.0005,      // Min area as ratio of image area
        MAX_AREA_RATIO: 0.15,        // Max area as ratio of image area
        MIN_ASPECT_RATIO: 0.2,       // Min width/height ratio
        MAX_ASPECT_RATIO: 5.0,       // Max width/height ratio
        MIN_SOLIDITY: 0.2,           // Min contour area / bounding box area
        PADDING: 5                   // Pixels of padding around detected regions
    },
    
    // Recognition settings
    RECOGNITION: {
        MIN_CONFIDENCE: 0.3,         // Minimum confidence to keep detection
        IOU_THRESHOLD: 0.3,          // IoU threshold for NMS
        SCALES: [0.5, 0.75, 1.0, 1.25, 1.5],  // Template scales to try
        ROTATIONS: [-15, -10, -5, 0, 5, 10, 15],  // Rotations to try (degrees)
        CONFIDENCE_WEIGHTS: {
            PRIMARY: 1.0,
            VARIANT: 0.95,
            EXAMPLE: 0.9,
            LEARNED: 0.85
        },
        SHAPE_WEIGHTS: {
            ASPECT: 0.3,
            SHAPE: 0.3,
            CONTOUR: 0.2,
            SIZE: 0.2
        }
    },
    
    // Preprocessing defaults
    PREPROCESSING: {
        rotation: 0,
        useAdaptiveThreshold: false,
        blockSize: 11,
        constantOffset: 2,
        gaussianBlur: 0,
        morphologyOperation: 'none',
        invertColors: false
    },
    
    // Storage keys
    STORAGE: {
        INSCRIPTION_KEY: 'hakli_inscriptions',
        CORRECTIONS_KEY: 'hakli_corrections',
        RECENT_EXPORTS_KEY: 'hakli_recent_exports',
        SETTINGS_KEY: 'hakli_settings',
        DISMISSED_TIPS_KEY: 'hakli_dismissed_tips',
        MAX_RECENT_EXPORTS: 20
    },
    
    // Inscription ID format
    ID_FORMAT: {
        PREFIX: 'HKI',
        SEPARATOR: '-',
        SEQUENCE_DIGITS: 4
    },
    
    // UI settings
    UI: {
        DEFAULT_VIEW_MODE: 'detection',
        DEFAULT_READING_DIRECTION: 'rtl',
        TOAST_DURATION: 3000,
        DEBOUNCE_DELAY: 300
    },
    
    // Export settings
    EXPORT: {
        IMAGE_FORMAT: 'image/png',
        IMAGE_QUALITY: 0.92,
        JSON_INDENT: 2
    },
    
    // Google Drive settings
    DRIVE: {
        CLIENT_ID: '894554328044-5ocv2t6g8h9ssj80sscniuqgl2t3021m.apps.googleusercontent.com',
        SCOPES: 'https://www.googleapis.com/auth/drive.file',
        FOLDER_NAME: 'Hakli_Inscriptions'
    },
    
    // Debug settings
    DEBUG: {
        ENABLED: true,
        LOG_LEVEL: 'info',
        SHOW_REGION_BOUNDARIES: false,
        SHOW_MATCHING_SCORES: false
    }
};

// Freeze to prevent accidental modification
Object.freeze(CONFIG);
Object.freeze(CONFIG.REPO);
Object.freeze(CONFIG.ISOLATION);
Object.freeze(CONFIG.RECOGNITION);
Object.freeze(CONFIG.PREPROCESSING);
Object.freeze(CONFIG.STORAGE);
Object.freeze(CONFIG.ID_FORMAT);
Object.freeze(CONFIG.UI);
Object.freeze(CONFIG.EXPORT);
Object.freeze(CONFIG.DRIVE);
Object.freeze(CONFIG.DEBUG);

// Make globally available
window.CONFIG = CONFIG;

console.log('✅ CONFIG loaded');
