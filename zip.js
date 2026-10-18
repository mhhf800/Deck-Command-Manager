import fs from 'fs';
import path from 'path';
import { zip } from 'bestzip';

async function main() {
  const dirName = 'Deck-Command-Manager';
  const filesToCopy = ['dist', 'main.py', 'plugin.json', 'assets', 'backend', 'py_modules', 'package.json'];

  // 1. 创建目标文件夹
  if (!fs.existsSync(dirName)) {
    fs.mkdirSync(dirName, { recursive: true });
  }

  // 2. 复制文件/文件夹
  for (const file of filesToCopy) {
    if (fs.existsSync(file)) {
      fs.cpSync(file, path.join(dirName, file), { recursive: true });
      console.log(`Copied: ${file}`);
    }
  }

  // 3. 压缩成 zip
  await zip({
    source: dirName,
    destination: 'Deck-Command-Manager.zip'
  });
  console.log('Zipped successfully!');

  // 4. 清理临时文件夹
  fs.rmSync(dirName, { recursive: true, force: true });
  console.log('Cleaned up!');
}

main().catch(console.error);