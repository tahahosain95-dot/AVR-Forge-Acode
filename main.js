/* AVR Forge for Acode 0.1.2
 * Sidebar registration is guarded so an unsupported sidebar API cannot break plugin loading.
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

  let sidebar = null;
  let sidebarRegistered = false;
  let commands = null;
  let commandRegistered = false;
  let pluginPage = null;

  function message(title, body, type) {
    try {
      if (acode && typeof acode.pushNotification === "function") {
        acode.pushNotification(title, body, { type: type || "info" });
      } else if (typeof alert === "function") {
        alert(title + "\n" + body);
      }
    } catch (e) {
      console.log("[AVR Forge]", title, body, e);
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
      "    /* Starter template for " + mcu + ". */",
      "    DDRB |= (1 << PB0);",
      "    while (1) {",
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

  function renderPanel(container) {
    if (!container) return;
    container.innerHTML = [
      '<div style="padding:14px;max-height:100%;overflow-y:auto;">',
      '<h2>AVR Forge</h2>',
      '<p>ابزار ساخت پروژه AVR</p>',
      '<button id="avr-forge-create" class="btn">ساخت پروژه جدید</button>',
      '<hr>',
      '<p>ساخت پروژه و فایل‌های اولیه فعال است.</p>',
      '<p>کامپایل AVR-GCC و تولید HEX هنوز در این نسخه پیاده‌سازی نشده است.</p>',
      '<small>نسخه 0.1.2</small>',
      '</div>'
    ].join("");

    const button = container.querySelector("#avr-forge-create");
    if (button) {
      button.addEventListener("click", async function () {
        button.disabled = true;
        try {
          await createProject();
        } catch (error) {
          console.error("[AVR Forge] Project creation failed:", error);
          message("AVR Forge", error && error.message ? error.message : String(error), "error");
        } finally {
          button.disabled = false;
        }
      });
    }
  }

  async function createProject() {
    // Use documented Acode UI APIs where available.
    const prompt = acode.prompt || acode.require("prompt");
    const select = acode.select || acode.require("select");
    const fileBrowser = acode.fileBrowser || acode.require("fileBrowser");
    const fsFactory = acode.require("fs");

    if (typeof prompt !== "function" || typeof select !== "function" ||
        typeof fileBrowser !== "function" || typeof fsFactory !== "function") {
      throw new Error("یکی از APIهای لازم Acode در دسترس نیست. ساخت پروژه در این نسخه پشتیبانی نمی‌شود.");
    }

    const name = await prompt("Project name", "avr-project", "text");
    if (!name) return;

    const mcu = await select("Select AVR MCU", MCUS, { default: "atmega16a" });
    if (!mcu) return;

    const picked = await fileBrowser("folder", "Choose the parent folder for your AVR project");
    if (!picked || !picked.url) return;

    const parent = await fsFactory(picked.url);
    const folder = safeName(name);
    const projectUrl = await parent.createDirectory(folder);
    const project = await fsFactory(projectUrl);

    await project.createFile("main.c", mainC(mcu));
    await project.createFile("Makefile", makefile(mcu));
    await project.createFile("README.md", [
      "# " + folder,
      "",
      "- MCU: " + mcu,
      "- Clock template: 8 MHz; change F_CPU to match your hardware.",
      "",
      "Run make in an environment with AVR-GCC, AVR-LibC, GNU Binutils and Make installed.",
      "AVR Forge 0.1.2 does not yet run the compiler inside Acode."
    ].join("\n") + "\n");

    message("AVR Forge", "پروژه ساخته شد: " + folder, "success");
  }

  function registerSidebar() {
    try {
      sidebar = acode.require("sidebarApps");
      if (!sidebar || typeof sidebar.add !== "function") {
        throw new Error("sidebarApps API در این نصب Acode در دسترس نیست.");
      }

      // Documented API: add(icon, id, title, initFunction, prepend, onSelected)
      sidebar.add(
        "icon-code",
        SIDEBAR_ID,
        "AVR Forge",
        function (container) { renderPanel(container); },
        false,
        function (container) {
          if (container && !container.querySelector("#avr-forge-create")) {
            renderPanel(container);
          }
        }
      );
      sidebarRegistered = true;
      return true;
    } catch (error) {
      console.error("[AVR Forge] Sidebar registration failed:", error);
      message("AVR Forge: Sidebar unavailable",
        error && error.message ? error.message : String(error),
        "warning");
      return false;
    }
  }

  function registerFallbackCommand() {
    try {
      commands = acode.require("commands");
      if (commands && typeof commands.addCommand === "function") {
        commands.addCommand({
          name: "avr-forge-open",
          description: "Open AVR Forge",
          exec: function () {
            try {
              if (sidebar && typeof sidebar.get === "function") {
                const panel = sidebar.get(SIDEBAR_ID);
                if (panel && typeof panel.show === "function") panel.show();
              }
              if (pluginPage && typeof pluginPage.show === "function") {
                pluginPage.show();
              }
            } catch (error) {
              console.error("[AVR Forge] Open command failed:", error);
            }
          }
        });
        commandRegistered = true;
      }
    } catch (error) {
      console.warn("[AVR Forge] Command API unavailable:", error);
    }
  }

  if (!window.acode) return;

  acode.setPluginInit(PLUGIN_ID, async function (_baseUrl, $page) {
    pluginPage = $page || null;

    // A sidebar error must never reject plugin initialization.
    const added = registerSidebar();
    registerFallbackCommand();

    if (!added && pluginPage) {
      renderPanel(pluginPage);
      message("AVR Forge", "پنل جایگزین افزونه در دسترس است؛ آیکون سایدبار ثبت نشد.", "warning");
    } else if (added) {
      message("AVR Forge", "افزونه بارگذاری شد. آیکون آن باید در سایدبار باشد.", "success");
    }
  });

  acode.setPluginUnmount(PLUGIN_ID, function () {
    try {
      if (commandRegistered && commands) commands.removeCommand("avr-forge-open");
    } catch (error) {
      console.warn("[AVR Forge] Command cleanup:", error);
    }
    try {
      if (sidebarRegistered && sidebar) sidebar.remove(SIDEBAR_ID);
    } catch (error) {
      console.warn("[AVR Forge] Sidebar cleanup:", error);
    }
    sidebar = null;
    commands = null;
    pluginPage = null;
    sidebarRegistered = false;
    commandRegistered = false;
  });
})();
