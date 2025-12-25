// ============================================
// INSCRIPTION PANEL
// Title, translations, notes, and completion status
// ============================================

const InscriptionPanel = ({
    inscriptionTitle,
    inscriptionNotes,
    inscriptionComplete,
    translationEnglish,
    translationArabic,
    onTitleChange,
    onNotesChange,
    onCompleteChange,
    onTranslationEnglishChange,
    onTranslationArabicChange,
    isCollapsed,
    onToggleCollapse,
    className = ''
}) => {
    const { useState } = React;
    const [activeTab, setActiveTab] = useState('english');
    
    return (
        <CollapsibleSection
            title="🌍 Translation & Notes"
            isCollapsed={isCollapsed}
            onToggle={onToggleCollapse}
            badge={inscriptionComplete ? '✅' : null}
            className={`bg-[#f0f5f3] border-2 border-patina ${className}`}
            headerClassName="bg-[#e5ede9]"
        >
            <div className="space-y-4">
                {/* Inscription Title */}
                <div className="pb-4 border-b border-[#b5d4c8]">
                    <div className="flex items-center gap-2 mb-2">
                        <label className="block text-sm font-semibold text-gray-700">
                            🏷️ Inscription Title
                        </label>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                            inscriptionComplete 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-yellow-100 text-yellow-700'
                        }`}>
                            {inscriptionComplete ? '✅ Complete' : '⏳ In Progress'}
                        </span>
                    </div>
                    <input
                        type="text"
                        value={inscriptionTitle}
                        onChange={(e) => onTitleChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-patina focus:border-transparent"
                        placeholder="e.g., Salalah Temple Inscription, Site A Fragment 3..."
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        This title will be used in the filename and reports
                    </p>
                    
                    {/* Completion Checkbox */}
                    <div className="mt-3 flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="inscription-complete"
                            checked={inscriptionComplete}
                            onChange={(e) => onCompleteChange(e.target.checked)}
                            className="w-4 h-4 text-patina border-gray-300 rounded focus:ring-patina"
                        />
                        <label htmlFor="inscription-complete" className="text-sm text-gray-700">
                            Mark this inscription as complete
                        </label>
                    </div>
                </div>

                {/* Language Toggle */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveTab('english')}
                        className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            activeTab === 'english' 
                                ? 'bg-patina text-white' 
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                    >
                        English Translation
                    </button>
                    <button
                        onClick={() => setActiveTab('arabic')}
                        className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            activeTab === 'arabic' 
                                ? 'bg-patina text-white' 
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                    >
                        ترجمة عربية
                    </button>
                </div>

                {/* Translation Input */}
                {activeTab === 'english' ? (
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            English Translation:
                        </label>
                        <textarea
                            value={translationEnglish}
                            onChange={(e) => onTranslationEnglishChange(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-patina focus:border-transparent resize-none"
                            rows="4"
                            placeholder="Enter English translation here..."
                        />
                    </div>
                ) : (
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            الترجمة العربية:
                        </label>
                        <textarea
                            value={translationArabic}
                            onChange={(e) => onTranslationArabicChange(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-patina focus:border-transparent resize-none"
                            style={{ 
                                direction: 'rtl', 
                                fontFamily: '"Traditional Arabic", "Scheherazade", serif' 
                            }}
                            rows="4"
                            placeholder="أدخل الترجمة العربية هنا..."
                        />
                    </div>
                )}

                {/* Notes Field */}
                <div className="pt-4 border-t border-[#b5d4c8]">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                        📝 Inscription Notes
                    </label>
                    <textarea
                        value={inscriptionNotes}
                        onChange={(e) => onNotesChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-patina focus:border-transparent resize-none"
                        rows="3"
                        placeholder="Add any notes, observations, or context about this inscription..."
                    />
                </div>

                {/* Preview */}
                {(translationEnglish || translationArabic) && (
                    <div className="p-4 bg-white rounded-lg border-2 border-patina">
                        <div className="text-sm font-semibold text-gray-700 mb-2">Preview:</div>
                        {translationEnglish && (
                            <div className="mb-3">
                                <span className="text-xs text-gray-500 block mb-1">English:</span>
                                <div className="text-base text-gray-800">{translationEnglish}</div>
                            </div>
                        )}
                        {translationArabic && (
                            <div>
                                <span className="text-xs text-gray-500 block mb-1">Arabic:</span>
                                <div 
                                    className="text-lg text-gray-800" 
                                    style={{ 
                                        direction: 'rtl', 
                                        fontFamily: '"Traditional Arabic", "Scheherazade", serif' 
                                    }}
                                >
                                    {translationArabic}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </CollapsibleSection>
    );
};

// Make globally available
window.InscriptionPanel = InscriptionPanel;
