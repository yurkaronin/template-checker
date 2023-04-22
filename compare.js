const puppeteer = require('puppeteer');
const fs = require('fs');
const PNG = require('pngjs').PNG;
const pixelmatch = require('pixelmatch');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('http://yourwebsite.com', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: 'screenshot.png' });

  await browser.close();

  const img1 = fs.createReadStream('screenshot.png').pipe(new PNG()).on('parsed', doneReading);
  const img2 = fs.createReadStream('design.png').pipe(new PNG()).on('parsed', doneReading);

  let filesRead = 0;

  function doneReading() {
    if (++filesRead < 2) return;

    const diff = new PNG({ width: img1.width, height: img1.height });
    const numDiffPixels = pixelmatch(img1.data, img2.data, diff.data, img1.width, img1.height, { threshold: 0.1 });

    diff.pack().pipe(fs.createWriteStream('diff.png'));

    const totalPixels = img1.width * img1.height;
    const percentage = ((totalPixels - numDiffPixels) / totalPixels) * 100;

    console.log(`Percentage of similarity: ${percentage.toFixed(2)}%`);
  }
})();
