# Changelog

## 0.1.5
- Add an "Open existing project" button to the AVR Forge page.
- Let the user choose a project folder and load it as an Acode workspace using the documented openFolder utility.
- This release has not yet been runtime-tested on Acode 1.13.5.

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
