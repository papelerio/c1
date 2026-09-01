// SHEET VIEWER RENDERING & MATH EVALUATION
        // ==========================================

        /**
         * Evaluates formula expression with local variables and stored slots
         */
        function evaluateFormulaExpression(formulaStr, varValues) {
            if (!formulaStr.trim()) return '';
            try {
                let sanitized = formulaStr.toLowerCase().replace(/\s/g, '');
                
                // Replace template local variables x, y, z
                sanitized = sanitized.replace(/(?<![a-z0-9.])(x)(?![a-z0-9])/gi, () => {
                    const val = varValues.x;
                    return val !== '' ? `(${val})` : '0';
                });
                sanitized = sanitized.replace(/(?<![a-z0-9.])(y)(?![a-z0-9])/gi, () => {
                    const val = varValues.y;
                    return val !== '' ? `(${val})` : '0';
                });
                sanitized = sanitized.replace(/(?<![a-z0-9.])(z)(?![a-z0-9])/gi, () => {
                    const val = varValues.z;
                    return val !== '' ? `(${val})` : '0';
                });
                
                // Pass it to the main safe expression evaluator
                return evaluateExpression(sanitized);
            } catch (e) {
                return 'Error';
            }
        }

        /**
         * Updates input variables for a specific tab in real-time
         */
        function updateSheetVariable(tabId, varName, value) {
            const tab = activeTabs.find(t => t.id === tabId);
            if (!tab) return;
            if (!tab.variablesValues) tab.variablesValues = { x: '', y: '', z: '' };
            tab.variablesValues[varName] = value;
            
            dbSaveTabs(activeTabs).then(() => {
                const activeTab = activeTabs.find(t => t.active);
                if (!activeTab || activeTab.id !== tabId) return;
                
                const p = plantillas.find(x => x.id === activeTab.plantillaId);
                if (!p) return;
                
                (p.formulas || []).forEach((f, idx) => {
                    const result = evaluateFormulaExpression(f.formula, activeTab.variablesValues);
                    const resElement = document.getElementById(`sheet-res-${idx}`);
                    if (resElement) resElement.innerText = result;
                });
            });
        }

        /**
         * Renders active sheet view in the main area
         */
        function renderActiveSheet() {
            const sheetContainer = document.getElementById('sheetViewer');
            if (!sheetContainer) return;

            const activeTab = activeTabs.find(t => t.active);
            if (!activeTab || !activeTab.plantillaId) {
                sheetContainer.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: var(--text-muted); font-size: 0.9rem;">
                        <p>No hay ninguna hoja seleccionada.</p>
                        <p style="margin-top: 8px; font-size: 0.8rem;">Crea o selecciona una plantilla desde el botón <strong>+</strong>.</p>
                    </div>`;
                const floatBtn = document.getElementById('floatingDeleteBtn');
                if (floatBtn) floatBtn.remove();
                return;
            }

            const p = plantillas.find(x => x.id === activeTab.plantillaId);
            if (!p) {
                sheetContainer.innerHTML = `<div style="color: red; padding: 20px;">Error: Plantilla no encontrada.</div>`;
                const floatBtn = document.getElementById('floatingDeleteBtn');
                if (floatBtn) floatBtn.remove();
                return;
            }

            if (!activeTab.variablesValues) {
                activeTab.variablesValues = { x: '', y: '', z: '' };
            }

            const headerTextColor = colorTextoParaFondo(p.color);

            // Populate active variables inputs
            let variablesHTML = '';
            ['x', 'y', 'z'].forEach(v => {
                const cfg = p.variablesConfig[v];
                if (cfg && cfg.activa) {
                    const desc = cfg.descripcion || `Variable ${v.toUpperCase()}`;
                    const val = activeTab.variablesValues[v] || '';
                    variablesHTML += `
                        <div class="sheet-variable-col">
                            <span class="sheet-variable-desc" title="${desc}">${desc}</span>
                            <input type="text" class="sheet-variable-input" data-var="${v}" value="${val}" oninput="updateSheetVariable('${activeTab.id}', '${v}', this.value)">
                        </div>`;
                }
            });

            if (variablesHTML === '') {
                variablesHTML = `<span style="font-size: 0.82rem; color: var(--text-muted); padding: 4px 0;">Sin variables configuradas.</span>`;
            }

            // Populate formula results
            let formulasHTML = '';
            (p.formulas || []).forEach((f, idx) => {
                const result = evaluateFormulaExpression(f.formula, activeTab.variablesValues);
                formulasHTML += `
                    <div class="sheet-formula-item">
                        <span class="sheet-formula-label">${f.etiqueta || 'Fórmula'} :</span>
                        <span class="sheet-formula-value" id="sheet-res-${idx}">${result}</span>
                    </div>`;
            });

            sheetContainer.innerHTML = `
                <div class="sheet-header-title" style="background: ${p.color}; color: ${headerTextColor}">
                    ${activeTab.nombre}
                </div>
                <div class="sheet-image-box" style="background: ${p.color}22;">
                    ${p.imagen ? `<img src="${p.imagen}" alt="${p.nombre}">` : `<span class="placeholder-text" style="color:${p.color}">Imagen</span>`}
                </div>
                <div class="sheet-variables-row">
                    ${variablesHTML}
                </div>
                <div class="sheet-formulas-list">
                    ${formulasHTML}
                </div>
            `;

            // Setup floating delete button
            let floatBtn = document.getElementById('floatingDeleteBtn');
            if (!floatBtn) {
                floatBtn = document.createElement('button');
                floatBtn.id = 'floatingDeleteBtn';
                floatBtn.className = 'floating-delete-btn';
                floatBtn.innerHTML = '✕';
                floatBtn.title = 'Eliminar hoja actual';
                floatBtn.onclick = (e) => closeTab(e, activeTab.id);
                document.body.appendChild(floatBtn);
            } else {
                floatBtn.onclick = (e) => closeTab(e, activeTab.id);
            }
        }