# Hakli Glyph Recognizer - Modular Refactoring Guide

## 🎯 What We've Done

Refactored your 4000+ line monolithic `index.html` into a clean, modular structure with **clear separation of concerns**.

## 📁 New Directory Structure

```
hakli-modular/
├── index.html (118 lines - just loads modules!)
├── src/
│   ├── core/
│   │   └── config.js ✅ COMPLETE - All constants & settings
│   │
│   ├── utils/
│   │   └── helpers.js ✅ COMPLETE - Common utility functions
│   │
│   ├── storage/
│   │   ├── hki.js ✅ COMPLETE - .hki save/load system
│   │   ├── cache.js ⏳ TODO - localStorage management
│   │   ├── corrections.js ⏳ TODO - Correction memory
│   │   └── export.js ⏳ TODO - Export functions (JSON/HTML/CSV)
│   │
│   ├── recognition/
│   │   ├── preprocessing.js ⏳ TODO - Image preprocessing
│   │   ├── isolation.js ⏳ TODO - Glyph isolation
│   │   ├── matching.js ⏳ TODO - Template matching
│   │   └── nms.js ⏳ TODO - Non-maximum suppression
│   │
│   ├── editing/
│   │   ├── validation.js ⏳ TODO - Validation logic
│   │   ├── adjustment.js ⏳ TODO - Box adjustment
│   │   └── merging.js ⏳ TODO - Detection merging
│   │
│   ├── reading/
│   │   ├── ordering.js ⏳ TODO - Reading order
│   │   └── transcription.js ⏳ TODO - Transcription generation
│   │
│   ├── ui/
│   │   └── styles.css ⏳ TODO - All CSS
│   │
│   └── main.jsx ⏳ TODO - React component
│
└── README.md
```

## ✅ Already Complete (3 modules)

### 1. **src/core/config.js**
All configuration and constants:
- `CONFIG.APP_NAME`, `CONFIG.APP_VERSION`
- `CONFIG.GITHUB_BASE_URL`, `CONFIG.GLYPH_CHART_URL`
- `CONFIG.RECOGNITION` - All recognition settings
- `CONFIG.ISOLATION` - Glyph isolation parameters
- `CONFIG.PREPROCESSING` - Default preprocessing values
- `CONFIG.STORAGE` - localStorage keys
- `CONFIG.ID_FORMAT` - Inscription ID format
- `CONFIG.UI` - UI-related settings

**Usage:**
```javascript
console.log(CONFIG.APP_NAME); // "Hakli Glyph Recognizer"
const minConfidence = CONFIG.RECOGNITION.MIN_CONFIDENCE; // 0.30
```

### 2. **src/utils/helpers.js**
Common utility functions:
- `Utils.convertToGitHubUrl()` - Convert GitHub URLs
- `Utils.getImageCoordinates()` - Mouse to image coords
- `Utils.extractRegionThumbnail()` - Extract thumbnails
- `Utils.calculateIoU()` - Intersection over Union
- `Utils.preprocessImageForMatching()` - OpenCV preprocessing
- `Utils.formatDate()` - Date formatting
- `Utils.downloadBlob()` - Download files
- `Utils.createJsonBlob()` - Create JSON blobs
- `Utils.deepClone()` - Deep object cloning

**Usage:**
```javascript
const coords = Utils.getImageCoordinates(event, imageRef);
const thumbnail = Utils.extractRegionThumbnail(img, region);
Utils.downloadBlob(blob, 'file.json');
```

### 3. **src/storage/hki.js**
Complete .hki file system:
- `HKIStorage.generateInscriptionId()` - Generate DH-YYYY-NNN IDs
- `HKIStorage.saveAsHkiFile()` - Save inscription packages
- `HKIStorage.loadHkiFile()` - Load from .hki data
- `HKIStorage.loadHkiFromFile()` - Load from file upload
- `HKIStorage.deleteInscription()` - Delete from library
- `HKIStorage.getLibrary()` - Get all inscriptions

**Usage:**
```javascript
const result = await HKIStorage.saveAsHkiFile(state);
HKIStorage.loadHkiFile(hkiData, setters);
const library = HKIStorage.getLibrary();
```

## ⏳ TODO - Modules to Create

### Priority 1: Core Recognition (High Priority)

#### **src/recognition/isolation.js**
Extract from original lines ~700-850:
```javascript
const Recognition = {
    isolateGlyphs: (inputImage) => {
        // Your existing isolateGlyphs function
        // Returns array of isolated regions
    }
};
window.Recognition = Recognition;
```

#### **src/recognition/matching.js**
Extract from original lines ~850-1100:
```javascript
const Recognition = {
    ...Recognition,
    performTemplateMatching: (inputImage, templateImage, region, glyphId) => {
        // Your existing template matching logic
        // Returns matches with confidence scores
    },
    
    recognizeGlyphs: (state, setters) => {
        // Main recognition pipeline
        // Calls isolation + matching
    }
};
```

#### **src/recognition/preprocessing.js**
Extract from original lines ~1500-1700:
```javascript
const Preprocessing = {
    processImageWithSettings: (sourceMat, settings) => {
        // Your preprocessing pipeline
    },
    
    applyAdjustments: (state, setters) => {
        // Apply preprocessing to main image
    }
};
window.Preprocessing = Preprocessing;
```

#### **src/recognition/nms.js**
Extract from original lines ~1100-1150:
```javascript
const Recognition = {
    ...Recognition,
    applyNonMaximumSuppression: (detections, iouThreshold = 0.3) => {
        // Your NMS implementation
    }
};
```

### Priority 2: Storage & Export

#### **src/storage/cache.js**
Extract from original lines ~400-450:
```javascript
const CacheStorage = {
    saveToLocalCache: (jsonData, filename) => {
        // Save to localStorage
    },
    
    getLocalCache: () => {
        // Get from localStorage
    }
};
window.CacheStorage = CacheStorage;
```

#### **src/storage/corrections.js**
Extract from original lines ~1900-2050:
```javascript
const CorrectionMemory = {
    saveCorrectionToMemory: (originalGlyph, correctedGlyph, confidence) => {
        // Save correction
    },
    
    getCorrectionSuggestion: (glyphId) => {
        // Get suggestion
    },
    
    exportCorrectionMemory: () => {
        // Export corrections
    },
    
    importCorrectionMemory: (jsonData) => {
        // Import corrections
    }
};
window.CorrectionMemory = CorrectionMemory;
```

#### **src/storage/export.js**
Extract from original lines ~2050-2400:
```javascript
const ExportUtils = {
    exportTranscription: (state) => {
        // Export transcription
    },
    
    exportDetectionData: (state) => {
        // Export JSON
    },
    
    exportAnnotatedImage: (state) => {
        // Export annotated image
    },
    
    exportHtmlReport: (state) => {
        // Export HTML report
    }
};
window.ExportUtils = ExportUtils;
```

### Priority 3: Editing Functions

#### **src/editing/validation.js**
```javascript
const Editing = {
    validateDetection: (detectionIndex, isCorrect, state, setters) => {
        // Validation logic
    },
    
    deleteDetection: (detectionIndex, state, setters) => {
        // Delete detection
    }
};
window.Editing = Editing;
```

#### **src/editing/adjustment.js**
```javascript
const Editing = {
    ...Editing,
    applyAdjustment: (detectionIndex, state, setters) => {
        // Apply corner adjustments
    },
    
    applyTrim: (detectionIndex, newBounds, state, setters) => {
        // Apply trimming
    },
    
    applyExclude: (detectionIndex, state, setters) => {
        // Apply exclusions
    }
};
```

#### **src/editing/merging.js**
```javascript
const Editing = {
    ...Editing,
    mergeSelectedDetections: (state, setters) => {
        // Merge detections
    }
};
```

### Priority 4: Reading & Transcription

#### **src/reading/ordering.js**
```javascript
const Reading = {
    applyReadingDirection: (direction, state, setters) => {
        // Set reading direction
    },
    
    toggleWordBoundary: (index, state, setters) => {
        // Toggle word boundary
    },
    
    toggleColumnBreak: (index, state, setters) => {
        // Toggle column break
    },
    
    toggleLineBreak: (index, state, setters) => {
        // Toggle line break
    }
};
window.Reading = Reading;
```

#### **src/reading/transcription.js**
```javascript
const Reading = {
    ...Reading,
    getLayoutStructure: (state) => {
        // Build 2D layout from breaks
    },
    
    getEnhancedTranscription: (state) => {
        // Generate formatted transcription
    },
    
    copyTranscriptionToClipboard: (state) => {
        // Copy to clipboard
    }
};
```

### Priority 5: UI Components

#### **src/ui/styles.css**
Extract all CSS from `<style>` tags:
```css
.detection-box { ... }
.detection-label { ... }
.reading-order-badge { ... }
/* etc. */
```

#### **src/main.jsx**
This is your React component - extract from `<script type="text/babel">`:
```jsx
const { useState, useEffect, useRef } = React;

function HakliGlyphRecognizer() {
    // All your state declarations
    // All your useEffect hooks
    // All your event handlers
    // Return JSX
}

ReactDOM.createRoot(document.getElementById('root')).render(<HakliGlyphRecognizer />);
```

## 🔄 Migration Strategy

### Step 1: Test Current Modules (Now)
1. Copy `hakli-modular/` folder to your project
2. Open `index.html` in browser
3. Open console - should see: "🚀 Hakli Glyph Recognizer - Modular Version"
4. Check that config, utils, hki modules are loaded

### Step 2: Extract Recognition Modules (Next)
1. Create `src/recognition/isolation.js`
2. Copy `isolateGlyphs()` function from original
3. Wrap in `const Recognition = { ... }`
4. Test in browser

### Step 3: Extract Remaining Modules (Week 1)
Follow the TODO list above, extracting one module at a time.

### Step 4: Extract React Component (Week 2)
This is the big one - your 2500+ line component.
- Keep all state in one place
- Move event handlers to helper functions where possible
- Consider splitting into sub-components later

### Step 5: Test & Deploy
Once all modules are extracted:
1. Test thoroughly
2. Update GitHub repo
3. Deploy to GitHub Pages

## 💡 Benefits You'll See

### Before (Monolithic):
- ❌ 4000+ lines in one file
- ❌ Hard to find bugs
- ❌ Can't test parts independently
- ❌ Merge conflicts when collaborating
- ❌ Slow to understand

### After (Modular):
- ✅ ~200-400 lines per file
- ✅ Easy to locate issues
- ✅ Test modules in isolation
- ✅ Collaborate on separate files
- ✅ Clear structure

## 🧪 Testing Each Module

```javascript
// Test config
console.log(CONFIG.APP_NAME); // Should log app name

// Test utils
const coords = Utils.getImageCoordinates(mockEvent, mockRef);
console.log(coords); // Should log {x: ..., y: ...}

// Test HKI
const library = HKIStorage.getLibrary();
console.log(Object.keys(library)); // Should log inscription IDs

// Test recognition (once created)
const regions = Recognition.isolateGlyphs(mockImage);
console.log(regions.length); // Should log number of regions
```

## 📚 Additional Resources

- **Module Pattern**: Each file exports a single object with related functions
- **Global Namespace**: Using `window.X = X` to make modules available globally
- **Dependency Order**: Scripts load in order - dependencies must load first
- **No Build Step**: Works immediately on GitHub Pages

## 🎓 Next Steps

1. **Test what we have** - Open index.html, check console
2. **Extract recognition modules** - Start with isolation.js
3. **Work through TODO list** - One module at a time
4. **Test each module** - Ensure it works before moving on
5. **Extract React component last** - It's the biggest piece

## 🤝 Need Help?

The structure is now clear. Each module:
- Has a single responsibility
- Exports one object
- Uses CONFIG and Utils
- Can be tested independently

**You're set up for success!** The hard work of designing the structure is done. Now it's just methodical extraction.

---

**Status**: Phase 1 Complete (3/15 modules) ✅  
**Next**: Extract recognition modules (isolation, matching, preprocessing)
