// STARTUP — Initialize IndexedDB & Tabs
        // ==========================================
        (async () => {
            try {
                await initDB();
                
                // 1. Load Plantillas
                const storedPlantillas = await dbGetAll();
                plantillas = storedPlantillas || [];

                // 2. Load Active Tabs
                const storedTabs = await dbGetTabs();
                if (storedTabs && storedTabs.length > 0) {
                    activeTabs = storedTabs;
                } else {
                    activeTabs = [];
                }
                
                // 3. Load Memory Slots
                const storedSlots = await dbGetSlots();
                if (storedSlots) {
                    Object.assign(storedValues, storedSlots);
                }

                // Render views
                renderActiveTabs();
                renderSlots();

            } catch (err) {
                console.warn('IndexedDB no disponible, usando datos de demo en memoria.', err);
                plantillas = [];
                activeTabs = [];
                renderActiveTabs();
                renderSlots();
            }
        })();