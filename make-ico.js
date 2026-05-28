const fs = require('fs');
const path = require('path');

const pngPath = path.join(__dirname, 'assets', 'SLEEP.png');
const icoPath = path.join(__dirname, 'assets', 'icon.ico');

if (fs.existsSync(pngPath)) {
  const pngData = fs.readFileSync(pngPath);
  const pngSize = pngData.length;
  
  // ICO header: 6 bytes
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Icon type (1 for ICO)
  header.writeUInt16LE(1, 4); // Number of images (1)
  
  // Directory entry: 16 bytes
  const dir = Buffer.alloc(16);
  dir.writeUInt8(0, 0); // Width: 0 means 256px or fits standard
  dir.writeUInt8(0, 1); // Height: 0 means 256px or fits standard
  dir.writeUInt8(0, 2); // Color palette
  dir.writeUInt8(0, 3); // Reserved
  dir.writeUInt16LE(1, 4); // Color planes
  dir.writeUInt16LE(32, 6); // Bits per pixel (32-bit colors)
  dir.writeUInt32LE(pngSize, 8); // Size of PNG data
  dir.writeUInt32LE(22, 12); // Offset where PNG begins (6 + 16 = 22)
  
  const icoData = Buffer.concat([header, dir, pngData]);
  fs.writeFileSync(icoPath, icoData);
  console.log('Successfully created assets/icon.ico!');
} else {
  console.error('Source PNG not found!');
}
