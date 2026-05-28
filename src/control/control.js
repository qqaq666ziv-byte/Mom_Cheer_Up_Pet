// Tab Switching Logic
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    tabBtns.forEach(b => b.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));
    
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});

// UI Elements (Settings Tab)
const petSize = document.getElementById('petSize');
const sizeValue = document.getElementById('sizeValue');
const petSpeed = document.getElementById('petSpeed');
const speedValue = document.getElementById('speedValue');
const randomWander = document.getElementById('randomWander');
const applyBtn = document.getElementById('applyBtn');

// UI Elements (Time Settings)
const lunchStartH = document.getElementById('lunchStartH');
const lunchStartM = document.getElementById('lunchStartM');
const lunchEndH = document.getElementById('lunchEndH');
const lunchEndM = document.getElementById('lunchEndM');

const offworkStartH = document.getElementById('offworkStartH');
const offworkStartM = document.getElementById('offworkStartM');
const offworkEndH = document.getElementById('offworkEndH');
const offworkEndM = document.getElementById('offworkEndM');

// UI Elements (Lock state selection)
const lockStateSelect = document.getElementById('lockStateSelect');

let config = {};

// Load Settings
async function init() {
  config = await window.electronAPI.loadConfig();
  
  // Initialize Default Values
  petSize.value = config.petSize || 120;
  sizeValue.innerText = petSize.value;
  
  petSpeed.value = config.petSpeed || 5;
  speedValue.innerText = petSpeed.value;
  
  randomWander.checked = config.randomWander !== false;

  // Initialize time period settings (with default standard values)
  const defaultLunch = { startH: 11, startM: 30, endH: 13, endM: 0 };
  const defaultOffwork = { startH: 15, startM: 0, endH: 18, endM: 0 };
  
  const lunch = config.lunchTime || defaultLunch;
  lunchStartH.value = lunch.startH;
  lunchStartM.value = lunch.startM;
  lunchEndH.value = lunch.endH;
  lunchEndM.value = lunch.endM;
  
  const offwork = config.offworkTime || defaultOffwork;
  offworkStartH.value = offwork.startH;
  offworkStartM.value = offwork.startM;
  offworkEndH.value = offwork.endH;
  offworkEndM.value = offwork.endM;

  // Initialize lockState select
  lockStateSelect.value = config.lockState || 'AUTO';

  // Initialize update URL and Version Info
  updateUrlInput.value = config.updateUrl || 'https://raw.githubusercontent.com/qqaq666ziv-byte/Mom_Cheer_Up_Pet/main/update.json';
  
  // Initialize dialogue category dropdown and current list
  phraseCategorySelect.value = 'lunch';
  loadPhrasesList();

  // Initialize Random Pool Settings
  useRandomPool.checked = config.useRandomPool === true;
  randomPoolInterval.value = config.randomPoolInterval || 5;
  
  // Render status boards and pool grids
  updateStatusBoard();
  loadRandomPoolGrid();
  
  // Silently check version info in background
  try {
    const check = await window.electronAPI.checkForUpdates(updateUrlInput.value);
    currentVersionLabel.innerText = `目前版本: ${check.currentVersion || '1.0.0'}`;
  } catch (e) {
    console.error('背景版本取得失敗', e);
  }
}

// Sync Input Values
petSize.addEventListener('input', (e) => sizeValue.innerText = e.target.value);
petSpeed.addEventListener('input', (e) => speedValue.innerText = e.target.value);

// Apply Settings
applyBtn.addEventListener('click', () => {
  config.petSize = parseInt(petSize.value);
  config.petSpeed = parseInt(petSpeed.value);
  config.randomWander = randomWander.checked;
  
  // Read time settings
  config.lunchTime = {
    startH: parseInt(lunchStartH.value),
    startM: parseInt(lunchStartM.value),
    endH: parseInt(lunchEndH.value),
    endM: parseInt(lunchEndM.value)
  };
  config.offworkTime = {
    startH: parseInt(offworkStartH.value),
    startM: parseInt(offworkStartM.value),
    endH: parseInt(offworkEndH.value),
    endM: parseInt(offworkEndM.value)
  };
  
  window.electronAPI.saveConfig(config);
  
  const btnText = applyBtn.innerText;
  applyBtn.innerText = '✅ 設定套用成功！';
  setTimeout(() => applyBtn.innerText = btnText, 2000);
});

// Lock State select change listener
lockStateSelect.addEventListener('change', () => {
  config.lockState = lockStateSelect.value;
  window.electronAPI.saveConfig(config);
  window.electronAPI.updatePetState(lockStateSelect.value);
});


// ==========================================
// Canvas Image Editor (Magic Eraser - States)
// ==========================================
const imageUpload = document.getElementById('imageUpload');
const uploadBtn = document.getElementById('uploadBtn');
const canvas = document.getElementById('photoEditor');
const ctx = canvas.getContext('2d');
const brushSize = document.getElementById('brushSize');
const brushSizeValue = document.getElementById('brushSizeValue');
const saveCustomBtn = document.getElementById('saveCustomBtn');
const resetCanvasBtn = document.getElementById('resetCanvasBtn');
const resetDefaultBtn = document.getElementById('resetDefaultBtn');

let currentImage = null;
let isDrawing = false;

brushSize.addEventListener('input', (e) => brushSizeValue.innerText = e.target.value);
uploadBtn.addEventListener('click', () => imageUpload.click());

imageUpload.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      currentImage = img;
      drawImageToCanvas(img, canvas, ctx);
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
});

function drawImageToCanvas(img, targetCanvas, targetCtx) {
  targetCtx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
  targetCtx.globalCompositeOperation = 'source-over';
  
  const scale = Math.min(targetCanvas.width / img.width, targetCanvas.height / img.height);
  const x = (targetCanvas.width / 2) - (img.width / 2) * scale;
  const y = (targetCanvas.height / 2) - (img.height / 2) * scale;
  
  targetCtx.drawImage(img, x, y, img.width * scale, img.height * scale);
  targetCtx.globalCompositeOperation = 'destination-out';
}

resetCanvasBtn.addEventListener('click', () => {
  if (currentImage) drawImageToCanvas(currentImage, canvas, ctx);
});

function getMousePos(targetCanvas, evt) {
  const rect = targetCanvas.getBoundingClientRect();
  return {
    x: evt.clientX - rect.left,
    y: evt.clientY - rect.top
  };
}

canvas.addEventListener('mousedown', (e) => {
  isDrawing = true;
  erase(e, canvas, ctx, brushSize);
});
canvas.addEventListener('mousemove', (e) => {
  if (isDrawing) erase(e, canvas, ctx, brushSize);
});
canvas.addEventListener('mouseup', () => isDrawing = false);
canvas.addEventListener('mouseleave', () => isDrawing = false);

function erase(e, targetCanvas, targetCtx, targetBrush) {
  const pos = getMousePos(targetCanvas, e);
  const size = parseInt(targetBrush.value);
  
  targetCtx.beginPath();
  targetCtx.arc(pos.x, pos.y, size, 0, Math.PI * 2);
  targetCtx.fill();
}

saveCustomBtn.addEventListener('click', async () => {
  if (!currentImage) {
    alert('請先選擇並上傳照片！');
    return;
  }
  
  const stateSelect = document.getElementById('customStateSelect');
  const state = stateSelect.value;
  
  const dataURL = canvas.toDataURL('image/png');
  const success = await window.electronAPI.uploadCustomImage(state, dataURL);
  
  if (success) {
    const btnText = saveCustomBtn.innerText;
    saveCustomBtn.innerText = '✅ 儲存成功並已套用';
    
    config.petState = 'CUSTOM';
    window.electronAPI.saveConfig(config);
    window.electronAPI.updatePetState('CUSTOM');
    
    updateStatusBoard();
    
    setTimeout(() => saveCustomBtn.innerText = btnText, 2000);
  } else {
    alert('儲存失敗！');
  }
});

resetDefaultBtn.addEventListener('click', async () => {
  config.petState = 'DEFAULT';
  window.electronAPI.saveConfig(config);
  window.electronAPI.updatePetState('DEFAULT');
  
  await window.electronAPI.clearAllCustomPets();
  
  currentImage = null;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  updateStatusBoard();
  
  const btnText = resetDefaultBtn.innerText;
  resetDefaultBtn.innerText = '↩️ 已還原為預設造型！';
  setTimeout(() => resetDefaultBtn.innerText = btnText, 2000);
});

// 綁定單一造型還原按鈕
document.querySelectorAll('.btn-slot-reset').forEach(btn => {
  btn.addEventListener('click', async (e) => {
    const state = e.target.dataset.state;
    const confirmReset = confirm(`確定要將此造型（${state}）還原為預設圖片嗎？`);
    if (!confirmReset) return;
    
    await window.electronAPI.clearCustomPet(state);
    
    const customPaths = await window.electronAPI.getCustomPetPaths();
    if (Object.keys(customPaths).length === 0) {
      config.petState = 'DEFAULT';
      await window.electronAPI.saveConfig(config);
      await window.electronAPI.updatePetState('DEFAULT');
    }
    
    updateStatusBoard();
  });
});

async function updateStatusBoard() {
  const customPaths = await window.electronAPI.getCustomPetPaths();
  const states = ['LAUGH', 'TRAVEL', 'STRETCH', 'SLEEP'];
  const defaultAssets = {
    LAUGH: '../../assets/LAUGH.png',
    TRAVEL: '../../assets/TRAVEL.png',
    STRETCH: '../../assets/STRETCH.png',
    SLEEP: '../../assets/SLEEP.png'
  };
  
  states.forEach(s => {
    const thumbImg = document.getElementById(`thumb-${s}`);
    const statusText = document.getElementById(`status-${s}`);
    const resetBtn = document.querySelector(`.btn-slot-reset[data-state="${s}"]`);
    
    if (customPaths[s]) {
      thumbImg.src = `file://${customPaths[s]}?t=${Date.now()}`;
      statusText.innerText = '✅ 已啟用自訂';
      statusText.style.color = '#2b8a3e';
      resetBtn.style.display = 'block';
    } else {
      thumbImg.src = defaultAssets[s];
      statusText.innerText = '使用預設璨璨';
      statusText.style.color = '#777';
      resetBtn.style.display = 'none';
    }
  });
}


// ==========================================
// 3. 自訂隨機照片形象庫 Tab
// ==========================================
const useRandomPool = document.getElementById('useRandomPool');
const randomPoolInterval = document.getElementById('randomPoolInterval');
const randomImageUpload = document.getElementById('randomImageUpload');
const randomUploadBtn = document.getElementById('randomUploadBtn');
const randomCanvasContainer = document.getElementById('randomCanvasContainer');
const randomEditorTools = document.getElementById('randomEditorTools');
const randomCanvas = document.getElementById('randomPhotoEditor');
const randomCtx = randomCanvas.getContext('2d');
const randomBrushSize = document.getElementById('randomBrushSize');
const randomBrushSizeValue = document.getElementById('randomBrushSizeValue');
const saveRandomBtn = document.getElementById('saveRandomBtn');
const cancelRandomBtn = document.getElementById('cancelRandomBtn');
const randomPoolGrid = document.getElementById('randomPoolGrid');

let currentRandomImage = null;
let isRandomDrawing = false;

// Change Settings for Random Pool
useRandomPool.addEventListener('change', () => {
  config.useRandomPool = useRandomPool.checked;
  window.electronAPI.saveConfig(config);
});
randomPoolInterval.addEventListener('change', () => {
  config.randomPoolInterval = Math.max(1, parseInt(randomPoolInterval.value) || 5);
  window.electronAPI.saveConfig(config);
});

randomBrushSize.addEventListener('input', (e) => randomBrushSizeValue.innerText = e.target.value);
randomUploadBtn.addEventListener('click', () => randomImageUpload.click());

randomImageUpload.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      currentRandomImage = img;
      
      // Show editor elements
      randomCanvasContainer.style.display = 'flex';
      randomEditorTools.style.display = 'flex';
      
      drawImageToCanvas(img, randomCanvas, randomCtx);
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
});

randomCanvas.addEventListener('mousedown', (e) => {
  isRandomDrawing = true;
  erase(e, randomCanvas, randomCtx, randomBrushSize);
});
randomCanvas.addEventListener('mousemove', (e) => {
  if (isRandomDrawing) erase(e, randomCanvas, randomCtx, randomBrushSize);
});
randomCanvas.addEventListener('mouseup', () => isRandomDrawing = false);
randomCanvas.addEventListener('mouseleave', () => isRandomDrawing = false);

cancelRandomBtn.addEventListener('click', () => {
  currentRandomImage = null;
  randomCtx.clearRect(0, 0, randomCanvas.width, randomCanvas.height);
  randomCanvasContainer.style.display = 'none';
  randomEditorTools.style.display = 'none';
  randomImageUpload.value = '';
});

saveRandomBtn.addEventListener('click', async () => {
  if (!currentRandomImage) return;
  
  const dataURL = randomCanvas.toDataURL('image/png');
  const filepath = await window.electronAPI.saveRandomPoolImage(dataURL);
  
  if (filepath) {
    alert('成功加入形象照片庫！');
    
    // Hide editor elements
    currentRandomImage = null;
    randomCtx.clearRect(0, 0, randomCanvas.width, randomCanvas.height);
    randomCanvasContainer.style.display = 'none';
    randomEditorTools.style.display = 'none';
    randomImageUpload.value = '';
    
    loadRandomPoolGrid();
  } else {
    alert('儲存照片失敗！');
  }
});

async function loadRandomPoolGrid() {
  const list = await window.electronAPI.getRandomPool();
  randomPoolGrid.innerHTML = '';
  
  if (list.length === 0) {
    randomPoolGrid.innerHTML = `<div style="grid-column: span 3; text-align: center; font-size: 12px; color: #777; padding: 15px;">形象庫為空，請上傳照片！</div>`;
    return;
  }
  
  list.forEach(filepath => {
    const filename = filepath.split('\\').pop().split('/').pop();
    
    const card = document.createElement('div');
    card.style.cssText = `
      background: rgba(255,255,255,0.7);
      border-radius: 8px;
      border: 1px solid rgba(0,0,0,0.05);
      padding: 5px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 5px;
      position: relative;
    `;
    
    const imgContainer = document.createElement('div');
    imgContainer.style.cssText = `
      width: 60px;
      height: 60px;
      background: rgba(0,0,0,0.03);
      border-radius: 6px;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px dashed rgba(0,0,0,0.1);
    `;
    
    const img = document.createElement('img');
    img.src = `file://${filepath}?t=${Date.now()}`;
    img.style.cssText = 'max-width: 100%; max-height: 100%; object-fit: contain;';
    
    const deleteBtn = document.createElement('button');
    deleteBtn.innerText = '🗑️ 刪除';
    deleteBtn.style.cssText = `
      width: 100%;
      height: 20px;
      font-size: 10px;
      padding: 0;
      border: 1px solid #ff5252;
      color: #ff5252;
      background: white;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
    `;
    
    deleteBtn.addEventListener('click', async () => {
      const confirmDel = confirm('確定要從隨機庫中刪除這張造型照片嗎？');
      if (confirmDel) {
        await window.electronAPI.deleteRandomPoolImage(filepath);
        loadRandomPoolGrid();
      }
    });
    
    imgContainer.appendChild(img);
    card.appendChild(imgContainer);
    card.appendChild(deleteBtn);
    randomPoolGrid.appendChild(card);
  });
}


// ==========================================
// 4. 溫馨語錄自訂編輯器 Tab
// ==========================================
const phraseCategorySelect = document.getElementById('phraseCategorySelect');
const newPhraseInput = document.getElementById('newPhraseInput');
const addPhraseBtn = document.getElementById('addPhraseBtn');
const phrasesListContainer = document.getElementById('phrasesListContainer');
const phraseCount = document.getElementById('phraseCount');

phraseCategorySelect.addEventListener('change', loadPhrasesList);

function loadPhrasesList() {
  const category = phraseCategorySelect.value;
  
  // Make sure configuration phrases are structured
  if (!config.phrases) {
    config.phrases = {
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
      ],
      click: [
        "璨璨來了！媽媽有什麼吩咐？😊",
        "摸摸璨璨～心情好一點了嗎？✨",
        "我會一直陪在妳身邊喔！"
      ]
    };
  }

  const list = config.phrases[category] || [];
  phraseCount.innerText = list.length;
  phrasesListContainer.innerHTML = '';
  
  if (list.length === 0) {
    phrasesListContainer.innerHTML = `<div style="text-align: center; color: #777; font-size: 12px; padding: 15px;">此分類目前無自訂話語。</div>`;
    return;
  }
  
  list.forEach((phrase, index) => {
    const item = document.createElement('div');
    item.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(255,255,255,0.7);
      border: 1px solid rgba(0,0,0,0.03);
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 13px;
      gap: 10px;
    `;
    
    const textSpan = document.createElement('span');
    textSpan.innerText = phrase;
    textSpan.style.cssText = 'font-weight: 600; color: #444; flex: 1; text-align: left; word-break: break-all;';
    
    const delBtn = document.createElement('button');
    delBtn.innerText = '🗑️ 刪除';
    delBtn.style.cssText = `
      background: #ff5252;
      color: white;
      border: none;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 11px;
      cursor: pointer;
      font-weight: bold;
    `;
    
    delBtn.addEventListener('click', () => {
      config.phrases[category].splice(index, 1);
      window.electronAPI.saveConfig(config);
      loadPhrasesList();
    });
    
    item.appendChild(textSpan);
    item.appendChild(delBtn);
    phrasesListContainer.appendChild(item);
  });
}

addPhraseBtn.addEventListener('click', () => {
  const category = phraseCategorySelect.value;
  const val = newPhraseInput.value.trim();
  
  if (!val) {
    alert('請輸入璨璨貼心話內容！');
    return;
  }
  
  if (!config.phrases[category]) {
    config.phrases[category] = [];
  }
  
  config.phrases[category].push(val);
  window.electronAPI.saveConfig(config);
  
  newPhraseInput.value = '';
  loadPhrasesList();
});


// ==========================================
// 5. 線上更新與檢測 Tab
// ==========================================
const checkUpdatesBtn = document.getElementById('checkUpdatesBtn');
const updateInfoContainer = document.getElementById('updateInfoContainer');
const latestVersionLabel = document.getElementById('latestVersionLabel');
const updateNotesLabel = document.getElementById('updateNotesLabel');
const startUpdateBtn = document.getElementById('startUpdateBtn');
const downloadProgressContainer = document.getElementById('downloadProgressContainer');
const downloadPercent = document.getElementById('downloadPercent');
const downloadProgressBar = document.getElementById('downloadProgressBar');
const noUpdateLabel = document.getElementById('noUpdateLabel');
const currentVersionLabel = document.getElementById('currentVersionLabel');
const updateUrlInput = document.getElementById('updateUrlInput');

// 當手動輸入或貼上更新網址時，自動儲存至本機設定檔中！
updateUrlInput.addEventListener('change', () => {
  config.updateUrl = updateUrlInput.value.trim();
  window.electronAPI.saveConfig(config);
});

let updateTargetUrl = '';

checkUpdatesBtn.addEventListener('click', async () => {
  const customUrl = updateUrlInput.value.trim();
  
  const originalText = checkUpdatesBtn.innerText;
  checkUpdatesBtn.innerText = '🔄 檢查更新中...';
  checkUpdatesBtn.disabled = true;
  
  updateInfoContainer.style.display = 'none';
  noUpdateLabel.style.display = 'none';
  
  try {
    const result = await window.electronAPI.checkForUpdates(customUrl);
    
    checkUpdatesBtn.innerText = originalText;
    checkUpdatesBtn.disabled = false;
    
    if (result.error) {
      alert(`檢查更新失敗: ${result.error}`);
      return;
    }
    
    currentVersionLabel.innerText = `目前版本: ${result.currentVersion}`;
    
    if (result.hasUpdate) {
      updateTargetUrl = result.url;
      latestVersionLabel.innerText = result.version;
      updateNotesLabel.innerHTML = result.notes.replace(/\n/g, '<br>');
      
      updateInfoContainer.style.display = 'block';
    } else {
      noUpdateLabel.style.display = 'block';
    }
  } catch (e) {
    checkUpdatesBtn.innerText = originalText;
    checkUpdatesBtn.disabled = false;
    alert(`更新檢測發生異常錯誤: ${e.message}`);
  }
});

startUpdateBtn.addEventListener('click', async () => {
  if (!updateTargetUrl) return;
  
  startUpdateBtn.style.display = 'none';
  downloadProgressContainer.style.display = 'block';
  
  // Listen to background progress events
  const unbind = window.electronAPI.onDownloadProgress((percent) => {
    downloadPercent.innerText = `${percent}%`;
    downloadProgressBar.style.width = `${percent}%`;
  });
  
  try {
    const success = await window.electronAPI.downloadAndInstallUpdate(updateTargetUrl);
    if (!success) {
      alert('下載更新程式失敗！');
      startUpdateBtn.style.display = 'block';
      downloadProgressContainer.style.display = 'none';
      unbind();
    }
  } catch (e) {
    alert(`執行線上更新出錯: ${e.message}`);
    startUpdateBtn.style.display = 'block';
    downloadProgressContainer.style.display = 'none';
    unbind();
  }
});

// Run Init
init();
