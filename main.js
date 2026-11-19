/* AVR Forge for Acode 0.1.9
 * Command Palette entry is registered independently from the optional sidebar app.
 */
(function () {
  "use strict";

  const PLUGIN_ID = "com.madarlab.avrforge";
  const COMMAND_ID = "avr-forge-open";
  const SIDEBAR_ID = "avr-forge-sidebar";
  const MCUS = [
    "atmega16", "atmega16a", "atmega32", "atmega8",
    "atmega328p", "atmega328pb", "atmega168", "atmega128",
    "atmega2560", "attiny13", "attiny85", "attiny2313"
  ];

  let commandsApi = null;
  let sidebarApi = null;
  let page = null;
  let commandRegistered = false;
  let sidebarRegistered = false;

  function notify(title, body, type) {
    try {
      acode.pushNotification(title, body, { type: type || "info" });
    } catch (e) {
      console.log("[AVR Forge] " + title + ": " + body, e);
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

  function panelHtml() {
    return [
      '<div style="padding:16px;overflow:auto;">',
      '<h2>AVR Forge</h2>',
      '<p>ابزار ساخت پروژه AVR برای Acode</p>',
      '<button id="avr-forge-create" class="btn">ساخت پروژه جدید</button>',
      '<button id="avr-forge-open-project" class="btn" style="margin-top:10px;">باز کردن پروژه موجود</button>',
      '<hr>',
      '<p>ساخت پروژه، انتخاب میکروکنترلر و ایجاد فایل‌های C و Makefile فعال است.</p>',
      '<p>کامپایل AVR-GCC و تولید HEX هنوز در این نسخه فعال نیست.</p>',
      '<small>نسخه 0.1.9</small>',
      '</div>'
    ].join("");
  }

  function renderPanel(container) {
    if (!container) return;
    container.innerHTML = panelHtml();
    const createButton = container.querySelector("#avr-forge-create");
    if (createButton) {
      createButton.addEventListener("click", async function () {
        createButton.disabled = true;
        try {
          await createProject();
        } catch (error) {
          console.error("[AVR Forge] createProject:", error);
          notify("AVR Forge", error && error.message ? error.message : String(error), "error");
        } finally {
          createButton.disabled = false;
        }
      });
    }

    const openButton = container.querySelector("#avr-forge-open-project");
    if (openButton) {
      openButton.addEventListener("click", async function () {
        openButton.disabled = true;
        try {
          await openExistingProject();
        } catch (error) {
          console.error("[AVR Forge] openExistingProject:", error);
          notify("AVR Forge", error && error.message ? error.message : String(error), "error");
        } finally {
          openButton.disabled = false;
        }
      });
    }
  }

  async function openExistingProject() {
    const fileBrowser = acode.require("fileBrowser");
    const openFolder = acode.require("openFolder");

    let selected;
    try {
      selected = await fileBrowser(
        "folder",
        "پوشه پروژه AVR را انتخاب کن",
        true
      );
    } catch (_) {
      return;
    }

    if (!selected || !selected.url) return;
    if (selected.type && selected.type !== "folder") {
      notify("AVR Forge", "لطفاً یک پوشه انتخاب کن.", "warning");
      return;
    }

    const folderUrl = String(selected.url).replace(/\/+$/, "");
    const mainCUrl = folderUrl + "/main.c";

    // Load the project folder first so it becomes the active workspace.
    await Promise.resolve(openFolder(selected.url, {
      name: selected.name || "AVR Project",
      saveState: true,
      reloadOnResume: true
    }));

    // Acode exposes its tab manager globally. Reuse an already-open main.c
    // tab when possible instead of creating duplicate tabs.
    const editorManager = window.editorManager || null;

    if (!editorManager) {
      throw new Error("مدیر تب‌های ویرایشگر Acode در دسترس نیست.");
    }

    let editorFile = null;
    if (typeof editorManager.getFile === "function") {
      editorFile = editorManager.getFile(mainCUrl, "uri");
    }

    if (!editorFile) {
      const EditorFile = acode.require("editorFile");
      if (typeof EditorFile === "function") {
        editorFile = new EditorFile("main.c", {
          uri: mainCUrl,
          render: true,
          editable: true
        });
      } else if (typeof acode.newEditorFile === "function") {
        editorFile = acode.newEditorFile("main.c", {
          uri: mainCUrl,
          render: true,
          editable: true
        });
      } else {
        throw new Error("رابط EditorFile در این نسخه از Acode در دسترس نیست.");
      }
    }

    if (!editorFile || !editorFile.id) {
      throw new Error("تب main.c ساخته نشد یا شناسهٔ معتبری ندارد.");
    }

    // Explicitly switch the editor manager to the target tab, then verify it.
    if (typeof editorManager.switchFile === "function") {
      editorManager.switchFile(editorFile.id);
    } else if (typeof editorFile.makeActive === "function") {
      editorFile.makeActive();
    }

    let activated = false;
    for (let attempt = 0; attempt < 30; attempt++) {
      const active = editorManager.activeFile;
      if (active && active.id === editorFile.id) {
        activated = true;
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
      if (typeof editorManager.switchFile === "function") {
        editorManager.switchFile(editorFile.id);
      } else if (typeof editorFile.makeActive === "function") {
        editorFile.makeActive();
      }
    }

    if (!activated) {
      throw new Error("فایل main.c ایجاد شد، اما Acode آن را به‌عنوان تب فعال نپذیرفت. صفحه افزونه باز می‌ماند.");
    }

    // Hide the plugin page only after the editor confirms main.c is active.
    if (page && typeof page.hide === "function") {
      page.hide();
    }

    notify("AVR Forge", "تب main.c با موفقیت فعال شد.", "success");
  }

  async function createProject() {
    const prompt = acode.require("prompt");
    const select = acode.require("select");
    const fileBrowser = acode.require("fileBrowser");
    const fs = acode.require("fs");

    const name = await prompt("Project name", "avr-project", "text");
    if (!name) return;

    const mcu = await select("Select AVR MCU", MCUS, { default: "atmega16a" });
    if (!mcu) return;

    let selected;
    try {
      selected = await fileBrowser("folder", "Select the parent folder for your AVR project");
    } catch (_) {
      return;
    }
    if (!selected || !selected.url) return;

    const parent = await fs(selected.url);
    const folderName = safeName(name);
    const projectUrl = await parent.createDirectory(folderName);
    const project = await fs(projectUrl);

    await project.createFile("main.c", mainC(mcu));
    await project.createFile("Makefile", makefile(mcu));
    await project.createFile("README.md", [
      "# " + folderName,
      "",
      "- MCU: " + mcu,
      "- Clock template: 8 MHz; edit F_CPU to match your hardware.",
      "",
      "The Makefile expects AVR-GCC, AVR-LibC, GNU Binutils and Make.",
      "This plugin version does not run the compiler inside Acode yet."
    ].join("\n") + "\n");

    notify("AVR Forge", "پروژه ساخته شد: " + folderName, "success");
  }

  function openPluginPage() {
    if (!page) {
      notify("AVR Forge", "صفحه افزونه هنوز آماده نیست.", "error");
      return;
    }
    renderPanel(page);
    page.show();
  }

  if (!window.acode) return;

  acode.setPluginInit(PLUGIN_ID, async function (_baseUrl, $page) {
    page = $page;

    // Register the command FIRST. Sidebar support is optional and cannot block it.
    try {
      commandsApi = acode.require("commands");
      commandsApi.addCommand({
        name: COMMAND_ID,
        description: "Open AVR Forge",
        exec: function () {
          openPluginPage();
          return true;
        }
      });
      commandRegistered = true;
    } catch (error) {
      console.error("[AVR Forge] Command registration failed:", error);
      notify("AVR Forge command error", error && error.message ? error.message : String(error), "error");
    }

    // Sidebar app is an additional shortcut, not a dependency for plugin startup.
    try {
      sidebarApi = acode.require("sidebarApps");
      if (sidebarApi && typeof sidebarApi.add === "function") {
        sidebarApi.add(
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
      }
    } catch (error) {
      console.warn("[AVR Forge] Sidebar unavailable; command remains enabled.", error);
    }

    notify(
      "AVR Forge",
      commandRegistered
        ? (sidebarRegistered ? "افزونه آماده است؛ از دستور AVR Forge یا آیکون سایدبار استفاده کن." : "افزونه آماده است؛ دستور AVR Forge ثبت شد.")
        : "افزونه بارگذاری شد، اما ثبت دستور ناموفق بود.",
      commandRegistered ? "success" : "warning"
    );
  }, {
    list: [{
      key: "open_avr_forge",
      text: "باز کردن صفحه ساخت پروژه",
      icon: "icon-code",
      info: "برای ورود به محیط AVR Forge این گزینه را انتخاب کن.",
      value: "open",
      select: [["open", "باز کردن AVR Forge"]],
    }],
    cb: function (key, value) {
      if (key === "open_avr_forge" && value === "open") {
        openPluginPage();
      }
    }
  });

  acode.setPluginUnmount(PLUGIN_ID, function () {
    try {
      if (commandRegistered && commandsApi) {
        commandsApi.removeCommand(COMMAND_ID);
      }
    } catch (error) {
      console.warn("[AVR Forge] command cleanup:", error);
    }
    try {
      if (sidebarRegistered && sidebarApi) {
        sidebarApi.remove(SIDEBAR_ID);
      }
    } catch (error) {
      console.warn("[AVR Forge] sidebar cleanup:", error);
    }
    page = null;
    commandsApi = null;
    sidebarApi = null;
    commandRegistered = false;
    sidebarRegistered = false;
  });
})();
