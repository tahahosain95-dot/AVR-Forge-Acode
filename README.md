# AVR Forge for Acode

AVR Forge is an Acode plugin project for creating AVR C firmware workspaces.

## Current status — 0.1.11

This is an **early project-scaffolding release**, not the complete AVR IDE.

Implemented:
- Acode plugin lifecycle registration and command.
- Project creation in a folder selected through Acode's file browser.
- Open an existing project folder as an Acode workspace from the AVR Forge page.
- MCU selection from a starter list.
- Generated `main.c`, `Makefile`, and project `README.md`.

Not implemented yet:
- Running AVR-GCC from inside Acode.
- Producing the HEX file inside the plugin.
- AVR register autocomplete and dedicated syntax highlighting.
- Bundled compiler toolchain.

The generated Makefile is intended for a system where `avr-gcc`, AVR-LibC, GNU Binutils and `make` are already available.

## Install

1. Download the repository ZIP from GitHub.
2. In Acode, open Settings → Plugins.
3. Choose the local ZIP install option and select the downloaded archive.
4. Open the Command Palette and run **AVR Forge**.

## Create a project

Open the AVR Forge page. Choose “ساخت پروژه جدید”, enter a project name, select an MCU, and choose the parent folder.

To open an existing project, choose “باز کردن پروژه موجود” and select its folder. Acode loads that folder into the sidebar file tree as the active workspace, opens its `main.c` file in a new editor tab, activates that tab, and hides the AVR Forge page.

The generated starter uses an 8 MHz clock definition. Change `F_CPU` to match your actual clock configuration.

## Compatibility

The manifest currently declares Acode version code 958 or newer because the project targets the modern documented plugin API. Android-version compatibility depends on the Acode version installed on the device.

## Development notes

The plugin uses Acode's documented `setPluginInit`, `setPluginUnmount`, `fs`, `fileBrowser`, `openFolder`, `editorFile`, `select`, and `prompt` APIs. The `EditorFile.makeActive()` method and page `hide()` method are used to switch to the code tab. It has not yet been device-tested; please treat this as an initial test build.

## License

MIT
