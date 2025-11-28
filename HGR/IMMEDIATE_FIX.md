# 🔧 IMMEDIATE FIX - Step by Step

## What Happened

You pushed `index.html` but not the `src/` directory with all the modules. That's why you're getting 404 errors.

## Quick Fix (5 minutes)

### Step 1: Navigate to your repo
```bash
cd ~/path/to/hakli_glyph_recognizer
```

### Step 2: Download the modular files
You have them in `/mnt/user-data/outputs/hakli-modular.tar.gz`

### Step 3: Create directory structure
```bash
mkdir -p src/core
mkdir -p src/utils  
mkdir -p src/storage
mkdir -p src/recognition
```

### Step 4: Copy the 10 module files

**From the modular folder, copy these files:**

```bash
# Core
cp /path/to/hakli-modular/src/core/config.js src/core/

# Utils
cp /path/to/hakli-modular/src/utils/helpers.js src/utils/

# Storage (4 files)
cp /path/to/hakli-modular/src/storage/hki.js src/storage/
cp /path/to/hakli-modular/src/storage/cache.js src/storage/
cp /path/to/hakli-modular/src/storage/corrections.js src/storage/
cp /path/to/hakli-modular/src/storage/export.js src/storage/

# Recognition (4 files)
cp /path/to/hakli-modular/src/recognition/isolation.js src/recognition/
cp /path/to/hakli-modular/src/recognition/matching.js src/recognition/
cp /path/to/hakli-modular/src/recognition/preprocessing.js src/recognition/
cp /path/to/hakli-modular/src/recognition/nms.js src/recognition/
```

### Step 5: Update index.html

Replace your current index.html with the modular one:
```bash
cp /path/to/hakli-modular/index.html .
```

Or manually update the script tags in your existing index.html to load the modules.

### Step 6: Add to git
```bash
git add src/
git add index.html
```

### Step 7: Check what will be committed
```bash
git status
```

You should see:
```
Changes to be committed:
  new file:   src/core/config.js
  new file:   src/utils/helpers.js
  new file:   src/storage/hki.js
  new file:   src/storage/cache.js
  new file:   src/storage/corrections.js
  new file:   src/storage/export.js
  new file:   src/recognition/isolation.js
  new file:   src/recognition/matching.js
  new file:   src/recognition/preprocessing.js
  new file:   src/recognition/nms.js
  modified:   index.html
```

### Step 8: Commit
```bash
git commit -m "Add modular architecture - 10 core modules"
```

### Step 9: Push
```bash
git push origin main
```

### Step 10: Wait & Test
1. Wait 1-2 minutes for GitHub Pages to rebuild
2. Hard refresh your page: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
3. Open console (F12)
4. You should see: ✅ "Modules loaded: {config: true, utils: true, hki: true, recognition: true}"

## Alternative: Test Locally First

Before pushing to GitHub, test locally:

```bash
cd ~/path/to/hakli_glyph_recognizer
python3 -m http.server 8000
```

Then open: http://localhost:8000

You should see:
- ✅ No 404 errors
- ✅ All modules loaded
- ✅ Can run tests in console

## Files Checklist

Make sure these files exist in your repo:

```
✅ index.html
✅ src/core/config.js
✅ src/utils/helpers.js
✅ src/storage/hki.js
✅ src/storage/cache.js
✅ src/storage/corrections.js
✅ src/storage/export.js
✅ src/recognition/isolation.js
✅ src/recognition/matching.js
✅ src/recognition/preprocessing.js
✅ src/recognition/nms.js
```

## Verify on GitHub

After pushing, check these URLs:

```
https://github.com/hytra3/hakli_glyph_recognizer/blob/main/index.html
https://github.com/hytra3/hakli_glyph_recognizer/blob/main/src/core/config.js
https://github.com/hytra3/hakli_glyph_recognizer/blob/main/src/utils/helpers.js
```

They should all show the file contents (not 404).

## Test the Live Site

After pushing and waiting for GitHub Pages to rebuild:

1. Go to: https://hytra3.github.io/hakli_glyph_recognizer/
2. Open console (F12)
3. Run:
```javascript
// Check all modules
console.log('Modules:', {
    config: typeof CONFIG !== 'undefined',
    utils: typeof Utils !== 'undefined',
    hki: typeof HKIStorage !== 'undefined',
    cache: typeof CacheStorage !== 'undefined',
    corrections: typeof CorrectionMemory !== 'undefined',
    export: typeof ExportUtils !== 'undefined',
    isolation: typeof Isolation !== 'undefined',
    matching: typeof Matching !== 'undefined',
    preprocessing: typeof Preprocessing !== 'undefined',
    nms: typeof NMS !== 'undefined'
});

// Test ID generation
const id = HKIStorage.generateInscriptionId();
console.log('Generated ID:', id);
```

**Expected output:**
```
Modules: {config: true, utils: true, hki: true, cache: true, ...all true}
Generated ID: DH-2025-001
```

## Still Having Issues?

### Issue 1: "Permission denied" when copying
```bash
# Use sudo
sudo cp /path/to/file destination/
```

### Issue 2: Can't find the files
```bash
# List what you have
ls -la /mnt/user-data/outputs/

# Extract if needed
cd /mnt/user-data/outputs/
tar -xzf hakli-modular.tar.gz
```

### Issue 3: Git won't add src/ directory
```bash
# Force add
git add -f src/

# Check .gitignore
cat .gitignore
# Make sure src/ is NOT in .gitignore
```

### Issue 4: GitHub Pages not updating
- Go to Settings → Pages
- Check "Source" is set to "main" branch
- Wait 2-3 minutes after push
- Force refresh: Ctrl+Shift+F5

## Success Indicators

✅ **Local test:** No console errors, all modules loaded  
✅ **GitHub:** All 11 files visible in repo  
✅ **GitHub Pages:** Live site loads without 404s  
✅ **Console test:** Can run `HKIStorage.generateInscriptionId()`  

---

**Need the files?** They're all in `/mnt/user-data/outputs/hakli-modular/`

**Still stuck?** Share your `git status` output and console errors.
