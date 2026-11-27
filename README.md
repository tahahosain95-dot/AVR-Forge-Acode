# AVR Forge for Acode

AVR Forge is an Acode plugin project for creating AVR C firmware workspaces.

## Current status — 0.1.20

This is an **early project-scaffolding release**, not the complete AVR IDE.

Implemented:
- Acode plugin lifecycle registration and command.
- Project creation in a folder selected through Acode's file browser.
- Open an existing project folder as an Acode workspace from the AVR Forge page.
- MCU selection from a starter list.
- Generated `main.c`, `Makefile`, and project `README.md`.
- ARM64 offline installer that reads five bundled Alpine APK files, copies them to the Acode Terminal public directory, and invokes `apk --no-network add`.
- The installer checks the Alpine architecture and verifies `avr-gcc`, Binutils commands, `make`, and `avrdude` after installation.

Not implemented yet:
- A dedicated in-plugin compile button and HEX workflow.
- AVR register autocomplete and dedicated syntax highlighting.

## Offline ARM64 toolchain

Before packaging the plugin ZIP, place these files in `assets/toolchain/aarch64/` with the exact names:

- `gcc-avr-14.2.0-r1.apk`
- `avr-libc-2.2.1-r0.apk`
- `binutils-avr-2.42-r1.apk`
- `make-4.4.1-r2.apk`
- `avrdude-8.0-r1.apk`

The current installer supports Alpine `aarch64` only. It does not refresh APK indexes or download packages. It does not bypass APK signature verification. If Alpine reports missing dependencies, matching dependency APKs must also be bundled and added to the installer command. The five primary packages may not be sufficient on a clean Alpine installation.
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
