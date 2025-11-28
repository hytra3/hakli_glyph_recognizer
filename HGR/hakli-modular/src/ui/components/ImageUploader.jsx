/**
 * ImageUploader Component
 * 
 * Handles image file upload with loading state and validation
 * 
 * Props:
 * @param {Function} onFileUpload - Handler when file is selected
 * @param {boolean} isLoading - Whether image is currently loading
 * @param {boolean} disabled - Whether upload should be disabled
 */

function ImageUploader({ 
    onFileUpload,
    isLoading,
    disabled = false
}) {
    /**
     * WHY THIS COMPONENT EXISTS:
     * 
     * Before: Image upload JSX mixed with 2,500 other lines
     * After: Isolated component, easy to find and modify
     * 
     * If upload breaks? Check this 50-line file, not 6,000 lines
     */

    return (
        <div className="mb-6">
            {/* File Input */}
            <input 
                type="file" 
                accept="image/*" 
                onChange={onFileUpload}
                disabled={isLoading || disabled}
                className="block w-full text-sm text-gray-500 
                          file:mr-4 file:py-2 file:px-4 
                          file:rounded file:border-0 
                          file:text-sm file:font-semibold 
                          file:bg-blue-50 file:text-blue-700 
                          hover:file:bg-blue-100 
                          disabled:opacity-50
                          disabled:cursor-not-allowed" 
            />
            
            {/* Loading Indicator */}
            {isLoading && (
                <div className="mt-2 flex items-center gap-2 text-blue-600">
                    {/* Spinner */}
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm font-medium">Loading image...</span>
                </div>
            )}
        </div>
    );
}

/**
 * WHAT YOU LEARNED:
 * 
 * 1. PROPS INTERFACE:
 *    - Component declares exactly what it needs
 *    - onFileUpload: Parent decides what happens with file
 *    - isLoading: Parent controls loading state
 *    - disabled: Optional prop with default value
 * 
 * 2. SEPARATION OF CONCERNS:
 *    - This component: Displays UI and calls handler
 *    - Parent component: Handles the actual file processing
 *    - Clear boundary: UI vs Logic
 * 
 * 3. WHY THIS HELPS WITH JSX ERRORS:
 *    - Only 50 lines to check
 *    - Self-contained
 *    - If broken, error is HERE not in 2,500-line file
 * 
 * 4. HOW PARENT USES IT:
 *    ```jsx
 *    <ImageUploader
 *        onFileUpload={handleFileUpload}
 *        isLoading={isImageLoading}
 *        disabled={isProcessing}
 *    />
 *    ```
 * 
 * 5. EASY TO MODIFY:
 *    - Want to add drag-and-drop? Add it here
 *    - Want to show file preview? Add it here
 *    - Want to validate file size? Add it here
 *    - All changes isolated to this component
 */

// Export for use in main app
window.ImageUploaderComponent = ImageUploader;
