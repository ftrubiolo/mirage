# Plan de Implementación: Perfiles/Variantes de Piezas & Página de Detalle de Pieza

Este documento detalla la arquitectura técnica, modelo de datos, diseño de interfaz y plan de ejecución para la funcionalidad de **Perfiles y Variantes por Pieza** en Mirage Sera Atelier, incorporando la **Página de Detalle de Pieza (Split 1/3 - 2/3)**, la **Barra de Variantes en el Visor 3D**, y las **Salvaguardas de Eliminación de Mapas Compartidos**.

---

## 1. Resumen Ejecutivo de Requisitos

1. **Modelo de Variantes 1 a N**:
   - Cada pieza (1 modelo 3D `.glb`) contiene $N$ perfiles o variantes de acabado.
   - Toda pieza inicia con un perfil por defecto (`Default`).
   - Cada variante almacena de manera independiente:
     - Asignación de mapas de textura PBR (`baseColor`, `normal`, `orm`, `ao`, `roughness`, `metalness`, `emissive`, etc.).
     - Overrides de parámetros de material (rugosidad, metálico, normal depth, clearcoat, emisión, etc.).
     - Miniatura / poster WebP renderizado específico.
     - Estructura base para vinculación futura con opciones de producto en DB web.

2. **Navegación y Tarjeta en Biblioteca (`/library`)**:
   - La tarjeta de biblioteca muestra una etiqueta informativa compacta (ej: `4 variantes`).
   - El botón directo *"Abrir en Mesa 3D"* abre la pieza directamente en su perfil por defecto.
   - Al hacer **clic en la tarjeta**, se abre la **Página de Detalle de la Pieza**.

3. **Página de Detalle de Pieza (`EntryDetailView.tsx`) — Split 1/3 - 2/3**:
   - **Tercio Izquierdo (1/3)**: Ficha técnica de la pieza (vista previa / poster, archivo `.glb`, metrología, dimensiones, polígonos, categoría, slug, notas de acabado y botón para abrir en 3D en la variante por defecto).
   - **Dos Tercios Derechos (2/3)**: Gestor y catálogo de Perfiles/Variantes. Vista amplia con todas las variantes, sus nombres, miniaturas de mapas asignados (Albedo, Normal, ORM, etc.), valores de material, estado de vinculación y botón para *"Abrir en Taller 3D"* con ese perfil activo.

4. **Barra de Variantes en Taller 3D (Bottom-Left Toolbar)**:
   - Toolbar flotante en la esquina inferior izquierda (`bottom-left`) del visor 3D.
   - Selector dropdown de variantes activas.
   - Botón `+` para crear una nueva variante (con opción de duplicar la actual o empezar en blanco).
   - Menú contextual para renombrar, duplicar o eliminar variante.

5. **Salvaguarda al Eliminar Mapas Compartidos**:
   - Si se intenta eliminar un mapa de textura que está siendo utilizado por otra variante de la misma pieza, se despliega un diálogo modal de confirmación (*"¿Estás seguro?"*) alertando qué perfiles perderán dicha textura.

6. **Regla de Eliminación de Variante Default**:
   - Si se elimina la variante por defecto, el sistema promueve automáticamente la siguiente variante disponible como nueva `Default`.

---

## 2. Modelo de Datos y Tipos TypeScript

### 2.1 Tipo `EntryVariant` (`src/renderer/src/types/library.ts`)
```typescript
export interface EntryVariantMapSlot {
  id?: string;
  fileName: string;
  filePath: string;
  fileSize?: number;
  url?: string;
}

export interface EntryVariant {
  id: string;                                           // Identificador único (ej: 'var-default', 'var-171829384')
  name: string;                                         // Nombre descriptivo (ej: 'Roble Claro & Lino Natural')
  isDefault: boolean;                                   // Indica si es el perfil principal
  posterUrl?: string | null;                            // Render WebP capturado para esta variante
  posterFileName?: string | null;
  maps: Partial<Record<SlotName, EntryVariantMapSlot>>; // Mapas asignados a este perfil
  slotEnabled?: Partial<Record<SlotName, boolean>>;     // Estado activo/inactivo por slot
  settings?: Partial<LibraryEntrySettings>;             // Factores PBR (roughnessFactor, metalnessFactor, normalScale, etc.)
  productOptionRef?: {                                  // Stub para vinculación e-commerce futura
    optionGroupId?: string;
    optionId?: string;
    sku?: string;
  };
  createdAt: string;
  updatedAt: string;
}
```

### 2.2 Estructura Actualizada de `LibraryEntry`
```typescript
export interface LibraryEntry {
  id: string;
  title: string;
  slug: string;
  category: FurnitureCategory;
  description?: string;
  status: 'active' | 'workshop' | 'pending' | 'madeToOrder' | 'dispatched' | 'neutral';
  createdAt: string;
  updatedAt: string;
  posterUrl?: string | null;
  posterFileName?: string | null;
  modelFileName?: string | null;
  modelFilePath?: string | null;
  modelFileSize?: number;
  dimensions?: { width: number; height: number; depth: number } | null;
  stats?: { triangleCount: number; vertexCount: number; meshCount: number } | null;
  
  // Perfiles / Variantes
  variants: EntryVariant[];
  activeVariantId?: string;

  // Fallbacks de compatibilidad
  maps: Record<string, { fileName: string; filePath: string; fileSize?: number }>;
  settings: LibraryEntrySettings;
}
```

---

## 3. Arquitectura de Estado en Zustand (`workbenchStore.ts` & `appStore.ts`)

### 3.1 Gestión de Variantes en Workbench
- **Estado:**
  - `variants: EntryVariant[]`
  - `activeVariantId: string | null`
- **Acciones:**
  - `loadWorkbenchState(data)`: Hidrata las variantes y activa la variante solicitada (o la default).
  - `selectVariant(variantId: string)`: Conmuta los slots de mapas activos y los sliders de material para que coincidan con la variante seleccionada, actualizando el 3D en tiempo real.
  - `createVariant(name: string, cloneCurrent: boolean)`: Crea una nueva variante e inmediatamente la activa.
  - `renameVariant(variantId: string, newName: string)`: Actualiza el nombre de la variante.
  - `deleteVariant(variantId: string)`: Elimina la variante; si era la default o la activa, promueve la siguiente disponible.
  - `captureVariantPoster(variantId: string)`: Genera snapshot WebP del visor 3D para el perfil.

### 3.2 Navegación de Vistas en `appStore.ts`
- `view`: `'workbench' | 'library' | 'entryDetail' | 'export' | 'audit' | 'settings'`
- `selectedEntryForDetail`: `LibraryEntry | null`

---

## 4. Diseño de Interfaces y Componentes

### 4.1 Tarjeta en Biblioteca (`LibraryView.tsx`)
- **Badge informativo de variantes:** `3 variantes` en el pie de metrología.
- **Acciones claras:**
  - Clic en el cuerpo de la tarjeta $\rightarrow$ Navega a la **Página de Detalle de Pieza** (`entryDetail`).
  - Clic en el botón *"Abrir en Mesa 3D"* $\rightarrow$ Carga la pieza con la variante por defecto directamente en el taller 3D.

---

### 4.2 Página de Detalle de Pieza (`EntryDetailView.tsx`) — Layout Split 1/3 - 2/3

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ ← Volver a Biblioteca        PIEZA: SILLÓN BASALTO CURVO                     [Abrir en 3D] │
├───────────────────────────────┬─────────────────────────────────────────────────────────────┤
│ 1/3: FICHA TÉCNICA Y MODELO   │ 2/3: GESTOR DE PERFILES / VARIANTES                         │
│                               │                                                             │
│ • Poster Render / Preview     │ [Filtro/Búsqueda]                     [+ Nuevo Perfil]      │
│ • Archivo: sillon_basalto.glb │                                                             │
│ • Dimensiones:                │ ┌─────────────────────────────────────────────────────────┐ │
│   0.85 × 0.80 × 0.90 m        │ │ ❖ Default (Roble Natural & Lino)              ★ Default │ │
│ • Polígonos: 48,250 △         │ │   Mapas: [Albedo: roble.webp] [Normal] [ORM]            │ │
│ • Vértices: 24,100            │ │   Ajustes: Rough 0.8 • Metal 0.0 • Normal 1.0x          │ │
│ • Categoría: Asientos         │ │   [Abrir en Taller 3D →]                [⋮ Acciones]    │ │
│ • Identificador Técnico:      │ └─────────────────────────────────────────────────────────┘ │
│   library/sillon-basalto      │ ┌─────────────────────────────────────────────────────────┐ │
│ • Especificación / Notas:     │ │ ❖ Nogal Oscuro & Cuero Negro                            │ │
│   Estructura en madera noble..│ │   Mapas: [Albedo: cuero_negro.webp] [Normal] [ORM]      │ │
│                               │ │   Ajustes: Rough 0.35 • Metal 0.1 • Normal 1.2x         │ │
│ [Abrir Pieza en 3D (Default)] │ │   [Abrir en Taller 3D →]                [⋮ Acciones]    │ │
│                               │ └─────────────────────────────────────────────────────────┘ │
└───────────────────────────────┴─────────────────────────────────────────────────────────────┘
```

---

### 4.3 Barra de Variantes en Visor 3D (`VariantBottomToolbar.tsx`)
- **Ubicación:** `absolute bottom-4 left-4 z-20` sobre el Canvas Three.js.
- **Aspecto:** Píldora modular compacta en `surface-lowest` con borde `1px hairline` (Design System Sera).
- **Contenido:**
  - Icono de variantes (`Layers` o `Palette`).
  - Dropdown interactivo con el nombre de la variante activa y selector para conmutar entre perfiles al instante.
  - Botón `+` para desplegar el modal de creación de nuevo perfil.
  - Menú de opciones de perfil (Renombrar, Duplicar, Capturar nuevo poster, Eliminar).

---

### 4.4 Modal de Protección al Eliminar Mapas (`MapDeleteGuardModal.tsx`)
- Cuando se pulsa el botón de eliminar o reemplazar un mapa en `MapSlotPicker.tsx`:
- Si el archivo físico está asignado a otros perfiles de la pieza:
  - Se abre un modal de confirmación:
    > **¿Eliminar mapa en uso por otros perfiles?**
    > El archivo `sillon_normal.webp` también está en uso por:
    > • *Nogal Oscuro & Cuero Negro*
    > • *Roble Claro & Lino*
    > 
    > [Cancelar]  [Desvincular sólo de este perfil]  [Eliminar de todos los perfiles]

---

## 5. Plan de Ejecución Paso a Paso

1. **Paso 1: Tipos & Migración de Datos** (`types/library.ts`, `utils/libraryBridge.ts`)
   - Definir `EntryVariant` y migrar entradas legacy sin variantes hacia la estructura `[defaultVariant]`.
2. **Paso 2: Store & Sincronización de Perfiles** (`store/workbenchStore.ts`, `store/appStore.ts`)
   - Agregar acciones de conmutación de variante, creación, duplicación y persistencia en `entry.json`.
3. **Paso 3: Toolbar Inferior en Visor 3D** (`components/Viewport/VariantBottomToolbar.tsx`, `Canvas3D.tsx`)
   - Implementar el selector flotante `bottom-left` y creación de variantes.
4. **Paso 4: Diálogo de Salvaguarda de Mapas Compartidos** (`components/Staging/MapSlotPicker.tsx`)
   - Validar uso cruzado entre perfiles antes de eliminar texturas del disco.
5. **Paso 5: Página de Detalle de Pieza Split 1/3 - 2/3** (`components/Library/EntryDetailView.tsx`)
   - Diseñar vista con ficha técnica en el tercio izquierdo (1/3) y catálogo amplio de perfiles interactivo en los dos tercios derechos (2/3).
6. **Paso 6: Actualización de Tarjetas de Biblioteca** (`components/Library/LibraryView.tsx`)
   - Conectar clic de tarjeta hacia la nueva página de detalle y ajustar contador de variantes.
7. **Paso 7: Verificación & Pruebas**
   - Verificar persistencia de carpetas en disco, auto-guardado, renderizado en 3D y estabilidad general.
