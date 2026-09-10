# Coding with an AI pair programmer

[GitHub Copilot](https://github.com/features/copilot) is your AI pair programmer, built to support you throughout your development experience. As with any new tool, using GitHub Copilot requires learning a few new skills. This project is built to do exactly that, to give you an opportunity to build a project, using the language and tools you typically use, with GitHub Copilot.

> **[Start hacking!](./hackathon.md)**

## Requirements

This project is configured with a [devcontainer](./.devcontainer/devcontainer.json), which can be [run locally](https://code.visualstudio.com/docs/devcontainers/containers) or in a [codespace](https://github.com/features/codespaces). Please refer to the [setup exercise](./content/0-get-started.md) for more information.

The project does assume you are familiar with programming, but is not prescriptive about language or framework choice.

## License 

This project is licensed under the terms of the MIT open source license. Please refer to [MIT](./LICENSE.txt) for the full terms.

## Maintainers 

You can find the list of maintainers in [CODEOWNERS](./.github/CODEOWNERS)

## Support

This project is provided as-is, and may be updated over time. If you have questions, please [open an issue](/issues/new).

# Sector Nexo - prototipo FPS táctico

Vertical slice jugable de un FPS táctico 3D creado con primitivas procedurales. No requiere instalación ni assets externos: Three.js se carga desde un CDN en `index.html`.

## Ejecutar

Por las políticas del navegador, los módulos ES deben servirse por HTTP. Desde la raíz:

```bash
python -m http.server 8080
```

Abre <http://localhost:8080> en un navegador moderno y pulsa **Entrar en operación**.

## Sistemas incluidos

- Movimiento FPS en primera persona con gravedad, salto, sprint y colisiones AABB.
- Apuntado con mouse, disparo por raycast, retroalimentación visual, recarga y arma visible.
- Rondas de 105 segundos, marcador Alfa/Omega, preparación y recompensas.
- Objetivo de recoger, colocar y defender un dispositivo en el sitio A.
- Tres bots sencillos con patrulla, orientación y daño al jugador.
- Compra mínima con créditos: chaleco, rifle automático y botiquín.
- Modo entrenamiento con objetivos y economía ilimitados.
- HUD responsive y escenario original generado con geometría y materiales básicos.
