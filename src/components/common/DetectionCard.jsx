/**
 * DetectionCard Component (unified)
 *
 * Single source of truth for the detection card on BOTH mobile and desktop.
 * `isMobile` gates presentation only (tap-target sizes, in-flow menus vs
 * popovers, ▲▼ move buttons vs drag-to-reorder, auto-close alternatives).
 * All features are available on both platforms.
 */

const DetectionCard = ({
    // Data
    result,
    idx,
    displayIdx,
    totalCards,

    // Display settings
    viewMode,
    showArabicLabels,
    isMobile = false,

    // Collections (derived values computed internally)
    validations,
    selectedRegions,
    expandedCards,
    excludedDetections,
    wordBoundaries,
    columnBreaks,
    lineBreaks,
    glyphThumbnails,

    // Selection
    setSelectedRegions,
    lastSelectedIdx,
    setLastSelectedIdx,

    // Menu / popover state
    editMenuCardIdx,
    setEditMenuCardIdx,
    breaksMenuCardIdx,
    setBreaksMenuCardIdx,
    historyCardIdx,
    setHistoryCardIdx,

    // Drag-to-reorder (desktop)
    draggedCardIdx,
    dragOverCardIdx,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,

    // Move-to-reorder (mobile)
    onMoveCard,

    // Action handlers
    validateDetection,
    setValidations,
    deleteDetection,
    toggleExcludeDetection,
    toggleCardExpansion,
    changeGlyphAssignment,
    toggleWordBoundary,
    toggleColumnBreak,
    toggleLineBreak,
    openRegionEditor,
    openChartSelector,
    shrinkBox,
    expandBox,
    setRegionEditorIdx,
    openGlyphSelector,
    addToChart,

    // History deps
    driveUserEmail,
    changeLog,
}) => {
    const conf = Math.round(result.confidence * 100);
    const validation = validations[idx];
    const isSelected = selectedRegions.has(idx);
    const isExpanded = expandedCards.has(idx);
    const isExcluded = excludedDetections.has(idx);
    const hasAlts = result.topMatches && result.topMatches.length > 1;
    const hasBreaks = wordBoundaries.has(idx) || columnBreaks.has(idx) || lineBreaks.has(idx);

    let borderColor = 'border-gray-200';
    if (isExcluded) borderColor = 'border-gray-300';
    else if (isSelected) borderColor = 'border-ochre';
    else if (validation?.isCorrect) borderColor = 'border-patina';
    else if (validation && !validation.isCorrect) borderColor = 'border-rust';

    const historyEnabled = driveUserEmail && typeof ChangeTracker !== 'undefined';
    const hasHistory = historyEnabled && ChangeTracker.getDetectionHistory(changeLog, idx).length > 0;
    const editOpen = editMenuCardIdx === idx;
    const breaksOpen = breaksMenuCardIdx === idx;
    const dragEnabled = !isMobile && viewMode === 'reading';

    // Shared menu item lists (rendered as popovers on desktop, in-flow on mobile)
    const breakMenuItems = (
        <>
            <button onClick={(e) => { e.stopPropagation(); toggleWordBoundary(idx); }}
                className={`w-full px-3 ${isMobile ? 'py-2.5' : 'py-1.5'} text-left text-xs hover:bg-gray-100 flex items-center gap-2 ${wordBoundaries.has(idx) ? 'text-stone font-bold' : ''}`}>
                | Word {wordBoundaries.has(idx) && '✓'}
            </button>
            <button onClick={(e) => { e.stopPropagation(); toggleColumnBreak(idx); }}
                className={`w-full px-3 ${isMobile ? 'py-2.5' : 'py-1.5'} text-left text-xs hover:bg-gray-100 flex items-center gap-2 ${columnBreaks.has(idx) ? 'text-amber-700 font-bold' : ''}`}>
                ‖ Column {columnBreaks.has(idx) && '✓'}
            </button>
            <button onClick={(e) => { e.stopPropagation(); toggleLineBreak(idx); }}
                className={`w-full px-3 ${isMobile ? 'py-2.5' : 'py-1.5'} text-left text-xs hover:bg-gray-100 flex items-center gap-2 ${lineBreaks.has(idx) ? 'text-ancient-purple font-bold' : ''}`}>
                ⏎ Line {lineBreaks.has(idx) && '✓'}
            </button>
        </>
    );

    const editMenuItems = (
        <>
            <button onClick={(e) => { e.stopPropagation(); shrinkBox(idx, 3); setEditMenuCardIdx(null); }}
                className={`w-full px-3 ${isMobile ? 'py-2.5' : 'py-1.5'} text-left text-xs hover:bg-gray-100 flex items-center gap-2`}>
                ⊟ Shrink box
            </button>
            <button onClick={(e) => { e.stopPropagation(); expandBox(idx, 3); setEditMenuCardIdx(null); }}
                className={`w-full px-3 ${isMobile ? 'py-2.5' : 'py-1.5'} text-left text-xs hover:bg-gray-100 flex items-center gap-2`}>
                ⊞ Expand box
            </button>
            <button onClick={(e) => { e.stopPropagation(); setRegionEditorIdx(idx); setEditMenuCardIdx(null); }}
                className={`w-full px-3 ${isMobile ? 'py-2.5' : 'py-1.5'} text-left text-xs hover:bg-gray-100 flex items-center gap-2`}>
                🖌️ Edit region
            </button>
            {addToChart && (
                <button onClick={(e) => { e.stopPropagation(); addToChart(idx); setEditMenuCardIdx(null); }}
                    className={`w-full px-3 ${isMobile ? 'py-2.5' : 'py-1.5'} text-left text-xs hover:bg-gray-100 flex items-center gap-2`}>
                    ➕ Add as training template
                </button>
            )}
            <div className="border-t border-gray-100 my-1"></div>
            <button onClick={(e) => { e.stopPropagation(); toggleExcludeDetection(idx); setEditMenuCardIdx(null); }}
                className={`w-full px-3 ${isMobile ? 'py-2.5' : 'py-1.5'} text-left text-xs hover:bg-gray-100 flex items-center gap-2 ${isExcluded ? 'text-patina' : 'text-rust'}`}>
                {isExcluded ? '👁 Include' : '🚫 Exclude'}
            </button>
            <button onClick={(e) => { e.stopPropagation(); if (confirm('Delete this detection?')) { deleteDetection(idx); setEditMenuCardIdx(null); } }}
                className={`w-full px-3 ${isMobile ? 'py-2.5' : 'py-1.5'} text-left text-xs hover:bg-gray-100 flex items-center gap-2 text-red-600`}>
                🗑 Delete detection
            </button>
            {historyEnabled && (
                <>
                    <div className="border-t border-gray-100 my-1"></div>
                    <button onClick={(e) => { e.stopPropagation(); setHistoryCardIdx(historyCardIdx === idx ? null : idx); setEditMenuCardIdx(null); }}
                        className={`w-full px-3 ${isMobile ? 'py-2.5' : 'py-1.5'} text-left text-xs hover:bg-gray-100 flex items-center gap-2 text-gray-600`}>
                        📜 History {ChangeTracker.getDetectionHistory(changeLog, idx).length > 0 ? `(${ChangeTracker.getDetectionHistory(changeLog, idx).length})` : ''}
                    </button>
                </>
            )}
        </>
    );

    return (
        <div key={`${isMobile ? 'm' : 'd'}-card-${idx}-${result.position.x}-${result.position.y}`}
            className={`border-2 ${borderColor} rounded-lg ${isSelected ? 'bg-yellow-50' : ''} ${isExcluded ? 'opacity-50' : ''} ${dragEnabled ? 'cursor-grab' : ''} ${!isMobile && draggedCardIdx === displayIdx ? 'opacity-50' : ''} ${!isMobile && dragOverCardIdx === displayIdx ? 'border-ochre border-dashed' : ''}`}
            draggable={dragEnabled}
            onDragStart={dragEnabled ? (e) => handleDragStart(e, displayIdx) : undefined}
            onDragOver={dragEnabled ? (e) => handleDragOver(e, displayIdx) : undefined}
            onDragLeave={dragEnabled ? handleDragLeave : undefined}
            onDrop={dragEnabled ? (e) => handleDrop(e, displayIdx) : undefined}
            onDragEnd={dragEnabled ? handleDragEnd : undefined}
        >
            {/* Main card header */}
            <div className="p-2 cursor-pointer hover:bg-gray-50"
                onClick={(e) => {
                    setEditMenuCardIdx(null);
                    setBreaksMenuCardIdx(null);
                    if (e.shiftKey && lastSelectedIdx !== null) {
                        const start = Math.min(lastSelectedIdx, idx);
                        const end = Math.max(lastSelectedIdx, idx);
                        setSelectedRegions(prev => {
                            const next = new Set(prev);
                            for (let i = start; i <= end; i++) next.add(i);
                            return next;
                        });
                    } else {
                        setSelectedRegions(prev => {
                            const n = new Set(prev);
                            n.has(idx) ? n.delete(idx) : n.add(idx);
                            return n;
                        });
                        setLastSelectedIdx(idx);
                    }
                }}>
                <div className="flex gap-2">
                    {/* Thumbnails: Detected vs Chart */}
                    <div className="flex gap-1 flex-shrink-0">
                        {result.thumbnail && (
                            <div className="relative cursor-pointer group"
                                onClick={(e) => { e.stopPropagation(); openRegionEditor(idx); }}
                                title="Click to edit region">
                                <div className={`${isMobile ? 'w-12 h-12' : 'w-10 h-10'} bg-gray-100 rounded overflow-hidden border-2 transition-colors ${result.thumbnailEdited ? 'border-patina' : 'border-gray-300'} group-hover:border-blue-400`}>
                                    <img src={result.thumbnail} alt="Detected" className="w-full h-full object-contain" />
                                </div>
                                <span className={`absolute -bottom-1 left-1 right-1 h-0.5 rounded-full ${result.thumbnailEdited ? 'bg-patina' : 'bg-blue-400/70 group-hover:bg-blue-500'}`}></span>
                            </div>
                        )}
                        {glyphThumbnails[result.glyph.id] && (
                            <div className="relative cursor-pointer group"
                                onClick={(e) => { e.stopPropagation(); openChartSelector(idx); }}
                                onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); openChartSelector(idx); }}
                                title="Tap to change glyph">
                                <div className={`${isMobile ? 'w-12 h-12' : 'w-10 h-10'} bg-white rounded overflow-hidden border-2 border-ancient-purple transition-colors group-hover:border-ochre`}>
                                    <img src={glyphThumbnails[result.glyph.id]} alt="Chart" className="w-full h-full object-contain" />
                                </div>
                                <span className="absolute -bottom-1 left-1 right-1 h-0.5 rounded-full bg-ancient-purple/60 group-hover:bg-ochre"></span>
                            </div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 flex-wrap">
                            <span className="font-bold text-xs text-gray-500">#{viewMode === 'reading' ? displayIdx + 1 : idx + 1}</span>
                            <span className={`text-xs font-medium ${conf >= 70 ? 'text-patina' : conf >= 50 ? 'text-ochre' : 'text-rust'}`}>{conf}%</span>
                            {result.matchedTemplateLabel && (
                                <span className="text-[10px] bg-gray-100 px-1 rounded" title={`Matched ${result.matchedTemplate}${result.matchedTemplateIndex !== undefined ? ' #' + (result.matchedTemplateIndex + 1) : ''}`}>
                                    {result.matchedTemplateLabel}
                                </span>
                            )}
                            {isExcluded && <span className="text-xs text-gray-400">(excluded)</span>}
                            {result.isMerged && <span className="text-xs text-blue-500">🔗</span>}
                            {hasHistory && <span className="w-2 h-2 rounded-full bg-blue-400" title="Has edit history"></span>}
                            {wordBoundaries.has(idx) && <span className="text-xs font-bold text-stone px-1 bg-stone/20 rounded">|</span>}
                            {columnBreaks.has(idx) && <span className="text-xs font-bold text-amber-700 px-1 bg-stone/20 rounded">‖</span>}
                            {lineBreaks.has(idx) && <span className="text-xs font-bold text-ancient-purple px-1 bg-ancient-purple/20 rounded">⏎</span>}
                        </div>
                        {(() => {
                            const latin = result.glyph.transliteration || result.glyph.name;
                            const arabic = result.glyph.arabic;
                            const featuredIsArabic = showArabicLabels && !!arabic;
                            const featured = featuredIsArabic ? arabic : latin;
                            const complement = showArabicLabels ? latin : arabic;
                            return (
                                <>
                                    {complement && complement !== featured && (
                                        <div className="text-xs text-gray-500 leading-tight" dir={featuredIsArabic ? 'ltr' : 'rtl'}>{complement}</div>
                                    )}
                                    <div className="text-lg text-ancient-purple leading-tight truncate" dir={featuredIsArabic ? 'rtl' : 'ltr'}>{featured}</div>
                                </>
                            );
                        })()}
                    </div>
                    <div className="flex flex-col gap-1">
                        {!validation ? (
                            <>
                                <button onClick={(e) => { e.stopPropagation(); validateDetection(idx, true); }}
                                    className={`${isMobile ? 'w-7 h-7' : 'w-6 h-6'} bg-patina text-white rounded text-xs hover:bg-[#5a7d6e]`} title="Confirm — mark reviewed">✓</button>
                                <button onClick={(e) => { e.stopPropagation(); validateDetection(idx, false); }}
                                    className={`${isMobile ? 'w-7 h-7' : 'w-6 h-6'} bg-rust text-white rounded text-xs hover:bg-[#8a574a]`} title="Flag for review">✗</button>
                            </>
                        ) : (
                            <button onClick={(e) => { e.stopPropagation(); setValidations(prev => { const n = { ...prev }; delete n[idx]; return n; }); }}
                                className={`${isMobile ? 'w-7 h-7' : 'w-6 h-6'} bg-gray-400 text-white rounded text-xs hover:bg-gray-500`} title="Clear review status">↩</button>
                        )}
                    </div>
                </div>
            </div>

            {/* Secondary controls row — alts, breaks, edit, reorder (merged) */}
            <div className="px-2 pb-2 flex items-center gap-1 flex-wrap border-t border-gray-100 pt-1">
                <button onClick={(e) => { e.stopPropagation(); toggleCardExpansion(idx); }}
                    className={`px-2 py-0.5 rounded text-xs ${isExpanded ? 'bg-ancient-purple text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    title="Show alternative matches">
                    {isExpanded ? '▼' : '▶'} Alts {hasAlts ? `(${result.topMatches.length - 1})` : ''}
                </button>

                {isExcluded && (
                    <button onClick={(e) => { e.stopPropagation(); toggleExcludeDetection(idx); }}
                        className="px-2 py-0.5 rounded text-xs bg-gray-500 text-white"
                        title="Include in reading">
                        👁 Include
                    </button>
                )}

                {/* Active break badges — sit just left of the Break control */}
                {hasBreaks && (
                    <div className="flex gap-0.5 ml-auto mr-0.5">
                        {wordBoundaries.has(idx) && <span className="text-xs font-bold text-stone bg-stone/20 px-1 rounded">|</span>}
                        {columnBreaks.has(idx) && <span className="text-xs font-bold text-amber-700 bg-amber-100 px-1 rounded">‖</span>}
                        {lineBreaks.has(idx) && <span className="text-xs font-bold text-ancient-purple bg-ancient-purple/20 px-1 rounded">⏎</span>}
                    </div>
                )}

                {/* Breaks control (right cluster starts here) */}
                <div className={`relative ${hasBreaks ? '' : 'ml-auto'}`}>
                    <button onClick={(e) => { e.stopPropagation(); setBreaksMenuCardIdx(breaksOpen ? null : idx); setEditMenuCardIdx(null); }}
                        className={`px-2 py-0.5 rounded text-xs ${breaksOpen ? 'bg-stone text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        title="Add break after this glyph">
                        Break ▾
                    </button>
                    {!isMobile && breaksOpen && (
                        <>
                            {/* Click-away backdrop — closes the menu; selections stay open until then, so word+line can both be toggled */}
                            <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setBreaksMenuCardIdx(null); }} />
                            <div className="absolute left-0 bottom-full mb-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 min-w-[100px]">
                                {breakMenuItems}
                            </div>
                        </>
                    )}
                </div>

                {/* Edit control */}
                <div className="relative">
                    <button onClick={(e) => { e.stopPropagation(); setEditMenuCardIdx(editOpen ? null : idx); setBreaksMenuCardIdx(null); }}
                        className={`px-2 py-0.5 rounded text-xs ${editOpen ? 'bg-stone text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        title="Edit options">
                        ✏️ Edit
                    </button>
                    {!isMobile && editOpen && (
                        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 min-w-[140px]">
                            {editMenuItems}
                        </div>
                    )}
                </div>

                {/* Reorder: drag handle (desktop) or ▲▼ buttons (mobile), reading mode only */}
                {viewMode === 'reading' && !isMobile && (
                    <div className="px-2 py-0.5 bg-ochre/20 text-ochre text-xs rounded cursor-grab hover:bg-ochre/30 font-medium select-none"
                        title="Drag to reorder">
                        ⋮⋮ drag
                    </div>
                )}
                {viewMode === 'reading' && isMobile && onMoveCard && (
                    <div className="flex gap-0.5">
                        <button onClick={(e) => { e.stopPropagation(); if (displayIdx > 0) onMoveCard(displayIdx, displayIdx - 1); }}
                            disabled={displayIdx === 0}
                            className="px-2 py-0.5 bg-ochre/20 text-ochre text-xs rounded font-bold disabled:opacity-30"
                            title="Move up">▲</button>
                        <button onClick={(e) => { e.stopPropagation(); if (displayIdx < totalCards - 1) onMoveCard(displayIdx, displayIdx + 1); }}
                            disabled={displayIdx === totalCards - 1}
                            className="px-2 py-0.5 bg-ochre/20 text-ochre text-xs rounded font-bold disabled:opacity-30"
                            title="Move down">▼</button>
                    </div>
                )}
            </div>

            {/* Mobile: in-flow Break menu (avoids popover clipping in scroll container) */}
            {isMobile && breaksOpen && (
                <div className="px-2 pb-2 border-t border-gray-100 bg-gray-50">
                    <div className="text-xs text-gray-500 pt-1 mb-1">Break after this glyph:</div>
                    <div className="flex flex-col gap-0.5">{breakMenuItems}</div>
                </div>
            )}

            {/* Mobile: in-flow Edit menu */}
            {isMobile && editOpen && (
                <div className="px-2 pb-2 border-t border-gray-100 bg-gray-50">
                    <div className="text-xs text-gray-500 pt-1 mb-1">Edit options:</div>
                    <div className="flex flex-col gap-0.5">{editMenuItems}</div>
                </div>
            )}

            {/* Expanded: Alternative matches */}
            {isExpanded && hasAlts && (
                <div className={`px-2 pb-2 border-t border-gray-100 ${isMobile ? 'bg-amber-50' : 'bg-gray-50'}`}>
                    <div className={`text-xs mb-1 pt-1 ${isMobile ? 'text-amber-700 font-semibold' : 'text-gray-500'}`}>
                        {isMobile ? '👆 Tap to switch glyph:' : 'Alternative matches:'}
                    </div>
                    <div className={`flex flex-wrap gap-${isMobile ? '2' : '1'}`}>
                        {result.topMatches.slice(1, 6).map((alt, altIdx) => (
                            <button key={altIdx}
                                onClick={(e) => { e.stopPropagation(); changeGlyphAssignment(idx, alt.glyph); if (isMobile) toggleCardExpansion(idx); }}
                                className={`flex items-center gap-1 ${isMobile ? 'px-4 py-3 text-sm' : 'px-2 py-1'} bg-white border border-gray-200 rounded hover:border-ancient-purple hover:bg-purple-50 transition-colors active:scale-95`}
                                title={`Switch to ${alt.glyph.name} (${Math.round(alt.confidence * 100)}%)`}>
                                {glyphThumbnails[alt.glyph.id] && (
                                    <img src={glyphThumbnails[alt.glyph.id]} alt="" className={`${isMobile ? 'w-8 h-8' : 'w-5 h-5'} object-contain`} />
                                )}
                                <span className="text-xs font-medium">{alt.glyph.transliteration || alt.glyph.name}</span>
                                <span className="text-xs text-gray-400">{Math.round(alt.confidence * 100)}%</span>
                            </button>
                        ))}
                        {openGlyphSelector && (
                            <button
                                onClick={(e) => { e.stopPropagation(); openGlyphSelector(idx); toggleCardExpansion(idx); }}
                                className={`flex items-center gap-1 ${isMobile ? 'px-4 py-3 text-sm font-semibold' : 'px-2 py-1'} bg-ancient-purple text-white border border-ancient-purple rounded hover:bg-ancient-purple/80 transition-colors active:scale-95`}
                                title="Browse full glyph chart">
                                <span className="text-xs font-semibold">📊 {isMobile ? 'More...' : 'Chart'}</span>
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* History panel */}
            {historyCardIdx === idx && historyEnabled && (
                <div className="px-2 pb-2 border-t border-gray-100 bg-blue-50">
                    <div className="flex items-center justify-between pt-1 mb-1">
                        <div className="text-xs text-gray-500">📜 Edit History</div>
                        <button onClick={(e) => { e.stopPropagation(); setHistoryCardIdx(null); }}
                            className="text-xs text-gray-400 hover:text-gray-600">✕</button>
                    </div>
                    {(() => {
                        const history = ChangeTracker.getDetectionHistory(changeLog, idx);
                        if (history.length === 0) {
                            return <div className="text-xs text-gray-400 italic">No changes recorded</div>;
                        }
                        return (
                            <div className="space-y-1 max-h-24 overflow-y-auto">
                                {history.slice(0, 5).map((entry, i) => (
                                    <div key={entry.id || i} className="text-xs text-gray-600 bg-white px-2 py-1 rounded">
                                        {ChangeTracker.formatEntry(entry)}
                                    </div>
                                ))}
                                {history.length > 5 && (
                                    <div className="text-xs text-gray-400">+{history.length - 5} more</div>
                                )}
                            </div>
                        );
                    })()}
                </div>
            )}
        </div>
    );
};
