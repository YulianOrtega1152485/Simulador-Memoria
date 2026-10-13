import { Conversions } from './conversions.js';

/**
 * Motor de Lógica para Modo Protegido
 */
export const ProtectedModeEngine = {
    /**
     * Calcula la dirección lineal/física en modo protegido.
     * Fórmula: Base + Offset
     *
     * @param {string} baseHex - Dirección base extraída del descriptor
     * @param {string} offsetHex - Valor del offset
     * @param {number} limitDec - Límite definido en el descriptor (20 bits)
     * @param {Object} [options={}] - Opciones de descriptor/selector
     * @param {boolean} [options.granular=false] - Bit G (granularidad 4KB)
     * @param {boolean} [options.present=true] - Bit P (presente)
     * @param {boolean} [options.isNullSelector=false] - Selector nulo (0000-0003)
     * @param {boolean} [options.indexValid=true] - Índice dentro de GDT/LDT
     * @param {number} [options.cpl=0] - Nivel de privilegio actual (CPL)
     * @param {number} [options.rpl=0] - Nivel de privilegio solicitado (RPL)
     * @param {number} [options.dpl=0] - Nivel de privilegio del descriptor (DPL)
     * @param {string} [options.operation=null] - Operación pedida: Leer/Escribir/Ejecutar/Usar como pila
     * @param {boolean} [options.isCode=false] - El descriptor es de Código
     * @param {boolean} [options.isData=false] - El descriptor es de Datos
     * @param {boolean} [options.rw=false] - Bit R/W del acceso (W en Datos, R en Código)
     * @returns {Object} Resultado del cálculo y validación de seguridad
     */
    calculatePhysicalAddress: (baseHex, offsetHex, limitDec, options = {}) => {
        const {
            granular = false,
            present = true,
            isNullSelector = false,
            indexValid = true,
            cpl = 0,
            rpl = 0,
            dpl = 0,
            operation = null,
            isCode = false,
            isData = false,
            rw = false
        } = options;

        const baseDec = Conversions.hexToDec(baseHex);
        const offsetDec = Conversions.hexToDec(offsetHex);

        const limitEffective = granular
            ? (limitDec * 0x1000) + 0xFFF
            : limitDec;

        const limitEffectiveHex = Conversions.decToHex(limitEffective);
        const rangeStartHex = baseHex;
        const rangeEndHex = Conversions.decToHex(baseDec + limitEffective);

        const fail = (error) => ({
            base: baseHex,
            offset: offsetHex,
            physicalAddressHex: null,
            physicalAddressDec: null,
            isValid: false,
            error,
            formula: null,
            limitEffective,
            limitEffectiveHex,
            rangeStartHex,
            rangeEndHex
        });

        // Validaciones por prioridad (errores de protección)
        if (isNullSelector) {
            return fail('#GP (General Protection Fault): selector nulo (0000–0003). El índice 0 es el descriptor nulo y no puede usarse para acceder a memoria.');
        }

        if (!indexValid) {
            return fail('#GP (General Protection Fault): el índice del selector está fuera de la GDT (no existe esa entrada).');
        }

        if (!present) {
            return fail('#NP (Segment Not Present): el descriptor tiene P=0 (base y límite no válidos).');
        }

        // Privilegio: max(CPL, RPL) <= DPL
        const privilege = Math.max(cpl, rpl);
        if (privilege > dpl) {
            return fail(`#GP (General Protection Fault): privilegio insuficiente. max(CPL=${cpl}, RPL=${rpl}) = ${privilege} > DPL=${dpl}.`);
        }

        // Tipo/permisos vs operación solicitada
        if (operation === 'Ejecutar') {
            if (!isCode) return fail('#GP: la operación "Ejecutar" requiere un segmento de Código (E=1).');
        } else if (operation === 'Escribir') {
            if (!isData || !rw) return fail('#GP: la operación "Escribir" requiere un segmento de Datos con W=1.');
        } else if (operation === 'Leer') {
            if (isCode && !rw) return fail('#GP: la operación "Leer" en un segmento de Código requiere R=1.');
            if (!isCode && !isData) return fail('#GP: la operación "Leer" requiere un segmento de Código o Datos.');
        } else if (operation === 'Usar como pila') {
            if (!isData || !rw) return fail('#GP: "Usar como pila" (SS) requiere un segmento de Datos con W=1.');
            if (privilege !== dpl) return fail(`#GP: SS exige CPL = RPL = DPL (actual max=${privilege}, DPL=${dpl}).`);
        }

        if (offsetDec > limitEffective) {
            return fail(`#GP: el offset ${offsetHex} (${offsetDec}) supera el límite efectivo ${limitEffectiveHex}.`);
        }

        const physicalDec = baseDec + offsetDec;

        return {
            base: baseHex,
            offset: offsetHex,
            physicalAddressHex: Conversions.decToHex(physicalDec),
            physicalAddressDec: physicalDec,
            isValid: true,
            error: null,
            formula: `${baseHex} + ${offsetHex} = ${Conversions.decToHex(physicalDec)}`,
            limitEffective,
            limitEffectiveHex,
            rangeStartHex,
            rangeEndHex
        };
    }
};
