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
                const res = evaluateExpression(sanitized);
                return (typeof res === 'object' && res !== null) ? (res.displayVal || '') : res;
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
                    const brainBtn = document.getElementById(`sheet-brain-btn-${idx}`);
                    if (resElement) resElement.innerText = result;
                    if (brainBtn) {
                        if (result === 'Error' || result === '') {
                            brainBtn.classList.add('disabled');
                        } else {
                            brainBtn.classList.remove('disabled');
                        }
                    }
                });
            });
        }

        /**
         * Opens step-by-step procedure modal for a template formula
         */
        function verProcedimientoPlantillaFormula(tabId, formulaIdx) {
            const tab = activeTabs.find(t => t.id === tabId);
            if (!tab) return;
            const p = plantillas.find(x => x.id === tab.plantillaId);
            if (!p || !p.formulas || !p.formulas[formulaIdx]) return;

            const f = p.formulas[formulaIdx];
            let formulaExpr = f.formula.toLowerCase().replace(/\s/g, '');

            // Substitute local variables x, y, z with current values
            ['x', 'y', 'z'].forEach(v => {
                const val = (tab.variablesValues && tab.variablesValues[v] !== undefined && tab.variablesValues[v] !== '') 
                            ? tab.variablesValues[v] 
                            : '0';
                formulaExpr = formulaExpr.replace(new RegExp(`(?<![a-z0-9.])(${v})(?![a-z0-9])`, 'gi'), `(${val})`);
            });

            const resObj = evaluateExpression(formulaExpr);
            if (resObj.isError || resObj.displayVal === 'Error') {
                alert('Resuelve primero los errores en las variables antes de ver el procedimiento.');
                return;
            }

            if (typeof abrirProcedimientoModal === 'function') {
                abrirProcedimientoModal(formulaExpr);
            }
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
                const isDisabled = (result === 'Error' || result === '');
                formulasHTML += `
                    <div class="sheet-formula-item">
                        <span class="sheet-formula-label">${f.etiqueta || 'Fórmula'} :</span>
                        <div class="sheet-formula-val-box">
                            <span class="sheet-formula-value" id="sheet-res-${idx}">${result}</span>
                            <button class="sheet-brain-btn ${isDisabled ? 'disabled' : ''}" 
                                    id="sheet-brain-btn-${idx}"
                                    onclick="verProcedimientoPlantillaFormula('${activeTab.id}', ${idx})" 
                                    title="Procedimiento paso a paso 🧠">🧠</button>
                        </div>
                    </div>`;
            });

            sheetContainer.innerHTML = `
                <div class="sheet-header-title">
                    <button class="sheet-header-btn-help" onclick="mostrarFormulasPlantilla('${p.id}')" title="Ver fórmulas usadas">?</button>
                    <div class="sheet-header-name" style="background: ${p.color}; color: ${headerTextColor}">
                        ${activeTab.nombre}
                    </div>
                    <button class="sheet-header-btn-close" onclick="closeTab(event, '${activeTab.id}')" title="Cerrar hoja">✕</button>
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

            // Cleanup floating delete button if present from earlier versions
            const oldFloatBtn = document.getElementById('floatingDeleteBtn');
            if (oldFloatBtn) oldFloatBtn.remove();
        }

        /**
         * Displays the internal formulas configured in the specified template
         */
        function mostrarFormulasPlantilla(plantillaId) {
            const p = plantillas.find(x => x.id === plantillaId);
            if (!p) return;

            const titleEl = document.getElementById('formulasInfoTitle');
            const listEl = document.getElementById('formulasInfoList');
            const modalEl = document.getElementById('formulasInfoModal');

            if (titleEl) titleEl.innerText = `Fórmulas usadas en "${p.nombre}"`;
            
            if (listEl) {
                if (!p.formulas || p.formulas.length === 0) {
                    listEl.innerHTML = `<p style="color: var(--text-muted); font-size: 0.9rem;">Sin fórmulas registradas.</p>`;
                } else {
                    listEl.innerHTML = p.formulas.map(f => `
                        <div style="background: #f8fafc; border: 1.5px solid var(--border-color); border-radius: 10px; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-weight: 700; color: var(--text-main); font-size: 0.92rem;">${f.etiqueta || 'Fórmula'}</span>
                            <code style="background: #e0e7ff; color: #3730a3; padding: 4px 8px; border-radius: 6px; font-weight: 700; font-family: monospace; font-size: 0.95rem;">${f.formula}</code>
                        </div>
                    `).join('');
                }
            }

            if (modalEl) modalEl.classList.add('show');
        }

        function closeFormulasInfoModal() {
            const modalEl = document.getElementById('formulasInfoModal');
            if (modalEl) modalEl.classList.remove('show');
        }