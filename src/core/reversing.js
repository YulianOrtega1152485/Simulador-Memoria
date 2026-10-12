import { Conversions } from './conversions.js';

/**
 * Motor de Lógica para el Laboratorio de Reversing
 * Implementación basada en el Descriptor del 80386 (64 bits totales, Base de 32 bits)
 */
export const ReversingEngine = {
    /**
     * Analiza un descriptor de 64 bits y extrae sus componentes según el mapa del 80386.
     *
     * @param {string} binary64 - String de 64 bits (0s y 1s)
     * @returns {Object} Desglose completo del descriptor
     */
    parseDescriptor: (binary64) => {
        if (!Conversions.isValidBinary(binary64) || binary64.length !== 64) {
            throw new Error('El descriptor debe ser un string de exactamente 64 bits binarios.');
        }

        // --- MAPEADO VISUAL SEGÚN IMAGEN 80386 ---

        // 1. Extracción de la Base (Total 32 bits)
        // B31-B24 (Fila 1, Izq) + B23-B16 (Fila 2, Der) + B15-B0 (Fila 3 Completa)
        const baseHigh = binary64.slice(0, 8);      // Bits 0-7
        const baseMid = binary64.slice(24, 32);     // Bits 24-31
        const baseLow = binary64.slice(32, 48);     // Bits 32-47
        const baseBin = baseHigh + baseMid + baseLow;
        const baseDec = Conversions.binToDec(baseBin);

        // 2. Extracción del Límite (Total 20 bits)
        // L19-L16 (Fila 1, Der) + L15-L0 (Fila 4 Completa)
        const limitHigh = binary64.slice(12, 16);   // Bits 12-15
        const limitLow = binary64.slice(48, 64);    // Bits 48-63
        const limitBin = limitHigh + limitLow;
        const limitDec = Conversions.binToDec(limitBin);

        // 3. Flags y Accesos
        const flags = binary64.slice(8, 12);        // G, D, 0, AV (Bits 8-11)
        const access = binary64.slice(16, 24);      // Derechos Acceso (Bits 16-23)

        return {
            binary: binary64,
            limit: {
                binary: limitBin,
                decimal: limitDec,
                hex: Conversions.decToHex(limitDec)
            },
            base: {
                binary: baseBin,
                decimal: baseDec,
                hex: Conversions.decToHex(baseDec)
            },
            details: {
                flags: flags,
                access: access,
                granular: flags[0] === '1' ? 'Yes (4KB units)' : 'No (1 byte units)',
                size: flags[1] === '1' ? '32-bit' : '16-bit'
            },
            fragments: {
                baseHigh,
                baseMid,
                baseLow,
                limitHigh,
                limitLow
            }
        };
    }
};
