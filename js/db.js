// INDEXED DB — STORAGE
        // ==========================================

        const DB_NAME = 'dnFormulasDB';
        const DB_VERSION = 4; // Upgraded to v4 to add STORE_TOMBSTONES
        const STORE_NAME = 'plantillas';
        const STORE_TABS = 'tabs';
        const STORE_SLOTS = 'slots';
        const STORE_TOMBSTONES = 'tombstones';
        let db = null;

        function initDB() {
            return new Promise((resolve, reject) => {
                const req = indexedDB.open(DB_NAME, DB_VERSION);
                req.onupgradeneeded = e => {
                    const database = e.target.result;
                    if (!database.objectStoreNames.contains(STORE_NAME)) {
                        database.createObjectStore(STORE_NAME, { keyPath: 'id' });
                    }
                    if (!database.objectStoreNames.contains(STORE_TABS)) {
                        database.createObjectStore(STORE_TABS, { keyPath: 'id' });
                    }
                    if (!database.objectStoreNames.contains(STORE_SLOTS)) {
                        database.createObjectStore(STORE_SLOTS, { keyPath: 'id' });
                    }
                    if (!database.objectStoreNames.contains(STORE_TOMBSTONES)) {
                        database.createObjectStore(STORE_TOMBSTONES, { keyPath: 'id' });
                    }
                };
                req.onsuccess = e => { db = e.target.result; resolve(); };
                req.onerror = e => reject(e.target.error);
            });
        }

        function dbGetAll() {
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readonly');
                const req = tx.objectStore(STORE_NAME).getAll();
                req.onsuccess = () => resolve(req.result);
                req.onerror = e => reject(e.target.error);
            });
        }

        function dbSave(item) {
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const req = tx.objectStore(STORE_NAME).put(item);
                req.onsuccess = () => resolve();
                req.onerror = e => reject(e.target.error);
            });
        }

        function dbDelete(id) {
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const req = tx.objectStore(STORE_NAME).delete(id);
                req.onsuccess = () => resolve();
                req.onerror = e => reject(e.target.error);
            });
        }

        function dbSaveTabs(tabsList) {
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_TABS, 'readwrite');
                const req = tx.objectStore(STORE_TABS).put({ id: 'current_state', list: tabsList });
                req.onsuccess = () => resolve();
                req.onerror = e => reject(e.target.error);
            });
        }

        function dbGetTabs() {
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_TABS, 'readonly');
                const req = tx.objectStore(STORE_TABS).get('current_state');
                req.onsuccess = () => resolve(req.result ? req.result.list : null);
                req.onerror = e => reject(e.target.error);
            });
        }

        function dbDelete(id) {
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const req = tx.objectStore(STORE_NAME).delete(id);
                req.onsuccess = () => resolve();
                req.onerror = e => reject(e.target.error);
            });
        }

        function dbSaveSlots(slotsObject) {
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_SLOTS, 'readwrite');
                const req = tx.objectStore(STORE_SLOTS).put({ id: 'current_slots', values: slotsObject });
                req.onsuccess = () => resolve();
                req.onerror = e => reject(e.target.error);
            });
        }

        function dbGetSlots() {
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_SLOTS, 'readonly');
                const req = tx.objectStore(STORE_SLOTS).get('current_slots');
                req.onsuccess = () => resolve(req.result ? req.result.values : null);
                req.onerror = e => reject(e.target.error);
            });
        }

        function dbGetTombstones() {
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_TOMBSTONES, 'readonly');
                const req = tx.objectStore(STORE_TOMBSTONES).getAll();
                req.onsuccess = () => resolve(req.result || []);
                req.onerror = e => reject(e.target.error);
            });
        }

        function dbSaveTombstone(tombstone) {
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_TOMBSTONES, 'readwrite');
                const req = tx.objectStore(STORE_TOMBSTONES).put(tombstone);
                req.onsuccess = () => resolve();
                req.onerror = e => reject(e.target.error);
            });
        }

        function dbDeleteTombstone(id) {
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_TOMBSTONES, 'readwrite');
                const req = tx.objectStore(STORE_TOMBSTONES).delete(id);
                req.onsuccess = () => resolve();
                req.onerror = e => reject(e.target.error);
            });
        }

        // ==========================================