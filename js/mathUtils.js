/**
 * Preprocesa funciones trigonométricas en español.
 * sen  -> Math.sin
 * cos  -> Math.cos
 * tan  -> Math.tan
 * asen -> Math.asin
 * acos -> Math.acos
 * atan -> Math.atan
 */
function preprocesarTrigonometria(expr) {
    return expr.replace(/(?<![a-z0-9.])(asen|acos|atan|sen|cos|tan)\(/gi, (match) => {
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
}

/**
 * Preprocesa raíces en notación √ antes de pasar al evaluador.
 * Soporta:
 *   √N        → Math.pow(N, 1/2)        raíz cuadrada
 *   √(expr)   → Math.pow((expr), 1/2)   raíz cuadrada de expresión
 *   N√M       → Math.pow(M, 1/N)        raíz N-ésima de número
 *   N√(expr)  → Math.pow((expr), 1/N)   raíz N-ésima de expresión
 */
function preprocesarRaices(expr) {
    while (expr.includes('√')) {
        let idx = expr.indexOf('√');
        
        // Find the radicand on the right
        let rightStart = idx + 1;
        let rightEnd = rightStart;
        if (expr[rightStart] === '(') {
            let parenCount = 1;
            rightEnd++;
            while (rightEnd < expr.length && parenCount > 0) {
                if (expr[rightEnd] === '(') parenCount++;
                else if (expr[rightEnd] === ')') parenCount--;
                rightEnd++;
            }
        } else {
            while (rightEnd < expr.length && /[0-9a-z.]/i.test(expr[rightEnd])) {
                rightEnd++;
            }
        }
        let radicand = expr.substring(rightStart, rightEnd);
        
        // Find the index on the left (if any)
        let leftEnd = idx;
        let leftStart = leftEnd;
        if (leftEnd > 0) {
            if (expr[leftEnd - 1] === ')') {
                let parenCount = 1;
                leftStart -= 2;
                while (leftStart >= 0 && parenCount > 0) {
                    if (expr[leftStart] === ')') parenCount++;
                    else if (expr[leftStart] === '(') parenCount--;
                    leftStart--;
                }
                leftStart++;
            } else if (/[0-9a-z.]/i.test(expr[leftEnd - 1])) {
                while (leftStart > 0 && /[0-9a-z.]/i.test(expr[leftStart - 1])) {
                    leftStart--;
                }
            }
        }
        
        let rootIndex = expr.substring(leftStart, leftEnd);
        
        let replacement;
        if (rootIndex.trim() === "") {
            replacement = `Math.pow(${radicand},0.5)`;
        } else {
            replacement = `Math.pow(${radicand},1/(${rootIndex}))`;
        }
        
        expr = expr.substring(0, leftStart) + replacement + expr.substring(rightEnd);
    }
    return expr;
}

/**
 * Evalúa expresiones matemáticas libres ingresadas por el usuario.
 */
function evaluarExpresion(expresion) {
    try {
        let limpia = expresion.trim().replace(/\s/g, '');
        if (!limpia) return '0';

        // Normalizar coma decimal → punto (ej: 1,5 → 1.5)
        limpia = limpia.replace(/,/g, '.');

        // Convertir trigonometría a notación de JavaScript Math.*
        limpia = preprocesarTrigonometria(limpia);

        // Validar caracteres (incluyendo %, √, ^ y letras de funciones trigonométricas en Math)
        if (!/^[0-9+\-*/().%√^Math\.sinco]+$/i.test(limpia)) {
            throw new Error('Caracteres no permitidos');
        }

        // Convertir % a /100 (ej: 70% -> 70/100)
        limpia = limpia.replace(/([0-9.]+)(%)/g, "($1/100)");

        // Convertir ^ a ** (potencia)
        limpia = limpia.replace(/\^/g, '**');

        // Convertir notación √ a Math.pow()
        limpia = preprocesarRaices(limpia);

        const resultado = eval(limpia);
        if (isNaN(resultado) || !isFinite(resultado)) {
            throw new Error('Resultado inválido');
        }
        
        const strFull = resultado.toString();
        const partes = strFull.split('.');
        
        if (partes.length === 1) return strFull;
        if (partes[1].length <= 10) return strFull;
        
        const redondeado = parseFloat(resultado.toFixed(10)).toString();
        return redondeado;
    } catch (e) {
        return 'Error en expresión';
    }
}

/**
 * Evalúa las fórmulas de las plantillas sustituyendo las variables X, Y, Z.
 */
function evaluarFormula(formula, x, y, z) { 
    try { 
        let procesada = formula.toLowerCase().replace(/\s/g, '');

        // Normalizar coma decimal → punto (ej: 1,5 → 1.5)
        procesada = procesada.replace(/,/g, '.');

        procesada = procesada.replace(/([0-9.xyz]+)(%)/g, "($1/100)");

        // Convertir ^ a ** (potencia)
        procesada = procesada.replace(/\^/g, '**');

        // Convertir trigonometría a notación de JavaScript Math.*
        procesada = preprocesarTrigonometria(procesada);

        // Sustituir variables antes de procesar raíces
        procesada = procesada.replace(/x/g, `(${x||0})`)
                             .replace(/y/g, `(${y||0})`)
                             .replace(/z/g, `(${z||0})`);

        // Convertir notación √ a Math.pow()
        procesada = preprocesarRaices(procesada);

        const resultado = eval(procesada);
        if (typeof resultado === 'number' && !isNaN(resultado)) {
            return parseFloat(resultado.toFixed(6)).toString();
        }
        return resultado.toString();
    } catch { 
        return '...'; 
    }
}
