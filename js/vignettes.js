// Cargar viñetas desde Local Storage
let vignettes = JSON.parse(localStorage.getItem('v')) || [];

/**
 * Renderiza todas las viñetas (tarjetas) en el contenedor principal.
 */
function renderVignettes() {
    const container = document.getElementById('vignettesContainer');
    if (!container) return;
    
    if (!vignettes.length) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">🧮</span>
                <p>No tienes calculadoras activas. Toca el botón de plantillas (📄) para empezar.</p>
            </div>`;
        return;
    }
    
    container.innerHTML = '';
    
    vignettes.forEach(vignette => {
        const template = templates.find(temp => temp.id == vignette.tId);
        if (!template) return;
        
        if (template.esEspecial) {
            renderSpecialVignette(container, vignette, template);
        } else {
            renderNormalVignette(container, vignette, template);
        }
    });

    // Asignar listeners a los textareas después de renderizar dinámicamente
    vignettes.forEach(vignette => {
        const temp = templates.find(t => t.id == vignette.tId);
        if (temp && temp.esEspecial) {
            const textarea = document.getElementById(`textarea-${vignette.id}`);
            if (textarea) {
                textarea.addEventListener('input', function() {
                    updateSpecialValue(vignette.id, this.value);
                });
            }
        }
    });
}

/**
 * Renderiza la viñeta especial (Calculadora rápida / Libre).
 */
function renderSpecialVignette(container, vignette, template) {
    const expresionActual = (vignette.expresion || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const resultado = evaluarExpresion(vignette.expresion || '');
    
    container.innerHTML += `
        <div class="card card-special" id="card-especial-${vignette.id}" data-id="${vignette.id}">
            <div class="card-header" style="background:${template.c}; color:#fff">
                <div class="header-left">
                    <span class="drag-icon" title="Arrastrar para ordenar">☰</span>
                    <span class="info-btn" onclick="toggleFormulas(${vignette.id})" title="Ver Info">❓</span>
                    <span class="header-title">${template.n}</span>
                    <span class="plantilla-especial-badge">LIBRE</span>
                </div>
                <button class="delete-btn" onclick="deleteVignette(${vignette.id})" title="Eliminar calculadora" type="button">&times;</button>
            </div>
            <div class="card-body">
                <div id="formulas-${vignette.id}" class="formulas-box">
                    <p><strong>Calculadora de expresión libre:</strong> Escribe operaciones directamente. Soporta variables, operaciones básicas, agrupaciones, potencias y trigonometría.</p>
                    <div class="formula-examples">
                        <div>Raíces: <code>√9</code> (3) | <code>3√8</code> (2) | <code>√(2+2)</code> (2)</div>
                        <div>Potencias: <code>2^3</code> (8) | <code>3^2.5</code> (15.588)</div>
                        <div>Trigonometría: <code>sen(10/10)</code> | <code>cos(1)</code> | <code>tan(1)</code> | <code>asen(1)</code></div>
                    </div>
                </div>
                <div class="input-group">
                    <div class="field-container">
                        <label>📐 Expresión Matemática</label>
                        <textarea id="textarea-${vignette.id}" placeholder="Ej: (12.5 * 4) + sen(1) - 3√8">${expresionActual}</textarea>
                        <small class="helper-text">✅ Soporta: +, -, *, /, %, √, ^, sen, cos, tan, asen, acos, atan</small>
                    </div>
                </div>
                <div class="resultado-especial">
                    <span class="resultado-label">🟰 Resultado:</span>
                    <b class="math-font" id="res-especial-${vignette.id}">${resultado}</b>
                </div>
            </div>
        </div>`;
}

/**
 * Renderiza una viñeta normal basada en una plantilla.
 */
function renderNormalVignette(container, vignette, template) {
    const labelX = template.descX ? `X - ${template.descX}` : 'X';
    const placeX = template.descX ? `placeholder="${template.descX}"` : '';
    let inpHtml = `
        <div class="field-container">
            <label>${labelX}</label>
            <input type="number" id="x-${vignette.id}" value="${vignette.x !== undefined ? vignette.x : ''}" ${placeX} oninput="updateValue(${vignette.id},'x',this.value)">
        </div>`;
    
    if (template.useY) {
        const labelY = template.descY ? `Y - ${template.descY}` : 'Y';
        const placeY = template.descY ? `placeholder="${template.descY}"` : '';
        inpHtml += `
            <div class="field-container">
                <label>${labelY}</label>
                <input type="number" id="y-${vignette.id}" value="${vignette.y !== undefined ? vignette.y : ''}" ${placeY} oninput="updateValue(${vignette.id},'y',this.value)">
            </div>`;
    }
    if (template.useZ) {
        const labelZ = template.descZ ? `Z - ${template.descZ}` : 'Z';
        const placeZ = template.descZ ? `placeholder="${template.descZ}"` : '';
        inpHtml += `
            <div class="field-container">
                <label>${labelZ}</label>
                <input type="number" id="z-${vignette.id}" value="${vignette.z !== undefined ? vignette.z : ''}" ${placeZ} oninput="updateValue(${vignette.id},'z',this.value)">
            </div>`;
    }

    let resHtml = template.f.map((f, i) => `
        <div class="res-item">
            <span class="res-label">${f.l}:</span>
            <b class="math-font" id="r-${vignette.id}-${i}">${evaluarFormula(f.f, vignette.x, vignette.y, vignette.z)}</b>
        </div>
    `).join('');

    const formulasList = template.f.map(f => `<div>${f.l}: <code class="math-font">${f.f}</code></div>`).join('');
    const dark = isDarkColor(template.c);

    container.innerHTML += `
        <div class="card" data-id="${vignette.id}">
            <div class="card-header" style="background:${template.c}; color:${dark ? '#fff' : '#222'}">
                <div class="header-left">
                    <span class="drag-icon" style="opacity: ${dark ? '0.8' : '0.5'}">☰</span>
                    <span class="info-btn" onclick="toggleFormulas(${vignette.id})" title="Ver Fórmulas">❓</span>
                    <span class="header-title">${template.n}</span>
                </div>
                <button class="delete-btn" style="color:${dark ? '#fff' : '#222'}" onclick="deleteVignette(${vignette.id})" title="Eliminar calculadora" type="button">&times;</button>
            </div>
            <div class="card-body">
                <div id="formulas-${vignette.id}" class="formulas-box">
                    <p class="formulas-title">Fórmulas Aplicadas:</p>
                    ${formulasList}
                </div>
                <div class="input-group normal-inputs">${inpHtml}</div>
                <div class="results-box">${resHtml}</div>
            </div>
        </div>`;
}

/**
 * Muestra u oculta la caja con detalles de las fórmulas aplicadas.
 */
function toggleFormulas(id) {
    const box = document.getElementById(`formulas-${id}`);
    if (box) {
        const isCurrentlyOpen = box.classList.contains('open') || box.style.display === 'block';
        if (isCurrentlyOpen) {
            box.style.display = 'none';
            box.classList.remove('open');
        } else {
            box.style.display = 'block';
            box.classList.add('open');
        }
    }
}

/**
 * Actualiza una variable numérica (x, y, z) de una viñeta normal.
 */
function updateValue(id, key, val) {
    const vignette = vignettes.find(x => x.id == id);
    if (!vignette) return;
    
    vignette[key] = val === '' ? '' : (parseFloat(val) || 0);
    const template = templates.find(temp => temp.id == vignette.tId);
    if (!template) return;
    
    template.f.forEach((f, i) => {
        const el = document.getElementById(`r-${vignette.id}-${i}`);
        if (el) el.innerText = evaluarFormula(f.f, vignette.x, vignette.y, vignette.z);
    });
    
    localStorage.setItem('v', JSON.stringify(vignettes));
}

/**
 * Actualiza la expresión de una viñeta especial (Libre).
 */
function updateSpecialValue(id, expresion) {
    const vignette = vignettes.find(x => x.id == id);
    if (!vignette) return;
    
    vignette.expresion = expresion;
    localStorage.setItem('v', JSON.stringify(vignettes));
    
    const resultado = evaluarExpresion(expresion || '');
    const resultadoSpan = document.getElementById(`res-especial-${id}`);
    if (resultadoSpan) {
        resultadoSpan.textContent = resultado;
    }
}

/**
 * Genera una nueva viñeta basada en la plantilla seleccionada.
 */
const spawnVignette = (templateId) => { 
    const newVignette = { id: Date.now(), tId: templateId, x: '', y: '', z: '' };
    if (templateId === -1) {
        newVignette.expresion = '';
    }
    vignettes.push(newVignette); 
    localStorage.setItem('v', JSON.stringify(vignettes)); 
    renderVignettes(); 
    closeModal(); 
};

/**
 * Elimina una viñeta y actualiza la pantalla.
 */
const deleteVignette = (id) => { 
    if(confirm('¿Eliminar esta calculadora de la pantalla?')) { 
        vignettes = vignettes.filter(x => x.id != id); 
        localStorage.setItem('v', JSON.stringify(vignettes)); 
        renderVignettes(); 
    }
};
