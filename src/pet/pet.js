const petWrapper = document.getElementById('pet-wrapper');
const petContainer = document.getElementById('pet-container');
const sprite = document.getElementById('pet-sprite');
const dialogBubble = document.getElementById('dialog-bubble');
const dialogText = document.getElementById('dialog-text');

// 台灣 22 縣市經緯度對照表
const TAIWAN_CITIES = {
  "台北市": { lat: 25.03, lon: 121.56 },
  "新北市": { lat: 25.01, lon: 121.46 },
  "桃園市": { lat: 24.99, lon: 121.31 },
  "台中市": { lat: 24.14, lon: 120.67 },
  "台南市": { lat: 22.99, lon: 120.21 },
  "高雄市": { lat: 22.62, lon: 120.31 },
  "基隆市": { lat: 25.12, lon: 121.73 },
  "新竹市": { lat: 24.81, lon: 120.96 },
  "嘉義市": { lat: 23.48, lon: 120.44 },
  "新竹縣": { lat: 24.82, lon: 121.01 },
  "苗栗縣": { lat: 24.56, lon: 120.82 },
  "彰化縣": { lat: 24.05, lon: 120.51 },
  "南投縣": { lat: 23.90, lon: 120.68 },
  "雲林縣": { lat: 23.70, lon: 120.53 },
  "嘉義縣": { lat: 23.45, lon: 120.25 },
  "屏東縣": { lat: 22.67, lon: 120.48 },
  "宜蘭縣": { lat: 24.75, lon: 121.75 },
  "花蓮縣": { lat: 23.97, lon: 121.60 },
  "台東縣": { lat: 22.75, lon: 121.14 },
  "澎湖縣": { lat: 23.56, lon: 119.56 },
  "金門縣": { lat: 24.44, lon: 118.37 },
  "連江縣": { lat: 26.15, lon: 119.92 }
};

let weatherState = {
  loaded: false,
  city: '台北市',
  temp: 25,
  desc: '晴朗',
  emoji: '☀️'
};
let weatherCheckInterval = null;
let mqttClient = null;

async function fetchWeather() {
  let city = config.weatherCity || '台北市';
  let isAuto = config.autoLocation !== false;
  
  if (isAuto) {
    try {
      const geoRes = await fetch('https://ipapi.co/json/');
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        if (geoData.country_code === 'TW' && geoData.region) {
          const detectedRegion = geoData.region;
          for (const cityName in TAIWAN_CITIES) {
            if (detectedRegion.includes(cityName.replace('市', '').replace('縣', ''))) {
              city = cityName;
              break;
            }
          }
        }
      }
    } catch (geoErr) {
      console.error('自動定位天氣失敗，將使用設定縣市', geoErr);
    }
  }
  
  const coords = TAIWAN_CITIES[city] || TAIWAN_CITIES["台北市"];
  
  try {
    const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,weather_code&timezone=Asia/Taipei`);
    if (weatherRes.ok) {
      const weatherData = await weatherRes.json();
      const temp = Math.round(weatherData.current.temperature_2m);
      const code = weatherData.current.weather_code;
      
      let desc = '晴朗';
      let emoji = '☀️';
      
      if (code === 0) { desc = '晴朗'; emoji = '☀️'; }
      else if (code >= 1 && code <= 3) { desc = '多雲'; emoji = '🌤️'; }
      else if (code === 45 || code === 48) { desc = '有霧'; emoji = '🌫️'; }
      else if (code >= 51 && code <= 55) { desc = '毛毛雨'; emoji = '🌧️'; }
      else if (code >= 61 && code <= 65) { desc = '下雨'; emoji = '🌧️'; }
      else if (code >= 71 && code <= 75) { desc = '下雪'; emoji = '🌨️'; }
      else if (code >= 80 && code <= 82) { desc = '陣雨'; emoji = '🌧️'; }
      else if (code >= 95 && code <= 99) { desc = '雷雨'; emoji = '⛈️'; }
      
      weatherState = {
        loaded: true,
        city: city,
        temp: temp,
        desc: desc,
        emoji: emoji
      };
      
      const weatherBadge = document.getElementById('dialog-weather');
      if (weatherBadge) {
        weatherBadge.innerText = `${emoji} ${city} ${temp}°C`;
        weatherBadge.classList.remove('hidden');
      }
    }
  } catch (weatherErr) {
    console.error('獲取天氣資料失敗', weatherErr);
  }
}

function initMqtt() {
  if (mqttClient) {
    try { mqttClient.end(); } catch(e) {}
  }
  
  try {
    mqttClient = mqtt.connect('wss://broker.emqx.io:8084/mqtt', {
      clientId: 'mompet_client_' + Math.random().toString(16).substr(2, 8),
      reconnectPeriod: 10000,
      connectTimeout: 10000
    });
    
    mqttClient.on('connect', () => {
      console.log('MQTT 遠端傳情服務連線成功');
      mqttClient.subscribe('mom_cheer_up_pet/messages/qqaq666ziv-byte', { qos: 1 });
    });
    
    mqttClient.on('message', (topic, message) => {
      try {
        const payload = JSON.parse(message.toString());
        if (payload.sender && payload.text) {
          handleIncomingRemoteMessage(payload.sender, payload.text);
        }
      } catch (e) {
        console.error('MQTT 接收訊息解析失敗', e);
      }
    });
    
    mqttClient.on('error', (err) => {
      console.error('MQTT 遠端服務連線錯誤', err);
    });
  } catch (err) {
    console.error('MQTT 初始化失敗', err);
  }
}

function playDingSound() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    // First high note
    const osc1 = audioCtx.createOscillator();
    const gainNode1 = audioCtx.createGain();
    osc1.connect(gainNode1); 
    gainNode1.connect(audioCtx.destination);
    osc1.type = 'sine'; 
    osc1.frequency.setValueAtTime(987.77, audioCtx.currentTime); // B5 note
    gainNode1.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode1.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.02);
    gainNode1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
    osc1.start(audioCtx.currentTime); 
    osc1.stop(audioCtx.currentTime + 0.4);
    
    // Second higher note shortly after, creating a beautiful chime/crystal double-ding
    const osc2 = audioCtx.createOscillator();
    const gainNode2 = audioCtx.createGain();
    osc2.connect(gainNode2); 
    gainNode2.connect(audioCtx.destination);
    osc2.type = 'sine'; 
    osc2.frequency.setValueAtTime(1318.51, audioCtx.currentTime + 0.08); // E6 note
    gainNode2.gain.setValueAtTime(0, audioCtx.currentTime + 0.08);
    gainNode2.gain.linearRampToValueAtTime(0.25, audioCtx.currentTime + 0.10);
    gainNode2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);
    osc2.start(audioCtx.currentTime + 0.08); 
    osc2.stop(audioCtx.currentTime + 0.6);
  } catch (e) { 
    console.error('Play audio failed', e); 
  }
}

function handleIncomingRemoteMessage(sender, text) {
  playDingSound();
  scaleX = 1.4;
  scaleY = 0.6;
  rotation = -10;
  
  setSpriteImage(images.DEFAULT, 8000);
  
  const formattedText = `【💖 遠端傳情】${sender}：${text}`;
  
  dialogBubble.classList.add('remote-bubble');
  showDialog(formattedText, 10000);
  
  setTimeout(() => {
    dialogBubble.classList.remove('remote-bubble');
  }, 10000);
}

let config = {};
let messageTimeout = null;
let scheduleInterval = null;

// 預設語錄對話
const defaultPhrases = {
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
    "不管有多忙，璨璨永遠在旁邊陪妳喔！💖",
    "加油加油！璨璨為妳打氣！🎉",
    "累了嗎？起來伸個懶腰吧！🙌"
  ],
  click: [
    "璨璨來了！媽媽有什麼吩咐？😊",
    "摸摸璨璨～心情好一點了嗎？✨",
    "我會一直陪在妳身邊喔！"
  ]
};

// 取得特定類別的對話清單 (優先採用自訂語錄)
function getPhrases(category) {
  if (config.phrases && config.phrases[category] && config.phrases[category].length > 0) {
    return config.phrases[category];
  }
  return defaultPhrases[category] || ["璨璨永遠陪伴在妳身邊喔！💖"];
}

const images = {
  DEFAULT: '../../assets/LAUGH.png',
  SLEEP: '../../assets/SLEEP.png',
  TRAVEL: '../../assets/TRAVEL.png',
  STRETCH: '../../assets/STRETCH.png'
};

// 物理系統與狀態
let screenWidth = 1920;
let screenHeight = 1080;

let petX = 0;
let petY = 0;
let velX = 0;
let velY = 0;
const gravity = 0.8;
const friction = 0.85;

let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;
let lastMouseX = 0;
let lastMouseY = 0;
let mouseX = 0;
let mouseY = 0;
let dragStartX = 0;
let dragStartY = 0;
let dragMoved = false;

let isMovingToCursor = false;
let targetX = null;

// 紙片人變形效果 (Scale, Rotate)
let scaleX = 1;
let scaleY = 1;
let rotation = 0;
let facing = 1; // 1 面向右, -1 面向左
let walkHop = 0;
let isWalking = false;
let currentVisualState = 'DEFAULT';
let customPaths = {}; // 儲存多個自訂造型的圖片路徑

// 每日提醒狀態鎖，防重複轟炸
let lastLunchReminderDay = -1;
let lastOffWorkReminderDay = -1;

// 隨機圖片池更換機制狀態
let lastRandomPoolChangeTime = 0;
let randomPoolImagePath = null;

// 載入設定
async function init() {
  config = await window.electronAPI.loadConfig();
  const workArea = await window.electronAPI.getWorkAreaSize();
  screenWidth = workArea.width;
  screenHeight = workArea.height;
  
  // 初始位置設定在螢幕中間掉落
  petX = screenWidth / 2;
  petY = -300; // 從上面掉下來
  
  applySettings(config);
  
  // 讀取所有自訂狀態照片路徑
  customPaths = await window.electronAPI.getCustomPetPaths();
  
  startScheduleCheck();
  startPhysicsLoop();
  startWanderingLogic();
  startRandomPoolRotationLoop();
  
  sprite.src = images.DEFAULT;
  
  // 立即觸發一次時段提醒判定與定時檢查
  checkTimeReminders();
  setInterval(checkTimeReminders, 30000); // 每 30 秒確實檢查一次時段

  // 啟動天氣與遠端即時傳情
  await fetchWeather();
  initMqtt();

  if (weatherCheckInterval) clearInterval(weatherCheckInterval);
  weatherCheckInterval = setInterval(fetchWeather, 30 * 60 * 1000);

  // 註冊右鍵查看天氣監聽器
  window.electronAPI.onShowWeatherDialog(() => {
    if (weatherState.loaded) {
      let weatherAdvice = `報告親愛的母！目前${weatherState.city}天氣${weatherState.desc} ${weatherState.emoji}，氣溫 ${weatherState.temp}°C。`;
      if (weatherState.desc.includes('雨')) {
        weatherAdvice += ` 外面正在下雨喔，出門一定要記得帶傘！🌧️`;
      } else {
        weatherAdvice += ` 天氣感覺挺不錯的，媽媽辛苦啦！✨`;
      }
      setSpriteImage(images.DEFAULT, 6000);
      showDialog(weatherAdvice, 6000);
    } else {
      showDialog('氣象雷達正在連線中... 請稍候再試喔！🛰️', 3000);
    }
  });
}

let overrideImage = null;
let overrideTimeout = null;

function setSpriteImage(src, duration = 0, customSrc = null) {
  if (config.petState === 'CUSTOM') {
    overrideImage = customSrc || src;
  } else {
    overrideImage = src;
  }
  
  sprite.src = overrideImage;
  
  if (overrideTimeout) clearTimeout(overrideTimeout);
  if (duration > 0) {
    overrideTimeout = setTimeout(() => {
      overrideImage = null;
      // 強制觸發視覺更替以恢復正常物理狀態
      currentVisualState = '';
      updateVisualState();
    }, duration);
  }
}

// 判斷時段狀態
function getPeriodState() {
  const lunch = config.lunchTime || { startH: 11, startM: 30, endH: 13, endM: 0 };
  const offwork = config.offworkTime || { startH: 15, startM: 0, endH: 18, endM: 0 };
  
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  const totalM = h * 60 + m;
  
  const lunchStart = lunch.startH * 60 + lunch.startM;
  const lunchEnd = lunch.endH * 60 + lunch.endM;
  const offworkStart = offwork.startH * 60 + offwork.startM;
  const offworkEnd = offwork.endH * 60 + offwork.endM;
  
  const isLunchTime = (totalM >= lunchStart && totalM <= lunchEnd);
  const isOffWorkTime = (totalM >= offworkStart && totalM <= offworkEnd);
  
  return { isLunchTime, isOffWorkTime };
}

function updateVisualState() {
  if (overrideImage) {
    let normalizedOverride = overrideImage;
    if (overrideImage.startsWith('../../')) {
      normalizedOverride = overrideImage.replace('../../', '');
    }
    if (sprite.src.indexOf(normalizedOverride) === -1) {
      sprite.src = overrideImage;
    }
    return;
  }

  let newState = 'DEFAULT';
  
  // 優先權 1：使用者手動鎖定固定造型
  if (config.lockState && config.lockState !== 'AUTO') {
    newState = config.lockState;
  }
  // 優先權 2：依物理狀態或時段更換造型 (AUTO)
  else if (isDragging) {
    newState = 'DRAGGING';
  } else if (petY < screenHeight && velY > 2.0) {
    newState = 'FALLING';
  } else if (isMovingToCursor || isWalking) {
    newState = 'WALKING';
  } else {
    const { isLunchTime, isOffWorkTime } = getPeriodState();
    if (isLunchTime || isOffWorkTime) {
      newState = 'SLEEP';
    } else {
      newState = 'DEFAULT';
    }
  }
  
  // 如果啟用隨機形象輪播，且當前為閒置預設造型，並且庫中有隨機圖片時，套用隨機圖片
  if (newState === 'DEFAULT' && config.useRandomPool === true && randomPoolImagePath) {
    sprite.src = `file://${randomPoolImagePath}?t=${lastRandomPoolChangeTime}`;
    currentVisualState = 'RANDOM_POOL';
    return;
  }
  
  if (currentVisualState !== newState) {
    currentVisualState = newState;
    
    // 自訂造型模式
    if (config.petState === 'CUSTOM') {
      let customSlot = 'LAUGH';
      if (newState === 'DRAGGING' || newState === 'FALLING') {
        customSlot = 'STRETCH';
      } else if (newState === 'WALKING') {
        customSlot = 'TRAVEL';
      } else if (newState === 'SLEEP') {
        customSlot = 'SLEEP';
      }
      
      // 有自訂照片則套用自訂，無則自動向下相容 Fallback 顯示預設璨璨圖片！
      if (customPaths[customSlot]) {
        sprite.src = `file://${customPaths[customSlot]}?t=${Date.now()}`;
      } else if (customPaths['LAUGH'] && newState === 'DEFAULT') {
        sprite.src = `file://${customPaths['LAUGH']}?t=${Date.now()}`;
      } else {
        // Fallback 到對應狀態的預設圖片
        let targetSrc = images.DEFAULT;
        if (newState === 'DRAGGING' || newState === 'FALLING') {
          targetSrc = images.STRETCH;
        } else if (newState === 'WALKING') {
          targetSrc = images.TRAVEL;
        } else if (newState === 'SLEEP') {
          targetSrc = images.SLEEP;
        }
        sprite.src = targetSrc;
      }
    } 
    // 預設精緻璨璨模式
    else {
      let targetSrc = images.DEFAULT;
      if (newState === 'DRAGGING' || newState === 'FALLING') {
        targetSrc = images.STRETCH;
      } else if (newState === 'WALKING') {
        targetSrc = images.TRAVEL;
      } else if (newState === 'SLEEP') {
        targetSrc = images.SLEEP;
      } else {
        targetSrc = images.DEFAULT;
      }
      
      sprite.src = targetSrc;
    }
  }
}

function applySettings(newConfig) {
  config = newConfig;
  sprite.style.width = `${config.petSize || 150}px`;
  
  currentVisualState = '';
  updateVisualState();
}

window.electronAPI.onUpdateSettings((newConfig) => {
  applySettings(newConfig);
  // 當設定更新時，重新拉取天氣，以防更換了縣市或定位開關
  fetchWeather();
});

// 排程隨機暖心對話語錄
function startScheduleCheck() {
  if (scheduleInterval) clearInterval(scheduleInterval);
  scheduleInterval = setInterval(() => {
    const time = new Date();
    const h = time.getHours();
    const { isLunchTime, isOffWorkTime } = getPeriodState();
    
    const lunchList = getPhrases('lunch');
    const offworkList = getPhrases('offwork');
    const cheerList = getPhrases('cheer');
    
    if (isLunchTime && Math.random() < 0.2) {
      setSpriteImage(images.SLEEP, 25000);
      showDialog(lunchList[Math.floor(Math.random() * lunchList.length)], 25000);
    } else if (isOffWorkTime && Math.random() < 0.2) {
      setSpriteImage(images.SLEEP, 25000);
      showDialog(offworkList[Math.floor(Math.random() * offworkList.length)], 25000);
    } else if (weatherState.loaded && Math.random() < 0.15) {
      // 15% 機率播報天氣
      let weatherAdvice = `璨璨天氣提醒 🌤️：目前${weatherState.city}氣溫 ${weatherState.temp}°C ${weatherState.emoji}，濕度適宜，媽媽工作辛苦了！`;
      if (weatherState.desc.includes('雨')) {
        weatherAdvice = `璨璨貼心提醒 🌧️：目前${weatherState.city}正在下雨呢！外面濕冷（氣溫 ${weatherState.temp}°C），媽媽記得多喝熱水，小心感冒喔！`;
      } else if (weatherState.temp <= 18) {
        weatherAdvice = `璨璨保暖警報 ❄️：目前${weatherState.city}冷冷的，只有 ${weatherState.temp}°C 喔！媽媽要注意保暖，別著涼了！`;
      }
      setSpriteImage(images.DEFAULT, 8000);
      showDialog(weatherAdvice, 8000);
    } else if (Math.random() < 0.1) {
      setSpriteImage(images.TRAVEL, 8000);
      showDialog(cheerList[Math.floor(Math.random() * cheerList.length)], 8000);
    }
  }, 60000);
}

// 隨機輪播圖片定時檢查器
function startRandomPoolRotationLoop() {
  setInterval(async () => {
    if (config.useRandomPool !== true) {
      randomPoolImagePath = null;
      return;
    }
    
    const intervalMs = (config.randomPoolInterval || 5) * 60000;
    const now = Date.now();
    
    if (now - lastRandomPoolChangeTime >= intervalMs || !randomPoolImagePath) {
      const list = await window.electronAPI.getRandomPool();
      if (list && list.length > 0) {
        // 隨機抽選一張形象照
        const randomPath = list[Math.floor(Math.random() * list.length)];
        randomPoolImagePath = randomPath;
        lastRandomPoolChangeTime = now;
        
        // 立即更新視覺狀態
        currentVisualState = '';
        updateVisualState();
      }
    }
  }, 10000); // 每 10 秒在背景偵測一次輪播時間
}

// 物理與渲染迴圈
function startPhysicsLoop() {
  requestAnimationFrame(physicsLoop);
}

function physicsLoop() {
  const petWidth = sprite.offsetWidth || 150;
  const petHeight = sprite.offsetHeight || 150;
  
  if (isDragging) {
    isWalking = false;
    // 拖曳狀態
    petX = mouseX - dragOffsetX;
    petY = mouseY - dragOffsetY;
    
    velX = mouseX - lastMouseX;
    velY = mouseY - lastMouseY;
    lastMouseX = mouseX;
    lastMouseY = mouseY;
    
    // 紙片人被提起來的物理擺動：依據拖曳速度產生旋轉
    rotation = velX * 1.5;
    // 稍微拉長身體
    scaleX = 0.9;
    scaleY = 1.1;
    walkHop = 0;
  } else {
    // 重力
    velY += gravity;
    // 摩擦力
    velX *= friction;
    
    // 漫步邏輯
    isWalking = false;
    if (config.randomWander === false) {
      targetX = null;
      velX = 0;
    } else if (!isMovingToCursor && Math.abs(velY) < 1 && petY >= screenHeight) {
      if (targetX !== null) {
        const speed = config.petSpeed || 5;
        if (Math.abs(targetX - petX) > speed) {
          velX = targetX > petX ? speed * 0.4 : -speed * 0.4;
          facing = velX > 0 ? 1 : -1;
          isWalking = true;
        } else {
          velX = 0;
          targetX = null;
        }
      }
    }
    
    // 呼叫邏輯
    if (isMovingToCursor && targetX !== null) {
      const speed = config.petSpeed || 5;
      if (Math.abs(targetX - petX) > speed * 1.5) {
        velX = targetX > petX ? speed : -speed;
        facing = velX > 0 ? 1 : -1;
        isWalking = true;
      } else {
        velX = 0;
        targetX = null;
        isMovingToCursor = false;
        
        const clickList = getPhrases('click');
        setSpriteImage(images.DEFAULT, 3000);
        showDialog(clickList[0], 4000);
      }
    }

    petX += velX;
    petY += velY;

    // 落地與彈跳碰撞 (Squash & Stretch)
    if (petY >= screenHeight) {
      // 剛落地時如果速度很快，產生擠壓效果
      if (velY > 5) {
        scaleX = 1.3;
        scaleY = 0.7;
      }
      petY = screenHeight;
      velY = 0;
      rotation = 0; // 落地不旋轉
    }

    // 邊界反彈
    if (petX < petWidth / 2) {
      petX = petWidth / 2;
      velX *= -0.5;
    } else if (petX > screenWidth - petWidth / 2) {
      petX = screenWidth - petWidth / 2;
      velX *= -0.5;
    }
    
    // 走路時的跳躍感 (Hop)
    if (isWalking) {
      walkHop += 0.3; // 步伐頻率
      rotation = Math.sin(walkHop) * 5; // 左右搖擺
    } else {
      walkHop = 0;
    }
    
    // 形狀恢復 (彈性回復)
    scaleX += (1 - scaleX) * 0.2;
    scaleY += (1 - scaleY) * 0.2;
    
    if (Math.abs(rotation) > 0 && !isWalking) {
       rotation *= 0.9; // 逐漸停止旋轉
     }
  }

  updateVisualState();
  updatePosition(petWidth, petHeight);
  requestAnimationFrame(physicsLoop);
}

function updatePosition(petWidth, petHeight) {
  // 走路時的視覺跳躍感 (不影響物理引擎的落地判定)
  const hopOffset = isWalking ? -Math.abs(Math.sin(walkHop)) * 10 : 0;

  // 將座標與物理變形應用到 DOM 上，改為以底部中心點定位，並融入視覺跳躍偏移
  petContainer.style.transform = `translate(${petX - petWidth / 2}px, ${petY + hopOffset - petHeight}px)`;
  
  // 圖片本身的翻轉、縮放、旋轉
  sprite.style.transform = `scaleX(${facing * scaleX}) scaleY(${scaleY}) rotate(${rotation}deg)`;
}

// 隨機目標點產生器
function startWanderingLogic() {
  setInterval(() => {
    if (config.randomWander === false) {
      targetX = null;
      return;
    }
    if (!isDragging && !isMovingToCursor && Math.random() < 0.3) {
      const petWidth = sprite.offsetWidth || 150;
      targetX = Math.max(petWidth / 2, Math.min(Math.random() * screenWidth, screenWidth - petWidth / 2));
    }
  }, 3000);
}

// 拖曳與點擊處理：使用 pointer 事件並捕捉，確保滑鼠移動再快也不會脫離
petContainer.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  petContainer.setPointerCapture(e.pointerId);
  
  // 當按下時，若有任何臨時鎖定的圖片狀態（如定時提醒），立刻清除，讓按壓的 STRETCH 造型能即時展現！
  if (overrideTimeout) {
    clearTimeout(overrideTimeout);
    overrideTimeout = null;
  }
  overrideImage = null;
  
  isDragging = true;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  dragMoved = false;
  dragOffsetX = e.clientX - petX;
  dragOffsetY = e.clientY - petY;
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
  mouseX = e.clientX;
  mouseY = e.clientY;
  
  sprite.style.filter = 'drop-shadow(0 15px 20px rgba(0,0,0,0.4))';
  
  targetX = null;
  isMovingToCursor = false;
});

petContainer.addEventListener('pointermove', (e) => {
  if (isDragging) {
    mouseX = e.clientX;
    mouseY = e.clientY;
    
    // 若滑鼠移動距離大於 5px，則視為拖曳而非點擊
    if (Math.abs(e.clientX - dragStartX) > 5 || Math.abs(e.clientY - dragStartY) > 5) {
      dragMoved = true;
    }
  }
});

petContainer.addEventListener('pointerup', (e) => {
  if (isDragging) {
    isDragging = false;
    petContainer.releasePointerCapture(e.pointerId);
    sprite.style.filter = '';
    
    // 如果沒有顯著拖曳移動，則是點擊互動！
    if (!dragMoved) {
      handlePetClick();
    }
  }
});

// 右鍵選單
petContainer.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  window.electronAPI.showContextMenu();
});

window.electronAPI.onCallPetOver((cursor) => {
  isMovingToCursor = true;
  targetX = cursor.x;
});

// 當單一自訂圖片造型上傳/更新時，更新對應快取與即時更新畫面
window.electronAPI.onCustomPetUpdated((data) => {
  const { state, path } = data;
  customPaths[state] = path;
  currentVisualState = ''; // 強制觸發視覺更新
  updateVisualState();
});

// 當全部造型還原時，清除全部快取
window.electronAPI.onCustomPetsCleared(() => {
  customPaths = {};
  currentVisualState = '';
  updateVisualState();
});

// 當單一造型被還原時，清除特定插槽快取
window.electronAPI.onCustomPetClearedSlot((state) => {
  delete customPaths[state];
  currentVisualState = '';
  updateVisualState();
});

window.electronAPI.onForceSpeak(() => {
  const cheerList = getPhrases('cheer');
  showDialog(cheerList[Math.floor(Math.random() * cheerList.length)]);
});

// 實作點擊互動與語錄對話框，點擊時強制彈性擠壓變形
function handlePetClick() {
  scaleX = 1.35;
  scaleY = 0.65;
  rotation = 12; // 增加俏皮旋轉
  
  // 25% 機率觸發獨特氣象語錄
  if (weatherState.loaded && Math.random() < 0.25) {
    let weatherGreeting = `目前${weatherState.city}是 ${weatherState.temp}°C ${weatherState.emoji} 喔！璨璨隨時陪伴您！`;
    if (weatherState.desc.includes('雨')) {
      weatherGreeting = `報告親愛的母！目前${weatherState.city}正在下雨呢 ${weatherState.emoji}（氣溫 ${weatherState.temp}°C）。璨璨提醒您出門一定要帶把傘喔！`;
    } else if (weatherState.desc.includes('晴')) {
      weatherGreeting = `天氣真好！目前${weatherState.city}是晴朗的一天 ${weatherState.emoji} ${weatherState.temp}°C。媽媽累了就跟璨璨一起去曬曬太陽吧！`;
    } else if (weatherState.temp <= 18) {
      weatherGreeting = `冷颼颼的天氣！目前${weatherState.city}氣溫僅有 ${weatherState.temp}°C ${weatherState.emoji}。媽媽要注意加件衣服保暖喔！`;
    }
    showDialog(weatherGreeting, 5000);
    return;
  }
  
  const clickList = getPhrases('click');
  const randomClickQuote = clickList[Math.floor(Math.random() * clickList.length)];
  showDialog(randomClickQuote, 4000);
}

// 實作時段檢查與提醒功能 (午休與下班，每次提醒停留 25 秒)
function checkTimeReminders() {
  const { isLunchTime, isOffWorkTime } = getPeriodState();
  const day = new Date().getDate();
  
  const lunchList = getPhrases('lunch');
  const offworkList = getPhrases('offwork');
  
  if (isLunchTime && lastLunchReminderDay !== day) {
    lastLunchReminderDay = day;
    setSpriteImage(images.SLEEP, 25000);
    showDialog(lunchList[Math.floor(Math.random() * lunchList.length)], 25000);
  } else if (isOffWorkTime && lastOffWorkReminderDay !== day) {
    lastOffWorkReminderDay = day;
    setSpriteImage(images.SLEEP, 25000);
    showDialog(offworkList[Math.floor(Math.random() * offworkList.length)], 25000);
  }
}

function showDialog(text, duration = 4000) {
  dialogText.innerText = text;
  dialogBubble.classList.add('show');
  if (messageTimeout) clearTimeout(messageTimeout);
  messageTimeout = setTimeout(() => {
    dialogBubble.classList.remove('show');
  }, duration);
}

// 精準的滑鼠穿透邏輯
document.addEventListener('pointermove', (e) => {
  if (isDragging) {
    window.electronAPI.setIgnoreMouseEvents(false);
    return;
  }
  
  const rect = petContainer.getBoundingClientRect();
  const pad = 15; // 增加 15px 的預留緩衝區
  
  const isInside = (
    e.clientX >= rect.left - pad &&
    e.clientX <= rect.right + pad &&
    e.clientY >= rect.top - pad &&
    e.clientY <= rect.bottom + pad
  );
  
  if (isInside) {
    window.electronAPI.setIgnoreMouseEvents(false);
  } else {
    window.electronAPI.setIgnoreMouseEvents(true, { forward: true });
  }
});

init();
