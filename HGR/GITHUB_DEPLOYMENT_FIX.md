# 🚀 GitHub Deployment Checklist

## ❌ Current Issue

You have 404 errors because not all files were pushed to GitHub. The console shows modules partially loaded.

## ✅ Required File Structure

Your GitHub repo needs this **exact** structure:

```
hakli_glyph_recognizer/
├── index.html
└── src/
    ├── core/
    │   └── config.js
    ├── utils/
    │   └── helpers.js
    ├── storage/
    │   ├── hki.js
    │   ├── cache.js
    │   ├── corrections.js
    │   └── export.js
    └── recognition/
        ├── isolation.js
        ├── matching.js
        ├── preprocessing.js
        └── nms.js
```

## 📋 Deployment Steps

### Option 1: Deploy Just the Modular Version

```bash
# 1. Navigate to your local hakli_glyph_recognizer repo
cd ~/path/to/hakli_glyph_recognizer

# 2. Extract the modular files
tar -xzf hakli-modular.tar.gz

# 3. Create the directory structure
mkdir -p src/core src/utils src/storage src/recognition

# 4. Copy files
cp hakli-modular/index.html .
cp hakli-modular/src/core/config.js src/core/
cp hakli-modular/src/utils/helpers.js src/utils/
cp hakli-modular/src/storage/*.js src/storage/
cp hakli-modular/src/recognition/*.js src/recognition/

# 5. Add to git
git add index.html src/

# 6. Commit
git commit -m "Add modular architecture (67% complete)"

# 7. Push
git push origin main
```

### Option 2: Deploy to Separate Branch (Safer)

```bash
# 1. Create new branch
cd ~/path/to/hakli_glyph_recognizer
git checkout -b modular-refactor

# 2. Extract and copy files (same as above)
tar -xzf hakli-modular.tar.gz
mkdir -p src/core src/utils src/storage src/recognition
cp hakli-modular/index.html .
cp hakli-modular/src/core/config.js src/core/
cp hakli-modular/src/utils/helpers.js src/utils/
cp hakli-modular/src/storage/*.js src/storage/
cp hakli-modular/src/recognition/*.js src/recognition/

# 3. Add, commit, push
git add .
git commit -m "Modular refactoring - Phase 1 complete"
git push origin modular-refactor

# 4. Test at: https://hytra3.github.io/hakli_glyph_recognizer/?branch=modular-refactor
```

## 🔍 Verify Deployment

After pushing, check these URLs return 200 (not 404):

```
https://hytra3.github.io/hakli_glyph_recognizer/index.html
https://hytra3.github.io/hakli_glyph_recognizer/src/core/config.js
https://hytra3.github.io/hakli_glyph_recognizer/src/utils/helpers.js
https://hytra3.github.io/hakli_glyph_recognizer/src/storage/hki.js
https://hytra3.github.io/hakli_glyph_recognizer/src/recognition/isolation.js
```

## 🧪 Quick Test

Once deployed, open browser console and run:

```javascript
// Check modules loaded
console.log('CONFIG:', typeof CONFIG !== 'undefined');
console.log('Utils:', typeof Utils !== 'undefined');
console.log('HKIStorage:', typeof HKIStorage !== 'undefined');
console.log('CacheStorage:', typeof CacheStorage !== 'undefined');
console.log('Isolation:', typeof Isolation !== 'undefined');

// Test ID generation
if (typeof HKIStorage !== 'undefined') {
    const id = HKIStorage.generateInscriptionId();
    console.log('Generated ID:', id);
}
```

**Expected output:**
```
✅ CONFIG: true
✅ Utils: true
✅ HKIStorage: true
✅ CacheStorage: true
✅ Isolation: true
✅ Generated ID: DH-2025-001
```

## 🐛 Current Errors Explained

**404 Errors:** Files not found on server
- Means: Files exist locally but not on GitHub
- Fix: Push the files (see steps above)

**Module Loading Partially:**
- `config: true` ✅
- `utils: true` ✅
- `hki: true` ✅
- `recognition: false` ❌

This means some files loaded but recognition modules didn't. After you push all files, this should show all `true`.

## ⚠️ Common Mistakes

1. **Wrong directory structure** 
   - ❌ `hakli_glyph_recognizer/hakli-modular/src/...`
   - ✅ `hakli_glyph_recognizer/src/...`

2. **Not pushing the src/ directory**
   - Make sure to `git add src/` explicitly

3. **Case sensitivity**
   - GitHub is case-sensitive
   - Make sure paths match exactly

4. **Cached old version**
   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

## 📞 Quick Fix Commands

```bash
# See what git thinks is staged
git status

# See what will be pushed
git diff --stat origin/main

# Force add everything in src/
git add -f src/

# Check remote URL
git remote -v
```

## 🎯 Success Criteria

When deployment is successful, you'll see:
- ✅ No 404 errors in console
- ✅ "OpenCV.js is ready" message
- ✅ "Modules loaded: {config: true, utils: true, hki: true, recognition: true}"
- ✅ Can run `HKIStorage.generateInscriptionId()` in console

## 📦 Files to Upload

Here's the exact list of what needs to be on GitHub:

```
index.html (118 lines)
src/core/config.js (130 lines)
src/utils/helpers.js (180 lines)
src/storage/hki.js (260 lines)
src/storage/cache.js (240 lines)
src/storage/corrections.js (280 lines)
src/storage/export.js (340 lines)
src/recognition/isolation.js (180 lines)
src/recognition/matching.js (250 lines)
src/recognition/preprocessing.js (200 lines)
src/recognition/nms.js (220 lines)
```

Total: 11 files, ~2,300 lines

---

**Need help?** The files are all in `/mnt/user-data/outputs/hakli-modular/` ready to upload.
