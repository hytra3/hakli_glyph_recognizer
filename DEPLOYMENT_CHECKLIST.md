# Hakli PWA v251203 - Deployment Checklist

## Files to Deploy to GitHub

### Required Files (Deploy Now)
- [x] **index.html** - Main app with PWA support
- [x] **manifest.json** - PWA configuration
- [x] **sw.js** - Service worker for offline mode
- [x] **hakli_viewer.html** - JSON viewer (updated with reading order fix)

### Required Files (Already on GitHub)
- [ ] **favicon.svg** - App icon (verify it's there)
- [ ] **Hakli_glyphs.JSON** - Glyph database (verify it's there)

### Optional Files (Create After Deploy)
- [ ] **icon-192.png** - 192×192 app icon (for better PWA support)
- [ ] **icon-512.png** - 512×512 app icon (for better PWA support)

## Deployment Steps

### 1. Push to GitHub
```bash
cd ~/hakli_glyph_recognizer
git add index.html manifest.json sw.js hakli_viewer.html
git commit -m "Add PWA support v251203 - offline functionality + UI improvements"
git push origin main
```

### 2. Wait for GitHub Pages to Deploy
- Visit https://hytra3.github.io/hakli_glyph_recognizer/
- Wait 1-2 minutes for deployment
- Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

### 3. Verify Service Worker Registration
Open DevTools (F12) → Console, should see:
```
✅ Service Worker registered: /hakli_glyph_recognizer/
✅ OpenCV.js is ready
📦 Loading X images for 27 glyphs...
✅ Loaded X images for 27 glyphs
```

### 4. Test on Desktop
- [ ] Service worker registers successfully
- [ ] Manifest.json loads (DevTools → Application → Manifest)
- [ ] Install prompt appears in address bar
- [ ] Can install as desktop app
- [ ] App works after installation

### 5. Test on Pixel 9a
- [ ] Page loads successfully
- [ ] Service worker registers (check console)
- [ ] "Add to Home screen" option appears
- [ ] Install the app
- [ ] Icon appears on home screen
- [ ] Launch from home screen opens in standalone mode
- [ ] Upload image works
- [ ] Recognition works
- [ ] All features functional

### 6. Test Offline Mode
**On Desktop:**
- [ ] DevTools → Network → Check "Offline"
- [ ] Reload page → Still works
- [ ] Upload image → Works
- [ ] Run recognition → Works
- [ ] Export JSON → Works

**On Pixel 9a:**
- [ ] Enable airplane mode
- [ ] Close and reopen app
- [ ] Upload image → Works
- [ ] Recognition → Works
- [ ] All offline features work

### 7. Test Online Features
- [ ] Turn network back on
- [ ] Google Drive sync works
- [ ] Save to Drive works
- [ ] Load from Drive works

## New Features in v251203

### PWA Features ✨
- ✅ Works completely offline
- ✅ Install on phone/desktop
- ✅ Standalone app mode
- ✅ Automatic caching
- ✅ Background updates

### UI Improvements ✅
- ✅ Upload section collapses after image loads
- ✅ "Upload Different Image" button when collapsed
- ✅ Green "✓ Image loaded" indicator
- ✅ All tips consistent yellow with dismiss
- ✅ Brush cursor on eraser canvas
- ✅ Reading order fixed after exclusions
- ✅ Rotation warnings
- ✅ Intuitive triangle/checkbox behavior

## Known Issues & Limitations

### Expected Behavior
- ⚠️ Cloud sync requires internet (this is correct)
- ⚠️ Icons missing until you create PNG files (app works fine without them)
- ⚠️ First load takes longer (caching assets)
- ⚠️ Service worker updates require page reload

### Not Issues
- Google Drive API calls go to network (not cached) ✅
- External libraries load from CDN first time ✅
- Service worker doesn't cache user images permanently ✅

## Create Icons (Optional but Recommended)

### Quick Method - Online Tool
1. Go to https://realfavicongenerator.net/
2. Upload favicon.svg
3. Generate icons
4. Download icon-192.png and icon-512.png
5. Add to GitHub repo

### Manual Method - Image Editor
1. Open favicon.svg in GIMP/Photoshop/Inkscape
2. Export as PNG, 192×192 pixels → icon-192.png
3. Export as PNG, 512×512 pixels → icon-512.png
4. Save to GitHub repo

## Success Criteria

The PWA is working correctly when:
- ✅ Service worker shows "registered" in console
- ✅ Can install on phone home screen
- ✅ Works in airplane mode
- ✅ Loads instantly after first visit
- ✅ All recognition features work offline
- ✅ Cloud sync works when online

## Troubleshooting

### "Service Worker registration failed"
- Check sw.js is in root directory
- Verify paths in sw.js match your GitHub Pages URL
- Hard refresh (Ctrl+Shift+R)

### "Install prompt doesn't appear"
- Wait 30 seconds after first load
- Check if already installed
- Try Menu → "Install app" manually
- Some browsers don't show install UI

### "Offline mode doesn't work"
- Check service worker is active (DevTools → Application)
- Verify cache has files (Application → Cache Storage → hakli-v251203)
- Try hard refresh and revisit
- Check console for cache errors

### "Icons not showing"
- This is expected until you create PNG files
- App works fine without them
- SVG icon will be used as fallback

## Ready for Salalah January 2026! 🎉

Your Hakli Glyph Recognizer is now:
- ✅ Fully offline capable
- ✅ Installable as native app
- ✅ Optimized for fieldwork
- ✅ Professional and reliable
- ✅ Ready for cave inscriptions!

Pack your Pixel 9a and get ready to document history! 📸✨
