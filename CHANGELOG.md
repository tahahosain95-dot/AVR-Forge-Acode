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
