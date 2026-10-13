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

        // 4. Bits especiales (Flags): G, D/B, L, AVL
        const g = flags[0] === '1';
        const d = flags[1] === '1';
        const av = flags[3] === '1';

        // 5. Byte de Derechos de Acceso: P DPL S E ED/C R/W A
        const present = access[0] === '1';
        const dpl = Conversions.binToDec(access.slice(1, 3));
        const s = access[3] === '1';
        const isCode = s && access[4] === '1';
        const isData = s && access[4] === '0';
        const isSystem = !s;
        const edc = access[5] === '1';
        const rw = access[6] === '1';
        const accessed = access[7] === '1';

        const kind = isSystem ? 'Sistema' : (isCode ? 'Código' : 'Datos');

        // Capacidades: qué operaciones permite el segmento
        const capacidades = [];
        if (isCode) {
            capacidades.push('Ejecutar');
            capacidades.push(rw ? 'Leer' : 'No se puede leer');
        } else if (isData) {
            capacidades.push('Leer');
            capacidades.push(rw ? 'Escribir' : 'No se puede escribir');
            if (rw) capacidades.push('Usar como pila (SS)');
        } else {
            capacidades.push('Segmento de sistema (no usable como Código/Datos)');
        }

        // Descripciones textuales según los bits
        const edcText = isCode
            ? `C=${edc ? 1 : 0}: ${edc ? 'honra el nivel de privilegio del descriptor (conforme)' : 'ignora el nivel de privilegio del descriptor (no conforme)'}`
            : `ED=${edc ? 1 : 0}: el segmento se expande hacia ${edc ? 'abajo (pila)' : 'arriba (datos)'}`;
        const rwText = isCode
            ? `R=${rw ? 1 : 0}: el segmento de código ${rw ? 'puede' : 'no puede'} leerse`
            : `W=${rw ? 1 : 0}: los datos ${rw ? 'pueden' : 'no pueden'} escribirse`;

        const resumen = isSystem
            ? 'Descriptor de sistema (no es un segmento de Código/Datos).'
            : `Segmento de ${kind} de ${d ? 32 : 16} bits, DPL ${dpl}${accessed ? ', ya utilizado' : ', sin utilizar'}. ` +
              (isCode
                  ? `Se puede EJECUTAR${rw ? ' y LEER' : ''}; no se puede escribir.`
                  : `Se puede LEER${rw ? ' y ESCRIBIR' : ' (solo lectura)'}${rw ? '; puede usarse como pila (SS)' : ''}.`);

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
                granular: g ? 'Yes (4KB units)' : 'No (1 byte units)',
                size: d ? '32-bit' : '16-bit'
            },
            decoded: {
                kind,
                isCode,
                isData,
                isSystem,
                edc,
                rw,
                capacidades,
                resumen,
                edcText,
                rwText,
                g: { value: g, text: g ? 'G=1: el límite se amplía a páginas de 4 KB (equivale a agregar 000, hasta 4 GB).' : 'G=0: el límite va de 00000H a FFFFFH (en bytes).' },
                d: { value: d, text: d ? 'D=1: las instrucciones operan en 32 bits.' : 'D=0: las instrucciones operan en 16 bits.' },
                av: { value: av, text: av ? 'AV=1: el segmento sí está disponible.' : 'AV=0: el segmento no está disponible.' },
                p: { value: present, text: present ? 'P=1: el segmento contiene base y límite válidos (presente).' : 'P=0: descriptor sin definir (no presente).' },
                dpl: { value: dpl, text: `DPL=${Conversions.decToBin(dpl, 2)}: nivel de privilegio del descriptor (00 mayor, 11 menor).` },
                s: { value: s, text: s ? 'S=1: descriptor de aplicación (Local).' : 'S=0: descriptor de sistema (Global).' },
                a: { value: accessed, text: accessed ? 'A=1: el segmento ya ha sido utilizado.' : 'A=0: el segmento no ha sido utilizado.' }
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
