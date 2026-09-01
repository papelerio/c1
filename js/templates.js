// Plantilla especial integrada (no editable, no eliminable)
const PLANTILLA_ESPECIAL = {
    id: -1,
    n: '🧮 Calculadora Rápida',
    c: '#1a1a1a',
    useY: false,
    useZ: false,
    esEspecial: true,
    f: [{ l: 'Resultado', f: 'expresion' }]
};

// Cargar plantillas desde Local Storage
let templates = JSON.parse(localStorage.getItem('t')) || [];
if (!templates.some(t => t.id === -1)) {
    templates.unshift(PLANTILLA_ESPECIAL);
}

/**
 * Determina si un color hexadecimal es oscuro.
 * @param {string} hex - Color hexadecimal (ej: #ffffff).
 * @returns {boolean} True si es oscuro, false en caso contrario.
 */
function isDarkColor(hex) { 
    if (!hex || hex.length < 7) return false;
    let r = parseInt(hex.slice(1,3), 16);
    let g = parseInt(hex.slice(3,5), 16);
    let b = parseInt(hex.slice(5,7), 16); 
    return (r * 299 + g * 587 + b * 114) / 1000 < 128; 
}

/**
 * Renderiza la lista de plantillas disponibles en el modal.
 */
function renderTemplatesList() {
    const listContainer = document.getElementById('listTemplates');
    if (!listContainer) return;
    listContainer.innerHTML = '';
    
    templates.forEach(template => {
        if (template.esEspecial) {
            listContainer.innerHTML += `
                <div class="template-tag" style="background:${template.c}; opacity:0.9; color:#fff">
                    <span onclick="spawnVignette(${template.id})" style="flex:1; cursor:pointer">⭐ ${template.n}</span>
                    <span style="font-size:0.8rem; opacity:0.7">🔒 Especial</span>
                </div>`;
        } else {
            const dark = isDarkColor(template.c);
            listContainer.innerHTML += `
                <div class="template-tag" style="background:${template.c}; color:${dark ? '#fff' : '#222'}">
                    <span onclick="spawnVignette(${template.id})" style="flex:1; cursor:pointer; display:flex; align-items:center;">📄 ${template.n}</span>
                    <button class="icon-btn" onclick="openTemplateEditor(${template.id})" title="Editar">✎</button>
                </div>`;
        }
    });
}

/**
 * Abre el modal editor de plantillas.
 * @param {number|null} id - ID de la plantilla a editar o null para una nueva.
 */
function openTemplateEditor(id = null) {
    if (id === -1) {
        alert('❌ La plantilla especial no se puede editar');
        return;
    }
    
    openModal('mEdit');
    
    // Cargar datos (o valores por defecto si es una nueva)
    const template = templates.find(x => x.id == id) || { 
        id: '', n: '', c: '#4a90e2', useY: false, useZ: false, f: [{ l: '', f: '' }] 
    };
    
    document.getElementById('edId').value = template.id;
    document.getElementById('edName').value = template.n;
    document.getElementById('edColor').value = template.c;
    document.getElementById('useY').checked = template.useY;
    document.getElementById('useZ').checked = template.useZ;
    
    document.getElementById('descX').value = template.descX || '';
    document.getElementById('descY').value = template.descY || '';
    document.getElementById('descZ').value = template.descZ || '';
    
    // Mostrar botón eliminar solo si está editando una plantilla existente
    document.getElementById('btnDeleteTemp').style.display = (id && id !== -1) ? 'block' : 'none';
    
    // Cargar campos dinámicos de fórmulas
    const fieldsContainer = document.getElementById('edFields');
    fieldsContainer.innerHTML = '<p style="font-size:0.8rem; margin-bottom:5px; font-weight:bold">Fórmulas de Resultado:</p>';
    
    (template.f || []).forEach(f => addFormulaField(f.l, f.f));
    
    const btnAdd = document.createElement('button');
    btnAdd.className = 'btn btn-secondary';
    btnAdd.type = 'button';
    btnAdd.innerText = '+ Añadir Fórmula';
    btnAdd.onclick = () => addFormulaField();
    fieldsContainer.appendChild(btnAdd);
}

/**
 * Añade una fila de inputs para definir una fórmula en el editor.
 */
function addFormulaField(label = '', formula = '') {
    const div = document.createElement('div');
    div.className = 'field-row';
    div.innerHTML = `
        <input placeholder="Etiqueta (Ej: Volumen)" class="input-label" value="${label.replace(/"/g, '&quot;')}">
        <input placeholder="Fórmula (Ej: x*y*z)" class="input-formula" value="${formula.replace(/"/g, '&quot;')}">
        <button onclick="this.parentElement.remove()" style="border:none; background:none; color:#e74c3c; font-size:1.4rem; cursor:pointer;" title="Eliminar fórmula" type="button">&times;</button>
    `;
    const fCont = document.getElementById('edFields');
    fCont.insertBefore(div, fCont.lastElementChild);
}

/**
 * Guarda los cambios realizados en el editor de plantillas.
 */
function saveTemplate() {
    const idInputValue = document.getElementById('edId').value;
    const newId = idInputValue ? parseInt(idInputValue) : Date.now();
    
    if (newId === -1) {
        alert('❌ No se puede modificar la plantilla especial');
        return;
    }
    
    const fieldRows = Array.from(document.querySelectorAll('.field-row'));
    
    const newTemplate = {
        id: newId,
        n: document.getElementById('edName').value || 'Sin nombre',
        c: document.getElementById('edColor').value,
        useY: document.getElementById('useY').checked,
        useZ: document.getElementById('useZ').checked,
        descX: document.getElementById('descX').value,
        descY: document.getElementById('descY').value,
        descZ: document.getElementById('descZ').value,
        f: fieldRows.map(row => ({
            l: row.querySelector('.input-label').value || '?',
            f: row.querySelector('.input-formula').value.toLowerCase().replace(/\s/g, '')
        }))
    };

    const indexToUpdate = templates.findIndex(x => x.id === newId);
    if (indexToUpdate > -1) {
        templates[indexToUpdate] = newTemplate;
    } else {
        templates.push(newTemplate);
    }
    
    localStorage.setItem('t', JSON.stringify(templates));
    renderVignettes(); 
    openModal('mTemplates');
}

/**
 * Elimina la plantilla seleccionada del Local Storage y actualiza la UI.
 */
const deleteTemplate = () => { 
    const id = parseInt(document.getElementById('edId').value);
    if (id === -1) {
        alert('❌ No se puede eliminar la plantilla especial');
        return;
    }
    if(confirm('¿Seguro que deseas borrar esta plantilla? Esto no eliminará las tarjetas ya creadas.')) { 
        templates = templates.filter(x => x.id !== id); 
        localStorage.setItem('t', JSON.stringify(templates)); 
        openModal('mTemplates'); 
    } 
};
