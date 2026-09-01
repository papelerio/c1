// PLANTILLAS DATA SYSTEM
        // ==========================================

        /**
         * Generates a compact unique ID: timestamp + random suffix
         */
        function generarId() {
            return `pt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        }

        /**
         * Plantilla schema v3 (IndexedDB):
         * {
         *   id: string              — Unique ID (auto-generated)
         *   timestamp: number       — Unix ms, updated on create/edit
         *   nombre: string          — Display name
         *   color: string           — Hex color
         *   imagen: string|null     — Base64 image or null
         *   variablesConfig: {      — Per-variable configuration
         *     x: { activa: bool, descripcion: string },
         *     y: { activa: bool, descripcion: string },
         *     z: { activa: bool, descripcion: string }
         *   }
         *   formulas: [             — List of result formulas
         *     { etiqueta: string, formula: string }
         *   ]
         * }
         */

        let plantillas = []; // In-memory cache
        let editorIdActual = null; // null = creating new, string = editing existing

        function colorTextoParaFondo(hex) {
            if (!hex || hex.length < 7) return '#111827';
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return (r * 299 + g * 587 + b * 114) / 1000 < 128 ? '#ffffff' : '#111827';
        }

        function renderPlantillas() {
            const area = document.getElementById('plantillasScrollArea');
            if (!area) return;

            if (plantillas.length === 0) {
                area.innerHTML = `
                    <div class="plantillas-empty-hint">
                        <span>📋</span>
                        <p>No hay plantillas aún.<br>Pulsa <strong>Crear</strong> para añadir una.</p>
                    </div>`;
                return;
            }

            // Sort newest first
            const sorted = [...plantillas].sort((a, b) => b.timestamp - a.timestamp);

            area.innerHTML = sorted.map(p => {
                const textoColor = colorTextoParaFondo(p.color);
                return `
                    <div class="plantilla-card" id="pcard-${p.id}">
                        <button class="plantilla-btn-edit" onclick="editarPlantilla('${p.id}')" title="Editar">
                            ✏️
                        </button>
                        <div class="plantilla-name" style="background:${p.color}; color:${textoColor}">
                            ${p.nombre}
                        </div>
                        <button class="plantilla-btn-send" onclick="enviarABarra('${p.id}')" title="Enviar a la Barra de Trabajo">
                            →
                        </button>
                    </div>`;
            }).join('');
        }

        // ==========================================
        // PLANTILLAS MODAL CONTROLS
        // ==========================================

        function openPlantillasModal() {
            renderPlantillas();
            plantillasOverlay.classList.add('show');
            document.body.style.overflow = 'hidden';
        }

        function closePlantillasModal() {
            plantillasOverlay.classList.remove('show');
            document.body.style.overflow = '';
        }

        function handleOverlayClick(event) {
            if (event.target === plantillasOverlay) closePlantillasModal();
        }

        function crearPlantilla() {
            abrirEditor(null);
        }

        function editarPlantilla(id) {
            abrirEditor(id);
        }

        function enviarABarra(id) {
            const p = plantillas.find(x => x.id === id);
            if (!p) return;
            addNewTab(p.nombre, p.color, p.id);
            closePlantillasModal();
        }

        // ==========================================
        // EDITOR MODAL
        // ==========================================

        const editorOverlay = document.getElementById('editorOverlay');
        let edImagenBase64 = null;

        function abrirEditor(id) {
            editorIdActual = id;
            edImagenBase64 = null;

            const p = id ? plantillas.find(x => x.id === id) : null;

            // Show/hide delete button
            document.getElementById('edBtnEliminar').style.display = id ? 'flex' : 'none';

            // Populate fields
            document.getElementById('edNombre').value = p ? p.nombre : '';
            document.getElementById('edColor').value = p ? p.color : '#4f46e5';

            // Image
            const zone = document.getElementById('imgUploadZone');
            if (p && p.imagen) {
                edImagenBase64 = p.imagen;
                zone.innerHTML = `
                    <img src="${p.imagen}" alt="Imagen de plantilla">
                    <button class="img-clear-btn" onclick="clearEditorImage(event)">×</button>`;
            } else {
                zone.innerHTML = `<span class="img-upload-icon">🖼️</span><span>Subir Imagen</span>`;
            }

            // Variables
            const vc = p ? p.variablesConfig : { x:{activa:true,descripcion:''}, y:{activa:false,descripcion:''}, z:{activa:false,descripcion:''} };
            ['x','y','z'].forEach(v => {
                const cb = document.getElementById(`var${v.toUpperCase()}`);
                const di = document.getElementById(`desc${v.toUpperCase()}`);
                cb.checked = vc[v].activa;
                di.value = vc[v].descripcion;
                di.disabled = !vc[v].activa;
            });

            // Formulas
            const rows = document.getElementById('edFormulaRows');
            rows.innerHTML = '';
            const fms = p ? p.formulas : [{ etiqueta: '', formula: '' }];
            fms.forEach(f => edAgregarFormula(f.etiqueta, f.formula));

            // Show editor
            closePlantillasModal();
            editorOverlay.classList.add('show');
            document.body.style.overflow = 'hidden';
        }

        function cerrarEditor() {
            editorOverlay.classList.remove('show');
            document.body.style.overflow = '';
            // Re-open the plantillas list
            openPlantillasModal();
        }

        // Variable checkbox enable/disable linked input
        ['X','Y','Z'].forEach(v => {
            const cb = document.getElementById(`var${v}`);
            const di = document.getElementById(`desc${v}`);
            cb.addEventListener('change', () => { di.disabled = !cb.checked; });
        });

        // Image upload
        function triggerImageUpload() {
            if (edImagenBase64) return; // don't re-open if image already set
            document.getElementById('edImageInput').click();
        }

        function handleImageUpload(event) {
            const file = event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = e => {
                edImagenBase64 = e.target.result;
                const zone = document.getElementById('imgUploadZone');
                zone.innerHTML = `
                    <img src="${edImagenBase64}" alt="Imagen">
                    <button class="img-clear-btn" onclick="clearEditorImage(event)">×</button>`;
            };
            reader.readAsDataURL(file);
            // Reset input so the same file can be selected again later
            event.target.value = '';
        }

        function clearEditorImage(event) {
            event.stopPropagation();
            edImagenBase64 = null;
            const zone = document.getElementById('imgUploadZone');
            zone.innerHTML = `<span class="img-upload-icon">🖼️</span><span>Subir Imagen</span>`;
        }

        // Formula rows
        function edAgregarFormula(etiqueta = '', formula = '') {
            const rows = document.getElementById('edFormulaRows');
            const row = document.createElement('div');
            row.className = 'formula-row';
            row.innerHTML = `
                <input type="text" class="input-etiqueta" placeholder="Etiqueta" value="${etiqueta}">
                <input type="text" class="input-formula-ed" placeholder="Fórmula" value="${formula}">
                <button class="btn-remove-formula" onclick="this.parentElement.remove()" title="Eliminar">×</button>`;
            rows.appendChild(row);
        }

        // Save plantilla to IndexedDB
        async function guardarPlantillaDesdeEditor() {
            const nombre = document.getElementById('edNombre').value.trim();
            if (!nombre) {
                document.getElementById('edNombre').focus();
                return;
            }

            const formulas = Array.from(document.querySelectorAll('#edFormulaRows .formula-row')).map(row => ({
                etiqueta: row.querySelector('.input-etiqueta').value.trim() || 'Resultado',
                formula: row.querySelector('.input-formula-ed').value.trim()
            })).filter(f => f.formula);

            const plantilla = {
                id: editorIdActual || generarId(),
                timestamp: Date.now(),
                nombre,
                color: document.getElementById('edColor').value,
                imagen: edImagenBase64 || null,
                variablesConfig: {
                    x: { activa: document.getElementById('varX').checked, descripcion: document.getElementById('descX').value.trim() },
                    y: { activa: document.getElementById('varY').checked, descripcion: document.getElementById('descY').value.trim() },
                    z: { activa: document.getElementById('varZ').checked, descripcion: document.getElementById('descZ').value.trim() }
                },
                formulas: formulas.length ? formulas : [{ etiqueta: 'Resultado', formula: '' }]
            };

            await dbSave(plantilla);

            // Sync cache
            const idx = plantillas.findIndex(x => x.id === plantilla.id);
            if (idx > -1) plantillas[idx] = plantilla;
            else plantillas.push(plantilla);

            // Synchronize open tabs in workBar with updated plantilla info
            let tabsModified = false;
            activeTabs.forEach(t => {
                if (t.plantillaId === plantilla.id) {
                    t.nombre = plantilla.nombre;
                    t.color = plantilla.color;
                    tabsModified = true;
                }
            });

            if (tabsModified) {
                await dbSaveTabs(activeTabs);
                renderActiveTabs();
            }

            // Always update active sheet viewer to reflect new image, inputs, and formulas
            renderActiveSheet();

            cerrarEditor();
        }

        async function eliminarPlantillaActual() {
            if (!editorIdActual) return;
            if (!confirm('¿Eliminar esta plantilla? Esta acción no se puede deshacer.')) return;

            // Generate tombstone ("id cadáver") for cloud sync
            await dbSaveTombstone({ id: editorIdActual, timestamp: Date.now() });

            await dbDelete(editorIdActual);
            plantillas = plantillas.filter(x => x.id !== editorIdActual);

            // Remove open tabs associated with deleted plantilla
            const initialTabCount = activeTabs.length;
            activeTabs = activeTabs.filter(t => t.plantillaId !== editorIdActual);
            if (activeTabs.length !== initialTabCount) {
                if (activeTabs.length > 0 && !activeTabs.some(t => t.active)) {
                    activeTabs[activeTabs.length - 1].active = true;
                }
                await dbSaveTabs(activeTabs);
                renderActiveTabs();
            }

            renderActiveSheet();

            editorOverlay.classList.remove('show');
            document.body.style.overflow = '';
            openPlantillasModal();
        }

        // Scroll shadow triggers
        function updateScrollShadows() {
            const maxScroll = tabsWrapper.scrollWidth - tabsWrapper.clientWidth;
            const scrollLeft = tabsWrapper.scrollLeft;

            if (scrollLeft > 3) {
                workBar.classList.add('scrolled-left');
            } else {
                workBar.classList.remove('scrolled-left');
            }

            if (scrollLeft < maxScroll - 3 && maxScroll > 0) {
                workBar.classList.add('scrolled-right');
            } else {
                workBar.classList.remove('scrolled-right');
            }
        }