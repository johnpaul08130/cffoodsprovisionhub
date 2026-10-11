# Offline Support – CF Food and Beverages

## What works offline

After you have opened the app **at least once while online**:

| Feature                        | Offline Status      | Notes |
|--------------------------------|---------------------|-------|
| Open already-visited pages     | ✅ Yes              | Cached by Service Worker |
| View products already loaded   | ✅ Yes              | Firestore offline cache |
| Search / filter products       | ✅ Yes              | Local data |
| Add items to POS cart          | ✅ Yes              | Pure JavaScript |
| Calculate totals & change      | ✅ Yes              | Pure JavaScript |
| Complete a sale                | ⚠️ Queued           | Saved locally, syncs when back online |
| Stock movements                | ⚠️ Queued           | Syncs when connection returns |
| Login (first time)             | ❌ No               | Needs internet |
| Login (returning user)         | ⚠️ Limited          | Token may need refresh |
| Upload product images          | ❌ No               | Needs internet |
| Create new users               | ❌ No               | Needs internet |

## How it works

1. **Service Worker (`sw.js`)**  
   Caches the main HTML, CSS, and JS files so the app shell loads without internet.

2. **Firestore Offline Persistence**  
   Already enabled in `js/firebase-config.js`.  
   Data that was previously loaded is available offline.  
   Writes (sales, stock changes) are queued and automatically sent when the device is online again.

3. **Offline fallback page**  
   If a page cannot be loaded, users see `offline.html` with a “Try Again” button.

## Limitations

- True multi-hour offline operation (e.g. no internet all day) is **not fully guaranteed**.
- Authentication tokens expire and need periodic refresh.
- Image uploads and first-time data loading still require internet.
- For a completely offline shop, a desktop/local database solution would be needed.

## Recommendations for your store

1. Open the app while you have internet every morning (or keep a phone hotspot ready).
2. Once products are loaded, short internet cuts will not stop sales.
3. When internet returns, all queued sales and stock changes will sync automatically.

## Future improvements (optional)

- Full PWA install prompt
- Better offline login handling
- Background sync API
- Local-first database (e.g. RxDB / IndexedDB advanced sync)

These can be added later if needed.
