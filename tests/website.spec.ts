import {test,expect} from '@playwright/test';
const real=process.env.TEST_REAL_CONTENT==='1';
// Reading telemetry is deliberately suppressed during review; content remains read-only.
test.beforeEach(async({page})=>{await page.route('**/api/blog/*/view',route=>route.fulfill({json:{success:true}}));});
test('home, dedicated routes, clocks, hidden terminal and status',async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.goto('/');await expect(page.locator('body')).toHaveCSS('font-family',/Manrope/);await expect(page.getByRole('heading',{name:'I’m Kathan.'})).toBeVisible();
 await expect(page.getByText(/I started BugBase/)).toBeVisible();await expect(page.getByText(/building Pentest Copilot in San Francisco/)).toBeVisible();
 await expect(page.locator('footer a[href="https://x.com/heykathan"]')).toBeVisible();
 await expect(page.locator('.scene-fallback')).toBeVisible();await expect(page.locator('.hero-clocks .clock time')).toHaveCount(2);await expect(page.locator('.life-clocks .clock time')).toHaveCount(2);
 await expect(page.locator('.landing-chapter')).toHaveCount(5);await expect(page.locator('.landing-content').first()).toHaveCSS('position','relative');
 await page.evaluate(()=>scrollTo(0,innerHeight/2));await page.waitForTimeout(150);const transition=await page.locator('.hero-content,#bugbase .landing-content').evaluateAll(elements=>elements.map(element=>Number(getComputedStyle(element).opacity)));expect(transition.every(opacity=>opacity<.08)).toBeTruthy();await page.evaluate(()=>scrollTo(0,0));
 await expect(page.getByRole('button',{name:/terminal/i})).toHaveCount(0);
 await page.getByLabel('Reduce motion',{exact:true}).check();await expect(page.locator('html')).toHaveAttribute('data-motion','reduced');await expect(page.locator('.scene canvas')).toHaveCount(0);await page.getByLabel('Reduce motion',{exact:true}).uncheck();await page.evaluate(()=>{(document.activeElement as HTMLElement | null)?.blur();});
 await page.keyboard.type('abracadabra');await expect(page.getByRole('dialog',{name:'Terminal'})).toBeVisible();
 await page.getByRole('textbox',{name:'Terminal input'}).fill('now');await page.keyboard.press('Enter');
 await expect(page.getByText('A random guess, not live activity.')).toBeVisible();await page.keyboard.press('Escape');
 await page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'Projects',exact:true}).click();await expect(page).toHaveURL(/\/projects$/);
 await expect(page.getByRole('heading',{name:'Built to be used.'})).toBeVisible();
 await page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'Photography',exact:true}).click();await expect(page).toHaveURL(/\/photography$/);
 expect(errors).toEqual([]);
});
test('mobile navigation and quiet motion work without horizontal overflow',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
 await expect(page.locator('.scene canvas')).toHaveCount(0);await expect(page.locator('.scene-fallback')).toBeVisible();
 const menu=page.locator('.nav-menu');await menu.click();await expect(menu).toHaveAttribute('aria-expanded','true');await page.keyboard.press('Escape');await expect(menu).toHaveAttribute('aria-expanded','false');await expect(menu).toBeFocused();
 await menu.click();await expect(menu).toHaveAttribute('aria-expanded','true');await page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'Writing',exact:true}).click();
 await expect(page).toHaveURL(/\/blogs$/);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 for(const route of ['/photography','/projects','/about','/work','/skills','/certifications','/faq','/now']){await page.goto(route);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();await expect(page.locator('main h1').first()).toBeVisible();}
 await expect(page.getByRole('heading',{name:'In San Francisco, building Pentest Copilot.'})).toBeVisible();
});
test('real projects, article content and persistent reader settings',async({page})=>{
 test.skip(!real,'Run against Vercel with TEST_REAL_CONTENT=1');
 await page.goto('/projects');await expect(page.locator('.project-featured')).toHaveCount(2);await expect(page.locator('.project-item')).toHaveCount(6);
 const name=await page.locator('.project-featured h2').first().innerText();await page.locator('.project-featured').first().getByRole('link',{name:/View the work/}).click();await expect(page.locator('main h1')).toHaveText(name);
 await page.goto('/blogs');await expect(page.locator('main article')).toHaveCount(12);const first=page.locator('main article a[href^="/blogs/"]').first();await expect(first).toBeVisible();await first.click();
 await expect(page.locator('#reading-article')).toBeVisible();await page.locator('summary[aria-controls="reading-settings"]').click();
 await page.getByRole('button',{name:'Use dark page colour',exact:true}).click();await page.reload();
 await expect(page.locator('[data-reading-theme="dark"]')).toBeVisible();
 await page.goto('/blogs/videomemory-searchable-memory-for-ai-agents');const diagram=page.locator('figure[aria-label="Article diagram"] [role="region"]');await expect(diagram).toBeVisible();const dimensions=await diagram.evaluate(el=>({client:el.clientWidth,scroll:el.scrollWidth,height:el.getBoundingClientRect().height}));expect(dimensions.scroll).toBeGreaterThan(dimensions.client);expect(dimensions.height).toBeGreaterThan(100);
});
test('real photography supports visual stories, deep links, full-size viewing and Escape',async({page})=>{
 test.skip(!real,'Run against Vercel with TEST_REAL_CONTENT=1');
 await page.goto('/photography');await expect(page.getByRole('heading',{name:/mountains/i})).toBeVisible();await expect(page.getByRole('searchbox')).toHaveCount(0);
 const photos=page.locator('button[aria-label^="Open photograph "]');await expect(photos).toHaveCount(6);const photo=photos.first();await expect(photo).toBeVisible();await photo.click();
 await expect(page.getByRole('dialog')).toBeVisible();await expect(page).toHaveURL(/photo=/);const url=page.url();await page.reload();
 await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);expect(page.url()).not.toEqual(url);
 const reopened=Date.now();await photo.click();await expect(page.getByRole('dialog')).toBeVisible();expect(Date.now()-reopened).toBeLessThan(1500);await page.keyboard.press('Escape');
});
