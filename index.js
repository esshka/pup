const puppeteer = require('puppeteer');
const fs = require('fs');
const argv = require('minimist')(process.argv.slice(2));
const path = require('path');
const URL = require('url');

const url = argv.url;
const tm = argv.timeout || 0;
const parsedURL = URL.parse(url);
let fileName = `${parsedURL.host.replace(
  /\./g,
  '_',
)}_${parsedURL.pathname.replace(/(^\/|\/$)/g, '').replace(/\./g, '_')}`;
if (fileName.length < 1) {
  fileName = URL.parse(url).hostname;
}
const appRoot = path.resolve(__dirname);

(async (url, tm) => {
  const browser = await puppeteer.launch();
  try {
    const page = await browser.newPage();
    await page.goto(url);
    const html = await page.evaluate(async tm => {
      function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
      }
      try {
        document.ready = new Promise(function(resolve) {
          if (document.readyState === 'complete') {
            resolve();
          } else {
            function onReady() {
              resolve();
              document.removeEventListener('DOMContentLoaded', onReady, true);
              window.removeEventListener('load', onReady, true);
            }
            document.addEventListener('DOMContentLoaded', onReady, true);
            window.addEventListener('load', onReady, true);
          }
        });
        await document.ready;
        await sleep(tm); //TODO custom hook based checking
        return document.documentElement.outerHTML;
      } catch (err) {
        return `error when prerender url: ${err}`;
      }
    }, tm);
    const fullPath = `${appRoot}/tmp/${fileName}.html`;
    fs.writeFileSync(fullPath, html);
  } catch (err) {
    console.log(err);
  } finally {
    browser.close();
  }
})(url, tm);
