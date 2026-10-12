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

document.addEventListener('DOMContentLoaded', () => {
    // Set initial active nav
    router.navigate('home');
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
        { index: 0, selector: '00', base: '0x00000000', limit: 0x00000, limitHex: '0x00000', granular: false, present: false, dpl: 0, access: '00000000', type: 'Descriptor Nulo' },
        { index: 1, selector: '08', base: '0x00000000', limit: 0xFFFFF, limitHex: '0xFFFFF', granular: true, present: true, dpl: 0, access: '9A', type: 'Código (DPL 0)' },
        { index: 2, selector: '10', base: '0x00000000', limit: 0xFFFFF, limitHex: '0xFFFFF', granular: true, present: true, dpl: 0, access: '92', type: 'Datos (DPL 0)' },
        { index: 3, selector: '18', base: '0x00400000', limit: 0x0FFFF, limitHex: '0x0FFFF', granular: false, present: true, dpl: 3, access: 'F2', type: 'Datos (DPL 3)' },
        { index: 4, selector: '20', base: '0x00001000', limit: 0x00FFF, limitHex: '0x00FFF', granular: true, present: true, dpl: 0, access: '89', type: 'Tarea/LDT (DPL 0)' },
    ];

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
        const selStr = document.getElementById('prot-selector').value.toUpperCase().replace(/^0X/, '');
        const offStr = document.getElementById('prot-offset').value.toUpperCase().replace(/^0X/, '');
        if (!selStr || !offStr) return alert('Ingresa selector y offset');
        try {
            const selVal = parseInt(selStr, 16);
            const ti = (selVal >> 2) & 1;
            const rpl = selVal & 3;
            const index = selVal >> 3;
            const isNull = (selVal & 0xFFF8) === 0;
            const indexValid = index >= 0 && index < gdtMock.length;
            const entry = indexValid ? gdtMock.find(e => e.index === index) : null;
            const base = entry ? entry.base : '0x00000000';
            const limitDec = entry ? entry.limit : 0x00000;
            const granular = entry ? entry.granular : false;
            const present = entry ? entry.present : false;
            const dpl = entry ? entry.dpl : 0;
            const access = entry ? entry.access : '00';
            const type = entry ? entry.type : 'Desconocido';

            const res = ProtectedModeEngine.calculatePhysicalAddress(base, offStr, limitDec, {
                granular,
                present,
                isNullSelector: isNull,
                indexValid
            });

            if (descView) descView.classList.remove('hidden');
            if (descBase) descBase.innerText = base;
            if (descLimit) descLimit.innerText = entry ? entry.limitHex : '0x00000';
            if (descFlags) descFlags.innerText = `G=${granular?1:0}, D/DB=0, AV=0, P=${present?1:0}, DPL=${dpl}`;

            renderGDT(indexValid ? index : -1);
            resultProt.classList.remove('hidden');
            resultProt.className = res.isValid ? 'result-card' : 'result-card error';

            const idxTxt = indexValid ? index : 'N/A';
            const rangeTxt = res.isValid
                ? `${res.rangeStartHex} – ${res.rangeEndHex} (Límite efectivo: ${res.limitEffectiveHex})`
                : `${res.rangeStartHex} – ${res.rangeEndHex} (Límite efectivo: ${res.limitEffectiveHex})`;

            resultProt.innerHTML = `
                <div class="result-item"><span class="result-label">Selector:</span><span class="result-value">${selStr} (Índice=${idxTxt}, TI=${ti}, RPL=${rpl})</span></div>
                <div class="result-item"><span class="result-label">Descriptor:</span><span class="result-value">${type}</span></div>
                <div class="result-item"><span class="result-label">Base:</span><span class="result-value">${res.base}</span></div>
                <div class="result-item"><span class="result-label">Límite (raw):</span><span class="result-value">${entry ? entry.limitHex : '0x00000'}</span></div>
                <div class="result-item"><span class="result-label">Límite efectivo:</span><span class="result-value">${res.limitEffectiveHex} (G=${granular?1:0})</span></div>
                <div class="result-item"><span class="result-label">Rango segmento:</span><span class="result-value">${rangeTxt}</span></div>
                <div class="result-item"><span class="result-label">Derechos (Access):</span><span class="result-value">${access} (P=${present?1:0}, DPL=${dpl})</span></div>
                <div class="result-item"><span class="result-label">Offset:</span><span class="result-value">${res.offset}</span></div>
                <div class="result-item" style="border-top: 2px solid ${res.isValid ? 'var(--accent-color)' : 'var(--error-color)'}"><span class="result-label">Dirección Lineal:</span><span class="result-value" style="color: ${res.isValid ? 'var(--accent-color)' : 'var(--error-color)'}">${res.isValid ? res.physicalAddressHex : 'ERROR'}</span></div>
                <div class="formula-box" style="color: ${res.isValid ? 'var(--accent-color)' : 'var(--error-color)'}">${res.isValid ? res.formula : res.error}</div>
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
                    <div class="rev-card"><h4>Atributos</h4><p>Granularidad (G): <strong>${res.details.granular}</strong></p><p>Tamaño (D/B): <strong>${res.details.size}</strong></p><p>Flags (bits 8-11): <span class="result-value">${res.details.flags}</span></p><p>Accesos (bits 16-23): <span class="result-value">${res.details.access}</span></p></div>
                `;
            } catch (err) { resultRev.classList.add('hidden'); }
        } else { resultRev.classList.add('hidden'); }
    });
});
