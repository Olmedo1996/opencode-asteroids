---
description: Crea un git worktree en .worktrees/<nombre> derivado del argumento.
agent: build
---

Crea un git worktree ejecutando exactamente:

```
git worktree add .worktrees/<nombre-del-worktree>
```

Reglas estrictas:
- El usuario pasó como argumento: $ARGUMENTS
- Analiza el argumento (puede tener espacios, ser una descripción natural, un nombre de feature, una rama, una tarea, etc.) y deriva un nombre de worktree corto en kebab-case, sin espacios ni caracteres especiales inválidos para rutas git. Usa español o inglés según el contexto del argumento.
- No cambies de directorio de trabajo (no `cd`, no `workdir` distinto).
- No ejecutes ningún otro comando besides `git worktree add .worktrees/<nombre-del-worktree>`.
- Solo ejecuta ese comando y reporta el resultado (éxito o error de git).
- Si el argumento está vacío, pide al usuario un nombre antes de ejecutar anything.