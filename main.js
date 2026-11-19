/* AVR Forge for Acode — sidebar project assistant.
 * Sidebar API: https://docs.acode.app/docs/interface-apis/sidebar-apps
 */
(function () {
  "use strict";

  const PLUGIN_ID = "com.madarlab.avrforge";
  const SIDEBAR_ID = "avr-forge-sidebar";
  const MCUS = [
    "atmega16", "atmega16a", "atmega32", "atmega8",
    "atmega328p", "atmega328pb", "atmega168", "atmega128",
    "atmega2560", "attiny13", "attiny85", "attiny2313"
  ];

  let commands = null;
  let sideBarApps = null;
  let commandAdded = false;
  let sidebarAdded = false;

  function notify(title, message, type) {
    if (window.acode && acode.pushNotification) {
      acode.pushNotification(title, message, { type: type || "info" });
    } else {
      alert(title + "\n" + message);
    }
  }

  function safeName(value) {
    return String(value || "avr-project").trim()
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "avr-project";
  }

  function mainC(mcu) {
    return [
      "#define F_CPU 8000000UL",
      "#include <avr/io.h>",
      "#include <util/delay.h>",
      "",
      "int main(void)",
      "{",
      "    /* TODO: configure GPIO and peripherals for " + mcu + ". */",
      "    DDRB |= (1 << PB0);",
      "    while (1)",
      "    {",
      "        PORTB ^= (1 << PB0);",
      "        _delay_ms(500);",
      "    }",
      "}"
    ].join("\n") + "\n";
  }

  function makefile(mcu) {
    return [
      "MCU = " + mcu,
      "F_CPU = 8000000UL",
      "CC = avr-gcc",
      "OBJCOPY = avr-objcopy",
      "CFLAGS = -mmcu=$(MCU) -DF_CPU=$(F_CPU) -Os -Wall -Wextra",
      "TARGET = main",
      "SRC = main.c",
      "",
      "all: $(TARGET).hex",
      "",
      "$(TARGET).elf: $(SRC)",
      "\t$(CC) $(CFLAGS) -o $@ $^",
      "",
      "$(TARGET).hex: $(TARGET).elf",
      "\t$(OBJCOPY) -O ihex -R .eeprom $< $@",
      "",
      "clean:",
      "\trm -f $(TARGET).elf $(TARGET).hex",
      "",
      ".PHONY: all clean"
    ].join("\n") + "\n";
  }

  async function createProject() {
    const fileBrowser = acode.require("fileBrowser");
    const fs = acode.require("fs");
    const select = acode.require("select");
    const prompt = acode.require("prompt");

    const projectName = await prompt("Project name", "avr-project", "text");
    if (!projectName) return;

    const mcu = await select("Select AVR MCU", MCUS, { default: "atmega16a" });
    if (!mcu) return;

    const picked = await fileBrowser("folder", "Choose the parent folder for your AVR project");
    if (!picked || !picked.url) return;

    const parent = await fs(picked.url);
    const folderName = safeName(projectName);
    const projectUrl = await parent.createDirectory(folderName);
    const project = await fs(projectUrl);

    await project.createFile("main.c", mainC(mcu));
    await project.createFile("Makefile", makefile(mcu));
    await project.createFile("README.md", [
      "# " + folderName,
      "",
      "- MCU: " + mcu,
      "- Clock template: 8 MHz (edit F_CPU to match your hardware)",
      "",
      "## Build",
      "",
      "This project includes a Makefile for an environment that already has AVR-GCC, AVR-LibC, GNU Binutils and Make installed.",
      "",
      "`make` creates `main.hex`; `make clean` removes generated build files.",
      "",
      "AVR Forge 0.1.1 does not yet execute the compiler from inside Acode."
    ].join("\n") + "\n");

    notify("AVR Forge", "Project created: " + folderName + "\nMCU: " + mcu + "\nFiles: main.c, Makefile, README.md", "success");
  }

  function renderPanel(container) {
    container.innerHTML = [
      '<div class="avr-forge scroll" style="padding:16px;max-height:100%;overflow-y:auto;">',
      '<h2>AVR Forge</h2>',
      '<p>ابزار ساخت پروژه AVR در Acode</p>',
      '<button id="avr-new-project" class="btn">ساخت پروژه جدید</button>',
      '<hr>',
      '<h3>وضعیت قابلیت‌ها</h3>',
      '<ul>',
      '<li>ساخت پوشه پروژه و فایل‌های main.c و Makefile: فعال</li>',
      '<li>انتخاب MCU: فعال</li>',
      '<li>کامپایل AVR-GCC و تولید HEX از داخل افزونه: هنوز پیاده‌سازی نشده</li>',
      '<li>هایلایت اختصاصی و تکمیل خودکار رجیسترها: در نسخه بعدی</li>',
      '</ul>',
      '<p style="opacity:.75;font-size:12px">نسخه 0.1.1 — پنل از نوار کناری باز می‌شود.</p>',
      '</div>'
    ].join("");

    const button = container.querySelector("#avr-new-project");
    button.addEventListener("click", async function () {
      button.disabled = true;
      try {
        await createProject();
      } catch (error) {
        console.error("[AVR Forge]", error);
        notify("AVR Forge error", error && error.message ? error.message : String(error), "error");
      } finally {
        button.disabled = false;
      }
    });
  }

  if (!window.acode) return;

  acode.setPluginInit(PLUGIN_ID, async function () {
    // Add a persistent one-tap entry to Acode's sidebar.
    sideBarApps = acode.require("sidebarApps");
    if (!sideBarApps || typeof sideBarApps.add !== "function") {
      throw new Error("این نسخه Acode از Sidebar Apps API پشتیبانی نمی‌کند.");
    }

    sideBarApps.add(
      "icon-code",
      SIDEBAR_ID,
      "AVR Forge",
      function (container) {
        renderPanel(container);
      },
      false,
      function (container) {
        // Keep the sidebar panel ready whenever the user selects it.
        if (!container.querySelector("#avr-new-project")) renderPanel(container);
      }
    );
    sidebarAdded = true;

    // Keep the command as an optional alternative entry point.
    try {
      commands = acode.require("commands");
      if (commands && typeof commands.addCommand === "function") {
        commands.addCommand({
          name: "avr-forge-open",
          description: "Open AVR Forge",
          exec: function () {
            const panel = sideBarApps.get(SIDEBAR_ID);
            if (panel && typeof panel.show === "function") panel.show();
          }
        });
        commandAdded = true;
      }
    } catch (error) {
      console.warn("[AVR Forge] Optional command registration skipped:", error);
    }

    notify("AVR Forge", "آیکون افزونه به نوار کناری اضافه شد.", "success");
  });

  acode.setPluginUnmount(PLUGIN_ID, function () {
    if (commandAdded && commands) {
      try { commands.removeCommand("avr-forge-open"); } catch (_) {}
    }
    if (sidebarAdded && sideBarApps) {
      try { sideBarApps.remove(SIDEBAR_ID); } catch (_) {}
    }
    commandAdded = false;
    sidebarAdded = false;
    commands = null;
    sideBarApps = null;
  });
})();
