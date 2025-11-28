# 📜 Hakli Glyph Recognizer - Modular Edition

**Computer vision tool for documenting ancient Dhofari script inscriptions**

![Progress](https://img.shields.io/badge/Progress-67%25-blue)
![Modules](https://img.shields.io/badge/Modules-10%2F15-green)
![Lines](https://img.shields.io/badge/Lines-3767-lightgrey)
![License](https://img.shields.io/badge/License-MIT-yellow)

---

## 🎯 Project Status

### ✅ **Phase 1 Complete** (67%)

**10 core modules extracted and tested:**
- Core configuration & utilities
- Complete storage system (.hki, cache, corrections)
- Full recognition pipeline (isolation, matching, preprocessing, NMS)
- Multi-format export (JSON, HTML, CSV, TXT, PNG)

### ⏳ **Phase 2 In Progress** (33%)

**Remaining work:**
- Reading order & transcription modules
- Validation & editing functions
- React UI component
- CSS extraction
- Full integration

---

## 📁 Architecture

```
hakli-modular/
├── index.html (118 lines)
│   └── Loads modules in dependency order
│
├── src/
│   ├── core/
│   │   └── config.js (130 lines)
│   │       └── All constants & settings
│   │
│   ├── utils/
│   │   └── helpers.js (180 lines)
│   │       └── Common utility functions
│   │
│   ├── storage/
│   │   ├── hki.js (260 lines)
│   │   │   └── .hki inscription package system
│   │   ├── cache.js (240 lines)
│   │   │   └── localStorage management
│   │   ├── corrections.js (280 lines)
│   │   │   └── Learning from user corrections
│   │   └── export.js (340 lines)
│   │       └── Multi-format export
│   │
│   └── recognition/
│       ├── isolation.js (180 lines)
│       │   └── Glyph detection & segmentation
│       ├── matching.js (250 lines)
│       │   └── Template matching pipeline
│       ├── preprocessing.js (200 lines)
│       │   └── Image enhancement
│       └── nms.js (220 lines)
│           └── Duplicate removal & filtering
│
├── QUICKSTART.md (Quick start & testing)
├── COMPLETION_STATUS.md (Current status & examples)
└── REFACTORING_GUIDE.md (Complete technical guide)
```

**Total:** ~2,300 lines of modular, documented code

---

## 🚀 Quick Start

### 1. Clone & Open
```bash
cd hakli-modular
python3 -m http.server 8000
# Open http://localhost:8000
```

### 2. Test in Console (F12)
```javascript
// Check modules
console.log('Modules loaded:', {
    config: typeof CONFIG !== 'undefined',
    utils: typeof Utils !== 'undefined',
    hki: typeof HKIStorage !== 'undefined',
    cache: typeof CacheStorage !== 'undefined'
});

// Generate inscription ID
const id = HKIStorage.generateInscriptionId();
console.log('Generated ID:', id); // "DH-2025-001"

// Test storage
CacheStorage.saveToCache({ test: 'data' }, 'test_key');
const loaded = CacheStorage.loadFromCache('test_key');
console.log('Cache works:', loaded.test === 'data');

// Test corrections
CorrectionMemory.saveCorrection('h', 'kh', 0.75);
const suggestion = CorrectionMemory.getSuggestion('h');
console.log('Suggestion:', suggestion.correctedGlyph);
```

**See:** `QUICKSTART.md` for full testing guide

---

## 💡 Module Overview

### **Core** - Foundation
- `config.js` - All configuration & constants
- `helpers.js` - Utility functions (coordinates, IoU, dates, etc.)

### **Storage** - Data Management
- `hki.js` - Complete .hki file system with version control
- `cache.js` - localStorage with quota management
- `corrections.js` - Learn from user corrections
- `export.js` - Export to JSON/HTML/CSV/TXT/PNG

### **Recognition** - Computer Vision
- `isolation.js` - Detect & segment glyphs using OpenCV
- `matching.js` - Multi-scale/rotation template matching
- `preprocessing.js` - Image enhancement pipeline
- `nms.js` - Remove duplicates & filter results

---

## 📚 Usage Examples

### Storage System
```javascript
// Generate sequential IDs
const id1 = HKIStorage.generateInscriptionId(); // "DH-2025-001"
const id2 = HKIStorage.generateInscriptionId(); // "DH-2025-002"

// Save complete inscription
await HKIStorage.saveAsHkiFile(state, id, updateMetadata);
// ✅ Saves to localStorage
// ✅ Downloads .hki file
// ✅ Tracks version history

// Load inscription
HKIStorage.loadHkiFile(hkiData, {
    setImage, setRecognitionResults, setValidations,
    // ... all your state setters
});
```

### Recognition Pipeline
```javascript
// Preprocess image
const settings = Preprocessing.getDefaultSettings();
const processed = Preprocessing.processImageWithSettings(mat, settings);

// Isolate glyphs
const regions = Isolation.isolateGlyphs(processed);
const filtered = Isolation.filterOverlappingRegions(regions, 0.3);

// Match templates
const detections = [];
for (const region of filtered) {
    const match = await Matching.matchAllTemplates(regionMat, glyph);
    if (match.confidence >= 0.30) {
        detections.push({ glyph, confidence: match.confidence, position: region.bounds });
    }
}

// Remove duplicates
const final = NMS.applyNMS(detections, 0.3);

// Apply learning
const enhanced = CorrectionMemory.applyLearning(final);
```

### Export System
```javascript
// Export transcription
ExportUtils.exportTranscription(state);
// Downloads: DH-2025-001-transcription.txt

// Export detection data
ExportUtils.exportDetectionData(state);
// Downloads: DH-2025-001-data.json

// Export HTML report
ExportUtils.exportHtmlReport(state);
// Downloads: DH-2025-001-report.html

// Export annotated image
ExportUtils.exportAnnotatedImage(state, imageElement);
// Downloads: DH-2025-001-annotated.png
```

### Correction Learning
```javascript
// Save corrections
CorrectionMemory.saveCorrection('h', 'kh', 0.75);
CorrectionMemory.saveCorrection('h', 'kh', 0.82);

// Get suggestions
const suggestion = CorrectionMemory.getSuggestion('h');
// Returns: { correctedGlyph: 'kh', frequency: 2, score: ... }

// View statistics
CorrectionMemory.showStatistics();
// Logs: Total corrections, most frequent patterns, recent corrections

// Export/import
CorrectionMemory.exportCorrections();
CorrectionMemory.importCorrections(data, merge);
```

---

## 🎯 Benefits

### Before (Monolithic)
- ❌ 4000+ lines in one file
- ❌ Hard to debug
- ❌ Can't test parts independently
- ❌ Scary to modify
- ❌ Merge conflicts

### After (Modular)
- ✅ ~150-300 lines per module
- ✅ Easy to locate bugs
- ✅ Test modules independently
- ✅ Clear dependencies
- ✅ Collaborate on separate files
- ✅ Scale cleanly

---

## 🔬 Testing

Each module includes:
- ✅ Comprehensive documentation
- ✅ Usage examples
- ✅ Error handling
- ✅ Console logging
- ✅ Type checking (via JSDoc)

**Test individual modules:**
```javascript
// Config
console.assert(CONFIG.APP_NAME === 'Hakli Glyph Recognizer');

// Utils
const coords = Utils.getImageCoordinates(event, ref);
console.assert(coords.x >= 0 && coords.y >= 0);

// HKI
const id = HKIStorage.generateInscriptionId();
console.assert(/^DH-\d{4}-\d{3}$/.test(id));

// Cache
CacheStorage.saveToCache({ test: true }, 'key');
const data = CacheStorage.loadFromCache('key');
console.assert(data.test === true);
```

---

## 📖 Documentation

- **QUICKSTART.md** - Get started in 5 minutes
- **COMPLETION_STATUS.md** - Current status, examples, roadmap
- **REFACTORING_GUIDE.md** - Complete technical guide
- **Individual modules** - Inline JSDoc documentation

---

## 🛣️ Roadmap

### ✅ Phase 1: Core Modules (COMPLETE)
- [x] Configuration system
- [x] Utility functions
- [x] Storage system (.hki, cache, corrections)
- [x] Recognition pipeline
- [x] Export utilities

### ⏳ Phase 2: Remaining Modules (IN PROGRESS)
- [ ] Reading order management
- [ ] Transcription generation
- [ ] Validation & editing functions
- [ ] UI components (React)
- [ ] CSS extraction

### 🔮 Phase 3: Integration & Polish
- [ ] Full end-to-end testing
- [ ] Performance optimization
- [ ] Error handling improvements
- [ ] Deploy to GitHub Pages

### 🚀 Phase 4: Advanced Features
- [ ] Real-time collaboration
- [ ] Cloud sync (Google Drive)
- [ ] Mobile-friendly interface
- [ ] Community contributions

---

## 🤝 Contributing

The modular structure makes contributions easy:

1. **Pick a module** - Work on one file at a time
2. **Follow the pattern** - Use existing modules as templates
3. **Test independently** - Each module can be tested alone
4. **Document thoroughly** - Add JSDoc comments
5. **Submit PR** - Clear, focused changes

---

## 📊 Project Stats

- **Total Lines:** 3,767
- **Modules:** 10 / 15 (67%)
- **Functions:** ~80+
- **Documentation:** Comprehensive
- **Test Coverage:** Manual (console-based)
- **Dependencies:** OpenCV.js, React, Tailwind CSS

---

## 🎓 For Researchers

This tool is designed for:
- **Field Documentation** - Quick capture in remote locations
- **Offline Work** - No internet required
- **Version Control** - Track changes over time
- **Collaboration** - Share .hki files with colleagues
- **Data Export** - Multiple formats for analysis

**Perfect for February 2026 fieldwork in Salalah, Oman!**

---

## 🏆 Credits

**Author:** Marty Heaton (©marty heaton)  
**Project:** Hakli Glyph Recognizer  
**Purpose:** Documenting endangered Dhofari script  
**Language:** Jibbali/Hakli (Semitic, Modern South Arabian)  
**Location:** Dhofar, Oman

Based on Al-Jallad's decipherment of ancient Dhofari script.

---

## 📞 Contact

- **GitHub:** [github.com/hytra3/hakli_glyph_recognizer](https://github.com/hytra3/hakli_glyph_recognizer)
- **Documentation:** See `QUICKSTART.md` for immediate help
- **Issues:** Use GitHub Issues for bugs/features
- **Questions:** Check `COMPLETION_STATUS.md` for examples

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🎉 Get Started

```bash
# 1. Clone
git clone https://github.com/hytra3/hakli_glyph_recognizer.git
cd hakli_glyph_recognizer/hakli-modular

# 2. Open
python3 -m http.server 8000

# 3. Test
# Open http://localhost:8000
# Press F12 for console
# Run tests from QUICKSTART.md
```

**Ready to document ancient inscriptions!** 📜🔍

---

**Last Updated:** November 26, 2025  
**Version:** Modular v1.0 (67% complete)  
**Status:** Production-ready core, UI in progress
