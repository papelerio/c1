// Toggle Quick Calculator
        function toggleCalculator() {
            calcPanel.classList.toggle('show');
            starBtn.classList.toggle('active');
            
            // Cancel save mode if active when closing calculator
            if (!calcPanel.classList.contains('show') && isSaveModeActive) {
                deactivateSaveMode();
            }
        }

        // Evaluate Math Expression Safely
        function evaluateExpression(str) {
            if (!str.trim()) return '';
            try {
                let sanitized = str.toLowerCase().replace(/\s/g, '');

                // Normalizar coma decimal → punto (ej: 1,5 → 1.5)
                sanitized = sanitized.replace(/,/g, '.');
                
                // Replace variable slots A-H with their stored values
                sanitized = sanitized.replace(/(?<![a-z0-9.])([a-h])(?![a-z0-9])/gi, (match) => {
                    const slot = match.toUpperCase();
                    const val = storedValues[slot];
                    return val !== '' ? `(${val})` : '0';
                });

                // Preprocess trigonometry (Spanish names support)
                sanitized = sanitized.replace(/(?<![a-z0-9.])(asen|acos|atan|sen|cos|tan)\(/gi, (match) => {
                    const name = match.slice(0, -1).toLowerCase();
                    const map = {
                        'asen': 'Math.asin(',
                        'acos': 'Math.acos(',
                        'atan': 'Math.atan(',
                        'sen': 'Math.sin(',
                        'cos': 'Math.cos(',
                        'tan': 'Math.tan('
                    };
                    return map[name];
                });

                // Convert % to /100
                sanitized = sanitized.replace(/([0-9.]+)(%)/g, "($1/100)");

                // Convert ^ to ** (potencia)
                sanitized = sanitized.replace(/\^/g, '**');

                // Convert √ to Math.pow with parenthesis matching
                while (sanitized.includes('√')) {
                    let idx = sanitized.indexOf('√');
                    
                    // Find the radicand on the right
                    let rightStart = idx + 1;
                    let rightEnd = rightStart;
                    if (sanitized[rightStart] === '(') {
                        let parenCount = 1;
                        rightEnd++;
                        while (rightEnd < sanitized.length && parenCount > 0) {
                            if (sanitized[rightEnd] === '(') parenCount++;
                            else if (sanitized[rightEnd] === ')') parenCount--;
                            rightEnd++;
                        }
                    } else {
                        while (rightEnd < sanitized.length && /[0-9a-z.]/i.test(sanitized[rightEnd])) {
                            rightEnd++;
                        }
                    }
                    let radicand = sanitized.substring(rightStart, rightEnd);
                    
                    // Find the index on the left (if any)
                    let leftEnd = idx;
                    let leftStart = leftEnd;
                    if (leftEnd > 0) {
                        if (sanitized[leftEnd - 1] === ')') {
                            let parenCount = 1;
                            leftStart -= 2;
                            while (leftStart >= 0 && parenCount > 0) {
                                if (sanitized[leftStart] === ')') parenCount++;
                                else if (sanitized[leftStart] === '(') parenCount--;
                                leftStart--;
                            }
                            leftStart++;
                        } else if (/[0-9a-z.]/i.test(sanitized[leftEnd - 1])) {
                            while (leftStart > 0 && /[0-9a-z.]/i.test(sanitized[leftStart - 1])) {
                                leftStart--;
                            }
                        }
                    }
                    
                    let rootIndex = sanitized.substring(leftStart, leftEnd);
                    
                    let replacement;
                    if (rootIndex.trim() === "") {
                        replacement = `Math.pow(${radicand},0.5)`;
                    } else {
                        replacement = `Math.pow(${radicand},1/(${rootIndex}))`;
                    }
                    
                    sanitized = sanitized.substring(0, leftStart) + replacement + sanitized.substring(rightEnd);
                }

                // Translate remaining math properties securely
                sanitized = sanitized.replace(/(?<!Math\.)sin\(/g, 'Math.sin(')
                                     .replace(/(?<!Math\.)cos\(/g, 'Math.cos(')
                                     .replace(/(?<!Math\.)tan\(/g, 'Math.tan(')
                                     .replace(/(?<!Math\.)sqrt\(/g, 'Math.sqrt(')
                                     .replace(/(?<!Math\.)log\(/g, 'Math.log(')
                                     .replace(/(?<!Math\.)pow\(/g, 'Math.pow(')
                                     .replace(/(?<![a-z0-9.])pi(?![a-z0-9])/g, 'Math.PI')
                                     .replace(/(?<![a-z0-9.])e(?![a-z0-9])/g, 'Math.E');

                // Safely evaluate only with allowed characters
                if (!/^[0-9+\-*/().%*√^,Math\.sincoapwle ]+$/i.test(sanitized)) {
                    return 'Error';
                }

                const evalFunc = new Function(`return (${sanitized});`);
                const res = evalFunc();
                if (typeof res === 'number' && !isNaN(res)) {
                    return Number(res.toFixed(10));
                }
                return 'Error';
            } catch (e) {
                return 'Error';
            }
        }

        // Real-time calculation evaluator
        function runCalc(rowNum) {
            const inputVal = document.getElementById(`calcInput${rowNum}`).value;
            const resultBox = document.getElementById(`result${rowNum}`);
            
            const result = evaluateExpression(inputVal);
            resultBox.innerText = result;
        }

        // Trigger Save Mode
        function activateSaveMode(rowNum) {
            const resultText = document.getElementById(`result${rowNum}`).innerText;
            
            if (!resultText || resultText === 'Error') {
                return; // Nothing to save or error output
            }

            isSaveModeActive = true;
            pendingSaveValue = parseFloat(resultText);

            // Make A-H badges pulsate
            const badges = document.querySelectorAll('.slot-badge');
            badges.forEach(badge => badge.classList.add('pulsate'));
        }

        // Deactivate Save Mode
        function deactivateSaveMode() {
            isSaveModeActive = false;
            pendingSaveValue = null;

            const badges = document.querySelectorAll('.slot-badge');
            badges.forEach(badge => badge.classList.remove('pulsate'));
        }

        // Live manual update of a slot
        function updateSlotManually(slotId, value) {
            storedValues[slotId] = value.trim();
            dbSaveSlots(storedValues).catch(err => console.error("Error al guardar slots:", err));
            runCalc(1);
            runCalc(2);
            if (typeof renderActiveSheet === 'function') {
                renderActiveSheet();
            }
        }

        // Handle Slot selection when clicking badge
        function clickSlot(slotId) {
            if (!isSaveModeActive) return; // Slots don't do anything in normal state

            // Store value in slot
            storedValues[slotId] = pendingSaveValue;
            
            // Render stored value in UI input
            const inputEl = document.getElementById(`input-val-${slotId}`);
            if (inputEl) inputEl.value = pendingSaveValue;

            // Turn off save mode
            deactivateSaveMode();

            // Persist slots to IndexedDB
            dbSaveSlots(storedValues).catch(err => console.error("Error al guardar slots:", err));

            // Recalculate calculator rows automatically
            runCalc(1);
            runCalc(2);

            // Recalculate active sheet if open
            if (typeof renderActiveSheet === 'function') {
                renderActiveSheet();
            }
        }

        // Clear All Slots
        function clearAllSlots() {
            for (let slotId in storedValues) {
                storedValues[slotId] = '';
                const inputEl = document.getElementById(`input-val-${slotId}`);
                if (inputEl) inputEl.value = '';
            }
            if (isSaveModeActive) {
                deactivateSaveMode();
            }
            // Persist slots to IndexedDB
            dbSaveSlots(storedValues).catch(err => console.error("Error al guardar slots:", err));

            // Recalculate calculator rows automatically
            runCalc(1);
            runCalc(2);

            // Recalculate active sheet if open
            if (typeof renderActiveSheet === 'function') {
                renderActiveSheet();
            }
        }

        // Help Modal Controls
        function openHelpModal() {
            helpModal.classList.add('show');
        }

        function closeHelpModal() {
            helpModal.classList.remove('show');
        }

        // Render Slots Values in UI from memory
        function renderSlots() {
            for (let slotId in storedValues) {
                const inputEl = document.getElementById(`input-val-${slotId}`);
                if (inputEl) inputEl.value = storedValues[slotId] || '';
            }
        }

        // ==========================================