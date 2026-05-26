// scratch/check_chrome.js
import puppeteer from 'puppeteer';

(async () => {
  console.log('Starting puppeteer script...');
  try {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    page.on('console', msg => {
      console.log('[BROWSER CONSOLE]', msg.type(), msg.text());
    });

    page.on('pageerror', err => {
      console.error('[BROWSER ERROR]', err.message);
    });

    console.log('Navigating to http://127.0.0.1:3000/ ...');
    await page.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle2', timeout: 5000 });
    
    console.log('Page loaded. Waiting 2 seconds...');
    await new Promise(r => setTimeout(r, 2000));
    
    await browser.close();
    console.log('Done!');
  } catch (err) {
    console.error('Error running check:', err.message);
  }
})();
