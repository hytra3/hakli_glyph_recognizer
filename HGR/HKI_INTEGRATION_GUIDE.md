# .HKI File System Integration Guide

## What We've Built

The `.hki` (Hakli Inscription) file format is a **self-contained package** for storing all work on an inscription:
- Original and preprocessed images
- All detected glyphs with positions, thumbnails, validation states
- Reading order, word/line/column breaks
- Translations in both English and Arabic
- Complete version history
- Metadata (location, date, stone type, notes)
- Action history

## Integration Steps

### Step 1: Add State Variables

Add these near your other state declarations (around line 82-156 of your original file):

```javascript
const [currentInscriptionId, setCurrentInscriptionId] = useState(null);
const [inscriptionLibrary, setInscriptionLibrary] = useState({});
const [showLibraryModal, setShowLibraryModal] = useState(false);

// Load inscription library on mount
useEffect(() => {
    const cache = JSON.parse(localStorage.getItem('hakliInscriptions') || '{}');
    setInscriptionLibrary(cache);
    console.log(`📚 Loaded ${Object.keys(cache).length} inscriptions from library`);
}, []);
```

### Step 2: Add Functions

Copy ALL the functions from `hki_save_load_module.js` and add them to your component, around line 400 (after your existing utility functions). This includes:

- `generateInscriptionId()`
- `saveAsHkiFile()`
- `loadHkiFile()`
- `loadHkiFromFile()`
- `deleteInscription()`

Also **replace** your existing `saveToGoogleDrive()` function with:
```javascript
const saveToGoogleDrive = () => saveAsHkiFile();
```

### Step 3: Add UI Components

Add the UI components from `hki_ui_components.jsx`:

1. **Library button** - Add near top of your interface:
   - Place after the image upload section
   - Shows inscription count

2. **Save buttons** - Update your "Export Options" section:
   - Replace "Save to Cache" button with new .hki save button
   - Add "Update" and "Edit Metadata" buttons (shown when inscription is loaded)

3. **Load .hki file input** - Add next to image upload:
   - Accepts .hki and .json files
   - Loads complete inscription state

4. **Library modal** - Add at the end of your return statement (before final `</div>`):
   - Grid of saved inscriptions
   - Thumbnails + metadata
   - Load and delete functions
   - Backup entire library

5. **Current inscription indicator** (optional) - Add at top:
   - Shows which inscription you're working on
   - Clear button to start fresh

### Step 4: Test It!

1. **Save a new inscription:**
   - Detect glyphs on an image
   - Click "💾 Save Inscription (.hki)"
   - Note the auto-generated ID (e.g., DH-2025-001)
   - File is cached locally AND downloaded

2. **Load an inscription:**
   - Click "📚 My Inscriptions"
   - Click "📂 Load" on any inscription
   - Everything restores: image, detections, translations, etc.

3. **Update an inscription:**
   - Make changes (correct glyphs, add translations, etc.)
   - Click "🔄 Update DH-2025-001"
   - Version increments, changes are tracked

4. **Add metadata:**
   - Click "📝 Edit Metadata"
   - Fill in location, date, stone type, etc.
   - Metadata is saved with the inscription

## File Structure

Example `.hki` file (DH-2025-001.hki):

```json
{
  "inscriptionId": "DH-2025-001",
  "currentVersion": 2,
  "created": "2025-11-26T10:30:00.000Z",
  "lastModified": "2025-11-26T14:45:00.000Z",
  
  "versions": [
    {
      "version": 1,
      "timestamp": "2025-11-26T10:30:00.000Z",
      "contributor": "User",
      "changes": "Initial recognition",
      "detectionCount": 15,
      "validatedCount": 0,
      "correctedCount": 0
    },
    {
      "version": 2,
      "timestamp": "2025-11-26T14:45:00.000Z",
      "contributor": "User",
      "changes": "Updated detections and translations",
      "detectionCount": 15,
      "validatedCount": 12,
      "correctedCount": 3
    }
  ],
  
  "images": {
    "original": "data:image/jpeg;base64,...",
    "preprocessed": "data:image/png;base64,...",
    "preprocessingSettings": {
      "rotation": 0,
      "useAdaptiveThreshold": true,
      "blockSize": 11,
      "constantOffset": 2,
      "gaussianBlur": 0,
      "morphologyOperation": "none",
      "invertColors": false
    }
  },
  
  "detections": [
    {
      "index": 0,
      "glyph": {
        "id": "h",
        "name": "ḥ",
        "transliteration": "ḥ",
        "arabic": "ح"
      },
      "confidence": 0.87,
      "position": { "x": 120, "y": 80, "width": 45, "height": 52 },
      "corners": null,
      "thumbnail": "data:image/png;base64,...",
      "matchType": "primary",
      "isManual": false,
      "isMerged": false,
      "isAdjusted": false,
      "corrected": false,
      "originalGlyph": null,
      "validated": {
        "isCorrect": true,
        "timestamp": "2025-11-26T11:15:00.000Z"
      }
    }
    // ... more detections
  ],
  
  "readingData": {
    "viewMode": "reading",
    "readingDirection": "rtl",
    "readingOrder": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
    "wordBoundaries": [4, 9],
    "columnBreaks": [],
    "lineBreaks": [14]
  },
  
  "translations": {
    "english": "Hakili son of Abd",
    "arabic": "حكلي بن عبد"
  },
  
  "statistics": {
    "totalGlyphs": 15,
    "uniqueGlyphs": 12,
    "words": 3,
    "lines": 2,
    "columns": 1,
    "averageConfidence": "82.3",
    "validated": {
      "correct": 12,
      "incorrect": 1,
      "unvalidated": 2
    }
  },
  
  "metadata": {
    "location": "Wadi Darbat",
    "site": "Eastern Cave Wall",
    "date_photographed": "2025-02-15",
    "stone_type": "limestone",
    "condition": "weathered but legible",
    "notes": "Found near water source, protected from direct sun"
  },
  
  "actionHistory": [
    { "type": "upload_image", "timestamp": "2025-11-26T10:28:00.000Z" },
    { "type": "recognize_glyphs", "timestamp": "2025-11-26T10:30:00.000Z" },
    { "type": "validation", "timestamp": "2025-11-26T11:15:00.000Z" },
    // ... more actions
  ]
}
```

## Key Features

### Auto-Generated IDs
- Format: `DH-YYYY-NNN` (e.g., DH-2025-001, DH-2025-002...)
- Sequential numbering per year
- Dhofar (DH) prefix

### Version Control
- Every save creates a new version entry
- Track what changed, when, and by whom
- Full history preserved

### Offline-First
- Everything cached in localStorage
- Files downloaded as backup
- No internet required

### Future-Ready
- Data structure compatible with Google Drive API
- Easy to sync across devices later
- Standard JSON format for interoperability

## Benefits

1. **Portability**: One file = complete inscription
2. **Resumable**: Load any inscription and continue working
3. **Organized**: Auto-named, searchable library
4. **Versionable**: Track changes over time
5. **Shareable**: Send .hki files to collaborators
6. **Crowdsourceable**: Ready for multi-user workflows

## Next Steps (Phase 2 - Future)

Once you're ready to scale:

1. **Google Drive API Integration**
   - OAuth backend setup
   - Auto-sync on save
   - Cross-device access

2. **Collaborative Features**
   - Multi-user editing
   - Conflict resolution
   - Comment threads

3. **Advanced Library**
   - Search by location, date, glyphs
   - Filter by validation status
   - Bulk operations

4. **Export Formats**
   - PDF reports
   - TEI XML for archival
   - Linked Open Data (LOD)

## Troubleshooting

**Q: Where are my inscriptions stored?**
A: In browser localStorage under key `hakliInscriptions`. Also downloaded as .hki files.

**Q: Can I transfer inscriptions to another computer?**
A: Yes! Download the .hki files or use "Backup Library" button, then load on new machine.

**Q: What if I lose my cached data?**
A: Always keep the downloaded .hki files! They contain everything.

**Q: Can I edit a .hki file manually?**
A: Yes, it's JSON. But be careful - invalid structure will break loading.

**Q: How do I share inscriptions with collaborators?**
A: Email or share the .hki files. They can load them in their recognizer.

## Credits

Developed by Marty Heaton for the Hakli Symbol Recognizer project.
Based on Ahmad Al-Jallad's decipherment of Dhofari script (2025).
