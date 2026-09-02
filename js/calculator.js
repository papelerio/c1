// Toggle Quick Calculator
        function toggleCalculator() {
            calcPanel.classList.toggle('show');
            starBtn.classList.toggle('active');
            
            // Cancel save mode if active when closing calculator
            if (!calcPanel.classList.contains('show') && isSaveModeActive) {
                deactivateSaveMode();
            }
        }

        // Evaluate Math Expression Safely (Returns object with displayVal, exactVal, and isSpecial flag)
        function evaluateExpression(str) {
            if (!str.trim()) return { displayVal: '', exactVal: null, isSpecial: false, isError: false };
            try {
                let sanitized = str.toLowerCase().replace(/\s/g, '');

                // Normalizar coma decimal → punto (ej: 1,5 → 1.5)
                sanitized = sanitized.replace(/,/g, '.');
                
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

                // Replace variable slots (X, Y, Z, A-G) with their stored values (using high precision if special)
                sanitized = sanitized.replace(/(?<![a-z0-9.])([a-gxyz])(?![a-z0-9])/gi, (match) => {
                    const slot = match.toUpperCase();
                    const slotData = storedValues[slot];
                    if (!slotData) return '0';

                    let actualNum;
                    if (typeof slotData === 'object' && slotData !== null) {
                        if (slotData.isSpecial && slotData.exactVal !== undefined && !isNaN(slotData.exactVal)) {
                            actualNum = slotData.exactVal; // High precision float!
                        } else {
                            actualNum = (slotData.val !== undefined && slotData.val !== '') ? slotData.val : '0';
                        }
                    } else {
                        actualNum = slotData !== '' ? slotData : '0';
                    }
                    return `(${actualNum})`;
                });

                // Convert % to /100
                sanitized = sanitized.replace(/([0-9.]+)(%)/g, "($1/100)");

                // Convert ^ to ** (potencia)
                sanitized = sanitized.replace(/\^/g, '**');

                // Convert √ to Math.pow with parenthesis matching
                while (sanitized.includes('√')) {
                    let idx = sanitized.indexOf('√');
                    
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

                if (!/^[0-9+\-*/().%*√^,Math\.sincoapwle ]+$/i.test(sanitized)) {
                    return { displayVal: 'Error', exactVal: null, isSpecial: false, isError: true };
                }

                const evalFunc = new Function(`return (${sanitized});`);
                const res = evalFunc();

                if (typeof res === 'number' && !isNaN(res) && isFinite(res)) {
                    const strFull = res.toString();
                    const rounded10 = Number(res.toFixed(10));
                    const displayVal = rounded10.toString();

                    // Detect non-terminating / high-precision infinite decimals ("Valor Especial")
                    const isSpecial = Math.abs(res - rounded10) > 1e-11 || (strFull.includes('.') && strFull.split('.')[1].length > 10);

                    return {
                        displayVal: displayVal,
                        exactVal: res,
                        isSpecial: isSpecial,
                        isError: false
                    };
                }
                return { displayVal: 'Error', exactVal: null, isSpecial: false, isError: true };
            } catch (e) {
                return { displayVal: 'Error', exactVal: null, isSpecial: false, isError: true };
            }
        }

        // Real-time calculation evaluator
        function runCalc(rowNum) {
            const inputVal = document.getElementById(`calcInput${rowNum}`).value;
            const resultBox = document.getElementById(`result${rowNum}`);
            const brainBtn = document.getElementById(`brainBtn${rowNum}`);
            
            const resData = evaluateExpression(inputVal);
            if (resData.isError || !resData.displayVal || resData.displayVal === 'Error') {
                resultBox.innerText = resData.displayVal || '';
                resultBox.style.color = '#dc2626'; // Error red
                delete resultBox.dataset.exactVal;
                delete resultBox.dataset.isSpecial;

                if (brainBtn) {
                    brainBtn.classList.add('disabled');
                }
            } else {
                resultBox.innerText = resData.displayVal;
                resultBox.dataset.exactVal = resData.exactVal;
                resultBox.dataset.isSpecial = resData.isSpecial ? 'true' : 'false';

                if (resData.isSpecial) {
                    resultBox.style.color = '#ea580c'; // Orange text for special non-terminating value!
                } else {
                    resultBox.style.color = '#1e40af'; // Normal indigo text
                }

                if (brainBtn) {
                    brainBtn.classList.remove('disabled');
                }
            }
        }

        // Trigger Save Mode
        function activateSaveMode(rowNum) {
            const resultBox = document.getElementById(`result${rowNum}`);
            const resultText = resultBox.innerText;
            
            if (!resultText || resultText === 'Error') {
                return; // Nothing to save or error output
            }

            isSaveModeActive = true;
            const isSpecial = resultBox.dataset.isSpecial === 'true';
            const exactVal = parseFloat(resultBox.dataset.exactVal);

            pendingSaveValue = {
                displayVal: resultText,
                exactVal: !isNaN(exactVal) ? exactVal : parseFloat(resultText),
                isSpecial: isSpecial
            };

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

        // Brain 🧠 Button Handler - Opens Step-by-Step Procedure Modal
        function handleBrainClick(rowNum) {
            const brainBtn = document.getElementById(`brainBtn${rowNum}`);
            if (brainBtn && brainBtn.classList.contains('disabled')) return;

            const inputVal = document.getElementById(`calcInput${rowNum}`).value;
            if (!inputVal.trim()) return;

            const resData = evaluateExpression(inputVal);
            if (resData.isError || resData.displayVal === 'Error') {
                return;
            }

            abrirProcedimientoModal(inputVal);
        }

        function formatShortPartialRes(valStr) {
            if (valStr === null || valStr === undefined) return '';
            const s = valStr.toString();
            const parts = s.split('.');
            if (parts.length === 2 && parts[1].length > 4) {
                return `${parts[0]}.${parts[1].substring(0, 4)}...`;
            }
            return s;
        }

        function abrirProcedimientoModal(rawExpr) {
            const container = document.getElementById('procedimientoContent');
            const modal = document.getElementById('procedimientoModal');
            if (!container || !modal) return;

            const pasos = generarPasosProcedimiento(rawExpr);
            if (pasos.length === 0) {
                container.innerHTML = `<p style="color: var(--text-muted); text-align: center;">No se pudo generar el procedimiento.</p>`;
            } else {
                container.innerHTML = pasos.map((paso, idx) => {
                    if (paso.isFinal) {
                        return `
                            <div class="procedimiento-step" style="background: #f0fdf4; border-color: #86efac;">
                                <span class="procedimiento-step-num" style="background: #bbf7d0; color: #14532d;">🟰</span>
                                <div class="procedimiento-expr" style="text-align: center;">
                                    <span class="step-final">${paso.text}</span>
                                </div>
                            </div>`;
                    }

                    const exprHTML = paso.chunks.map(chunk => {
                        if (chunk.highlight) {
                            const shortRes = formatShortPartialRes(chunk.partialResult);
                            return `<span class="step-highlight"><span class="step-partial-res">${shortRes}</span>${chunk.text}</span>`;
                        }
                        return `<span>${chunk.text}</span>`;
                    }).join('');

                    return `
                        <div class="procedimiento-step">
                            <span class="procedimiento-step-num">${idx + 1})</span>
                            <div class="procedimiento-expr">${exprHTML}</div>
                        </div>`;
                }).join('');
            }

            modal.classList.add('show');
        }

        function closeProcedimientoModal() {
            const modal = document.getElementById('procedimientoModal');
            if (modal) modal.classList.remove('show');
        }

        function evalSubExpr(subStr) {
            try {
                let clean = subStr.replace(/\^/g, '**');
                while (clean.includes('√')) {
                    let idx = clean.indexOf('√');
                    let rightStart = idx + 1;
                    let rightEnd = rightStart;
                    while (rightEnd < clean.length && /[0-9.]/.test(clean[rightEnd])) rightEnd++;
                    let radicand = clean.substring(rightStart, rightEnd);
                    let replacement = `Math.pow(${radicand},0.5)`;
                    clean = clean.substring(0, idx) + replacement + clean.substring(rightEnd);
                }
                let res = new Function(`return (${clean})`)();
                if (typeof res === 'number' && !isNaN(res)) {
                    const rounded10 = Number(res.toFixed(10));
                    return rounded10.toString();
                }
                return subStr;
            } catch {
                return subStr;
            }
        }

        function findAllHighestPriorityOps(str) {
            function collectMatches(regex) {
                let results = [];
                let m;
                const gRegex = new RegExp(regex.source, 'g');
                while ((m = gRegex.exec(str)) !== null) {
                    let fullText = m[0];
                    let startIndex = m.index;
                    let endIndex = m.index + fullText.length;
                    let res = evalSubExpr(fullText);
                    results.push({ startIndex, endIndex, fullText, partialResult: res });
                }
                return results;
            }

            // Check Priority 1: ^, √
            let opRegex1 = /(-?[0-9.]+)\^([0-9.]+)|√([0-9.]+)|([0-9.]+)√([0-9.]+)/;
            let matches1 = collectMatches(opRegex1);
            if (matches1.length > 0) return matches1;

            // Check Priority 2: *, / — resolve in PAIRS of 2 (e.g. 2*2*4 → (2*2)*4)
            // Find all mul/div chains, then split each into non-overlapping pairs
            let opRegex2Full = /(-?[0-9.]+(?:\s*[*/]\s*-?[0-9.]+)+)/;
            let mFull;
            let allMulDivTargets = [];
            const gMulDiv = new RegExp(opRegex2Full.source, 'g');
            while ((mFull = gMulDiv.exec(str)) !== null) {
                const chainStr = mFull[0];
                const chainStart = mFull.index;

                // Split chain into individual tokens: numbers and operators
                const tokenRegex = /(-?[0-9.]+|[*/])/g;
                let tokens = [];
                let tok;
                while ((tok = tokenRegex.exec(chainStr)) !== null) {
                    tokens.push({ val: tok[0], idx: chainStart + tok.index });
                }

                // Process pairs: (num op num), (num op num), leftover
                let i = 0;
                while (i < tokens.length) {
                    if (i + 2 < tokens.length) {
                        // Pair: tokens[i] op tokens[i+1] tokens[i+2]
                        const pairStr = tokens[i].val + tokens[i+1].val + tokens[i+2].val;
                        const pairStart = tokens[i].idx;
                        const pairEnd = tokens[i+2].idx + tokens[i+2].val.length;
                        const res = evalSubExpr(pairStr);
                        allMulDivTargets.push({ startIndex: pairStart, endIndex: pairEnd, fullText: pairStr, partialResult: res });
                        i += 4; // skip: num, op, num, (next op if any)
                    } else {
                        break;
                    }
                }
            }
            if (allMulDivTargets.length > 0) return allMulDivTargets;

            // Check Priority 3: +, - (continuous chain of additions and subtractions)
            let opRegex3 = /(-?[0-9.]+(?:\s*[+-]\s*[0-9.]+)+)/;
            let matches3 = collectMatches(opRegex3);
            if (matches3.length > 0) return matches3;

            return [];
        }

        function resolverSiguientePaso(expr) {
            const innerParenRegex = /\(([^()]+)\)/g;
            let matches = [];
            let match;
            let hasInnerParens = false;

            while ((match = innerParenRegex.exec(expr)) !== null) {
                hasInnerParens = true;
                matches.push({
                    fullMatch: match[0],
                    innerContent: match[1],
                    index: match.index
                });
            }

            let targets = [];

            if (hasInnerParens) {
                for (let m of matches) {
                    let inner = m.innerContent;
                    if (/^-?[0-9.]+(\.[0-9]+)?$/.test(inner)) {
                        targets.push({
                            startIndex: m.index,
                            endIndex: m.index + m.fullMatch.length,
                            fullText: m.fullMatch,
                            partialResult: inner
                        });
                        continue;
                    }

                    let subTargets = findAllHighestPriorityOps(inner);
                    for (let subTarget of subTargets) {
                        if (subTarget.fullText === inner) {
                            targets.push({
                                startIndex: m.index,
                                endIndex: m.index + m.fullMatch.length,
                                fullText: m.fullMatch,
                                partialResult: subTarget.partialResult
                            });
                        } else {
                            targets.push({
                                startIndex: m.index + 1 + subTarget.startIndex,
                                endIndex: m.index + 1 + subTarget.endIndex,
                                fullText: subTarget.fullText,
                                partialResult: subTarget.partialResult
                            });
                        }
                    }
                }
            } else {
                let subTargets = findAllHighestPriorityOps(expr);
                for (let subTarget of subTargets) {
                    targets.push({
                        startIndex: subTarget.startIndex,
                        endIndex: subTarget.endIndex,
                        fullText: subTarget.fullText,
                        partialResult: subTarget.partialResult
                    });
                }
            }

            if (targets.length === 0) return null;

            targets.sort((a, b) => a.startIndex - b.startIndex);

            let chunks = [];
            let nextExpr = '';
            let lastIndex = 0;

            for (let t of targets) {
                if (t.startIndex > lastIndex) {
                    const normalText = expr.substring(lastIndex, t.startIndex);
                    chunks.push({ text: normalText, highlight: false });
                    nextExpr += normalText;
                }
                chunks.push({
                    text: t.fullText,
                    highlight: true,
                    partialResult: t.partialResult
                });
                nextExpr += t.partialResult;
                lastIndex = t.endIndex;
            }

            if (lastIndex < expr.length) {
                const normalText = expr.substring(lastIndex);
                chunks.push({ text: normalText, highlight: false });
                nextExpr += normalText;
            }

            nextExpr = nextExpr.replace(/\+\+/g, '+')
                               .replace(/\+-/g, '-')
                               .replace(/--/g, '+');

            return { chunks, nextExpr };
        }

        function generarPasosProcedimiento(rawExpr) {
            let expr = prepararExpresionParaProcedimiento(rawExpr);
            if (!expr) return [];

            const pasos = [];
            let currentExpr = expr;
            let maxSafetyCounter = 20;

            while (maxSafetyCounter-- > 0) {
                if (/^-?[0-9.]+(\.[0-9]+)?$/.test(currentExpr)) {
                    pasos.push({
                        isFinal: true,
                        text: currentExpr
                    });
                    break;
                }

                const stepResult = resolverSiguientePaso(currentExpr);
                if (!stepResult || stepResult.nextExpr === currentExpr) {
                    pasos.push({
                        isFinal: true,
                        text: currentExpr
                    });
                    break;
                }

                pasos.push({
                    isFinal: false,
                    chunks: stepResult.chunks
                });

                currentExpr = stepResult.nextExpr;
            }

            return pasos;
        }

        function prepararExpresionParaProcedimiento(exprStr) {
            let limpia = exprStr.trim().replace(/\s/g, '').replace(/,/g, '.');
            
            limpia = limpia.replace(/(?<![a-z0-9.])([a-gxyz])(?![a-z0-9])/gi, (match) => {
                const slot = match.toUpperCase();
                const slotData = storedValues[slot];
                if (!slotData) return '0';

                let val;
                if (typeof slotData === 'object' && slotData !== null) {
                    val = (slotData.isSpecial && slotData.exactVal !== undefined) ? slotData.exactVal : (slotData.val || '0');
                } else {
                    val = slotData !== '' ? slotData : '0';
                }
                return `(${val})`;
            });

            return limpia;
        }

        // Live manual update of a slot
        function updateSlotManually(slotId, value) {
            const valStr = value.trim();
            const numVal = parseFloat(valStr);

            // User manually typed inside input -> loses Special Value status!
            storedValues[slotId] = {
                val: valStr,
                exactVal: !isNaN(numVal) ? numVal : 0,
                isSpecial: false
            };

            const inputEl = document.getElementById(`input-val-${slotId}`);
            if (inputEl) {
                inputEl.style.color = '#2563eb'; // Reverts to normal blue!
            }

            dbSaveSlots(storedValues).catch(err => console.error("Error al guardar slots:", err));
            runCalc(1);
            runCalc(2);
            if (typeof renderActiveSheet === 'function') {
                renderActiveSheet();
            }
        }

        // Handle Slot selection when clicking badge
        function clickSlot(slotId) {
            if (!isSaveModeActive || !pendingSaveValue) return;

            // Store object in slot
            storedValues[slotId] = {
                val: pendingSaveValue.displayVal,
                exactVal: pendingSaveValue.exactVal,
                isSpecial: pendingSaveValue.isSpecial
            };
            
            // Render stored value in UI input with corresponding color
            const inputEl = document.getElementById(`input-val-${slotId}`);
            if (inputEl) {
                inputEl.value = pendingSaveValue.displayVal;
                if (pendingSaveValue.isSpecial) {
                    inputEl.style.color = '#ea580c'; // Orange!
                } else {
                    inputEl.style.color = '#2563eb'; // Blue!
                }
            }

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
                storedValues[slotId] = { val: '', exactVal: 0, isSpecial: false };
                const inputEl = document.getElementById(`input-val-${slotId}`);
                if (inputEl) {
                    inputEl.value = '';
                    inputEl.style.color = '#2563eb';
                }
            }
            if (isSaveModeActive) {
                deactivateSaveMode();
            }
            dbSaveSlots(storedValues).catch(err => console.error("Error al guardar slots:", err));

            runCalc(1);
            runCalc(2);

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
                if (!inputEl) continue;

                const data = storedValues[slotId];
                if (typeof data === 'object' && data !== null) {
                    inputEl.value = data.val || '';
                    if (data.isSpecial) {
                        inputEl.style.color = '#ea580c'; // Orange for special value
                    } else {
                        inputEl.style.color = '#2563eb'; // Normal blue
                    }
                } else {
                    inputEl.value = data || '';
                    inputEl.style.color = '#2563eb';
                }
            }
        }