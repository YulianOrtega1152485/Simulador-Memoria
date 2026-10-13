import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Conversions } from '../src/core/conversions.js';
import { ReversingEngine } from '../src/core/reversing.js';
import { ProtectedModeEngine } from '../src/core/protectedMode.js';

// Construye un descriptor con Base 0x400000, Límite 3, G=1 y el byte Access dado,
// usando el mismo camino que la UI del modo protegido (entrada little-endian),
// y lo devuelve ya parseado.
const parseAccess = (accessHex) => {
    const canonicalValue = `00C0${accessHex}4000000003`.toUpperCase();
    return ReversingEngine.parseDescriptor(Conversions.hexToBin(canonicalValue));
};

// Calcula la operación "Escribir" (CPL=3, RPL=3, offset 0x0A10) para un Access dado.
const calcWrite = (accessHex) => {
    const p = parseAccess(accessHex);
    const d = p.decoded;
    return ProtectedModeEngine.calculatePhysicalAddress(p.base.hex, '0A10', p.limit.decimal, {
        granular: d.g.value,
        present: d.p.value,
        isNullSelector: false,
        indexValid: true,
        cpl: 3,
        rpl: 3,
        dpl: d.dpl.value,
        operation: 'Escribir',
        isCode: d.isCode,
        isData: d.isData,
        rw: d.rw
    });
};

test('W es el bit 1 del byte de acceso (access & 0x02); ED (bit 2) no debe usarse', () => {
    assert.equal(parseAccess('F0').decoded.rw, false, 'F0: bit 1 (W)=0');
    assert.equal(parseAccess('F2').decoded.rw, true, 'F2: bit 1 (W)=1');
    assert.equal(parseAccess('F4').decoded.rw, false, 'F4: bit 2 (ED)=1 pero bit 1 (W)=0');
    assert.equal(parseAccess('F6').decoded.rw, true, 'F6: bit 2 (ED)=1 y bit 1 (W)=1');
});

test('DS Escribir con Access F0 (W=0) → #GP', () => {
    const r = calcWrite('F0');
    assert.equal(r.isValid, false);
    assert.match(r.error, /W=1/);
});

test('DS Escribir con Access F2 (W=1) → válido, base 0x400000 + 0A10', () => {
    const r = calcWrite('F2');
    assert.equal(r.isValid, true);
    assert.equal(r.physicalAddressHex, '0x400A10');
});

test('DS Escribir con Access F4 (ED=1, W=0) → #GP (ED no otorga escritura)', () => {
    const r = calcWrite('F4');
    assert.equal(r.isValid, false);
    assert.match(r.error, /W=1/);
});

test('DS Escribir con Access F6 (ED=1, W=1) → válido (ED no bloquea la escritura)', () => {
    const r = calcWrite('F6');
    assert.equal(r.isValid, true);
    assert.equal(r.physicalAddressHex, '0x400A10');
});

test('Caso usuario: selector 0023h + descriptor 0300000040F2C000 + offset 00000A10h + DS/Escribir + CPL 3', () => {
    const descClean = '0300000040F2C000';
    const descValue = descClean.match(/../g).reverse().join('');
    assert.equal(descValue, '00C0F24000000003');
    const parsed = ReversingEngine.parseDescriptor(Conversions.hexToBin(descValue));
    assert.equal(parsed.decoded.isData, true);
    assert.equal(parsed.decoded.rw, true);

    const index = parseInt('0023', 16) >> 3;
    const rpl = parseInt('0023', 16) & 3;
    assert.equal(index, 4);
    assert.equal(rpl, 3);

    const res = ProtectedModeEngine.calculatePhysicalAddress(parsed.base.hex, '00000A10', parsed.limit.decimal, {
        granular: parsed.decoded.g.value,
        present: parsed.decoded.p.value,
        isNullSelector: false,
        indexValid: index < 5,
        cpl: 3,
        rpl,
        dpl: parsed.decoded.dpl.value,
        operation: 'Escribir',
        isCode: parsed.decoded.isCode,
        isData: parsed.decoded.isData,
        rw: parsed.decoded.rw
    });
    assert.equal(res.isValid, true);
    assert.equal(res.physicalAddressHex, '0x400A10');
});