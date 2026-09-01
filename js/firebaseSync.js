// ==========================================
// FIREBASE 2-WAY AUTOMATIC SYNC SYSTEM
// ==========================================

const FIREBASE_BASE_URL = "https://autoformula-a2442-default-rtdb.firebaseio.com";

/**
 * Perform automatic 2-way synchronization with Firebase Realtime Database:
 * 1. Upload new local plantillas to Firebase
 * 2. Update existing plantillas comparing timestamps (keeps the newest version)
 * 3. Process tombstones ("ids cadáveres") to delete items from Firebase and local
 * 4. Download newer/missing plantillas from Firebase to IndexedDB
 */
async function sincronizarConFirebase() {
    const btn = document.querySelector('.btn-importar');
    const originalText = btn ? btn.innerText : '🌐';
    if (btn) {
        btn.innerText = '⏳';
        btn.disabled = true;
    }

    try {
        // 1. Load local state from IndexedDB
        const localPlantillas = await dbGetAll();
        const localTombstones = await dbGetTombstones();

        // 2. Fetch remote data from Firebase
        const [resPlantillas, resTombstones] = await Promise.all([
            fetch(`${FIREBASE_BASE_URL}/plantillas.json`),
            fetch(`${FIREBASE_BASE_URL}/tombstones.json`)
        ]);

        if (!resPlantillas.ok || !resTombstones.ok) {
            throw new Error(`Error HTTP: ${resPlantillas.status} / ${resTombstones.status}`);
        }

        const remotePlantillasData = (await resPlantillas.json()) || {};
        const remoteTombstonesData = (await resTombstones.json()) || {};

        // Parse remote plantillas map
        const remotePlantillasMap = new Map();
        if (Array.isArray(remotePlantillasData)) {
            remotePlantillasData.forEach(p => { if (p && p.id) remotePlantillasMap.set(p.id, p); });
        } else if (typeof remotePlantillasData === 'object') {
            Object.values(remotePlantillasData).forEach(p => { if (p && p.id) remotePlantillasMap.set(p.id, p); });
        }

        // Parse remote tombstones map
        const remoteTombstonesMap = new Map();
        if (Array.isArray(remoteTombstonesData)) {
            remoteTombstonesData.forEach(t => { if (t && t.id) remoteTombstonesMap.set(t.id, t); });
        } else if (typeof remoteTombstonesData === 'object') {
            Object.values(remoteTombstonesData).forEach(t => { if (t && t.id) remoteTombstonesMap.set(t.id, t); });
        }

        const localPlantillasMap = new Map(localPlantillas.map(p => [p.id, p]));
        const localTombstonesMap = new Map(localTombstones.map(t => [t.id, t]));

        let uploadedCount = 0;
        let downloadedCount = 0;
        let deletedCount = 0;

        // 3. Process Tombstones ("ids cadáveres")
        // A) Process local tombstones -> sync deletion to remote & save remote tombstone
        for (const [id, localTomb] of localTombstonesMap.entries()) {
            if (localPlantillasMap.has(id)) {
                await dbDelete(id);
                localPlantillasMap.delete(id);
            }
            if (remotePlantillasMap.has(id)) {
                await fetch(`${FIREBASE_BASE_URL}/plantillas/${id}.json`, { method: 'DELETE' });
                remotePlantillasMap.delete(id);
                deletedCount++;
            }
            if (!remoteTombstonesMap.has(id)) {
                await fetch(`${FIREBASE_BASE_URL}/tombstones/${id}.json`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(localTomb)
                });
            }
        }

        // B) Process remote tombstones -> sync deletion to local
        for (const [id, remoteTomb] of remoteTombstonesMap.entries()) {
            if (!localTombstonesMap.has(id)) {
                await dbSaveTombstone(remoteTomb);
                localTombstonesMap.set(id, remoteTomb);
            }
            if (localPlantillasMap.has(id)) {
                const localP = localPlantillasMap.get(id);
                if ((remoteTomb.timestamp || 0) >= (localP.timestamp || 0)) {
                    await dbDelete(id);
                    localPlantillasMap.delete(id);
                    deletedCount++;
                }
            }
        }

        // 4. Compare & Merge Plantillas
        const allIds = new Set([...localPlantillasMap.keys(), ...remotePlantillasMap.keys()]);

        for (const id of allIds) {
            // Ignore tombstones
            if (localTombstonesMap.has(id) || remoteTombstonesMap.has(id)) {
                continue;
            }

            const localItem = localPlantillasMap.get(id);
            const remoteItem = remotePlantillasMap.get(id);

            if (localItem && !remoteItem) {
                // Local only -> Upload to Firebase
                await fetch(`${FIREBASE_BASE_URL}/plantillas/${id}.json`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(localItem)
                });
                uploadedCount++;
            } else if (!localItem && remoteItem) {
                // Remote only -> Download to IndexedDB
                await dbSave(remoteItem);
                localPlantillasMap.set(id, remoteItem);
                downloadedCount++;
            } else if (localItem && remoteItem) {
                const localTs = localItem.timestamp || 0;
                const remoteTs = remoteItem.timestamp || 0;

                if (localTs > remoteTs) {
                    // Local is newer -> Upload to Firebase
                    await fetch(`${FIREBASE_BASE_URL}/plantillas/${id}.json`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(localItem)
                    });
                    uploadedCount++;
                } else if (remoteTs > localTs) {
                    // Remote is newer -> Download to IndexedDB
                    await dbSave(remoteItem);
                    localPlantillasMap.set(id, remoteItem);
                    downloadedCount++;
                }
            }
        }

        // 5. Update local cache and UI
        plantillas = Array.from(localPlantillasMap.values());
        renderPlantillas();

        // Also refresh active sheet if active tab belongs to a synced plantilla
        if (typeof renderActiveSheet === 'function') {
            renderActiveSheet();
        }

        alert(`🌐 Sincronización completada con éxito:\n\n` +
              `⬆️ Plantillas subidas/actualizadas: ${uploadedCount}\n` +
              `⬇️ Plantillas descargadas/actualizadas: ${downloadedCount}\n` +
              `🗑️ Plantillas eliminadas en la nube: ${deletedCount}`);

    } catch (error) {
        console.error("Error al sincronizar con Firebase:", error);
        alert('❌ Error al conectar con Firebase: ' + (error.message || 'Error de red'));
    } finally {
        if (btn) {
            btn.innerText = originalText;
            btn.disabled = false;
        }
    }
}
