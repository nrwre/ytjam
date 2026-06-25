const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

const PROTOCOL = "ytjam";
let win;

function parseProtocolUrl(urlString) {
  try {
    const url = new URL(urlString);
    if (url.protocol !== `${PROTOCOL}:`) return null;
    const server = url.searchParams.get("server");
    const room = url.searchParams.get("room");
    if (!server || !room) return null;
    return { server, room };
  } catch {
    return null;
  }
}

function handleLaunchArgs(argv) {
  const urlArg = argv.find((arg) => arg.startsWith(`${PROTOCOL}://`));
  if (!urlArg || !win) return;
  const parsed = parseProtocolUrl(urlArg);
  if (!parsed) return;
  win.webContents.send("companion:autojoin", parsed);
  win.show();
  win.focus();
}

const SIZE_COMPACT = { width: 200, height: 220 };
const SIZE_WITH_CHAT = { width: 280, height: 460 };

function createWindow() {
  const { screen } = require("electron");
  const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize;

  win = new BrowserWindow({
    ...SIZE_COMPACT,
    x: screenW - SIZE_COMPACT.width - 20,
    y: screenH - SIZE_COMPACT.height - 40,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  win.loadFile(path.join(__dirname, "pet.html"));
  win.webContents.once("did-finish-load", () => {
    handleLaunchArgs(process.argv);
  });
}

ipcMain.on("companion:setChatVisible", (event, visible) => {
  if (!win) return;
  const { screen } = require("electron");
  const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize;
  const size = visible ? SIZE_WITH_CHAT : SIZE_COMPACT;
  win.setBounds({
    width: size.width,
    height: size.height,
    x: screenW - size.width - 20,
    y: screenH - size.height - 40,
  });
});

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", (event, argv) => {
    handleLaunchArgs(argv);
  });

  app.whenReady().then(() => {
    app.setAsDefaultProtocolClient(PROTOCOL);
    createWindow();
  });
}

// macOS dispatches protocol launches via this event instead of argv.
app.on("open-url", (event, urlString) => {
  const parsed = parseProtocolUrl(urlString);
  if (parsed && win) {
    win.webContents.send("companion:autojoin", parsed);
    win.show();
    win.focus();
  }
});

ipcMain.on("companion:quit", () => {
  app.quit();
});

app.on("window-all-closed", () => {
  app.quit();
});
