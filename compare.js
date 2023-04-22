const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const pixelmatch = require('pixelmatch');
const puppeteer = require('puppeteer');

// Указываем адрес тестируемой страницы
const testPageUrl = 'http://127.0.0.1:5500/promotions-news.html';

// Настройки для pixelmatch
const pixelmatchOptions = {
  threshold: 0.1, // допустимая погрешность (от 0 до 1)
  includeAA: false,
};

async function run() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  const designsFolder = './designs';
  const designFiles = fs.readdirSync(designsFolder).filter((file) => path.extname(file) === '.png');

  for (const designFile of designFiles) {
    const designPath = path.join(designsFolder, designFile);

    const design = PNG.sync.read(fs.readFileSync(designPath));
    const { width: designWidth, height: designHeight } = design;

    await page.setViewport({ width: designWidth, height: designHeight });
    const screenshot = await page.screenshot({ fullPage: true });

    const screenshotPath = `./screenshots/${designFile.replace('.png', '-screenshot.png')}`;
    fs.writeFileSync(screenshotPath, screenshot);

    const pageImage = PNG.sync.read(screenshot);

    const height = Math.min(designHeight, pageImage.height);
    const width = designWidth;

    const img1 = design.data;
    const img2 = pageImage.data;
    const diffImage = new PNG({ width, height });

    // создаем папку для слепка различий 
    if (!fs.existsSync('diff')) {
      fs.mkdirSync('diff');
    }

    const diff = pixelmatch(img1, img2, diffImage.data, width, height, pixelmatchOptions);

    const diffPath = `./diff/${designFile.replace('.png', '-diff.png')}`;
    diffImage.pack().pipe(fs.createWriteStream(diffPath));

    const matchPercentage = (1 - diff / (width * height)) * 100;

    console.log(
      `Вёрстка страницы '${testPageUrl}' соответствует макету '${designFile}' на: ${matchPercentage.toFixed(2)}%`
    );
  }

  await browser.close();
}

run().catch((error) => console.error('Произошла ошибка:', error));
