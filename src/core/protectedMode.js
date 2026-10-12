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
     * @returns {Object} Resultado del cálculo y validación de seguridad
     */
    calculatePhysicalAddress: (baseHex, offsetHex, limitDec, options = {}) => {
        const {
            granular = false,
            present = true,
            isNullSelector = false,
            indexValid = true
        } = options;

        const baseDec = Conversions.hexToDec(baseHex);
        const offsetDec = Conversions.hexToDec(offsetHex);

        const limitEffective = granular
            ? (limitDec * 0x1000) + 0xFFF
            : limitDec;

        // Validaciones por prioridad (errores de protección)
        if (isNullSelector) {
            return {
                base: baseHex,
                offset: offsetHex,
                physicalAddressHex: null,
                physicalAddressDec: null,
                isValid: false,
                error: '#GP (General Protection Fault): Null selector (segmento nulo no puede usarse).',
                formula: null,
                limitEffective,
                limitEffectiveHex: Conversions.decToHex(limitEffective),
                rangeStartHex: baseHex,
                rangeEndHex: Conversions.decToHex(baseDec + limitEffective)
            };
        }

        if (!indexValid) {
            return {
                base: baseHex,
                offset: offsetHex,
                physicalAddressHex: null,
                physicalAddressDec: null,
                isValid: false,
                error: '#GP (General Protection Fault): Selector fuera de rango de la GDT/LDT.',
                formula: null,
                limitEffective,
                limitEffectiveHex: Conversions.decToHex(limitEffective),
                rangeStartHex: baseHex,
                rangeEndHex: Conversions.decToHex(baseDec + limitEffective)
            };
        }

        if (!present) {
            return {
                base: baseHex,
                offset: offsetHex,
                physicalAddressHex: null,
                physicalAddressDec: null,
                isValid: false,
                error: '#GP (General Protection Fault): Segmento no presente (P=0).',
                formula: null,
                limitEffective,
                limitEffectiveHex: Conversions.decToHex(limitEffective),
                rangeStartHex: baseHex,
                rangeEndHex: Conversions.decToHex(baseDec + limitEffective)
            };
        }

        if (offsetDec > limitEffective) {
            return {
                base: baseHex,
                offset: offsetHex,
                physicalAddressHex: null,
                physicalAddressDec: null,
                isValid: false,
                error: '#GP (General Protection Fault): Offset supera el límite del segmento.',
                formula: null,
                limitEffective,
                limitEffectiveHex: Conversions.decToHex(limitEffective),
                rangeStartHex: baseHex,
                rangeEndHex: Conversions.decToHex(baseDec + limitEffective)
            };
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
            limitEffectiveHex: Conversions.decToHex(limitEffective),
            rangeStartHex: baseHex,
            rangeEndHex: Conversions.decToHex(baseDec + limitEffective)
        };
    }
};
