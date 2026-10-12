/**
 * Módulo de Conversiones
 * Proporciona utilidades para transformar valores entre diferentes bases numéricas.
 */

export const Conversions = {
    /**
     * Convierte un valor hexadecimal (con o sin 0x) a decimal.
     * @param {string} hex
     * @returns {number}
     */
    hexToDec: (hex) => {
        const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
        return parseInt(cleanHex, 16);
    },

    /**
     * Convierte un valor decimal a hexadecimal en mayúsculas, asegurando formato 0x.
     * @param {number} dec
     * @returns {string}
     */
    decToHex: (dec) => {
        return '0x' + dec.toString(16).toUpperCase();
    },

    /**
     * Convierte un valor hexadecimal a binario, mapeando cada dígito a 4 bits.
     * Seguro para descriptores de 64 bits (evita la pérdida de precisión de Number).
     * @param {string} hex
     * @returns {string}
     */
    hexToBin: (hex) => {
        const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
        return cleanHex.split('').map(d => parseInt(d, 16).toString(2).padStart(4, '0')).join('');
    },

    /**
     * Convierte un string binario a decimal.
     * @param {string} bin
     * @returns {number}
     */
    binToDec: (bin) => {
        return parseInt(bin, 2);
    },

    /**
     * Convierte un número decimal a binario con un padding específico.
     * @param {number} dec
     * @param {number} bits
     * @returns {string}
     */
    decToBin: (dec, bits = 32) => {
        return dec.toString(2).padStart(bits, '0');
    },

    /**
     * Valida si un string es binario válido (solo 0s y 1s).
     * @param {string} bin
     * @returns {boolean}
     */
    isValidBinary: (bin) => {
        return /^[01]+$/.test(bin);
    }
};
