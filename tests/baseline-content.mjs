import {chromium}from '@playwright/test';
import {writeFile}from'node:fs/promises';
const browser=await chromium.launch({channel:'chrome'});const page=await browser.newPage();const result={};
for(const path of ['/projects','/blogs','/photography']){await page.goto('https://www.kathandesai.com'+path);await page.waitForTimeout(700);result[path]=await page.locator('main').first().evaluate(el=>({text:el.textContent,links:[...el.querySelectorAll('a')].map(a=>({text:a.textContent,href:a.getAttribute('href')})),images:[...el.querySelectorAll('img')].map(img=>({alt:img.alt,src:img.getAttribute('src')}))}));}
await writeFile('/tmp/kathan-public-content-baseline.json',JSON.stringify(result,null,2));console.log(Object.fromEntries(Object.entries(result).map(([path,value])=>[path,{images:value.images.length,links:value.links.length}])));await browser.close();
