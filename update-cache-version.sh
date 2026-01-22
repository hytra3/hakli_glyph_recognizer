#!/bin/bash
# Cache Version Updater
# Usage: ./update-cache-version.sh v260122c
# This updates all ?v= query parameters in index.html to bust browser cache

if [ -z "$1" ]; then
    echo "Usage: ./update-cache-version.sh <new_version>"
    echo "Example: ./update-cache-version.sh v260122c"
    exit 1
fi

NEW_VERSION=$1

# Remove 'v' prefix if present
NEW_VERSION=${NEW_VERSION#v}

echo "Updating cache version to: $NEW_VERSION"

# Update APP_VERSION
sed -i "s/const APP_VERSION = 'v[0-9a-z]*'/const APP_VERSION = 'v$NEW_VERSION'/" index.html

# Update cache-busting comment
sed -i "s/Current version: v[0-9a-z]*/Current version: v$NEW_VERSION/" index.html

# Update all .jsx?v= tags
sed -i "s/\.jsx?v=[0-9a-z]*/\.jsx?v=$NEW_VERSION/g" index.html

# Update all .js?v= tags (if any)
sed -i "s/\.js?v=[0-9a-z]*/\.js?v=$NEW_VERSION/g" index.html

echo "✓ Updated all version tags to v$NEW_VERSION"
echo "✓ Don't forget to update sw.js CACHE_VERSION if you changed core assets!"
