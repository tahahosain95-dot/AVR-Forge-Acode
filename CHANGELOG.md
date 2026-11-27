# Changelog

## 0.1.18
- Check readable CA certificate bundle candidates and APK file permissions before updating indexes.
- Retry APK index refresh once with a short delay.
- Show troubleshooting hints for permission/TLS/network errors without weakening repository security.


## 0.1.17
- Use a plugin-owned writable APK cache directory to mitigate cache permission errors.
- Stream setup output to the terminal and save a log.
- Report detected architecture, final verification, and installation failure more accurately.
- Preserve APK installation failure status rather than always showing exit code 0.


## 0.1.16
- Keep setup output visible at a final prompt instead of letting the terminal close immediately.
- Save complete setup output to `~/avr-forge-setup.log`.
- Check all expected AVR commands and report final verification.


## 0.1.15
- Check Alpine package records and required executables after every project creation.
- Skip package installation when `make`, `gcc-avr`, `avr-libc`, `binutils-avr`, `avr-gcc`, and `avr-objcopy` are already present.
- Run `apk update` and install the required packages only if any component is missing.


## 0.1.14
- After creating a project, open a visible Acode Alpine terminal tab.
- Run `apk update` and install `make`, `gcc-avr`, `avr-libc`, and `binutils-avr`.
- Verify AVR-GCC, AVR-Objcopy, and GNU Make versions in the terminal output.
- Keep project creation successful even if terminal setup cannot start; show the setup error as a notification.


## 0.1.13
- After creating a project and writing main.c, Makefile, and README.md, automatically open the new folder as the active Acode workspace.
- Automatically open and activate the newly created main.c tab.
- Reuse the same project-opening routine for both Create Project and Open Existing Project.

# Changelog

## 0.1.12
- Preserve the existing entry path: AVR Forge sidebar → plugin-specific settings → open AVR Forge.
- On project open, hide the AVR Forge page first, then pop one settings navigation action.
- Activate and verify the main.c tab only after navigation has settled.
- Use Acode's documented EditorFile, EditorManager, Page, and Action Stack APIs.
- Runtime behavior still requires verification on Acode 1.13.5.

## 0.1.11
- Detect launch from the plugin-specific Settings page.
- Pop both the AVR Forge page and plugin Settings navigation layer before activating main.c.
- Runtime behavior still requires verification on Acode 1.13.5.

## 0.1.10
- Hide the plugin page before switching editor tabs, because page navigation can restore the previous Plugin Settings screen.
- Activate and verify main.c after the plugin page is hidden.
- Runtime behavior still requires testing on the target Acode device.

## 0.1.9
- Reuse an already-open main.c tab when possible.
- Switch to main.c through Acode's EditorManager and verify the active tab before hiding the plugin page.
- Keep the plugin page open and report an error if main.c cannot be confirmed as active.
- Runtime behavior still requires testing on the target device.

# Changelog

## 0.1.8
- Explicitly activate the newly opened main.c tab with EditorFile.makeActive().
- Hide the AVR Forge plugin page after the editor tab is activated.
- Uses documented Acode EditorFile and Page APIs; not yet runtime-tested on device.

## 0.1.7
- Initial attempt to close the plugin page and activate main.c after opening a project.

## 0.1.6
- When opening an existing project folder, activate it as the Acode workspace and open its main.c file in a new editor tab.

## 0.1.5
- Add an "Open existing project" button to the AVR Forge page.
- Let the user choose a project folder and load it as an Acode workspace.

## 0.1.4
- Add a plugin-specific settings entry to open the AVR Forge project page from the plugin manager.
- Keep the Command Palette and sidebar entry as alternate launch paths.

## 0.1.3
- Fix command execution so the plugin page is rendered before it is shown.
- Register the Command Palette command before optional sidebar setup.
- Keep sidebar registration isolated so it cannot disable the command.

## 0.1.2
- Prevent sidebar registration failures from aborting plugin initialization.
- Add fallback page and optional command entry.

## 0.1.1
- Added one-tap sidebar app entry.

## 0.1.0
- Initial project scaffolding.
- Added AVR MCU selector and starter main.c / Makefile generation.
