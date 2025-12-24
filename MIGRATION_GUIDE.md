# Hakli Glyph Recognizer - Modular Architecture Migration Guide

## Overview

This guide explains how to migrate from the monolithic `index.html` (9,500+ lines) to a clean, modular architecture that's easier to maintain, test, and extend.

## Architecture Comparison

### Before (Monolithic)
```
index.html (9,584 lines)
├── 75+ useState hooks in one component
├── 119+ function definitions
├── All UI in a single HakliGlyphRecognizer function
└── Difficult to maintain and causes compaction errors
```

### After (Modular)
```
hakli-refactored/
├── index.html                    (~400 lines - just structure + mounting)
├── src/
│   ├── core/
│   │   ├── config.js            (existing - app constants)
│   │   └── state.js             (NEW - centralized state management)
│   ├── hooks/
│   │   ├── useAppState.js       (NEW - state hook with actions)
│   │   ├── useHistory.js        (NEW - undo/redo logic)
│   │   ├── useRecognition.js    (NEW - detection workflow)
│   │   └── useChartLoader.js    (NEW - glyph chart loading)
│   ├── components/
│   │   ├── common/
│   │   │   └── CommonComponents.jsx  (CollapsibleSection, Modal, Button, etc.)
│   │   ├── detection/
│   │   │   ├── DetectionComponents.jsx (DetectionBox, DetectionCard, DetectionList)
│   │   │   └── ImageCanvas.jsx        (Main image display with overlays)
│   │   ├── panels/
│   │   │   ├── PreprocessingPanel.jsx
│   │   │   ├── TranscriptionPanel.jsx
│   │   │   └── ExportPanel.jsx
│   │   └── modals/
│   │       ├── GlyphEditorModal.jsx
│   │       └── ChartViewerModal.jsx
│   ├── storage/                  (existing modules)
│   ├── recognition/              (existing modules)
│   ├── reading/                  (existing modules)
│   └── utils/                    (existing modules)
```

## Key Changes

### 1. State Management

**Before:** 75+ individual `useState` calls
```javascript
const [image, setImage] = useState(null);
const [displayImage, setDisplayImage] = useState(null);
const [recognitionResults, setRecognitionResults] = useState([]);
// ... 72 more ...
```

**After:** Centralized state with `useReducer`
```javascript
// In your component:
const appState = useAppState();
const { state, setImage, setRecognitionResults, ... } = appState;

// Access state:
state.image.original       // instead of image
state.recognition.results  // instead of recognitionResults
state.reading.direction    // instead of readingDirection
```

**State Structure:**
```javascript
{
  image: { original, display, rotation, isLoading },
  preprocessing: { rotation, useAdaptiveThreshold, blockSize, ... },
  chart: { data, loadStatus, loadedImages, thumbnails },
  recognition: { results, validations, isProcessing, progress },
  reading: { viewMode, direction, order, wordBoundaries, lineBreaks },
  translation: { english, arabic },
  interaction: { selectedRegions, correctionMode, trimMode, ... },
  ui: { collapsed: {...}, modals: {...}, dismissedTips },
  inscription: { currentId, title, complete, metadata },
  cloud: { driveAuthStatus, customGistUrl }
}
```

### 2. Hooks Organization

| Hook | Purpose | Key Functions |
|------|---------|---------------|
| `useAppState` | Central state management | All setters + computed values |
| `useHistory` | Undo/redo | `takeSnapshot()`, `undo()`, `redo()` |
| `useRecognition` | Detection workflow | `recognizeGlyphs()`, `validateDetection()`, `correctDetection()` |
| `useChartLoader` | Glyph chart | `loadDefaultChart()`, `addGlyph()`, `searchGlyphs()` |

### 3. Component Extraction

**Panels** (sidebar controls):
- `PreprocessingPanel` - Image preprocessing controls
- `TranscriptionPanel` - Reading order and transcription display
- `ExportPanel` - Export options

**Detection Components:**
- `DetectionBox` - Overlay box on image
- `DetectionCard` - Card in sidebar list
- `DetectionList` - Grid/list of detection cards
- `ImageCanvas` - Main image display with all overlays

**Modals:**
- `GlyphEditorModal` - Add/edit glyphs
- `ChartViewerModal` - Browse glyph chart

**Common:**
- `CollapsibleSection` - Expandable section wrapper
- `DismissableTip` - Tips that can be permanently dismissed
- `Modal` - Base modal component
- `Button` - Styled button
- `ProgressBar` - Progress indicator
- `ConfidenceBadge` - Shows confidence with color coding

## Migration Steps

### Step 1: Copy New Files

Copy the entire `hakli-refactored/src/` directory to your project, alongside your existing `src/` files.

### Step 2: Update Script Loading

In your `index.html`, add the new scripts after the existing backend modules:

```html
<!-- Existing backend modules -->
<script src="src/core/config.js"></script>
<script src="src/utils/helpers.js"></script>
<!-- ... other existing modules ... -->

<!-- NEW: State Management -->
<script src="src/core/state.js"></script>

<!-- NEW: React Hooks (use text/babel for JSX) -->
<script type="text/babel" src="src/hooks/useAppState.js"></script>
<script type="text/babel" src="src/hooks/useHistory.js"></script>
<script type="text/babel" src="src/hooks/useRecognition.js"></script>
<script type="text/babel" src="src/hooks/useChartLoader.js"></script>

<!-- NEW: React Components -->
<script type="text/babel" src="src/components/common/CommonComponents.jsx"></script>
<script type="text/babel" src="src/components/detection/DetectionComponents.jsx"></script>
<script type="text/babel" src="src/components/detection/ImageCanvas.jsx"></script>
<script type="text/babel" src="src/components/panels/PreprocessingPanel.jsx"></script>
<script type="text/babel" src="src/components/panels/TranscriptionPanel.jsx"></script>
<script type="text/babel" src="src/components/panels/ExportPanel.jsx"></script>
<script type="text/babel" src="src/components/modals/GlyphEditorModal.jsx"></script>
<script type="text/babel" src="src/components/modals/ChartViewerModal.jsx"></script>
```

### Step 3: Migrate Incrementally

You don't have to migrate everything at once. Start with:

1. **Replace state management first**
   - Use `useAppState()` hook
   - Keep existing functions, just change how they access state

2. **Extract components one at a time**
   - Start with modals (they're already somewhat isolated)
   - Then panels
   - Finally the main canvas

3. **Test each change**
   - Verify functionality before moving to next component

### Step 4: Example Migration

**Before (in monolithic index.html):**
```javascript
const [isPreprocessingCollapsed, setIsPreprocessingCollapsed] = useState(false);
const [preprocessing, setPreprocessing] = useState({
    rotation: 0,
    useAdaptiveThreshold: false,
    // ...
});

// In JSX:
<div className="...">
    <button onClick={() => setIsPreprocessingCollapsed(!isPreprocessingCollapsed)}>
        Preprocessing
    </button>
    {!isPreprocessingCollapsed && (
        <div>
            <input 
                type="range" 
                value={preprocessing.rotation}
                onChange={e => setPreprocessing({...preprocessing, rotation: e.target.value})}
            />
            {/* ... lots more JSX ... */}
        </div>
    )}
</div>
```

**After (using new components):**
```javascript
const appState = useAppState();
const { state, updatePreprocessing, togglePanel } = appState;

// In JSX:
<PreprocessingPanel
    preprocessing={state.preprocessing}
    onUpdate={updatePreprocessing}
    isCollapsed={state.ui.collapsed.preprocessing}
    onToggleCollapse={() => togglePanel('preprocessing')}
    // ... other props
/>
```

## Testing the Migration

### Quick Test
1. Open the new `index.html` in a browser
2. Check the console for any errors
3. Verify module loading messages appear
4. Test core workflows:
   - Upload an image
   - Run recognition
   - Validate detections
   - Switch between detection/reading modes
   - Export data

### Full Test Checklist
- [ ] Image upload and display
- [ ] Preprocessing controls
- [ ] Glyph recognition runs
- [ ] Detection boxes appear correctly
- [ ] Click to select detections
- [ ] Validate correct/incorrect
- [ ] Correction mode works
- [ ] Manual detection mode works
- [ ] Reading order detection
- [ ] Word/line boundaries
- [ ] Transcription display
- [ ] All export formats work
- [ ] HKI save/load works
- [ ] Google Drive sync works
- [ ] Undo/redo works
- [ ] Glyph chart viewer
- [ ] Add/edit glyphs

## Benefits of New Architecture

1. **Maintainability**
   - Each file has a single responsibility
   - Easy to find and fix bugs
   - Clear dependencies

2. **Testability**
   - Hooks can be tested in isolation
   - Components can be tested with mock props

3. **Performance**
   - Smaller re-renders (components only update when their props change)
   - Better code splitting potential

4. **Collaboration**
   - Multiple people can work on different components
   - Less merge conflicts

5. **No More Compaction Errors**
   - Smaller files = no context window issues

## Future Improvements

Once this migration is complete, consider:

1. **Build Tool Integration**
   ```bash
   npm create vite@latest hakli-app -- --template react
   ```
   This would give you:
   - Hot module replacement
   - Production builds
   - TypeScript support (optional)
   - Better error messages

2. **TypeScript**
   - Add type safety
   - Better IDE support
   - Self-documenting code

3. **Testing Framework**
   - Jest for unit tests
   - React Testing Library for components
   - Playwright for E2E tests

4. **State Management Upgrade**
   - Consider Zustand or Jotai for simpler API
   - Or Redux Toolkit if you need more features

## File Reference

| File | Lines | Purpose |
|------|-------|---------|
| `state.js` | ~500 | State types, reducer, initial state |
| `useAppState.js` | ~250 | State hook with all setters |
| `useHistory.js` | ~180 | Undo/redo functionality |
| `useRecognition.js` | ~350 | Recognition workflow |
| `useChartLoader.js` | ~280 | Chart loading and CRUD |
| `CommonComponents.jsx` | ~280 | Shared UI components |
| `DetectionComponents.jsx` | ~350 | Detection display components |
| `ImageCanvas.jsx` | ~280 | Main image canvas |
| `PreprocessingPanel.jsx` | ~300 | Preprocessing controls |
| `TranscriptionPanel.jsx` | ~250 | Transcription display |
| `ExportPanel.jsx` | ~300 | Export options |
| `GlyphEditorModal.jsx` | ~280 | Glyph editor |
| `ChartViewerModal.jsx` | ~350 | Chart browser |
| **Total** | ~3,950 | vs 9,584 in monolithic |

## Questions?

If you run into issues during migration:

1. Check the browser console for errors
2. Verify all script files are loading (check Network tab)
3. Make sure script loading order is correct
4. Ensure React and Babel are loaded before your components

Good luck with the migration! The modular architecture will make your Oman fieldwork much smoother. 🏜️📜
