const packager = require('electron-packager');

console.log('開始以程式化方式執行打包...');

packager({
  dir: '.',
  name: 'MomCheerUpPet',
  platform: 'win32',
  arch: 'x64',
  out: 'dist',
  overwrite: true,
  icon: 'assets/icon.ico'
}).then(appPaths => {
  console.log('【打包成功】輸出路徑為:', appPaths);
}).catch(err => {
  console.error('【打包失敗】錯誤詳情如下:', err);
});
