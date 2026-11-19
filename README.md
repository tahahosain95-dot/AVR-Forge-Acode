# AVR Forge for Acode

AVR Forge is an Acode plugin project for creating AVR C firmware workspaces.

## Current status — 0.1.16

This is an **early project-scaffolding release**, not the complete AVR IDE.

Implemented:
- Acode plugin lifecycle registration and command.
- Project creation in a folder selected through Acode's file browser.
- Open an existing project folder as an Acode workspace from the AVR Forge page.
- MCU selection from a starter list.
- Generated `main.c`, `Makefile`, and project `README.md`.
- Automatically opens a visible Acode Alpine terminal after project creation, checks whether `make`, `gcc-avr`, `avr-libc`, and `binutils-avr` are installed, and installs them only when one or more packages or required executables are missing.
- Verifies the installed `avr-gcc`, `avr-objcopy`, and `make` versions in the terminal output.

Not implemented yet:
- A dedicated in-plugin compile button and HEX workflow are not implemented yet; the installed toolchain can be used from the Alpine terminal.
- AVR register autocomplete and dedicated syntax highlighting.
- Bundled compiler toolchain.

After each project creation, AVR Forge opens the built-in Alpine terminal and checks the package records and required executables. If everything is present, it skips installation. If any required package or executable is missing, it runs `apk update` and installs `gcc-avr`, `avr-libc`, `binutils-avr`, and `make`. Output appears in the `AVR Toolchain Setup` terminal tab and remains visible at a final prompt. Full output is saved to `~/avr-forge-setup.log`. Internet access is needed only when installation is required.

## Install

1. Download the repository ZIP from GitHub.
2. In Acode, open Settings → Plugins.
3. Choose the local ZIP install option and select the downloaded archive.
4. Open AVR Forge from its sidebar entry and use the plugin-specific settings entry to launch its page.

## Create a project

Open the AVR Forge page. Choose “ساخت پروژه جدید”, enter a project name, select an MCU, and choose the parent folder. After creating the project files, AVR Forge automatically opens the new project as the active workspace and activates its `main.c` tab.

To open an existing project, choose “باز کردن پروژه موجود” and select its folder. Both actions use the same project-opening routine. Acode loads that folder as the active workspace. AVR Forge closes its own page, returns from the plugin-specific settings screen, then activates the `main.c` tab. This navigation sequence is an implementation attempt and still needs runtime verification on the target device.

The generated starter uses an 8 MHz clock definition. Change `F_CPU` to match your actual clock configuration.

## Compatibility

The manifest currently declares Acode version code 958 or newer because the project targets the modern documented plugin API. Android-version compatibility depends on the Acode version installed on the device.

## Development notes

The plugin uses Acode's `setPluginInit`, `setPluginUnmount`, `fileBrowser`, `openFolder`, `editorFile`, `EditorManager.switchFile()`, `Page.hide()`, and `ActionStack.pop()` APIs. When opened from plugin-specific settings, it first hides the plugin page and then pops one settings navigation action before activating `main.c`. This build has not been runtime-tested on the target device.

## License

MIT
