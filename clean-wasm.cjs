const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, 'dist', 'assets');
if (fs.existsSync(assetsDir)) {
  const files = fs.readdirSync(assetsDir);
  for (const file of files) {
    if (file.endsWith('.wasm')) {
      const fullPath = path.join(assetsDir, file);
      console.log(`[clean-wasm] Đã xóa file wasm vượt giới hạn 25MB: ${file} (ONNX Runtime Web sẽ tự nạp qua CDN jsdelivr khi chạy trên trình duyệt)`);
      fs.unlinkSync(fullPath);
    }
  }
}
