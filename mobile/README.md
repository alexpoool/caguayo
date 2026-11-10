# itemli-mobile

Aplicación Android de reportes ITEMLI, construida con **Kotlin + Jetpack Compose + Koin + Retrofit + Room**, siguiendo una arquitectura feature-based con separación de capas (`domain / application / infrastructure / presentation`).

## Objetivo

Consumir los reportes del backend FastAPI existente sin duplicar la lógica de negocio: la app solo lee previews y descarga PDFs.

## Stack

| Área | Elección |
|---|---|
| UI | Jetpack Compose + Material 3 |
| Adaptativo | `material3-window-size-class` |
| Navegación | Navigation Compose + `AdaptiveAppScaffold` |
| DI | Koin |
| Red | Retrofit + OkHttp + kotlinx.serialization |
| Persistencia | Room + DataStore + EncryptedSharedPreferences |
| Async | Coroutines + Flow |

## Estructura

```text
app/src/main/kotlin/com/itemli/mobile/
├── app/
│   ├── di/
│   └── navigation/
├── shared/
│   ├── domain/
│   ├── infrastructure/
│   └── ui/
└── features/
    ├── auth/
    └── reports/
```

Cada feature vive bajo `features/<feature>/` con `domain/`, `application/`, `infrastructure/` y `presentation/`.

## Cómo se compila

```bash
cd mobile
./gradlew assembleDebug
```

Debes tener un Android SDK y el JDK 17 instalado. Vamos a configurarlos automáticamente en dev.

## Roadmap

- Conectar los 10 reportes restantes del backend.
- Soporte offline con Room.
- Descarga y visualización de PDFs.
