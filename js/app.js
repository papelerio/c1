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

                // 4. Load Virtual Keyboard State
                const savedKbdState = await dbGetKbdState();
                if (savedKbdState !== null) {
                    isVirtualKbdEnabled = savedKbdState;
                } else if (localStorage.getItem('virtual_kbd_enabled') === 'true') {
                    isVirtualKbdEnabled = true;
                }

                // Render views
                renderActiveTabs();
                renderSlots();
                if (typeof updateVirtualKbdUI === 'function') {
                    updateVirtualKbdUI();
                }

            } catch (err) {
                console.warn('IndexedDB no disponible, usando datos de demo en memoria.', err);
                plantillas = [];
                activeTabs = [];
                renderActiveTabs();
                renderSlots();
                if (typeof updateVirtualKbdUI === 'function') {
                    updateVirtualKbdUI();
                }
            }
        })();