#!/bin/bash
# Cache Version Updater
# Usage: ./update-cache-version.sh v260728a
# Stamps the SAME version into BOTH index.html (APP_VERSION + ?v= tags)
# AND sw.js (CACHE_VERSION), so the two can never drift apart again.

if [ -z "$1" ]; then
    echo "Usage: ./update-cache-version.sh <new_version>"
    echo "Example: ./update-cache-version.sh v260728a"
    exit 1
fi

NEW_VERSION=$1

# Remove 'v' prefix if present
NEW_VERSION=${NEW_VERSION#v}

echo "Updating version to: v$NEW_VERSION"

# --- index.html ---------------------------------------------------------
# APP_VERSION constant
sed -i "s/const APP_VERSION = 'v[0-9a-z]*'/const APP_VERSION = 'v$NEW_VERSION'/" index.html

# Cache-busting comment (if present)
sed -i "s/Current version: v[0-9a-z]*/Current version: v$NEW_VERSION/" index.html

# Any ?v= query tags on .jsx and .js script src attributes
sed -i "s/\.jsx?v=[0-9a-z]*/\.jsx?v=$NEW_VERSION/g" index.html
sed -i "s/\.js?v=[0-9a-z]*/\.js?v=$NEW_VERSION/g" index.html
echo "  index.html  -> APP_VERSION v$NEW_VERSION"

# --- sw.js --------------------------------------------------------------
# CACHE_VERSION constant (this is the line that used to be forgotten)
sed -i "s/const CACHE_VERSION = 'v[0-9a-z]*'/const CACHE_VERSION = 'v$NEW_VERSION'/" sw.js

# Header comment (cosmetic, keeps the file self-documenting)
sed -i "s|// Version [0-9a-z]*|// Version $NEW_VERSION|" sw.js
echo "  sw.js       -> CACHE_VERSION v$NEW_VERSION"

echo ""
echo "Both files stamped v$NEW_VERSION. Now:"
echo "  git add index.html sw.js && git commit -m \"v$NEW_VERSION\" && git push"