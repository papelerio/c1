// Active tabs list state
        let activeTabs = [];

        tabsWrapper.addEventListener('scroll', updateScrollShadows);
        window.addEventListener('resize', updateScrollShadows);
        setTimeout(updateScrollShadows, 100);

        // Render Active Tabs dynamically
        function renderActiveTabs() {
            tabsWrapper.innerHTML = '';
            
            if (activeTabs.length === 0) {
                // If empty, show a small helper placeholder
                tabsWrapper.innerHTML = '<span style="color: var(--text-muted); font-size: 0.8rem; padding-left: 8px;">Presiona + para abrir una plantilla</span>';
                updateScrollShadows();
                return;
            }

            activeTabs.forEach(tab => {
                const isTabActive = tab.active;
                const textColor = colorTextoParaFondo(tab.color);
                
                const activeStyle = `background: ${tab.color}; color: ${textColor}; border-color: rgba(15, 23, 42, 0.15);`;
                const inactiveStyle = `background: rgba(255, 255, 255, 0.7); color: var(--text-muted);`;
                
                const tabElement = document.createElement('div');
                tabElement.className = `tab-item ${isTabActive ? 'active' : ''}`;
                tabElement.setAttribute('style', isTabActive ? activeStyle : inactiveStyle);
                
                const dotColor = tab.color;
                const closeStyle = isTabActive ? `color: ${textColor}; opacity: 0.8;` : '';
                
                tabElement.innerHTML = `
                    <span class="tab-dot" style="background: ${dotColor};"></span>
                    <span>${tab.nombre}</span>
                    <span class="tab-close" style="${closeStyle}" onclick="closeTab(event, '${tab.id}')">✕</span>
                `;
                
                tabElement.addEventListener('click', () => {
                    selectTabById(tab.id);
                });
                
                tabsWrapper.appendChild(tabElement);
            });
            
            updateScrollShadows();
        }

        // Select Tab
        function selectTabById(id) {
            activeTabs.forEach(tab => {
                tab.active = (tab.id === id);
            });
            dbSaveTabs(activeTabs).then(() => {
                renderActiveTabs();
                renderActiveSheet();
            });
        }

        // Add Tab (linked to a template config)
        function addNewTab(tabName = null, tabColor = null, plantillaId = null) {
            if (!tabName) {
                tabCounter++;
                tabName = `Hoja ${tabCounter}`;
            }
            const color = tabColor || '#fca5a5';
            
            // Deactivate others
            activeTabs.forEach(t => t.active = false);
            
            const newTab = {
                id: `tab_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                plantillaId: plantillaId,
                nombre: tabName,
                color: color,
                variablesValues: { x: '', y: '', z: '' },
                active: true
            };
            
            activeTabs.push(newTab);
            
            dbSaveTabs(activeTabs).then(() => {
                renderActiveTabs();
                renderActiveSheet();
                setTimeout(() => {
                    const elements = document.querySelectorAll('.tab-item');
                    const lastEl = elements[elements.length - 1];
                    if (lastEl) {
                        lastEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'end' });
                    }
                }, 50);
            });
        }

        // Close Tab
        function closeTab(event, id) {
            event.stopPropagation();
            
            const index = activeTabs.findIndex(t => t.id === id);
            if (index === -1) return;
            
            const wasActive = activeTabs[index].active;
            const tabElements = document.querySelectorAll('.tab-item');
            const tabElement = tabElements[index];
            if (tabElement) {
                tabElement.style.opacity = '0';
                tabElement.style.transform = 'scale(0.85)';
            }
            
            setTimeout(() => {
                activeTabs.splice(index, 1);
                
                if (wasActive && activeTabs.length > 0) {
                    const newActiveIndex = Math.min(index, activeTabs.length - 1);
                    activeTabs[newActiveIndex].active = true;
                }
                
                dbSaveTabs(activeTabs).then(() => {
                    renderActiveTabs();
                    renderActiveSheet();
                });
            }, 150);
        }

        // ==========================================