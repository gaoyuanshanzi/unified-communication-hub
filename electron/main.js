const { app, BrowserWindow, session, ipcMain, shell } = require("electron");
const path = require("path");

// Google 로그인 차단 방지를 위한 순수 Chrome User-Agent
const CHROME_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 950,
    minWidth: 1024,
    minHeight: 700,
    title: "Unified Communication Hub",
    backgroundColor: "#f8fafc",
    autoHideMenuBar: true,
    webPreferences: {
      webviewTag: true,
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // 전역 세션 User-Agent 설정
  session.defaultSession.setUserAgent(CHROME_USER_AGENT);

  // 모든 파티션(카카오, 네이버, 지메일) 세션에 Chrome User-Agent 적용
  const partitions = ["persist:kakaotalk", "persist:naver", "persist:gmail"];
  partitions.forEach((partitionName) => {
    const customSession = session.fromPartition(partitionName);
    customSession.setUserAgent(CHROME_USER_AGENT);

    // 팝업 및 새 창 열기 처리 (로그인 팝업 등)
    customSession.setPermissionRequestHandler((webContents, permission, callback) => {
      callback(true);
    });
  });

  // 로컬 개발 서버 또는 Vercel 프로덕션 URL 로드
  const startUrl =
    process.env.ELECTRON_START_URL ||
    "https://hyunscommunications.vercel.app";

  mainWindow.loadURL(startUrl);

  // 새 창 요청을 기본 브라우저 대신 처리
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
