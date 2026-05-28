const { app, BrowserWindow, ipcMain, Tray, Menu, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const { exec } = require('child_process');

let petWindow;
let tray;

// 預設設定檔路徑
const configPath = path.join(app.getPath('userData'), 'pet-config.json');
const randomPoolDir = path.join(app.getPath('userData'), 'random-pool');

app.disableHardwareAcceleration(); // 解決 Windows 透明視窗可能變黑底的問題

// 讀取設定
function loadConfig() {
  if (fs.existsSync(configPath)) {
    try {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } catch (e) {
      console.error('讀取設定檔失敗，將使用預設值', e);
    }
  }
  return {
    size: 150,
    speed: 3,
    colorFilters: {
      hueRotate: 0,
      saturate: 100,
      brightness: 100,
      contrast: 100
    },
    phrases: {
      lunch: [
        "親愛的母，現在是午休時間！一定要記得吃午餐，吃飽睡一下喔！🍱",
        "噓... 璨璨充飽電了，親愛的母也該放下手邊工作，好好休息一下囉! 💤"
      ],
      offwork: [
        "親愛的母，下午 3 點多了，工作辛苦啦！可以準備收工囉！💼",
        "辛苦一整天了，親愛的母快快整理東西，我們一起回家吧！🏠"
      ],
      cheer: [
        "親愛的母！喝口水休息一下吧！🚰",
        "不管有多忙，璨璨永遠在旁邊陪妳喔！💪",
        "報告親愛的母！璨璨警長提醒妳，該讓眼睛休息一下囉！👀",
        "出發！陪親愛的母一起努力工作！✨"
      ],
      interact: [
        "親愛的母，看到我笑，心情有沒有好一點呀？❤️",
        "親愛的母，今天也要開開心心喔！😁",
        "哇～被抓起來了！放到這裡好不好？🚚",
        "親愛的母，坐太久對腰不好，跟著我站起來伸個懶腰吧！🙌"
      ]
    }
  };
}

// 儲存設定
function saveConfig(config) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  } catch (e) {
    console.error('儲存設定檔失敗', e);
  }
}

function createPetWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  
  // 使用全螢幕透明視窗，確保物理引擎與滑鼠拖曳在 60FPS 下完美平滑運行
  petWindow = new BrowserWindow({
    width,
    height,
    x: 0,
    y: 0,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: false,
      contextBridge: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false // 允許讀取本機自訂圖片
    }
  });

  petWindow.loadFile(path.join(__dirname, 'src', 'pet', 'pet.html'));
  
  // 視窗最上層與防置頂失效處理
  petWindow.setAlwaysOnTop(true, 'screen-saver');

  // 初始化時預設忽略滑鼠事件，讓全螢幕視窗不會擋住用戶操作
  petWindow.setIgnoreMouseEvents(true, { forward: true });

  // 防止視窗被系統最小化 (例如按下 Win+D 顯示桌面時)
  petWindow.on('minimize', () => {
    petWindow.restore();
  });

  // 當視窗失去焦點時，強制重新置頂
  petWindow.on('blur', () => {
    if (petWindow) {
      petWindow.setAlwaysOnTop(true, 'screen-saver');
    }
  });

  // 每秒定時器強制置頂，雙重保險防止任何第三方視窗搶佔最上層，並自動還原最小化
  const topmostInterval = setInterval(() => {
    if (petWindow) {
      if (petWindow.isMinimized()) {
        petWindow.restore();
      }
      petWindow.setAlwaysOnTop(true, 'screen-saver');
    } else {
      clearInterval(topmostInterval);
    }
  }, 1000);

  petWindow.on('closed', () => {
    petWindow = null;
    clearInterval(topmostInterval);
  });
}

function createTray() {
  tray = new Tray(path.join(__dirname, 'assets', 'icon.ico'));
  const contextMenu = Menu.buildFromTemplate([
    { label: '開啟控制面板', click: () => createControlPanel() },
    { label: '跟我說話！', click: () => petWindow.webContents.send('force-speak') },
    { type: 'separator' },
    { label: '關閉應用程式', click: () => app.quit() }
  ]);
  tray.setToolTip('Mom Cheer Up Pet');
  tray.setContextMenu(contextMenu);
}

function createControlPanel() {
  const controlWindow = new BrowserWindow({
    width: 600,
    height: 750,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextBridge: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  controlWindow.loadFile(path.join(__dirname, 'src', 'control', 'control.html'));
}

app.whenReady().then(() => {
  createPetWindow();
  createTray();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC 通訊處理
ipcMain.handle('load-config', () => {
  return loadConfig();
});

ipcMain.handle('save-config', (event, config) => {
  saveConfig(config);
  if (petWindow) {
    petWindow.webContents.send('config-updated', config);
  }
});

// 處理背景透明視窗的滑鼠穿透切換
ipcMain.on('set-ignore-mouse-events', (event, ignore, options) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.setIgnoreMouseEvents(ignore, options);
  }
});

ipcMain.handle('get-work-area-size', () => {
  return screen.getPrimaryDisplay().workAreaSize;
});

// 處理右鍵選單
ipcMain.on('show-context-menu', () => {
  const contextMenu = Menu.buildFromTemplate([
    { label: '開啟控制面板', click: () => createControlPanel() },
    { label: '跟我說話！', click: () => petWindow.webContents.send('force-speak') },
    { type: 'separator' },
    { label: '關閉寵物', click: () => app.quit() }
  ]);
  contextMenu.popup();
});

ipcMain.on('quit-app', () => {
  app.quit();
});

// 儲存與讀取自訂寵物圖片 (支援多插槽：LAUGH, TRAVEL, STRETCH, SLEEP)
ipcMain.handle('save-custom-pet', (event, { state, base64Data }) => {
  const customPetPath = path.join(app.getPath('userData'), `custom-${state}.png`);
  const base64Image = base64Data.split(';base64,').pop();
  fs.writeFileSync(customPetPath, base64Image, { encoding: 'base64' });
  if (petWindow) {
    petWindow.webContents.send('custom-pet-updated', { state, path: customPetPath });
  }
  return customPetPath;
});

ipcMain.handle('get-custom-pet-paths', () => {
  const paths = {};
  const states = ['LAUGH', 'TRAVEL', 'STRETCH', 'SLEEP'];
  states.forEach(s => {
    const p = path.join(app.getPath('userData'), `custom-${s}.png`);
    if (fs.existsSync(p)) {
      paths[s] = p;
    }
  });
  return paths;
});

ipcMain.handle('clear-all-custom-pets', () => {
  const states = ['LAUGH', 'TRAVEL', 'STRETCH', 'SLEEP'];
  states.forEach(s => {
    const p = path.join(app.getPath('userData'), `custom-${s}.png`);
    if (fs.existsSync(p)) {
      try {
        fs.unlinkSync(p);
      } catch (e) {
        console.error('刪除自訂造型失敗', p, e);
      }
    }
  });
  if (petWindow) {
    petWindow.webContents.send('custom-pets-cleared');
  }
  return true;
});

ipcMain.handle('clear-custom-pet', (event, state) => {
  const customPetPath = path.join(app.getPath('userData'), `custom-${state}.png`);
  if (fs.existsSync(customPetPath)) {
    try {
      fs.unlinkSync(customPetPath);
    } catch (e) {
      console.error('刪除單一自訂造型失敗', customPetPath, e);
    }
  }
  if (petWindow) {
    petWindow.webContents.send('custom-pet-cleared-slot', state);
  }
  return true;
});

// ==========================================
// 隨機圖片池 (random-pool) 檔案管理 IPC
// ==========================================
ipcMain.handle('save-random-pool-image', (event, base64Data) => {
  if (!fs.existsSync(randomPoolDir)) {
    fs.mkdirSync(randomPoolDir, { recursive: true });
  }
  const filename = `img-${Date.now()}.png`;
  const filepath = path.join(randomPoolDir, filename);
  const base64Image = base64Data.split(';base64,').pop();
  fs.writeFileSync(filepath, base64Image, { encoding: 'base64' });
  return filepath;
});

ipcMain.handle('get-random-pool', () => {
  if (!fs.existsSync(randomPoolDir)) {
    return [];
  }
  try {
    const files = fs.readdirSync(randomPoolDir);
    return files
      .filter(f => f.endsWith('.png'))
      .map(f => path.join(randomPoolDir, f));
  } catch (e) {
    console.error('讀取隨機形象庫失敗', e);
    return [];
  }
});

ipcMain.handle('delete-random-pool-image', (event, filepath) => {
  try {
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      return true;
    }
  } catch (e) {
    console.error('刪除隨機形象庫照片失敗', filepath, e);
  }
  return false;
});

// ==========================================
// 一鍵線上自動更新系統 IPC
// ==========================================
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'MomCheerUpPet-Updater' } }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`下載 JSON 失敗，狀態碼: ${res.statusCode}`));
        return;
      }
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', (err) => reject(err));
  });
}

function isNewerVersion(newVer, currentVer) {
  const n = newVer.split('.').map(Number);
  const c = currentVer.split('.').map(Number);
  for (let i = 0; i < Math.max(n.length, c.length); i++) {
    const nVal = n[i] || 0;
    const cVal = c[i] || 0;
    if (nVal > cVal) return true;
    if (nVal < cVal) return false;
  }
  return false;
}

ipcMain.handle('check-for-updates', async (event, customUrl) => {
  const url = customUrl || "https://raw.githubusercontent.com/username/Mom_Cheer_Up_Pet/main/update.json";
  try {
    const updateInfo = await fetchJSON(url);
    const currentVersion = app.getVersion();
    const hasUpdate = isNewerVersion(updateInfo.version, currentVersion);
    return {
      hasUpdate,
      version: updateInfo.version,
      url: updateInfo.url,
      notes: updateInfo.notes,
      currentVersion
    };
  } catch (e) {
    console.error('線上檢查更新失敗', e);
    return { hasUpdate: false, error: e.message };
  }
});

// 支援 HTTP 重定向 (301/302) 的檔案下載輔助函數 (適用於 GitHub Release 轉向 AWS S3 儲存)
function downloadWithRedirect(url, destPath, event) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'MomCheerUpPet-Updater' } }, (res) => {
      // 處理 HTTP 重定向 (例如 301, 302) 到真正的下載伺服器 (如 AWS S3)
      if (res.statusCode === 301 || res.statusCode === 302) {
        const redirectUrl = res.headers.location;
        resolve(downloadWithRedirect(redirectUrl, destPath, event));
        return;
      }
      
      if (res.statusCode !== 200) {
        reject(new Error(`下載安裝檔失敗，狀態碼: ${res.statusCode}`));
        return;
      }
      
      const file = fs.createWriteStream(destPath);
      const totalSize = parseInt(res.headers['content-length'], 10) || 0;
      let downloadedSize = 0;
      
      res.on('data', (chunk) => {
        downloadedSize += chunk.length;
        if (totalSize > 0) {
          const progress = Math.round((downloadedSize / totalSize) * 100);
          event.sender.send('download-progress', progress);
        }
      });
      
      res.pipe(file);
      
      file.on('finish', () => {
        file.close(() => {
          resolve(true);
        });
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

ipcMain.handle('download-and-install-update', async (event, downloadUrl) => {
  const tempDir = app.getPath('temp');
  
  // 順便清理 temp 資料夾中舊的安裝檔，保持系統乾淨，若鎖定則跳過
  try {
    const files = fs.readdirSync(tempDir);
    files.forEach(f => {
      if (f.startsWith('MomCheerUpPet_Setup_') && f.endsWith('.exe')) {
        try { fs.unlinkSync(path.join(tempDir, f)); } catch(e) {}
      }
    });
  } catch(e) {}

  // 使用時間戳記生成唯一的檔名，徹底避免先前下載的 installer 被 Windows 鎖定導致 EPERM 寫入失敗的 Bug！
  const installerPath = path.join(tempDir, `MomCheerUpPet_Setup_${Date.now()}.exe`);
  
  try {
    await downloadWithRedirect(downloadUrl, installerPath, event);
    
    // 解決 Windows 下安裝檔執行時的檔案寫入鎖定 (File Lock) Bug：
    // 使用 detached spawn 獨立啟動安裝檔，並「立刻」使用 app.exit(0) 強制關閉主程式，
    // 釋放所有檔案鎖，讓安裝程式能順利覆寫 MomCheerUpPet.exe！
    const { spawn } = require('child_process');
    try {
      const child = spawn(installerPath, [], {
        detached: true,
        stdio: 'ignore'
      });
      child.unref();
      
      // 立刻關閉主程式，確保檔案鎖在一瞬間全部釋放，好讓安裝檔順利覆蓋舊版
      app.exit(0);
    } catch (spawnErr) {
      console.error('使用 spawn 啟動失敗，嘗試 exec 備份方案', spawnErr);
      exec(`"${installerPath}"`, () => {});
      setTimeout(() => {
        app.exit(0);
      }, 100);
    }
    
    return true;
  } catch (err) {
    try { fs.unlinkSync(installerPath); } catch(e) {}
    throw err;
  }
});
