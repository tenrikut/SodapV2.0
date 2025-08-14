const puppeteer = require('puppeteer');

(async () => {
  try {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    // Listen for console messages
    page.on('console', msg => {
      console.log(`CONSOLE ${msg.type().toUpperCase()}: ${msg.text()}`);
    });
    
    // Listen for page errors
    page.on('pageerror', error => {
      console.log(`PAGE ERROR: ${error.message}`);
    });
    
    await page.goto('http://localhost:8080/profile?tab=wallet', {
      waitUntil: 'networkidle2',
      timeout: 10000
    });
    
    // Wait a bit for React to render
    await page.waitForTimeout(2000);
    
    // Check if wallet tab content exists
    const walletContent = await page.$('[data-tab="wallet"], .wallet-tab, h1, h2, h3');
    if (walletContent) {
      const text = await page.evaluate(el => el.textContent, walletContent);
      console.log('Found content:', text);
    } else {
      console.log('No wallet content found');
    }
    
    // Get page title
    const title = await page.title();
    console.log('Page title:', title);
    
    await browser.close();
  } catch (error) {
    console.error('Error:', error.message);
  }
})();
