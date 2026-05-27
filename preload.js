const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  setIgnoreMouseEvents: (ignore, options) => ipcRenderer.send('set-ignore-mouse-events', ignore, options),
  loadConfig: () => ipcRenderer.invoke('load-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  callPetToCursor: () => ipcRenderer.send('call-pet-to-cursor'),
  getCursorPosition: () => ipcRenderer.invoke('get-cursor-position'),
  getWorkAreaSize: () => ipcRenderer.invoke('get-work-area-size'),
  saveCustomPet: (state, base64Data) => ipcRenderer.invoke('save-custom-pet', { state, base64Data }),
  getCustomPetPaths: () => ipcRenderer.invoke('get-custom-pet-paths'),
  uploadCustomImage: (state, base64Data) => ipcRenderer.invoke('save-custom-pet', { state, base64Data }),
  clearAllCustomPets: () => ipcRenderer.invoke('clear-all-custom-pets'),
  clearCustomPet: (state) => ipcRenderer.invoke('clear-custom-pet', state),
  callPet: () => ipcRenderer.send('call-pet-to-cursor'),
  updatePetState: (state) => ipcRenderer.send('update-pet-state', state),
  closeApp: () => ipcRenderer.send('quit-app'),
  showContextMenu: () => ipcRenderer.send('show-context-menu'),
  
  // 隨機形象庫與線上更新 API
  saveRandomPoolImage: (base64Data) => ipcRenderer.invoke('save-random-pool-image', base64Data),
  getRandomPool: () => ipcRenderer.invoke('get-random-pool'),
  deleteRandomPoolImage: (filepath) => ipcRenderer.invoke('delete-random-pool-image', filepath),
  checkForUpdates: (customUrl) => ipcRenderer.invoke('check-for-updates', customUrl),
  downloadAndInstallUpdate: (downloadUrl) => ipcRenderer.invoke('download-and-install-update', downloadUrl),
  
  onDownloadProgress: (callback) => {
    const subscription = (event, percent) => callback(percent);
    ipcRenderer.on('download-progress', subscription);
    return () => ipcRenderer.removeListener('download-progress', subscription);
  },

  // 監聽主進程事件
  onCustomPetClearedSlot: (callback) => {
    const subscription = (event, state) => callback(state);
    ipcRenderer.on('custom-pet-cleared-slot', subscription);
    return () => ipcRenderer.removeListener('custom-pet-cleared-slot', subscription);
  },
  onConfigUpdated: (callback) => {
    const subscription = (event, config) => callback(config);
    ipcRenderer.on('config-updated', subscription);
    return () => ipcRenderer.removeListener('config-updated', subscription);
  },
  onUpdateSettings: (callback) => {
    const subscription = (event, config) => callback(config);
    ipcRenderer.on('config-updated', subscription);
    return () => ipcRenderer.removeListener('config-updated', subscription);
  },
  onCallPetOver: (callback) => {
    const subscription = (event, cursor) => callback(cursor);
    ipcRenderer.on('call-pet-over', subscription);
    return () => ipcRenderer.removeListener('call-pet-over', subscription);
  },
  onCustomPetUpdated: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('custom-pet-updated', subscription);
    return () => ipcRenderer.removeListener('custom-pet-updated', subscription);
  },
  onCustomPetsCleared: (callback) => {
    const subscription = () => callback();
    ipcRenderer.on('custom-pets-cleared', subscription);
    return () => ipcRenderer.removeListener('custom-pets-cleared', subscription);
  },
  onPetStateChange: (callback) => {
    const subscription = (event, state) => callback(state);
    ipcRenderer.on('pet-state-change', subscription);
    return () => ipcRenderer.removeListener('pet-state-change', subscription);
  },
  onForceSpeak: (callback) => {
    const subscription = () => callback();
    ipcRenderer.on('force-speak', subscription);
    return () => ipcRenderer.removeListener('force-speak', subscription);
  }
});

contextBridge.exposeInMainWorld('electronAPIMove', (x, y) => {
  ipcRenderer.send('move-window', x, y);
});
