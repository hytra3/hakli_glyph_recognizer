# Hakli Glyph Recognizer - PWA Implementation

## Files Created

### 1. manifest.json
- PWA manifest file with app metadata
- Defines name, icons, colors, display mode
- Located in root directory

### 2. sw.js (Service Worker)
- Handles offline caching
- Cache-first strategy for core assets
- Network-first for Google APIs (Drive sync still works online)
- Automatic cache cleanup on updates

### 3. Icon Files Needed
You need to create these PNG icons from favicon.svg:
- `icon-192.png` - 192x192 pixels
- `icon-512.png` - 512x512 pixels

**How to create icons:**
1. Open favicon.svg in an image editor (GIMP, Photoshop, Inkscape)
2. Export as PNG at 192x192 and 512x512
3. Save as icon-192.png and icon-512.png in the same directory

**Quick online tool:** https://realfavicongenerator.net/

## What PWA Provides

### Offline Functionality
- ✅ App works without internet
- ✅ Core files cached automatically
- ✅ Glyph chart cached
- ✅ OpenCV.js cached
- ✅ Recognition works offline
- ⚠️ Cloud sync requires internet (as expected)

### Install on Device
- ✅ "Add to Home Screen" on mobile
- ✅ Standalone app window
- ✅ No browser UI
- ✅ App icon on home screen
- ✅ Splash screen

### Performance
- ✅ Instant loading from cache
- ✅ Background updates
- ✅ Optimized for mobile

## Testing Instructions

### On Desktop (Chrome/Edge)
1. Open DevTools (F12)
2. Go to Application tab → Service Workers
3. Check "Service Worker registered" ✅
4. Go to Manifest tab → Verify manifest.json loads
5. Click install icon in address bar (⊕ or install prompt)

### On Pixel 9a (Chrome)
1. Open https://hytra3.github.io/hakli_glyph_recognizer/
2. Wait for page to load completely
3. Menu → "Add to Home screen" or "Install app"
4. Confirm installation
5. App icon appears on home screen
6. Launch from home screen → Opens in standalone mode

### Test Offline Mode
1. Open app in Chrome
2. DevTools → Network tab → Check "Offline"
3. Reload page → Should still work! ✅
4. Try recognition → Should work! ✅
5. Try cloud sync → Shows network error (expected)

## Caching Strategy

### Cached on Install (Immediate)
- index.html
- favicon.svg
- Hakli_glyphs.JSON
- opencv.js

### Cached on First Use (Runtime)
- Glyph template images
- React/Babel libraries
- Tailwind CSS
- User-uploaded images (temporarily)

### Never Cached (Always Network)
- Google Drive API calls
- Google Authentication
- Any googleapis.com requests

## Version Updates

When you push a new version:
1. Update version in sw.js: `CACHE_NAME = 'hakli-v251204'`
2. Service worker auto-updates on next visit
3. Users get new version automatically

## Troubleshooting

### Service Worker not registering?
- Check browser console for errors
- Verify sw.js is in root directory
- Check paths in manifest.json match your GitHub Pages structure

### Icons not showing?
- Create icon-192.png and icon-512.png
- Or remove icon references from manifest.json temporarily

### App not installing on mobile?
- Wait 30 seconds after first page load
- Check if browser shows install prompt
- Try Menu → "Install app" manually

### Offline mode not working?
- Check Service Worker is active (DevTools → Application)
- Verify cache contains files (Application → Cache Storage)
- Hard refresh (Ctrl+Shift+R) and try again

## Field Deployment Checklist

Before January 2026 Salalah trip:

- [ ] Create PNG icons (192×192 and 512×512)
- [ ] Deploy all 3 files to GitHub Pages (index.html, manifest.json, sw.js)
- [ ] Test install on Pixel 9a
- [ ] Test offline recognition works
- [ ] Test image upload works offline
- [ ] Verify glyph chart loads offline
- [ ] Check preprocessing works offline
- [ ] Confirm exports work offline (JSON, HTML, etc.)
- [ ] Test cloud sync works when back online

## Benefits for Fieldwork

1. **No Internet Required** - Works in remote Salalah caves
2. **Fast Loading** - Instant startup from cache
3. **Battery Efficient** - No constant network requests
4. **Reliable** - No dependence on spotty mobile data
5. **Professional** - Proper app experience on phone
6. **Data Safety** - All processing happens locally

Your inscription data never leaves your device unless you explicitly sync to Google Drive!

## Next Steps

1. Push these files to GitHub
2. Create icon PNG files
3. Test on Pixel 9a
4. Verify offline functionality
5. Pack for Salalah! 🚀
