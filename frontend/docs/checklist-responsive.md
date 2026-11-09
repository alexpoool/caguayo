# Checklist responsive por módulo

Anchos de referencia: 320, 390, 768, 1024 y 1440 px. Móvil primero.

## Armazón

- [ ] Sin scroll horizontal de página (`scrollWidth <= clientWidth + 1`).
- [ ] Sidebar se convierte en drawer con overlay por debajo de `lg`.
- [ ] El drawer cierra al navegar y con `Escape`.
- [ ] Header muestra hamburguesa y acciones de perfil.
- [ ] `main` usa `p-4 md:p-8`.
- [ ] Área principal usa `dvh`, no `vh`.

## Listas

- [ ] `PageHeader` apila acciones debajo del título en móvil.
- [ ] Tabla dentro de `overflow-x-auto`; el scroll horizontal no arrastra la
      página.
- [ ] Botones de fila conservan objetivo táctil de 44×44 px.
- [ ] Texto informativo mínimo `text-xs` (12 px).

## Formularios y modales

- [ ] Formularios en una columna en móvil, dos desde `sm`, tres desde `lg`.
- [ ] Modales son hoja a pantalla completa por debajo de `sm`.
- [ ] Footer del modal visible sin tapar campos.
- [ ] Errores visibles junto al campo, no solo como toast.

## Acciones

- [ ] La acción principal usa `CreateButton`.
- [ ] Volver usa `BackButton` con destino explícito.
- [ ] Estados vacíos incluyen la acción de creación.

## Verificación automática

`e2e/smoke.spec.ts` comprueba desborde a 320, 768 y 1440 px en el login. Añade
el mismo chequeo a cada flujo crítico que incorpores.
