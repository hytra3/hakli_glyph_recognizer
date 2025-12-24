/* PLACEHOLDER - Copy from existing repo: src/utils/helpers.js */
console.warn('⚠️ helpers.js not found - copy from existing repo');
window.Utils = {
    formatDate: (d) => new Date(d).toLocaleString(),
    formatDateForFilename: () => new Date().toISOString().slice(0,10),
    downloadBlob: (blob, filename) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    },
    createJsonBlob: (data) => new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
};
