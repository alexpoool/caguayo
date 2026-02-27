# Guía rápida de PNPM para este frontend

Este archivo muestra comandos comunes de `pnpm` y ejemplos para gestionar dependencias en la carpeta `frontend`.

Por qué: `pnpm` usa `package.json` para la lista de dependencias y `pnpm-lock.yaml` para instalaciones reproducibles.

Comandos básicos

- Instalar todas las dependencias (usa `pnpm-lock.yaml` si está presente):

```bash
pnpm install
```

- Añadir una dependencia (tiempo de ejecución):

```bash
pnpm add react@18.3.1
```

- Añadir una dependencia de desarrollo:

```bash
pnpm add -D typescript eslint
```

- Eliminar una dependencia:

```bash
pnpm remove react-hot-toast
```

- Actualizar un paquete:

```bash
pnpm up react@latest
```

- Instalar exactamente lo que está en el lockfile (CI):

```bash
pnpm install --frozen-lockfile
```

- Instalar desde un registro específico o caché offline (ejemplos):

```bash
PNPM_REGISTRY=<url> pnpm install
```

Cómo se ven `dependencies` y `devDependencies` en `package.json`

```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "typescript": "^5.9.3",
    "vite": "^7.3.1"
  }
}
```

Consejos

- Usa `pnpm add <pkg>@<version>` para fijar versiones; usa `^` en `package.json` para permitir actualizaciones compatibles.
- Para builds reproducibles, haz commit de `pnpm-lock.yaml` y usa `--frozen-lockfile` en CI.
- Para instalar desde una carpeta local (editable):

```bash
pnpm add -D ../local-package
```

Scripts útiles (ejemplos de scripts ya presentes en `package.json`):

- `pnpm run dev` — inicia el servidor de desarrollo de Vite
- `pnpm run build` — construye para producción
- `pnpm run preview` — previsualiza la aplicación construida

Si quieres, puedo:

- añadir o quitar paquetes específicos en `frontend/package.json` usando comandos `pnpm`
- ejecutar `pnpm install` aquí (veo que `pnpm install` ya se ha ejecutado en tu terminal)

---
Archivo: frontend/package.json
