const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const PNG = require('pngjs').PNG;
const pixelmatch = require('pixelmatch');
const sharp = require('sharp');
const designsFolder = 'designs';
const screenshotsFolder = 'screenshots';

// Создание папки для скриншотов, если она не существует
if (!fs.existsSync(screenshotsFolder)) {
  fs.mkdirSync(screenshotsFolder);
}

(async () => {
  // Адрес тестируемой страницы
  const testedPageUrl = 'http://127.0.0.1:5500/promotions-news.html';

  // Список файлов макетов для сравнения
  const designFiles = fs.readdirSync(designsFolder).filter((file) => path.extname(file) === '.png');

  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Загрузка тестируемой страницы
  await page.goto(testedPageUrl, { waitUntil: 'networkidle0' });

  for (const designFile of designFiles) {
    const designPath = path.join(designsFolder, designFile);
    const designImage = await sharp(designPath);
    const { width, height } = await designImage.metadata();

    // Установка размера окна браузера согласно размерам макета
    await page.setViewport({ width, height });

    // Создание скриншота страницы
    const fullScreenshotBuffer = await page.screenshot({ fullPage: true });
    const screenshotBuffer = await sharp(fullScreenshotBuffer)
      .extract({ left: 0, top: 0, width: width, height: height })
      .toBuffer();

    const screenshot = await sharp(screenshotBuffer);

    // Сохранение скриншота
    await screenshot.toFile(path.join(screenshotsFolder, `screenshot-${designFile}`));

    const maxHeight = Math.max(height, (await screenshot.metadata()).height);

    const img1 = await screenshot
      .extend({
        top: 0,
        bottom: maxHeight - (await screenshot.metadata()).height,
        left: 0,
        right: 0,
      })
      .raw()
      .toBuffer();

    const img2 = await designImage
      .extend({
        top: 0,
        bottom: maxHeight - height,
        left: 0,
        right: 0,
      })
      .raw()
      .toBuffer();

    const diff = new PNG({ width, height: maxHeight });
    const numDiffPixels = pixelmatch(img1, img2, diff.data, width, maxHeight, { threshold: 0.1 });

    diff.pack().pipe(fs.createWriteStream(`diff-${designFile}`));

    const totalPixels = width * maxHeight;
    const percentage = ((totalPixels - numDiffPixels) / totalPixels) * 100;

    console.log(`Вёрстка страницы '${testedPageUrl}' соответствует макету '${designFile}' на: ${percentage.toFixed(2)}%`);
  }

  await browser.close();
})();
