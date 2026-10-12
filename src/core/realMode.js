import { Conversions } from './conversions.js';

/**
 * Motor de Lógica para Modo Real
 */
export const RealModeEngine = {
    /**
     * Calcula la dirección física en modo real.
     * Fórmula: (Segmento * 16) + Offset
     *
     * @param {string} segmentoHex - Valor del segmento en hexadecimal
     * @param {string} offsetHex - Valor del offset en hexadecimal
     * @returns {Object} Detalle del cálculo para fines pedagógicos
     */
    calculatePhysicalAddress: (segmentoHex, offsetHex) => {
        const segDec = Conversions.hexToDec(segmentoHex);
        const offDec = Conversions.hexToDec(offsetHex);

        const shiftedSegDec = segDec * 16;
        const physicalDec = shiftedSegDec + offDec;

        return {
            segmento: segmentoHex,
            offset: offsetHex,
            segmentoDesplazadoHex: Conversions.decToHex(shiftedSegDec),
            segmentoDesplazadoDec: shiftedSegDec,
            physicalAddressHex: Conversions.decToHex(physicalDec),
            physicalAddressDec: physicalDec,
            formula: `${segmentoHex} * 16 + ${offsetHex} = ${Conversions.decToHex(physicalDec)}`
        };
    }
};
