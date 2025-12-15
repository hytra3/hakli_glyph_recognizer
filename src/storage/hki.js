// ============================================
// HKI FILE SYSTEM
// Save/Load inscription packages
// ============================================

const HKIStorage = {
    // Generate unique inscription ID
    generateInscriptionId: () => {
        const year = new Date().getFullYear();
        const cache = JSON.parse(localStorage.getItem(CONFIG.STORAGE.INSCRIPTION_KEY) || '{}');
        const existingIds = Object.keys(cache);
        
        const yearPrefix = `${CONFIG.ID_FORMAT.PREFIX}${CONFIG.ID_FORMAT.SEPARATOR}${year}${CONFIG.ID_FORMAT.SEPARATOR}`;
        const thisYearIds = existingIds
            .filter(id => id.startsWith(yearPrefix))
            .map(id => parseInt(id.split(CONFIG.ID_FORMAT.SEPARATOR)[2]))
            .filter(n => !isNaN(n));
        
        const nextNum = thisYearIds.length > 0 ? Math.max(...thisYearIds) + 1 : 1;
        return `${yearPrefix}${String(nextNum).padStart(CONFIG.ID_FORMAT.SEQUENCE_DIGITS, '0')}`;
    },

    // Save as .hki file
    saveAsHkiFile: async (state, inscriptionId = null, updateMetadata = false) => {
        const {
            recognitionResults, validations, image, displayImage, preprocessing,
            viewMode, readingDirection, readingOrder, wordBoundaries, columnBreaks, lineBreaks,
            translationEnglish, translationArabic, actionHistory, currentInscriptionId,
            preprocessCanvasRef, preprocessedMat
        } = state;

        if (!recognitionResults || recognitionResults.length === 0) {
            alert('❌ No data to save. Please detect glyphs first.');
            return null;
        }
        
        const id = inscriptionId || currentInscriptionId || HKIStorage.generateInscriptionId();
        
        const cache = JSON.parse(localStorage.getItem(CONFIG.STORAGE.INSCRIPTION_KEY) || '{}');
        const existingFile = cache[id];
        const isUpdate = !!existingFile;
        
        let metadata = existingFile?.metadata || {
            location: '', site: '', date_photographed: '', stone_type: '', condition: '', notes: ''
        };
        
        if (updateMetadata) {
            const location = prompt('Location (e.g., Wadi Darbat):', metadata.location);
            if (location === null) return null;
            const site = prompt('Site name:', metadata.site);
            if (site === null) return null;
            const date = prompt('Date photographed (YYYY-MM-DD):', metadata.date_photographed);
            if (date === null) return null;
            const stoneType = prompt('Stone type (e.g., limestone):', metadata.stone_type);
            if (stoneType === null) return null;
            const condition = prompt('Condition (e.g., weathered, clear):', metadata.condition);
            if (condition === null) return null;
            const notes = prompt('Notes:', metadata.notes);
            if (notes === null) return null;
            
            metadata = { location, site, date_photographed: date, stone_type: stoneType, condition, notes };
        }
        
        // Capture preprocessed image if available
        let preprocessedImage = null;
        if (preprocessCanvasRef && preprocessCanvasRef.current && preprocessedMat && !preprocessedMat.isDeleted()) {
            try {
                preprocessedImage = preprocessCanvasRef.current.toDataURL('image/png');
            } catch (err) {
                console.warn('Could not capture preprocessed image:', err);
            }
        }
        
        const versionEntry = {
            version: isUpdate ? existingFile.currentVersion + 1 : 1,
            timestamp: new Date().toISOString(),
            contributor: 'User',
            changes: updateMetadata ? 'Updated metadata' : (isUpdate ? 'Updated detections and translations' : 'Initial recognition'),
            detectionCount: recognitionResults.length,
            validatedCount: Object.keys(validations).length,
            correctedCount: recognitionResults.filter(r => r.corrected).length
        };
        
        const hkiData = {
            inscriptionId: id,
            currentVersion: versionEntry.version,
            created: isUpdate ? existingFile.created : new Date().toISOString(),
            lastModified: new Date().toISOString(),
            versions: isUpdate ? [...existingFile.versions, versionEntry] : [versionEntry],
            
            images: {
                original: image,
                preprocessed: displayImage || image,
                preprocessedCanvas: preprocessedImage, // NEW: actual preprocessed canvas image
                preprocessingSettings: preprocessing
            },
            
            detections: recognitionResults.map((result, index) => ({
                index: index,
                glyph: {
                    id: result.glyph.id,
                    name: result.glyph.name,
                    transliteration: result.glyph.transliteration,
                    arabic: result.glyph.arabic || result.glyph.transliteration || result.glyph.name
                },
                confidence: result.confidence,
                position: result.position,
                corners: result.corners || null,
                thumbnail: result.thumbnail || null,
                regionIndex: result.regionIndex !== undefined ? result.regionIndex : index,
                matchType: result.matchType,
                isManual: result.isManual || false,
                isMerged: result.isMerged || false,
                isAdjusted: result.isAdjusted || false,
                corrected: result.corrected || false,
                originalGlyph: result.originalGlyph || null,
                validated: validations[index] ? {
                    isCorrect: validations[index].isCorrect,
                    timestamp: validations[index].timestamp
                } : null
            })),
            
            readingData: {
                viewMode: viewMode,
                readingDirection: readingDirection,
                readingOrder: viewMode === 'reading' ? readingOrder : null,
                wordBoundaries: Array.from(wordBoundaries),
                columnBreaks: Array.from(columnBreaks || []),
                lineBreaks: Array.from(lineBreaks || [])
            },
            
            translations: {
                english: translationEnglish || '',
                arabic: translationArabic || ''
            },
            
            statistics: {
                totalGlyphs: recognitionResults.length,
                uniqueGlyphs: new Set(recognitionResults.map(r => r.glyph.name)).size,
                words: Array.from(wordBoundaries).length + 1,
                lines: Array.from(lineBreaks || []).length + 1,
                columns: Array.from(columnBreaks || []).length + 1,
                averageConfidence: recognitionResults.length > 0 
                    ? (recognitionResults.reduce((sum, r) => sum + r.confidence, 0) / recognitionResults.length * 100).toFixed(1)
                    : 0,
                validated: {
                    correct: Object.values(validations).filter(v => v.isCorrect).length,
                    incorrect: Object.values(validations).filter(v => !v.isCorrect).length,
                    unvalidated: recognitionResults.length - Object.keys(validations).length
                }
            },
            
            metadata: metadata,
            actionHistory: actionHistory
        };
        
        const filename = `${id}.hki`;
        
        cache[id] = hkiData;
        localStorage.setItem(CONFIG.STORAGE.INSCRIPTION_KEY, JSON.stringify(cache));
        
        Utils.downloadBlob(Utils.createJsonBlob(hkiData), filename);
        
        alert(`✅ Saved successfully!\n\n📦 Inscription ID: ${id}\n📝 Version: ${versionEntry.version}\n💾 Cached locally (${Object.keys(cache).length} total)\n📥 File downloaded: ${filename}\n\n${isUpdate ? '🔄 Updated existing inscription' : '🆕 New inscription created'}`);
        
        return { id, hkiData };
    },

    // Load .hki file data
    loadHkiFile: (hkiData, setters) => {
        try {
            const {
                setCurrentInscriptionId, setImage, setDisplayImage, setPreprocessing,
                setRecognitionResults, setValidations, setViewMode, setReadingDirection,
                setReadingOrder, setWordBoundaries, setColumnBreaks, setLineBreaks,
                setTranslationEnglish, setTranslationArabic, setActionHistory,
                setShowLibraryModal
            } = setters;

            setCurrentInscriptionId(hkiData.inscriptionId);
            setImage(hkiData.images.original);
            setDisplayImage(hkiData.images.preprocessed);
            if (hkiData.images.preprocessingSettings) {
                setPreprocessing(hkiData.images.preprocessingSettings);
            }
            
            setRecognitionResults(hkiData.detections.map(d => ({
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
            })));
            
            const newValidations = {};
            hkiData.detections.forEach((d, index) => {
                if (d.validated) {
                    newValidations[index] = {
                        isCorrect: d.validated.isCorrect,
                        timestamp: d.validated.timestamp,
                        detectionData: hkiData.detections[index]
                    };
                }
            });
            setValidations(newValidations);
            
            setViewMode(hkiData.readingData.viewMode);
            setReadingDirection(hkiData.readingData.readingDirection);
            setReadingOrder(hkiData.readingData.readingOrder || []);
            setWordBoundaries(new Set(hkiData.readingData.wordBoundaries || []));
            setColumnBreaks(new Set(hkiData.readingData.columnBreaks || []));
            setLineBreaks(new Set(hkiData.readingData.lineBreaks || []));
            
            setTranslationEnglish(hkiData.translations.english || '');
            setTranslationArabic(hkiData.translations.arabic || '');
            setActionHistory(hkiData.actionHistory || []);
            
            if (setShowLibraryModal) setShowLibraryModal(false);
            
            alert(`✅ Loaded successfully!\n\n📦 Inscription: ${hkiData.inscriptionId}\n📝 Version: ${hkiData.currentVersion}\n📊 Detections: ${hkiData.detections.length}\n🗓️ Last modified: ${Utils.formatDate(hkiData.lastModified)}\n\n${hkiData.metadata.location ? `📍 Location: ${hkiData.metadata.location}` : ''}`);
            
            return true;
        } catch (error) {
            console.error('Load error:', error);
            alert(`❌ Failed to load file: ${error.message}`);
            return false;
        }
    },

    // Load from file upload
    loadHkiFromFile: (event, setters) => {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const hkiData = JSON.parse(e.target.result);
                HKIStorage.loadHkiFile(hkiData, setters);
            } catch (error) {
                alert('❌ Failed to load .hki file: ' + error.message);
            }
        };
        reader.readAsText(file);
    },

    // Delete inscription from library
    deleteInscription: (inscriptionId, currentInscriptionId, setCurrentInscriptionId, setInscriptionLibrary) => {
        if (!confirm(`⚠️ Delete ${inscriptionId}?\n\nThis will remove it from your local library. The downloaded .hki file will remain on your computer.`)) {
            return;
        }
        
        const cache = JSON.parse(localStorage.getItem(CONFIG.STORAGE.INSCRIPTION_KEY) || '{}');
        delete cache[inscriptionId];
        localStorage.setItem(CONFIG.STORAGE.INSCRIPTION_KEY, JSON.stringify(cache));
        setInscriptionLibrary(cache);
        
        if (currentInscriptionId === inscriptionId) {
            setCurrentInscriptionId(null);
        }
        
        alert(`✅ Deleted ${inscriptionId} from library`);
    },

    // Get library from storage
    getLibrary: () => {
        return JSON.parse(localStorage.getItem(CONFIG.STORAGE.INSCRIPTION_KEY) || '{}');
    }
};

// Make globally available
window.HKIStorage = HKIStorage;
