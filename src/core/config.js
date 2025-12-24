// ============================================
// APPLICATION CONFIGURATION
// Central configuration for the Hakli Glyph Recognizer
// ============================================

const CONFIG = {
    // App info
    APP_VERSION: 'v2.0.0-modular',
    APP_NAME: 'Hakli Glyph Recognizer',
    APP_AUTHOR: 'Marty Heyman',
    
    // GitHub repository
    REPO: {
        OWNER: 'hytra3',
        NAME: 'hakli_glyph_recognizer',
        BRANCH: 'main',
        CHART_PATH: 'Hakli_glyphs.JSON'
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
    
    // Recognition settings
    RECOGNITION: {
        MIN_CONFIDENCE: 0.3,
        NMS_THRESHOLD: 0.3,
        MIN_REGION_SIZE: 10,
        MAX_REGION_SIZE: 500,
        DEFAULT_PREPROCESSING: {
            rotation: 0,
            useAdaptiveThreshold: false,
            blockSize: 11,
            constantOffset: 2,
            gaussianBlur: 0,
            morphologyOperation: 'none',
            invertColors: false
        }
    },
    
    // Template matching weights
    MATCHING: {
        SHAPE_WEIGHT: 0.4,
        CONTOUR_WEIGHT: 0.3,
        ASPECT_WEIGHT: 0.2,
        SIZE_WEIGHT: 0.1
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
        DEFAULT_READING_DIRECTION: 'detection',
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
    
    // Glyph chart settings
    CHART: {
        DEFAULT_URL: 'Hakli_glyphs.JSON',
        GITHUB_RAW_BASE: 'https://raw.githubusercontent.com/hytra3/hakli_glyph_recognizer/main/'
    },
    
    // Debug settings
    DEBUG: {
        ENABLED: true,
        LOG_LEVEL: 'info', // 'debug' | 'info' | 'warn' | 'error'
        SHOW_REGION_BOUNDARIES: false,
        SHOW_MATCHING_SCORES: false
    }
};

// Freeze to prevent accidental modification
Object.freeze(CONFIG);
Object.freeze(CONFIG.REPO);
Object.freeze(CONFIG.STORAGE);
Object.freeze(CONFIG.RECOGNITION);
Object.freeze(CONFIG.MATCHING);
Object.freeze(CONFIG.ID_FORMAT);
Object.freeze(CONFIG.UI);
Object.freeze(CONFIG.EXPORT);
Object.freeze(CONFIG.DRIVE);
Object.freeze(CONFIG.CHART);
Object.freeze(CONFIG.DEBUG);

// Make globally available
window.CONFIG = CONFIG;
