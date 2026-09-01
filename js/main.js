/**
 * Abre un modal por su ID.
 * @param {string} id - ID del elemento modal.
 */
function openModal(id) { 
    // Ocultar todos los modales primero
    document.querySelectorAll('.modal').forEach(m => {
        m.style.display = 'none';
        m.classList.remove('modal-show');
    }); 
    
    const targetModal = document.getElementById(id);
    if (targetModal) {
        targetModal.style.display = 'flex'; // Centrado usando Flexbox en el nuevo estilo
        setTimeout(() => {
            targetModal.classList.add('modal-show');
        }, 10);
    }
    
    if (id === 'mTemplates') {
        renderTemplatesList(); 
    }
}

/**
 * Cierra todos los modales abiertos.
 */
function closeModal() {
    document.querySelectorAll('.modal').forEach(m => {
        m.classList.remove('modal-show');
        setTimeout(() => {
            m.style.display = 'none';
        }, 300); // Dar tiempo a la animación de cierre (fade out)
    });
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Renderizar las viñetas almacenadas
    renderVignettes();

    // Configurar Drag and Drop para reorganizar las viñetas con SortableJS
    const container = document.getElementById('vignettesContainer');
    if (container && typeof Sortable !== 'undefined') {
        Sortable.create(container, {
            animation: 250, // Animación más suave
            handle: '.drag-icon', // Permite arrastrar solo desde el tirador
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            dragClass: 'sortable-drag',
            onEnd: function (evt) {
                const newOrderIds = Array.from(evt.to.children).map(child => parseInt(child.dataset.id));
                const newVignettesArray = [];
                
                newOrderIds.forEach(id => {
                    const found = vignettes.find(v => v.id === id);
                    if (found) newVignettesArray.push(found);
                });
                
                vignettes = newVignettesArray;
                localStorage.setItem('v', JSON.stringify(vignettes));
            }
        });
    }

    // Cerrar modales haciendo click fuera de la caja de contenido
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
    });
});
