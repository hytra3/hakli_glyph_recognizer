# Access Control & Auto-Sync Integration Guide

## Overview

These new modules add:
1. **Keyword-based access control** - Track changes by user without account system
2. **Auto-sync** - Offline-first with automatic sync when connectivity returns

## New Files

```
src/
├── storage/
│   ├── access-control.js    # Keyword auth & user management
│   ├── sync-manager.js      # Offline-first sync logic
│   └── hki-enhanced.js      # Updated HKI with access control
└── components/
    └── AccessControlUI.jsx   # Unlock modal, user management, sync status
```

## Quick Start

### 1. Add script tags to index.html

```html
<!-- After existing storage scripts -->
<script src="src/storage/access-control.js"></script>
<script src="src/storage/sync-manager.js"></script>
<script src="src/storage/hki-enhanced.js"></script>

<!-- After React/Babel -->
<script type="text/babel" src="src/components/AccessControlUI.jsx"></script>
```

### 2. Initialize SyncManager on app load

```javascript
// In your main component's useEffect
useEffect(() => {
    SyncManager.initialize();
}, []);
```

### 3. Add state for access control

```javascript
const [isReadOnly, setIsReadOnly] = useState(true);
const [showUnlockModal, setShowUnlockModal] = useState(false);
const [pendingHkiData, setPendingHkiData] = useState(null);
const [accessControl, setAccessControl] = useState(null);
```

### 4. Add UI components

```jsx
{/* Read-only banner at top of app */}
<ReadOnlyBanner 
    isVisible={isReadOnly && recognitionResults.length > 0}
    onUnlockClick={() => setShowUnlockModal(true)}
    userName={AccessControl.getCurrentUser()?.name}
/>

{/* Sync status in header */}
<SyncStatusIndicator 
    onSignIn={() => DriveSync.signIn()}
/>

{/* Edit mode indicator when unlocked */}
{!isReadOnly && (
    <EditModeIndicator 
        user={AccessControl.getCurrentUser()}
        onLogout={() => {
            AccessControl.logout();
            setIsReadOnly(true);
        }}
    />
)}

{/* Unlock modal */}
<UnlockModal
    isOpen={showUnlockModal}
    onClose={() => {
        setShowUnlockModal(false);
        // Load in read-only mode
        if (pendingHkiData) {
            HKIStorage.loadHkiFile(pendingHkiData, setters);
        }
    }}
    onUnlock={(keyword) => {
        const result = HKIStorage.unlockWithKeyword(pendingHkiData, keyword);
        if (result.success) {
            setIsReadOnly(false);
            HKIStorage.loadHkiFile(pendingHkiData, setters, { skipAccessCheck: true });
        }
        return result;
    }}
    inscriptionTitle={pendingHkiData?.inscriptionTitle}
/>

{/* User management (owner only) */}
{!isReadOnly && accessControl && (
    <UserManagementPanel
        accessControl={accessControl}
        onAddUser={(keyword, name, role) => {
            const updated = AccessControl.addUser(
                accessControl, keyword, name, role,
                AccessControl.getCurrentUser()?.name
            );
            setAccessControl({...updated});
        }}
        onRemoveUser={(hash) => {
            // Need to prompt for keyword to remove
            const keyword = prompt('Enter keyword to revoke:');
            if (keyword) {
                const updated = AccessControl.removeUser(
                    accessControl, keyword,
                    AccessControl.getCurrentUser()?.name
                );
                setAccessControl({...updated});
            }
        }}
        onUpdateRole={(hash, role) => {
            const updated = AccessControl.updateUserRole(
                accessControl, hash, role,
                AccessControl.getCurrentUser()?.name
            );
            setAccessControl({...updated});
        }}
        isCollapsed={isUserPanelCollapsed}
        onToggleCollapse={() => setIsUserPanelCollapsed(!isUserPanelCollapsed)}
    />
)}
```

## Workflow Examples

### Creating a New Inscription

```javascript
// First save prompts for name and creates owner keyword
const result = await HKIStorage.saveAsHkiFile(state, {
    downloadLocal: true,
    syncToCloud: true
});

// User sees: "Your name: Marty Heyman"
// User sees: "Create your edit keyword: [xk7m4p2n]"
```

### Sharing with a Colleague

```javascript
// Owner adds a user
AccessControl.addUser(
    accessControl,
    "jallad2025",           // Keyword to share
    "Ahmad Al-Jallad",      // Their name
    "editor",               // Their role
    "Marty Heyman"          // Added by
);

// Share the keyword securely (Signal, email, etc.)
// They use it to unlock editing
```

### Working Offline

```javascript
// SyncManager automatically:
// 1. Saves locally first (always works)
// 2. Queues for cloud sync
// 3. Syncs when back online

// UI shows:
// "⏳ Pending sync (offline)" → "☁️ Synced"
```

### Reviewing Changes

```javascript
// Version history tracks who did what:
hkiData.versions = [
    { version: 1, contributor: "Marty Heyman", role: "owner", changes: "Initial recognition" },
    { version: 2, contributor: "Ahmad Al-Jallad", role: "editor", changes: "Corrected 5 glyphs" },
    { version: 3, contributor: "Guest Reviewer", role: "commenter", changes: "Added translation" }
];
```

## API Reference

### AccessControl

```javascript
// Create access control for new file
AccessControl.createDefaultAccessControl(ownerName, ownerKeyword)

// Add/remove users
AccessControl.addUser(accessControl, keyword, name, role, addedBy)
AccessControl.removeUser(accessControl, keyword, revokedBy)

// Authenticate
AccessControl.authenticate(accessControl, keyword) // Returns user or null

// Check permissions
AccessControl.canEdit()       // true/false
AccessControl.canComment()    // true/false
AccessControl.canManageUsers() // true/false

// Session
AccessControl.getCurrentUser()  // { name, role, permissions }
AccessControl.logout()

// Utilities
AccessControl.generateKeyword(length = 8)
AccessControl.listUsers(accessControl)
```

### SyncManager

```javascript
// Initialize (call once on app load)
SyncManager.initialize()

// Save with auto-sync
SyncManager.save(hkiData, { downloadLocal: true, syncToCloud: true })

// Manual sync
SyncManager.syncPending()

// Get status
SyncManager.getStatus(inscriptionId)  // { status, lastSynced, ... }
SyncManager.getSummary()              // { total, synced, pending, ... }

// Listen for events
const unsubscribe = SyncManager.addListener((event) => {
    // event.type: 'online', 'offline', 'synced', 'error', etc.
});
```

## Migration

To migrate existing HKI files:

```javascript
// Prompts for owner name and keyword once
HKIStorage.migrateLibrary("Marty Heyman", "mypassword123");
```

## Security Notes

1. **Keywords are hashed** - Stored as `kh_xxxxx`, not plaintext
2. **No external auth** - Works completely offline
3. **Revocation is instant** - Remove keyword = immediate loss of access
4. **Audit trail** - All access attempts and changes are logged
5. **Client-side only** - Keywords never leave the device/file

## Recommended Keyword Practices

- Use 8+ characters
- Mix letters and numbers
- Share securely (Signal, encrypted email)
- Use different keywords for different users
- Owner should save their keyword somewhere safe
