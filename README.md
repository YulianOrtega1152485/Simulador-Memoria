# Simulador de Memoria 80386

Simulador didáctico del direccionamiento de memoria del procesador **Intel 80386**, orientado a estudiantes de Arquitectura de Computadoras.

Explora tres conceptos clave:

- **Modo Real**: cálculo de dirección física como `(Segmento × 16) + Offset`.
- **Modo Protegido**: descriptores, selectores, GDT y protección de memoria.
- **Reversing**: análisis binario de un descriptor de 64 bits.

## Cómo ejecutar

No requiere instalación ni dependencias. Abre con cualquier navegador:

```
src/index.html
```

(Este archivo redirige automáticamente a `src/ui/index.html`, que es la interfaz real.)

> Nota: el proyecto usa ES Modules (`import`/`export`). Si el navegador bloquea módulos a un archivo local, servir la carpeta con un servidor estático simple:
>
> ```bash
> # Python
> python3 -m http.server 8000
> # y luego abrir http://localhost:8000/src/index.html
> ```

## Modo Real

**Fórmula:** `Dirección Física = (Segmento × 16) + Offset`

Pasos pedagógicos que muestra la aplicación:

1. El **segmento** (16 bits) se desplaza 4 bits a la izquierda (×16); en hexadecimal se le agrega un `0` al final.
2. Se suma el **offset** (desplazamiento dentro de la ventana de 64 KB).
3. El resultado se visualiza junto con un **mapa de 1 MB** y una animación del cálculo.

**Ejemplo:** `1234 : 00AB → 0x12340 + 0x00AB = 0x123EB`

Entrada: segmento y offset en **hexadecimal** (hasta 4 dígitos cada uno).

## Modo Protegido

En modo protegido el programa no da una dirección absoluta: da un **selector** + un **offset**. El hardware obtiene el **descriptor** desde la GDT, valida la protección y recién ahí compone la dirección.

**Fórmula:** `Dirección Lineal = Base (del descriptor) + Offset`

### Entrada

- **Descriptor (64 bits)** — se ingresa en **orden de bytes de memoria (little-endian)**: el primer par de dígitos hexadecimales es el **byte 0** (el menos significativo). Internamente el simulador invierte el orden de bytes para reconstruir el valor canónico.
- **Selector (hex)**, que se descompone en:
  - `Índice` = bits 15–3 → fila de la GDT.
  - `TI` = bit 2 (0 = GDT, 1 = LDT).
  - `RPL` = bits 1–0 (privilegio solicitado).
- **Tipo de segmento**: DS (datos), CS (código), SS (pila).
- **Operación**: Leer / Escribir / Ejecutar / Usar como pila (según el registro).
- **CPL**: nivel de privilegio actual (0 = kernel … 3 = usuario).
- **Offset (hex)**, hasta 8 dígitos.

### Tabla GDT (mock)

El simulador parte de una GDT de ejemplo con 5 entradas. **El descriptor ingresado es la única fuente de verdad**: al calcular, ese descriptor se escribe en la fila de la GDT correspondiente al índice del selector.

| Índice | Selector | Base | Límite | Access | Tipo |
| --- | --- | --- | --- | --- | --- |
| 0 | 00 | 0x00000000 | 0x00000 | 00 | Descriptor Nulo |
| 1 | 08 | 0x00000000 | 0xFFFFF (G=1) | 9A | Código (DPL 0) |
| 2 | 10 | 0x00000000 | 0xFFFFF (G=1) | 92 | Datos (DPL 0) |
| 3 | 18 | 0x00400000 | 0x0FFFF | F2 | Datos (DPL 3) |
| 4 | 20 | 0x00001000 | 0x00FFF (G=1) | 89 | Tarea/LDT (DPL 0) |

### Reglas de validación (orden de prioridad)

1. **Selector nulo** (`0000`–`0003`) → `#GP`.
2. **Índice fuera de la GDT** (no existe la entrada) → `#GP`.
3. **P = 0** (descriptor no presente) → `#NP`.
4. **Privilegio**: `max(CPL, RPL) ≤ DPL`; si no → `#GP`.
5. **Operación vs. permisos** del descriptor:
   - Ejecutar → requiere segmento de Código (E=1).
   - Escribir → requiere Datos con **W=1** (bit 1 del byte de acceso; en este simulador **ED no otorga escritura**).
   - Leer → Código con R=1, o Datos.
   - Usar como pila (SS) → Datos con W=1 y `CPL = RPL = DPL`.
6. **Offset ≤ Límite efectivo**; si no → `#GP`.

**Límite efectivo:** `G=1 → (Límite × 1000h) + FFFh` (páginas de 4 KB); `G=0 → Límite` (bytes).

**Ejemplo:** selector `0x23` (índice 4, GDT, RPL 3) + descriptor `0300000040F2C000` (bytes LE) + offset `0xA10` + CPL 0 → Base `0x400000` + `0xA10` = **`0x400A10`**.

## Reversing

Laboratorio para analizar un **descriptor de segmento de 64 bits** ingresado en **binario** (solo 0s y 1s, exactamente 64).

Al llegar a 64 bits la aplicación, de forma automática:

1. Divide el descriptor según el esquema del 80386:
   - Base 32 bits = `Base[31:24] + Base[23:16] + Base[15:0]`.
   - Límite 20 bits = `Límite[19:16] + Límite[15:0]`.
   - Flags (bits 8–11): `G`, `D/B`, `0`, `AV`.
   - Byte de acceso (bits 16–23): `P · DPL · S · E · ED/C · R/W · A`.
2. Reconstruye **Base**, **Límite** y todos los **atributos**.
3. Describe **qué se puede hacer** en ese segmento (leer, escribir, ejecutar, usar como pila).

**Ejemplo clásico:** binario `0000000011001111100110100000000000000000000000001111111111111111` → Base `0x00000000`, Límite `0xFFFFF`, Código 32 bits.

## Controles de la interfaz

- Cada modo tiene un botón **Limpiar** que vacía los campos y restablece los datos a su estado inicial.
- Al **editar cualquier campo** tras calcular, el resultado se oculta automáticamente (se recalcula/limpió el estado).

## Arquitectura del proyecto

```
src/
├── index.html                # Redirige a la interfaz
├── core/
│   ├── conversions.js        # Utilidades: hex↔dec↔bin, validación de binario
│   ├── realMode.js           # Motor del Modo Real
│   ├── protectedMode.js      # Motor del Modo Protegido (validaciones de protección)
│   └── reversing.js          # Motor de Reversing (parseo del descriptor 64 bits)
└── ui/
    ├── index.html            # Interfaz (HTML)
    ├── main.js               # Controlador de interfaz e integración con los motores
    └── style.css             # Estilos
tests/
    └── protectedMode.test.mjs
```

- **`core/`**: motores de cálculo puros, independientes de la interfaz.
- **`ui/`**: el archivo `main.js` integra los motores, maneja la entrada *little-endian* y actualiza la tabla GDT.
- **`tests/`**: pruebas automatizadas de los motores.

## Pruebas

Las pruebas usan el runner de Node.js nativo (`node:test`):

```bash
node --test tests/protectedMode.test.mjs
```