import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.SITE_BASE_URL||'http://127.0.0.1:3001';
const browser=await chromium.launch({channel:'chrome'});
await mkdir('screenshots',{recursive:true});
const results=[];
for(const path of ['/','/projects','/photography','/blogs','/about','/now']){
 const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:2});
 await page.route('**/api/blog/*/view',r=>r.fulfill({json:{success:true}}));
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const response=await page.goto(base+path);await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(1200);
 await page.screenshot({path:`screenshots/final-${path==='/'?'home':path.slice(1)}.png`,scale:'device'});
 results.push({path,status:response?.status(),title:await page.title(),headings:await page.locator('main h1,main h2').allTextContents(),images:await page.locator('main img').count(),links:await page.locator('main a').evaluateAll(a=>a.map(el=>({text:el.textContent,href:el.getAttribute('href')}))),errors});
 await page.close();
}
await writeFile('screenshots/route-review.json',JSON.stringify(results,null,2));
console.log(results.map(({path,status,images,errors})=>({path,status,images,errors})));
await browser.close();
