/**
 * MOTOR LÓGICO INTEGRADO (Para evitar problemas de CORS/Módulos en archivos locales)
 */

import { Conversions } from '../core/conversions.js';
import { RealModeEngine } from '../core/realMode.js';
import { ProtectedModeEngine } from '../core/protectedMode.js';
import { ReversingEngine } from '../core/reversing.js';

/**
 * CONTROLADOR DE INTERFAZ
 */
window.router = {
    navigate: (screenId) => {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        const target = document.getElementById(`screen-${screenId}`);
        if (target) target.classList.add('active');

        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.id === `btn-nav-${screenId}`);
        });
    }
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Glosario de bits (derechos de acceso y bits especiales) — compartido por Protegido y Reversing.
 */
const BIT_GLOSSARY = `
    <div class="glossary-cols">
        <div class="glossary-col">
            <h5>Bits especiales (Flags)</h5>
            <ul>
                <li><strong>G = 1</strong> amplía el límite a páginas de 4 KB (equivale a agregar 000) hasta 4 GB. <strong>G = 0</strong> el límite va de 00000H a FFFFFH (en bytes).</li>
                <li><strong>AV = 0</strong> el segmento no está disponible. <strong>AV = 1</strong> sí está disponible.</li>
                <li><strong>D = 0</strong> las instrucciones operan en 16 bits. <strong>D = 1</strong> operan en 32 bits.</li>
            </ul>
        </div>
        <div class="glossary-col">
            <h5>Byte de Derechos de Acceso &nbsp;(7→0: P · DPL · S · E · ED/C · R/W · A)</h5>
            <ul>
                <li><strong>P</strong>: 1 = base y límite válidos (presente); 0 = descriptor sin definir.</li>
                <li><strong>DPL</strong>: nivel de privilegio del descriptor (00 mayor … 11 menor).</li>
                <li><strong>S</strong>: 1 = descriptor de aplicación/local; 0 = de sistema/global.</li>
                <li><strong>E</strong>: 1 = segmento de Código; 0 = segmento de Datos/Pila.</li>
                <li><strong>ED/C</strong>: si es Datos, ED=0 expande hacia arriba / ED=1 hacia abajo; si es Código, C=0 ignora el nivel de privilegio / C=1 lo honra.</li>
                <li><strong>R/W</strong>: si es Código, R=1 el código puede leerse; si es Datos, W=1 los datos pueden escribirse.</li>
                <li><strong>A</strong>: 1 = el segmento ya ha sido utilizado; 0 = no ha sido utilizado.</li>
            </ul>
        </div>
    </div>
`;

/**
 * Genera la tarjeta que describe los derechos de acceso y qué se puede hacer en el segmento.
 * @param {Object} decoded - Salida de ReversingEngine.parseDescriptor(...).decoded
 * @returns {string} HTML
 */
const renderDerechos = (decoded) => {
    const caps = decoded.capacidades
        .map(c => `<span class="cap-badge">${c}</span>`)
        .join('');
    return `
        <div class="rev-card rev-card-wide">
            <h4>Derechos de Acceso · ¿Qué se puede hacer en este segmento?</h4>
            <p class="derechos-summary">${decoded.resumen}</p>
            <div class="caps-row">${caps}</div>
            <ul class="bit-legend">
                <li>${decoded.p.text}</li>
                <li>${decoded.g.text}</li>
                <li>${decoded.d.text}</li>
                <li>${decoded.av.text}</li>
                <li>${decoded.s.text}</li>
                <li>${decoded.dpl.text}</li>
                <li>${decoded.edcText}</li>
                <li>${decoded.rwText}</li>
                <li>${decoded.a.text}</li>
            </ul>
        </div>
    `;
};

document.addEventListener('DOMContentLoaded', () => {
    // Set initial active nav
    router.navigate('home');

    // Glosario de bits compartido
    const protGlossary = document.getElementById('prot-glossary');
    const revGlossary = document.getElementById('rev-glossary');
    if (protGlossary) protGlossary.innerHTML = BIT_GLOSSARY;
    if (revGlossary) revGlossary.innerHTML = BIT_GLOSSARY;

    // Navigation Setup
    document.getElementById('btn-nav-home')?.addEventListener('click', () => router.navigate('home'));
    document.getElementById('btn-nav-real')?.addEventListener('click', () => router.navigate('real'));
    document.getElementById('btn-nav-protected')?.addEventListener('click', () => router.navigate('protected'));
    document.getElementById('btn-nav-reversing')?.addEventListener('click', () => router.navigate('reversing'));

    // Home Cards
    document.getElementById('card-real')?.addEventListener('click', () => router.navigate('real'));
    document.getElementById('card-protected')?.addEventListener('click', () => router.navigate('protected'));
    document.getElementById('card-reversing')?.addEventListener('click', () => router.navigate('reversing'));

    // MODO REAL
    const btnReal = document.getElementById('btn-calc-real');
    const resultReal = document.getElementById('real-result');
    const animStage = document.getElementById('real-animation-stage');
    const mapContainer = document.getElementById('real-memory-map');

    btnReal.addEventListener('click', async () => {
        const seg = document.getElementById('real-segment').value.toUpperCase();
        const off = document.getElementById('real-offset').value.toUpperCase();
        if(!seg || !off) return alert('Por favor ingresa ambos valores');

        try {
            const res = RealModeEngine.calculatePhysicalAddress(seg, off);

            // Mostrar componentes
            resultReal.classList.add('hidden');
            animStage.classList.remove('hidden');
            mapContainer.classList.remove('hidden');

            // MAPA DE MEMORIA
            const mapWindow = document.getElementById('map-segment-window');
            const mapPointer = document.getElementById('map-offset-pointer');
            const mapSegInfo = document.getElementById('map-seg-info');
            const mapOffInfo = document.getElementById('map-off-info');

            const totalMemory = 0x100000;
            const windowPos = (res.segmentoDesplazadoDec / totalMemory) * 100;
            const windowWidth = (0x10000 / totalMemory) * 100;
            const pointerPos = (res.physicalAddressDec / totalMemory) * 100;

            mapWindow.style.left = `${windowPos}%`;
            mapWindow.style.width = `${windowWidth}%`;
            mapPointer.style.left = `${pointerPos}%`;
            mapSegInfo.innerText = res.segmentoDesplazadoHex;
            mapOffInfo.innerText = res.physicalAddressHex;

            // ANIMACIONES
            const aSeg = document.getElementById('anim-seg');
            const aSegS = document.getElementById('anim-seg-shifted');
            const aOff = document.getElementById('anim-off');
            const aFin = document.getElementById('anim-final');

            aSeg.innerText = seg; aSegS.innerText = res.segmentoDesplazadoHex;
            aOff.innerText = off; aFin.innerText = '??????';
            [aSeg, aSegS, aOff, aFin].forEach(el => el.classList.remove('highlight'));

            aSeg.classList.add('highlight'); await sleep(600);
            aSegS.classList.add('highlight'); await sleep(600);
            aOff.classList.add('highlight'); await sleep(600);
            aFin.innerText = res.physicalAddressHex;
            aFin.classList.add('highlight');

            await sleep(600);
            resultReal.classList.remove('hidden');
            resultReal.innerHTML = `
                <div class="result-item"><span class="result-label">Segmento Desplazado:</span><span class="result-value">${res.segmentoDesplazadoHex}</span></div>
                <div class="result-item"><span class="result-label">Offset:</span><span class="result-value">${res.offset}</span></div>
                <div class="result-item" style="border-top: 2px solid var(--accent-color); margin-top: 10px"><span class="result-label">Dirección Física:</span><span class="result-value" style="color: var(--accent-color)">${res.physicalAddressHex}</span></div>
                <div class="formula-box">${res.formula}</div>
            `;
        } catch (e) { alert('Error: ' + e.message); }
    });

    // MODO PROTEGIDO - GDT Mock
    const gdtMock = [
        { index: 0, selector: '00', base: '0x00000000', limit: 0x00000, limitHex: '0x00000', granular: false, present: false, dpl: 0, access: '00', type: 'Descriptor Nulo' },
        { index: 1, selector: '08', base: '0x00000000', limit: 0xFFFFF, limitHex: '0xFFFFF', granular: true, present: true, dpl: 0, access: '9A', type: 'Código (DPL 0)' },
        { index: 2, selector: '10', base: '0x00000000', limit: 0xFFFFF, limitHex: '0xFFFFF', granular: true, present: true, dpl: 0, access: '92', type: 'Datos (DPL 0)' },
        { index: 3, selector: '18', base: '0x00400000', limit: 0x0FFFF, limitHex: '0x0FFFF', granular: false, present: true, dpl: 3, access: 'F2', type: 'Datos (DPL 3)' },
        { index: 4, selector: '20', base: '0x00001000', limit: 0x00FFF, limitHex: '0x00FFF', granular: true, present: true, dpl: 0, access: '89', type: 'Tarea/LDT (DPL 0)' },
    ];

    // Operaciones permitidas según el registro de segmento
    const OPERATIONS_BY_TYPE = {
        DS: [
            { value: 'Leer', label: 'Leer' },
            { value: 'Escribir', label: 'Escribir' }
        ],
        CS: [{ value: 'Ejecutar', label: 'Ejecutar' }],
        SS: [{ value: 'Usar como pila', label: 'Usar como pila' }]
    };
    const opSelect = document.getElementById('prot-operation');
    const cplSelect = document.getElementById('prot-cpl');
    const segTypeSelect = document.getElementById('prot-segtype');

    const populateOperations = (segType) => {
        if (!opSelect) return;
        const ops = OPERATIONS_BY_TYPE[segType] || [];
        opSelect.innerHTML = ops.map(o => `<option value="${o.value}">${o.label}</option>`).join('');
    };
    populateOperations(segTypeSelect ? segTypeSelect.value : 'DS');
    segTypeSelect?.addEventListener('change', (e) => populateOperations(e.target.value));

    const renderGDT = (activeIndex = -1) => {
        const container = document.getElementById('gdt-rows');
        if (!container) return;
        container.innerHTML = '';
        gdtMock.forEach(entry => {
            const row = document.createElement('div');
            row.className = `gdt-row ${entry.index === activeIndex ? 'active' : ''}`;
            row.innerHTML = `
                <span>${entry.index}</span>
                <span>${entry.selector}</span>
                <span>${entry.base}</span>
                <span>${entry.limitHex}</span>
                <span>${entry.access}</span>
                <span>${entry.present ? 'P1' : 'P0'} · DPL${entry.dpl} · G${entry.granular ? 1 : 0}</span>
            `;
            container.appendChild(row);
        });
    };
    renderGDT();

    const btnProt = document.getElementById('btn-calc-prot');
    const resultProt = document.getElementById('prot-result');
    const descView = document.getElementById('prot-descriptor-view');
    const descBase = document.getElementById('desc-base-val');
    const descLimit = document.getElementById('desc-limit-val');
    const descFlags = document.getElementById('desc-flags-val');

    btnProt.addEventListener('click', () => {
        const descStr = document.getElementById('prot-descriptor').value.trim();
        const selStr = document.getElementById('prot-selector').value.toUpperCase().replace(/^0X/, '');
        const offStr = document.getElementById('prot-offset').value.toUpperCase().replace(/^0X/, '');
        const segType = document.getElementById('prot-segtype').value;
        if (!descStr || !selStr || !offStr) return alert('Ingresa descriptor, selector y offset');

        const descClean = descStr.toUpperCase().replace(/^0X/, '');
        if (!/^[0-9A-F]{16}$/.test(descClean)) {
            return alert('El descriptor debe tener exactamente 16 dígitos hexadecimales (64 bits).');
        }

        try {
            // El descriptor se ingresa en orden de bytes de memoria (little-endian: byte 0 primero).
            // Se invierte el orden de bytes para obtener el valor canónico del descriptor.
            const descValue = descClean.match(/../g).reverse().join('');
            const descBin = Conversions.hexToBin(descValue);
            const parsed = ReversingEngine.parseDescriptor(descBin);

            const dec = parsed.decoded;
            const base = parsed.base.hex;
            const limitDec = parsed.limit.decimal;
            const accessBin = parsed.details.access;
            const accessHex = parseInt(accessBin, 2).toString(16).toUpperCase().padStart(2, '0');
            const granular = dec.g.value;
            const present = dec.p.value;
            const dpl = dec.dpl.value;
            const sBit = dec.s.value;
            const isCode = dec.isCode;
            const isData = dec.isData;
            const rw = dec.rw;
            const typeName = dec.kind;
            const operation = opSelect ? opSelect.value : null;
            const cpl = cplSelect ? parseInt(cplSelect.value, 10) : 0;

            const selVal = parseInt(selStr, 16);
            const ti = (selVal >> 2) & 1;
            const rpl = selVal & 3;
            const index = selVal >> 3;
            const isNull = (selVal & 0xFFF8) === 0;
            const indexValid = index < gdtMock.length;

            // El descriptor ingresado es la única fuente: se escribe en la fila de la GDT del índice del selector.
            if (indexValid && !isNull) {
                gdtMock[index] = {
                    index,
                    selector: (index << 3).toString(16).toUpperCase().padStart(2, '0'),
                    base,
                    limit: limitDec,
                    limitHex: parsed.limit.hex,
                    granular,
                    present,
                    dpl,
                    access: accessHex,
                    type: typeName
                };
            }

            const res = ProtectedModeEngine.calculatePhysicalAddress(base, offStr, limitDec, {
                granular,
                present,
                isNullSelector: isNull,
                indexValid,
                cpl,
                rpl,
                dpl,
                operation,
                isCode,
                isData,
                rw
            });

            if (descView) descView.classList.remove('hidden');
            if (descBase) descBase.innerText = res.base;
            if (descLimit) descLimit.innerText = parsed.limit.hex + (granular ? ' ×4KB' : '');
            if (descFlags) descFlags.innerText = `P=${present?1:0}, DPL=${dpl}, S=${sBit?1:0}, G=${granular?1:0}`;

            renderGDT(indexValid ? index : -1);
            resultProt.classList.remove('hidden');
            resultProt.className = res.isValid ? 'result-card' : 'result-card error';

            const capsHtml = dec.capacidades.map(c => `<span class="cap-badge">${c}</span>`).join('');
            const privilege = Math.max(cpl, rpl);

            resultProt.innerHTML = `
                <div class="result-item"><span class="result-label">Registro:</span><span class="result-value">${segType} (${typeName})</span></div>
                <div class="result-item"><span class="result-label">Descriptor (bytes LE):</span><span class="result-value">${descClean}</span></div>
                <div class="result-item"><span class="result-label">Descriptor (valor):</span><span class="result-value">0x${descValue}</span></div>
                <div class="result-item"><span class="result-label">Selector:</span><span class="result-value">${selStr} (Índice=${index}, TI=${ti}, RPL=${rpl})</span></div>
                <div class="result-item"><span class="result-label">Operación:</span><span class="result-value">${operation || '—'}</span></div>
                <div class="result-item"><span class="result-label">Base:</span><span class="result-value">${res.base}</span></div>
                <div class="result-item"><span class="result-label">Límite (raw):</span><span class="result-value">${parsed.limit.hex}</span></div>
                <div class="result-item"><span class="result-label">Límite efectivo:</span><span class="result-value">${res.limitEffectiveHex} (G=${granular?1:0})</span></div>
                <div class="result-item"><span class="result-label">Rango segmento:</span><span class="result-value">${res.rangeStartHex} – ${res.rangeEndHex}</span></div>
                <div class="result-item"><span class="result-label">Derechos (Access):</span><span class="result-value">${accessBin} (P=${present?1:0}, DPL=${dpl}, S=${sBit?1:0})</span></div>
                <div class="result-item"><span class="result-label">Privilegio:</span><span class="result-value">max(CPL=${cpl}, RPL=${rpl}) = ${privilege} vs DPL=${dpl}</span></div>
                <div class="result-item"><span class="result-label">Offset:</span><span class="result-value">${res.offset}</span></div>
                <div class="result-item" style="border-top: 2px solid ${res.isValid ? 'var(--accent-color)' : 'var(--error-color)'}"><span class="result-label">Dirección Lineal:</span><span class="result-value" style="color: ${res.isValid ? 'var(--accent-color)' : 'var(--error-color)'}">${res.isValid ? res.physicalAddressHex : 'ERROR'}</span></div>
                <div class="formula-box" style="color: ${res.isValid ? 'var(--accent-color)' : 'var(--error-color)'}">${res.isValid ? res.formula : res.error}</div>
                <div class="result-item" style="display:block; border-bottom:none; margin-top:0.8rem"><span class="result-label">¿Qué se puede hacer?</span><div class="caps-row">${capsHtml}</div></div>
                <p class="derechos-summary">${dec.resumen}</p>
            `;
        } catch (e) { alert('Error: ' + e.message); }
    });

    // REVERSING
    const binInput = document.getElementById('rev-binary');
    const binCounter = document.getElementById('bin-counter');
    const resultRev = document.getElementById('rev-result');
    const renderBinaryBlocks = (bits) => {
        if (bits.length < 64) {
            let html = '<div style="display:flex; flex-wrap:wrap; gap:4px; font-size:0.9rem;">';
            html += bits.split('').map(b=>`<span class="bin-block">${b}</span>`).join('');
            html += '</div>';
            return html;
        }

        const row1 = bits.slice(0, 16);  // Bits 0-15
        const row2 = bits.slice(16, 32); // Bits 16-31
        const row3 = bits.slice(32, 48); // Bits 32-47
        const row4 = bits.slice(48, 64); // Bits 48-63

        let html = '<div class="rev-rows">';

        // FILA 1: [Base B31-B24] [Flags G,D,0,AV] [Límite L19-L16]
        html += `
            <div class="rev-row">
                <span class="rev-row-label">Fila 1 (bits 0–15)</span>
                <div class="rev-row-bits">
                    ${row1.slice(0,8).split('').map(b=>`<span class="bin-block bin-base-high" title="Base B31-B24 (bits 0-7)">${b}</span>`).join('')}
                    <span class="rev-sep"></span>
                    ${row1.slice(8,12).split('').map(b=>`<span class="bin-block bin-flags" title="Flags G,D,0,AV (bits 8-11)">${b}</span>`).join('')}
                    <span class="rev-sep"></span>
                    ${row1.slice(12,16).split('').map(b=>`<span class="bin-block bin-limit-high" title="Límite L19-L16 (bits 12-15)">${b}</span>`).join('')}
                </div>
                <span class="rev-row-sub">[Base B31-B24 (8b)] &nbsp;|&nbsp; [Flags G,D,0,AV (4b)] &nbsp;|&nbsp; [Límite L19-L16 (4b)]</span>
            </div>
        `;

        // FILA 2: [Derechos de Acceso] [Base B23-B16]
        html += `
            <div class="rev-row">
                <span class="rev-row-label">Fila 2 (bits 16–31)</span>
                <div class="rev-row-bits">
                    ${row2.slice(0,8).split('').map(b=>`<span class="bin-block bin-access" title="Derechos de Acceso (bits 16-23)">${b}</span>`).join('')}
                    <span class="rev-sep"></span>
                    ${row2.slice(8,16).split('').map(b=>`<span class="bin-block bin-base-mid" title="Base B23-B16 (bits 24-31)">${b}</span>`).join('')}
                </div>
                <span class="rev-row-sub">[Access (8b)] &nbsp;|&nbsp; [Base B23-B16 (8b)]</span>
            </div>
        `;

        // FILA 3: [Base B15-B0]
        html += `
            <div class="rev-row">
                <span class="rev-row-label">Fila 3 (bits 32–47)</span>
                <div class="rev-row-bits">
                    ${row3.split('').map(b=>`<span class="bin-block bin-base-low" title="Base B15-B0 (bits 32-47)">${b}</span>`).join('')}
                </div>
                <span class="rev-row-sub">[Base B15-B0 (16b)]</span>
            </div>
        `;

        // FILA 4: [Límite L15-L0]
        html += `
            <div class="rev-row">
                <span class="rev-row-label">Fila 4 (bits 48–63)</span>
                <div class="rev-row-bits">
                    ${row4.split('').map(b=>`<span class="bin-block bin-limit-low" title="Límite L15-L0 (bits 48-63)">${b}</span>`).join('')}
                </div>
                <span class="rev-row-sub">[Límite L15-L0 (16b)]</span>
            </div>
        `;

        html += '</div>';
        return html;
    };

    binInput.addEventListener('input', (e) => {
        const val = e.target.value.replace(/[^01]/g, '');
        e.target.value = val;
        binCounter.innerText = `${val.length} / 64 bits`;
        if(val.length === 64) {
            try {
                const res = ReversingEngine.parseDescriptor(val);
                resultRev.classList.remove('hidden');
                resultRev.innerHTML = `
                    <div class="rev-card rev-card-wide">
                        <h4>Descriptor (64 bits) · Vista por Filas</h4>
                        ${renderBinaryBlocks(res.binary)}
                        <p style="margin-top:1rem; font-size:0.8rem; color:var(--text-muted)">Separación por filas según esquema del descriptor 80386 (4×16 bits)</p>
                    </div>
                    <div class="rev-card"><h4>Base (32 bits)</h4><div class="result-value" style="font-size:1.5rem; color:var(--accent-color)">${res.base.hex}</div><p style="font-size:0.75rem; color:var(--text-muted)">${res.base.binary}</p><p style="font-size:0.7rem; color:var(--text-muted); margin-top:0.5rem">= B31-B24 + B23-B16 + B15-B0</p></div>
                    <div class="rev-card"><h4>Límite (20 bits)</h4><div class="result-value" style="font-size:1.5rem; color:var(--success-color)">${res.limit.hex}</div><p style="font-size:0.75rem; color:var(--text-muted)">${res.limit.binary}</p><p style="font-size:0.7rem; color:var(--text-muted); margin-top:0.5rem">= L19-L16 + L15-L0</p></div>
                    <div class="rev-card"><h4>Atributos</h4><p>Tipo: <strong>${res.decoded.kind}</strong></p><p>Granularidad (G): <strong>${res.details.granular}</strong></p><p>Tamaño (D/B): <strong>${res.details.size}</strong></p><p>Flags (bits 8-11): <span class="result-value">${res.details.flags}</span></p><p>Accesos (bits 16-23): <span class="result-value">${res.details.access}</span></p></div>
                    ${renderDerechos(res.decoded)}
                `;
            } catch (err) { resultRev.classList.add('hidden'); }
        } else { resultRev.classList.add('hidden'); }
    });
});
