## Repo overview (big picture)

- Single-page React app scaffolded with Vite. Entry: `src/main.jsx` -> `src/App.jsxx`.
- Firebase-centric: app initializes Firebase Auth + Firestore in `src/App.jsxx` using `src/firebaseConfig.js`.
- Data model: products stored under collection path `/artifacts/${myAppIdentifier}/users/{uid}/products` (see `App.jsx` and `firebaseConfig.js`).
- UI is view-driven: `src/views/*` (InventoryList, Scanner, ProductForm, QrGenerator). `Header` switches view via `setView`.

## Quick dev workflows

- Start dev server: `npm run dev` (Vite, HMR). Build: `npm run build`. Preview production: `npm run preview`. Lint: `npm run lint`.
- No tests configured in repo.

## Important patterns & conventions (do this in your edits)

- Top-level state & routing: `App.jsx` holds Firebase instances, userId, and view routing. Prefer editing this file when changing global behaviors.
- Firestore access: components receive `db` and `collectionPath` props; use Firestore helpers (e.g., `doc`, `setDoc`, `getDoc`) as in `ssrc/views/QrGenerator.jsxx` and `src/views/QrGenerator.jsx`.
- Realtime updates: inventory list is populated via `onSnapshot` in `App.jsx`. Don't replace it with ad-hoc fetch loops — maintain the listener pattern and cleanup with returned unsubscribe.
- External script loading: Scanner and QrGenerator use a guarded script loader hook (`useScript`) that polls for a global object. Mirror that approach when adding other CDN libs (see `src/views/QrGenerator.jsx` and `src/views/QrGenerator.jsx`).
- No image upload: product photos are only tracked as a boolean (`photosTaken`); there is no backend image upload flow in this repo.

## Integration points & runtime gotchas

- Authentication: app uses anonymous sign-in or a custom token if global `__initial_auth_token` is provided. To emulate auth in development, set that global before app init or rely on anonymous sign-in (see `App.jsx`).
- Collection path is derived from `myAppIdentifier` exported in `src/firebaseConfig.js` — change there updates all user collections.
- Third-party CDNs:
  - QR scanner: `https://unpkg.com/html5-qrcode@...` (Scanner). The component expects `window.Html5Qrcode`.
  - QR generator: uses jsDelivr `qrcode` lib and expects `window.QRCode`.
  Use the `useScript` pattern to add new CDN-based libs to avoid race conditions.

## Files to inspect for common edits

- App-level wiring: `src/App.jsxx` (auth, Firestore, onSnapshot listener, view routing)
- Firebase settings: `src/firebaseConfig.js` (apiKey, projectId, myAppIdentifier)
- Views: `ssrc/views/QrGenerator.jsxx`, `src/views/QrGenerator.jsx`, `src/views/QrGenerator.jsx`, `src/views/QrGenerator.jsx` (primary UI logic)
- UI bits: `src/views/QrGenerator.jsx`, `src/views/QrGenerator.jsx`.
- Entry: `src/main.jsx` and global styles `src/index.css`.

## Helpful examples to copy from

- Save / merge document: in `ProductForm` use `setDoc(doc(db, collectionPath, currentQrCodeId), productData, { merge: true })`.
- Real-time listener: `onSnapshot(query(collection(db, collectionPath)), snapshot => { ... })` in `App.jsx`.
- External script loader: the `useScript(url, globalObjectName)` hook in `Scanner.js` and `QrGenerator.js`.

## Agent-specific tips

- When editing UI state or view routing, update `App.jsx` first — it's the single source of truth for views and Firebase instances.
- If a read_file or import fails, check for subtle filename issues: some workspace listings show a leading space in `src/views/ ProductForm.js` or `src/components/ Header.js`. If a path fails, search by basename (e.g., `ProductForm`) rather than assuming exact path.
- Avoid adding server-side code — this is a client-only Vite React app; do not introduce Node-only runtime expectations unless you also add appropriate build/runtime scripts.

If anything here is unclear or you'd like me to expand a section (for example, adding example PR comments, suggested tests, or common bug fixes), tell me which area and I'll iterate.
