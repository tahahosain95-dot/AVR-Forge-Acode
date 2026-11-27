/* AVR Forge for Acode 0.1.20
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
  let launchedFromPluginSettings = false;
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
      '<p>پس از ساخت پروژه، بسته‌های AVR همراه پلاگین به‌صورت آفلاین در Alpine نصب می‌شوند.</p>',
      '<small>نسخه 0.1.20</small>',
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

  async function openProjectFolder(folderUrl, projectName) {
    const openFolder = acode.require("openFolder");
    let normalizedUrl = String(folderUrl);
    while (normalizedUrl.endsWith("/")) normalizedUrl = normalizedUrl.slice(0, -1);
    const mainCUrl = normalizedUrl + "/main.c";

    await Promise.resolve(openFolder(folderUrl, {
      name: projectName || "AVR Project",
      saveState: true,
      reloadOnResume: true
    }));

    const editorManager = window.editorManager;
    if (!editorManager) {
      throw new Error("مدیر تب‌های ویرایشگر Acode در دسترس نیست.");
    }

    let editorFile = editorManager.getFile(mainCUrl, "uri");
    if (!editorFile) {
      const EditorFile = acode.require("editorFile");
      editorFile = new EditorFile("main.c", { uri: mainCUrl, render: true });
    }

    if (!editorFile || !editorFile.id) {
      throw new Error("تب main.c ساخته نشد یا شناسهٔ معتبری ندارد.");
    }

    // Keep the same navigation sequence used by the Open Existing Project action.
    if (page && typeof page.hide === "function") {
      page.hide();
    }

    await new Promise(resolve => setTimeout(resolve, 180));

    if (launchedFromPluginSettings) {
      const actionStack = acode.require("actionStack");
      if (actionStack && typeof actionStack.pop === "function") {
        actionStack.pop();
      }
    }

    launchedFromPluginSettings = false;
    await new Promise(resolve => setTimeout(resolve, 300));

    let activated = false;
    for (let attempt = 0; attempt < 25; attempt++) {
      if (typeof editorManager.switchFile === "function") {
        editorManager.switchFile(editorFile.id);
      } else if (typeof editorFile.makeActive === "function") {
        editorFile.makeActive();
      }

      await new Promise(resolve => setTimeout(resolve, 120));
      const active = editorManager.activeFile;
      if (active && active.id === editorFile.id) {
        activated = true;
        break;
      }
    }

    if (!activated) {
      notify("AVR Forge", "پروژه باز شد، اما فعال‌شدن تب main.c تأیید نشد.", "error");
      return false;
    }

    try {
      if (editorManager.editor && typeof editorManager.editor.focus === "function") {
        editorManager.editor.focus();
      }
    } catch (_) {}

    notify("AVR Forge", "پروژه باز شد و main.c فعال شد.", "success");
    return true;
  }

  let pluginBaseUrl = "";

  function getTerminalFilesDir() {
    return new Promise((resolve, reject) => {
      if (!window.system || typeof window.system.getFilesDir !== "function") {
        reject(new Error("مسیر فایل‌های ترمینال Acode در دسترس نیست."));
        return;
      }
      window.system.getFilesDir(resolve, reject);
    });
  }

  async function copyBundledToolchainToTerminal() {
    const filesDir = await getTerminalFilesDir();
    const publicUrl = "file://" + String(filesDir).replace(/\/$/, "") + "/public";
    const targetUrl = publicUrl + "/avr-forge-toolchain";
    const publicDir = acode.fsOperation(publicUrl);
    if (!(await publicDir.exists())) {
      throw new Error("پوشه Public ترمینال Acode پیدا نشد. ابتدا ترمینال Alpine را یک‌بار باز کن.");
    }
    const targetDir = acode.fsOperation(targetUrl);
    if (!(await targetDir.exists())) await publicDir.createDirectory("avr-forge-toolchain");

    const packageFiles = [
      "gcc-avr-14.2.0-r1.apk",
      "avr-libc-2.2.1-r0.apk",
      "binutils-avr-2.42-r1.apk",
      "make-4.4.1-r2.apk",
      "avrdude-8.0-r1.apk"
    ];
    const assetBase = pluginBaseUrl + "assets/toolchain/aarch64/";
    for (const filename of packageFiles) {
      const response = await fetch(assetBase + filename);
      if (!response.ok) throw new Error("فایل داخل ZIP پلاگین پیدا نشد: assets/toolchain/aarch64/" + filename);
      const data = await response.arrayBuffer();
      if (!data || data.byteLength < 100) throw new Error("فایل بسته ناقص یا خالی است: " + filename);
      await acode.fsOperation(targetUrl + "/" + filename).writeFile(data);
    }
    return "/public/avr-forge-toolchain";
  }

  async function installAvrToolchain() {
    const terminalApi = acode.require("terminal");
    if (!terminalApi || typeof terminalApi.createServer !== "function" || typeof terminalApi.write !== "function") {
      throw new Error("API ترمینال Acode در دسترس نیست؛ ترمینال داخلی را فعال یا به‌روزرسانی کن.");
    }
    notify("AVR Forge", "در حال آماده‌سازی بسته‌های آفلاین همراه پلاگین...", "info");
    const packageDir = await copyBundledToolchainToTerminal();
    const terminalInstance = await terminalApi.createServer({ name: "AVR Offline Toolchain" });
    if (!terminalInstance || !terminalInstance.id) throw new Error("ترمینال Alpine ایجاد نشد.");

    const command = [
      'set -o pipefail',
      'LOG="$HOME/avr-forge-setup.log"',
      'APK_DIR="' + packageDir + '"',
      'mkdir -p "$HOME/.cache/avr-forge"',
      '{',
      'echo "AVR Forge offline toolchain setup v0.1.20"',
      'echo "Architecture: $(apk --print-arch 2>/dev/null || uname -m)"',
      'echo "Package directory: $APK_DIR"',
      'if [ "$(apk --print-arch 2>/dev/null)" != "aarch64" ]; then echo "ERROR: This bundled toolchain is for aarch64 only."; exit 10; fi',
      'MISSING_FILES=0',
      'for f in gcc-avr-14.2.0-r1.apk avr-libc-2.2.1-r0.apk binutils-avr-2.42-r1.apk make-4.4.1-r2.apk avrdude-8.0-r1.apk; do if [ -s "$APK_DIR/$f" ]; then echo "[OK] $f"; else echo "[MISSING] $APK_DIR/$f"; MISSING_FILES=1; fi; done',
      'if [ "$MISSING_FILES" -ne 0 ]; then echo "ERROR: Put all five ARM64 APK files in assets/toolchain/aarch64/ inside the plugin ZIP, then reinstall/update the plugin."; exit 11; fi',
      'echo "Installing local APK files without network access..."',
      'apk --no-network add "$APK_DIR/gcc-avr-14.2.0-r1.apk" "$APK_DIR/avr-libc-2.2.1-r0.apk" "$APK_DIR/binutils-avr-2.42-r1.apk" "$APK_DIR/make-4.4.1-r2.apk" "$APK_DIR/avrdude-8.0-r1.apk" || { rc=$?; echo "ERROR: Offline APK installation failed (exit $rc). Dependency APKs may also need to be bundled."; exit "$rc"; }',
      'echo "Verifying commands..."',
      'VERIFY=0',
      'for c in avr-gcc avr-objcopy avr-objdump avr-size avr-nm avr-as avr-ld make avrdude; do if command -v "$c" >/dev/null 2>&1; then echo "[OK] $c: $(command -v "$c")"; else echo "[MISSING] $c"; VERIFY=1; fi; done',
      'if [ "$VERIFY" -ne 0 ]; then echo "RESULT: FAILED - installed packages but commands are missing."; exit 12; fi',
      'echo "RESULT: SUCCESS - AVR tools installed from local files. No network was used."',
      'echo "avr-gcc: $(avr-gcc --version | head -n 1)"',
      'echo "make: $(make --version | head -n 1)"',
      'echo "avrdude: $(avrdude --version 2>&1 | head -n 1)"',
      'echo "Setup finished. Log: $LOG"',
      'echo "Press Enter to close this setup output."',
      'read -r AVR_FORGE_PAUSE',
      '} 2>&1 | tee "$LOG"'
    ].join("\n");
    terminalApi.write(terminalInstance.id, command + "\r");
    notify("AVR Forge", "بسته‌های داخل ZIP به Public ترمینال منتقل شدند و نصب آفلاین آغاز شد.", "info");
    return true;
  }

  async function openExistingProject() {
    const fileBrowser = acode.require("fileBrowser");

    let selected;
    try {
      selected = await fileBrowser("folder", "پوشه پروژه AVR را انتخاب کن", true);
    } catch (_) {
      return;
    }

    if (!selected || !selected.url) return;
    if (selected.type && selected.type !== "folder") {
      notify("AVR Forge", "لطفاً یک پوشه انتخاب کن.", "warning");
      return;
    }

    await openProjectFolder(selected.url, selected.name || "AVR Project");
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

    notify("AVR Forge", "پروژه ساخته شد؛ نصب ابزارهای کامپایل AVR و make آغاز می‌شود.", "success");
    try {
      await installAvrToolchain();
    } catch (installError) {
      console.error("[AVR Forge] toolchain installation:", installError);
      notify(
        "AVR Forge - نصب ابزارها",
        "پروژه ساخته شد، اما نصب خودکار ابزارها شروع نشد: " +
          (installError && installError.message ? installError.message : String(installError)),
        "error"
      );
    }
    await openProjectFolder(projectUrl, folderName);
  }

  function openPluginPage(fromSettings) {
    launchedFromPluginSettings = !!fromSettings;
    if (!page) {
      notify("AVR Forge", "صفحه افزونه هنوز آماده نیست.", "error");
      return;
    }
    renderPanel(page);
    page.show();
  }

  if (!window.acode) return;

  acode.setPluginInit(PLUGIN_ID, async function (_baseUrl, $page) {
    pluginBaseUrl = String(_baseUrl || "");
    if (!pluginBaseUrl.endsWith("/")) pluginBaseUrl += "/";
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
        openPluginPage(true);
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
