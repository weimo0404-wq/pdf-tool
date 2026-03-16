import sharp from 'sharp';
import fs from 'fs';
import https from 'https';
import http from 'http';

async function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const chunks = [];
    
    protocol.get(url, (response) => {
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    }).on('error', reject);
  });
}

async function processLogo() {
  try {
    const logoUrl = 'https://code.coze.cn/api/sandbox/coze_coding/file/proxy?expire_time=-1&file_path=assets%2F%E5%BE%AE%E4%BF%A1%E5%9B%BE%E7%89%87_20260316202852_21_7.jpg&nonce=221b615a-1453-4a8e-89d4-3fde540d4b5c&project_id=7617817295271903272&sign=3a149e5a03f1b57de29c04f68762f1fc5eab4d93e3bfebeceae3ebd917e5f2ad';
    
    console.log('正在下载logo...');
    const inputBuffer = await downloadImage(logoUrl);
    console.log('下载完成，文件大小:', inputBuffer.length);
    
    console.log('正在处理图片...');
    
    // 使用sharp处理图片
    const image = sharp(inputBuffer);
    const metadata = await image.metadata();
    console.log('图片尺寸:', metadata.width, 'x', metadata.height);
    
    // 获取原始像素数据
    const { data, info } = await sharp(inputBuffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    
    console.log('正在去除背景...');
    
    // 遍历像素，将浅色背景设为透明
    let transparentPixels = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // 检测浅色背景（接近白色）
      const brightness = (r + g + b) / 3;
      const isNearWhite = brightness > 240 && 
                          Math.abs(r - g) < 15 && 
                          Math.abs(g - b) < 15 &&
                          Math.abs(r - b) < 15;
      
      if (isNearWhite) {
        data[i + 3] = 0; // 设置为完全透明
        transparentPixels++;
      }
    }
    
    console.log(`处理了 ${transparentPixels} 个像素`);
    
    // 保存处理后的图片
    await sharp(data, {
      raw: {
        width: info.width,
        height: info.height,
        channels: 4
      }
    })
    .png()
    .toFile('/workspace/projects/public/logo.png');
    
    console.log('✅ Logo处理完成，已保存到 public/logo.png');
  } catch (error) {
    console.error('处理失败:', error);
    process.exit(1);
  }
}

processLogo();
