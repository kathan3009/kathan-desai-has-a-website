import {test,expect} from '@playwright/test';
const real=process.env.TEST_REAL_CONTENT==='1';
// Reading telemetry is deliberately suppressed during review; content remains read-only.
test.beforeEach(async({page})=>{await page.route('**/api/blog/*/view',route=>route.fulfill({json:{success:true}}));});
test('home, dedicated routes, ASCII scene, hidden terminal and status',async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.goto('/');await expect(page.locator('body')).toHaveCSS('font-family',/bricolage/i);await expect(page.getByRole('heading',{name:'I’m Kathan.'})).toBeVisible();
 await expect(page.getByText(/I started BugBase/)).toBeVisible();await expect(page.getByText(/building Pentest Copilot in San Francisco/)).toBeVisible();
 await expect(page.locator('footer a[href="https://x.com/heykathan"]')).toBeVisible();
 await expect(page.getByRole('navigation',{name:'Start here'}).getByRole('link')).toHaveCount(3);
 await expect(page.locator('.hero-scene .ascii-scene')).toHaveAttribute('data-ready','true');await expect(page.locator('.hero-scene canvas[role="img"]')).toHaveAttribute('aria-label',/drawn in text characters/);await expect(page.getByRole('button',{name:'Draw another'})).toBeVisible();
 await expect(page.getByRole('button',{name:/terminal/i})).toHaveCount(0);
 await page.getByLabel('Reduce motion',{exact:true}).check();await expect(page.locator('html')).toHaveAttribute('data-motion','reduced');await page.getByLabel('Reduce motion',{exact:true}).uncheck();await page.evaluate(()=>{(document.activeElement as HTMLElement | null)?.blur();});
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
 await expect(page.locator('.hero-scene')).toBeVisible();
 const menu=page.locator('.nav-menu');await menu.click();await expect(menu).toHaveAttribute('aria-expanded','true');await page.keyboard.press('Escape');await expect(menu).toHaveAttribute('aria-expanded','false');await expect(menu).toBeFocused();
 await menu.click();await expect(menu).toHaveAttribute('aria-expanded','true');await page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'Writing',exact:true}).click();
 await expect(page).toHaveURL(/\/blogs$/);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 for(const route of ['/photography','/projects','/about','/work','/skills','/certifications','/faq','/now']){await page.goto(route);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();await expect(page.locator('main h1').first()).toBeVisible();}
 await expect(page.getByRole('heading',{name:'In San Francisco, building Pentest Copilot Enterprise.'})).toBeVisible();
});
test('real projects, article content and persistent reader settings',async({page})=>{
 test.skip(!real,'Run against Vercel with TEST_REAL_CONTENT=1');
 await page.goto('/projects');await expect(page.locator('.project-featured')).toHaveCount(2);await expect(page.locator('.project-item')).toHaveCount(7);
 const name=await page.locator('.project-featured h2').first().innerText();await page.locator('.project-featured').first().click();await expect(page.locator('main h1')).toHaveText(name);
 await page.goto('/blogs');await expect(page.locator('main article')).toHaveCount(12);const first=page.locator('main article a[href^="/blogs/"]').first();await expect(first).toBeVisible();await first.click();
 await expect(page.locator('#reading-article')).toBeVisible();await page.locator('summary[aria-controls="reading-settings"]').click();
 await page.getByRole('button',{name:'Use dark page colour',exact:true}).click();await page.reload();
 await expect(page.locator('[data-reading-theme="dark"]')).toBeVisible();
 await page.goto('/blogs/videomemory-searchable-memory-for-ai-agents');const diagram=page.locator('figure[aria-label="Article diagram"] [role="region"]');await expect(diagram).toBeVisible();const dimensions=await diagram.evaluate(el=>({client:el.clientWidth,scroll:el.scrollWidth,height:el.getBoundingClientRect().height}));expect(dimensions.scroll).toBeGreaterThan(dimensions.client);expect(dimensions.height).toBeGreaterThan(100);
});
test('real photography supports visual stories, deep links, full-size viewing and Escape',async({page})=>{
 test.skip(!real,'Run against Vercel with TEST_REAL_CONTENT=1');
 await page.goto('/photography');await expect(page.getByRole('heading',{name:'San Francisco'})).toBeVisible();await expect(page.getByRole('heading',{name:/mountains/i})).toBeVisible();await expect(page.getByRole('searchbox')).toHaveCount(0);
 const photos=page.locator('button[aria-label^="Open photograph "]');await expect(photos).toHaveCount(13);const photo=photos.first();await expect(photo).toBeVisible();await photo.click();
 await expect(page.getByRole('dialog')).toBeVisible();await expect(page).toHaveURL(/photo=/);const url=page.url();await page.reload();
 await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);expect(page.url()).not.toEqual(url);
 const reopened=Date.now();await photo.click();await expect(page.getByRole('dialog')).toBeVisible();expect(Date.now()-reopened).toBeLessThan(1500);await page.keyboard.press('Escape');
});

test('search and answer engines get a sitemap, feed, llms.txt, share image and one h1 per page',async({page,request})=>{
 const robots=await request.get('/robots.txt');expect(await robots.text()).toMatch(/User-Agent: OAI-SearchBot\nAllow: \//);
 const sitemap=await request.get('/sitemap.xml');expect(sitemap.headers()['content-type']).toMatch(/xml/);expect(await sitemap.text()).toContain('<loc>https://www.kathandesai.com/photoshop-mcp</loc>');
 const feed=await request.get('/feed.xml');expect(feed.headers()['content-type']).toMatch(/rss\+xml/);expect(await feed.text()).toContain('<item>');
 const llms=await request.get('/llms.txt');expect(await llms.text()).toMatch(/^# Kathan Desai/);
 const og=await request.get('/opengraph-image');expect(og.headers()['content-type']).toBe('image/png');
 const icon=await request.get('/icon.png');expect((await icon.body()).length).toBeLessThan(100000);
 await page.goto('/');await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content',/opengraph-image/);await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href','https://www.kathandesai.com');await expect(page.locator('link[rel="alternate"][type="application/rss+xml"]')).toHaveCount(1);
 for(const route of ['/','/about','/projects','/blogs','/photography','/photoshop-mcp']){await page.goto(route);expect(await page.locator('h1').count()).toBe(1);}
});


test('article diagrams keep every node and label inside the SVG at reader widths', async ({ page }) => {
 test.skip(!real, 'Run against Vercel with TEST_REAL_CONTENT=1');
 for (const slug of ['how-id-hand-a-complex-feature-to-a-coding-agent', 'why-i-think-everyone-getting-into-ai-should-build-a-small-ml-project']) {
  await page.goto(`/blogs/${slug}`);
  for (const width of [390, 1280]) {
   await page.setViewportSize({ width, height: 900 });
   await expect(page.locator('figure[aria-label="Article diagram"][aria-busy="true"]')).toHaveCount(0);
   const drawings = page.locator('figure[aria-label="Article diagram"] svg');
   await expect(drawings).toHaveCount(slug.startsWith('how-') ? 3 : 4);
   const clipped = await drawings.evaluateAll(svgs => svgs.flatMap(svg => {
    const frame = svg.getBoundingClientRect();
    return Array.from(svg.querySelectorAll('.node, .edgeLabel, text')).filter(item => {
     const box = item.getBoundingClientRect();
     return box.width > 0 && box.height > 0 && (box.left < frame.left - 1 || box.right > frame.right + 1 || box.top < frame.top - 1 || box.bottom > frame.bottom + 1);
    }).map(item => item.textContent);
   }));
   expect(clipped).toEqual([]);
  }
 }
});
