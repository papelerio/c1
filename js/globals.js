let tabCounter = 0;
        
        // Slot values state
        const storedValues = {
            A: '', B: '', C: '', D: '', E: '', F: '', G: '', H: ''
        };

        // Save mode state
        let isSaveModeActive = false;
        let pendingSaveValue = null;

        const tabsWrapper = document.getElementById('tabsWrapper');
        const workBar = document.getElementById('workBar');
        const calcPanel = document.getElementById('calcPanel');
        const starBtn = document.getElementById('starBtn');
        const helpModal = document.getElementById('helpModal');
        const plantillasOverlay = document.getElementById('plantillasOverlay');

        // ==========================================