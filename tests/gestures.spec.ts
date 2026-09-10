import {test, expect, type Page} from '@playwright/test';

/**
 * Adapted from the standalone gesture project. Synthetic gesture events drive
 * the real adapter; the camera tests run the real local model on Chrome's fake
 * video device. Neither proves physical-hand accuracy — that needs a person.
 */

const TEST = '?gesture-test';

type Harness = {
  event(event: Record<string, unknown>): void;
  receiveHands(result: {landmarks: {x: number; y: number}[][]; handedness: {categoryName: string}[][]; aspect: number}): void;
  engine: {current: {update(sample: unknown, time: number): void; cancel(): void} | null};
  tracker: {current: {running: boolean; stop(): void} | null};
  toReach(x: number, y: number): {x: number; y: number};
  preferences: Record<string, unknown>;
};

declare global {
  interface Window {
    __gestureTest: Harness;
    __paintTest: {art: {current: {strokes: unknown[]; ctx: CanvasRenderingContext2D; view: {zoom: number}} | null}};
    __gestureTestRuntime?: never;
    __tracks?: MediaStreamTrack[];
  }
}

const box = (page: Page) => page.getByRole('checkbox', {name: 'Hand controls'});
const guideOf = (page: Page) => page.getByRole('complementary', {name: 'Hand control guide'});

/** React has to hydrate before the synthetic-gesture harness exists. */
async function ready(page: Page, paint = false) {
  await page.waitForFunction(() => !!window.__gestureTest?.engine?.current);
  if (paint) await page.waitForFunction(() => !!window.__paintTest?.art?.current);
}

async function enableHandControls(page: Page) {
  await box(page).check();
  await expect(box(page)).toBeChecked();
}

/** Gesture hit-testing uses viewport coordinates, so the control must be on screen. */
async function centre(page: Page, selector: string) {
  const locator = page.locator(selector);
  await locator.scrollIntoViewIfNeeded();
  const found = await locator.boundingBox();
  if (!found) throw new Error(`No box for ${selector}`);
  return {x: found.x + found.width / 2, y: found.y + found.height / 2};
}

// Reach is mapped onto whatever owns input, so aim through the same conversion.
async function pinchAt(page: Page, point: {x: number; y: number}) {
  await page.evaluate(({x, y}) => {
    const p = window.__gestureTest.toReach(x, y);
    window.__gestureTest.event({type: 'pointer', point: p, pose: 'point', selecting: true});
    window.__gestureTest.event({type: 'down', point: p});
    window.__gestureTest.event({type: 'up', point: p});
  }, point);
}

async function dwellAt(page: Page, point: {x: number; y: number}) {
  await page.evaluate(async ({x, y}) => {
    const p = window.__gestureTest.toReach(x, y);
    for (let i = 0; i < 24; i++) {
      window.__gestureTest.event({type: 'pointer', point: p, pose: 'point', selecting: true});
      await new Promise(resolve => setTimeout(resolve, 40));
    }
  }, point);
}

test('an unchecked box captures nothing, downloads no model, and shows no guide', async ({page}) => {
  const heavy: string[] = [];
  page.on('request', request => {
    if (/tracking-worker|hand_landmarker|vision_wasm/.test(request.url())) heavy.push(request.url());
  });
  await page.goto('/');
  await expect(box(page)).not.toBeChecked();
  await expect(guideOf(page)).toHaveCount(0);
  await expect(page.locator('video')).toHaveCount(0);
  expect(heavy).toEqual([]);
});

test('enabling starts one local session, shows the guide, and hides the camera', async ({page}) => {
  const remote: string[] = [];
  page.on('request', request => {
    const url = request.url();
    if (!/^(http:\/\/127\.0\.0\.1|http:\/\/localhost|blob:|data:)/.test(url)) remote.push(url);
  });
  await page.goto(`/${TEST}`);
  await ready(page);
  await enableHandControls(page);
  const guide = guideOf(page);
  await expect(guide).toBeVisible();
  await expect(guide).toContainText('Getting ready');
  await expect(guide).toContainText('Camera on', {timeout: 60000});
  // Exactly one processing element, and it is never visible.
  await expect(page.locator('video')).toHaveCount(1);
  expect(await page.locator('video').evaluate(el => el.getBoundingClientRect().width <= 4)).toBe(true);
  await expect(guide).toContainText('No video is recorded or uploaded');
  expect(remote).toEqual([]);

  await page.evaluate(() => {
    window.__tracks = (document.querySelector('video') as HTMLVideoElement).srcObject as MediaStream ? ((document.querySelector('video') as HTMLVideoElement).srcObject as MediaStream).getTracks() : [];
  });
  await box(page).uncheck();
  expect(await page.evaluate(() => window.__tracks!.every(t => t.readyState === 'ended'))).toBe(true);
  await expect(guideOf(page)).toHaveCount(0);
});

test('a denied camera restores the checkbox and leaves the site usable', async ({page}) => {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      throw new DOMException('Denied', 'NotAllowedError');
    };
  });
  await page.goto(`/${TEST}`);
  await ready(page);
  await enableHandControls(page);
  const guide = guideOf(page);
  await expect(guide).toContainText('Camera access was blocked', {timeout: 60000});
  await expect(box(page)).not.toBeChecked();
  expect(await page.evaluate(() => (document.querySelector('video') as HTMLVideoElement | null)?.srcObject ?? null)).toBeNull();
  await guide.getByRole('button', {name: 'Not now'}).click();
  await page.getByRole('navigation', {name: 'Main navigation'}).getByRole('link', {name: 'Projects', exact: true}).click();
  await expect(page).toHaveURL(/\/projects$/);
});

test('cancelling a pending permission stops a stream that arrives afterwards', async ({page}) => {
  await page.addInitScript(() => {
    const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async constraints => {
      const stream = await original(constraints);
      (window as unknown as {__lateStream: MediaStream}).__lateStream = stream;
      await new Promise<void>(resolve => {
        (window as unknown as {__release: () => void}).__release = resolve;
      });
      return stream;
    };
  });
  await page.goto(`/${TEST}`);
  await ready(page);
  await enableHandControls(page);
  await expect
    .poll(() => page.evaluate(() => !!(window as unknown as {__release?: () => void}).__release), {timeout: 60000})
    .toBe(true);
  await box(page).uncheck();
  await page.evaluate(() => (window as unknown as {__release: () => void}).__release());
  await expect
    .poll(() =>
      page.evaluate(() => (window as unknown as {__lateStream: MediaStream}).__lateStream.getTracks().every(t => t.readyState === 'ended')),
    )
    .toBe(true);
});

test('gestures reach real navigation, scroll the page, and stop at neutral', async ({page}) => {
  await page.goto(`/${TEST}`);
  await ready(page);
  await enableHandControls(page);
  await expect(guideOf(page)).toContainText('Camera on', {timeout: 60000});

  const scroll = (displacement: number) =>
    page.evaluate(async d => {
      for (let i = 0; i < 14; i++) {
        window.__gestureTest.event({
          type: 'scroll',
          point: {x: 0.5, y: 0.6},
          anchor: {x: 0.5, y: 0.6},
          origin: {x: 0.5, y: 0.5},
          displacement: d,
          dt: 0.04,
        });
        await new Promise(resolve => setTimeout(resolve, 40));
      }
      await new Promise(resolve => setTimeout(resolve, 120));
      return document.scrollingElement!.scrollTop;
    }, displacement);

  const down = await scroll(0.2);
  expect(down).toBeGreaterThan(100);
  // Returning to neutral stops immediately rather than gliding on.
  const neutral = await scroll(0);
  expect(Math.abs(neutral - down)).toBeLessThan(2);
  expect(await scroll(-0.2)).toBeLessThan(down);
  await page.evaluate(() => window.__gestureTest.event({type: 'scrollend'}));
  // Gesture scrolling must not leave the site's smooth anchor scrolling disabled.
  expect(await page.evaluate(() => document.documentElement.style.scrollBehavior)).toBe('');

  await page.evaluate(() => scrollTo(0, 0));
  await pinchAt(page, await centre(page, 'header nav a[href="/projects"]'));
  await expect(page).toHaveURL(/\/projects$/, {timeout: 10000});
  // The session survives client route changes without a second prompt or a
  // second camera, and nothing is duplicated on the way through.
  for (const [href, url] of [
    ['/blogs', /\/blogs$/],
    ['/paint', /\/paint$/],
    ['/about', /\/about$/],
  ] as const) {
    await page.getByRole('navigation', {name: 'Main navigation'}).locator(`a[href="${href}"]`).click();
    await expect(page).toHaveURL(url);
    await expect(page.locator('video')).toHaveCount(1);
  }
  await expect(box(page)).toBeChecked();
  await expect(guideOf(page)).toContainText('Camera on');
});

test('gestures never activate anything outside a registered scope', async ({page}) => {
  await page.goto(`/${TEST}`);
  await ready(page);
  await enableHandControls(page);
  await expect(guideOf(page)).toContainText('Camera on', {timeout: 60000});
  const before = page.url();
  await pinchAt(page, {x: 700, y: 400});
  await page.waitForTimeout(300);
  expect(page.url()).toBe(before);
});

test('releasing over a different control never fires the first one', async ({page}) => {
  await page.goto(`/paint${TEST}`);
  await ready(page, true);
  const pine = await centre(page, 'button[aria-label="Pine"], button:has-text("Pine")');
  const rose = await centre(page, 'button:has-text("Rose")');
  await page.evaluate(
    ({a, b}) => {
      const p = (q: {x: number; y: number}) => ({x: q.x / innerWidth, y: q.y / innerHeight});
      window.__gestureTest.event({type: 'pointer', point: p(a), pose: 'point', selecting: true});
      window.__gestureTest.event({type: 'down', point: p(a)});
      window.__gestureTest.event({type: 'up', point: p(b)});
    },
    {a: pine, b: rose},
  );
  await expect(page.getByRole('heading', {level: 2, name: /Colour/})).toContainText('Pine');
});

test('paint draws by mouse, erases, undoes, and exports artwork only', async ({page}) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`/paint${TEST}`);
  await ready(page, true);
  await expect(page.getByRole('heading', {name: 'Paint in the air'})).toBeVisible();
  await expect(page.getByRole('button', {name: 'Enable hand painting'})).toBeVisible();

  const canvas = page.locator('canvas[aria-label="Drawing canvas"]');
  // Read the box each time: choosing a tool can scroll the page.
  const stroke = async () => {
    const area = (await canvas.boundingBox())!;
    await page.mouse.move(area.x + area.width * 0.25, area.y + area.height * 0.45);
    await page.mouse.down();
    await page.mouse.move(area.x + area.width * 0.6, area.y + area.height * 0.6, {steps: 14});
    await page.mouse.up();
  };
  await stroke();
  await expect.poll(() => page.evaluate(() => window.__paintTest.art.current!.strokes.length)).toBe(1);

  // The eraser keeps its own size, and undo brings the ink back.
  await page.getByRole('button', {name: 'Erase', exact: true}).click();
  await expect(page.getByRole('heading', {level: 2, name: 'Eraser size'})).toBeVisible();
  await stroke();
  await expect.poll(() => page.evaluate(() => window.__paintTest.art.current!.strokes.length)).toBe(2);
  const alpha = () =>
    page.evaluate(() => {
      const art = window.__paintTest.art.current as unknown as {strokes: {points: {x: number; y: number}[]}[]; ctx: CanvasRenderingContext2D};
      const point = art.strokes[0].points[6];
      return art.ctx.getImageData(Math.round(point.x), Math.round(point.y), 1, 1).data[3];
    });
  expect(await alpha()).toBe(0);
  await page.getByRole('button', {name: 'Undo', exact: true}).click();
  expect(await alpha()).toBeGreaterThan(0);
  await page.getByRole('button', {name: 'Draw', exact: true}).click();
  await expect(page.getByRole('heading', {level: 2, name: 'Brush size'})).toBeVisible();

  // Clearing always asks first.
  await page.getByRole('button', {name: 'Clear', exact: true}).click();
  await page.getByRole('button', {name: 'Keep drawing'}).click();
  await expect.poll(() => page.evaluate(() => window.__paintTest.art.current!.strokes.length)).toBe(1);

  const exported = await page.evaluate(async () => {
    const art = window.__paintTest.art.current as unknown as {blob(t: boolean): Promise<Blob>};
    const blob = await art.blob(true);
    const bitmap = await createImageBitmap(blob);
    return {type: blob.type, width: bitmap.width, height: bitmap.height};
  });
  expect(exported).toMatchObject({type: 'image/png', width: 1600, height: 1000});

  const download = page.waitForEvent('download');
  await page.getByRole('button', {name: 'Download PNG'}).click();
  expect((await download).suggestedFilename()).toMatch(/air-drawing.*\.png/);
  expect(errors).toEqual([]);
});

test('sheet tools respond to dwell, and clearing never does', async ({page}) => {
  await page.goto(`/paint${TEST}`);
  await ready(page, true);
  const canvas = page.locator('canvas[aria-label="Drawing canvas"]');
  const area = (await canvas.boundingBox())!;
  await page.mouse.move(area.x + 60, area.y + 60);
  await page.waitForTimeout(50);
  await page.mouse.down();
  await page.mouse.move(area.x + 200, area.y + 160, {steps: 8});
  await page.mouse.up();
  await page.waitForTimeout(800);

  // Open palm brings the tools within reach of the hand.
  await page.evaluate(() => window.__gestureTest.event({type: 'menu'}));
  const sheet = page.getByRole('group', {name: 'Drawing tools'});
  await expect(sheet).toBeVisible();
  const inSheet = (name: string) => centre(page, `[data-gesture-sheet] button:has-text("${name}")`);

  await dwellAt(page, await inSheet('Rose'));
  await expect(page.getByRole('heading', {level: 2, name: /Colour/}).first()).toContainText('Rose');
  await dwellAt(page, await inSheet('Neon'));
  await expect(sheet.locator('button:has-text("Neon")')).toHaveAttribute('aria-pressed', 'true');

  // One sustained hold activates once: staying put must not flip Erase back.
  await dwellAt(page, await inSheet('Erase'));
  await expect(sheet.getByRole('button', {name: 'Draw', exact: true})).toBeVisible();
  await dwellAt(page, await inSheet('Draw'));
  await expect(sheet.getByRole('button', {name: 'Draw', exact: true})).toBeVisible();

  await dwellAt(page, await inSheet('Clear'));
  await expect(sheet.getByRole('button', {name: 'Clear it'})).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.__paintTest.art.current!.strokes.length)).toBe(1);
});

test('an open palm opens paint tools, and a fist closes them', async ({page}) => {
  await page.goto(`/paint${TEST}`);
  await ready(page, true);
  await page.evaluate(() => window.__gestureTest.event({type: 'menu'}));
  const sheet = page.getByRole('group', {name: 'Drawing tools'});
  await expect(sheet).toBeVisible();
  await page.evaluate(() => window.__gestureTest.event({type: 'cancel', reason: 'fist'}));
  await expect(sheet).toHaveCount(0);
});

test('losing tracking never joins two strokes into one', async ({page}) => {
  await page.goto(`/paint${TEST}`);
  await ready(page, true);
  await page.evaluate(() => {
    const box = document.querySelector('canvas[aria-label="Drawing canvas"]')!.getBoundingClientRect();
    const engine = window.__gestureTest.engine.current!;
    let time = 0;
    const sample = (pinched: boolean, x = 0.4) => {
      time += 60;
      engine.update(
        {
          point: {x: (box.x + box.width * x) / innerWidth, y: (box.y + box.height * 0.5) / innerHeight},
          pose: 'point',
          pinchRatio: pinched ? 0.1 : 0.9,
        },
        time,
      );
    };
    for (let i = 0; i < 5; i++) sample(false);
    sample(true);
    sample(true, 0.6);
    engine.update(null, (time += 60));
    sample(true, 0.7);
  });
  await expect.poll(() => page.evaluate(() => window.__paintTest.art.current!.strokes.length)).toBe(1);
});

test('the guide keeps the site keyboard accessible and never traps focus', async ({page}) => {
  await page.goto(`/${TEST}`);
  await ready(page);
  await enableHandControls(page);
  const guide = guideOf(page);
  await expect(guide).toBeVisible();
  await expect(guide).not.toHaveAttribute('role', 'dialog');
  await guide.getByRole('button', {name: 'Minimize'}).click();
  await expect(guide).toContainText('Turn off');
  await expect(guide).not.toContainText('Open palm');
  await guide.getByRole('button', {name: 'Help'}).click();
  await expect(guide).toContainText('Open palm');
  await page.getByRole('navigation', {name: 'Main navigation'}).getByRole('link', {name: 'About', exact: true}).click();
  await expect(page).toHaveURL(/\/about$/);
  await expect(guideOf(page)).toBeVisible();
});

test('a noisy pinch with dropouts still draws one continuous stroke', async ({page}) => {
  await page.goto(`/paint${TEST}`);
  await ready(page, true);
  const area = (await page.locator('canvas[aria-label="Drawing canvas"]').boundingBox())!;

  const result = await page.evaluate(
    async box => {
      const wait = () => new Promise(resolve => setTimeout(resolve, 45));
      // Landmarks for a pointing hand, placed so the fingertip lands where we want.
      const handAt = (viewX: number, viewY: number, pinchGap: number) => {
        const nx = viewX / innerWidth;
        const ny = viewY / innerHeight;
        const ix = 1 - 0.12 - 0.76 * nx;
        const iy = 0.1 + 0.76 * ny;
        const lm = Array.from({length: 21}, () => ({x: ix, y: iy + 0.3}));
        lm[0] = {x: ix, y: iy + 0.45};
        lm[5] = {x: ix - 0.08, y: iy + 0.3};
        lm[17] = {x: ix + 0.08, y: iy + 0.3};
        lm[6] = {x: ix, y: iy + 0.12};
        lm[8] = {x: ix, y: iy};
        [12, 16, 20].forEach(tip => {
          lm[tip - 2] = {x: ix, y: iy + 0.14};
          lm[tip] = {x: ix, y: iy + 0.2};
        });
        lm[4] = {x: ix + pinchGap, y: iy};
        return lm;
      };
      const send = (viewX: number, viewY: number, gap: number, label: string) =>
        window.__gestureTest.receiveHands({landmarks: [handAt(viewX, viewY, gap)], handedness: [[{categoryName: label}]], aspect: 4 / 3});
      const nothing = () => window.__gestureTest.receiveHands({landmarks: [], handedness: [], aspect: 4 / 3});

      const y = box.y + box.height * 0.5;
      const left = box.x + box.width * 0.2;
      const step = (box.width * 0.6) / 18;
      // An open hand, so the engine arms.
      for (let i = 0; i < 10; i++) {
        send(left, y, 0.13, 'Right');
        await wait();
      }
      for (let i = 0; i < 18; i++) {
        // A light pinch that wobbles, a two-frame dropout, and a flipped label.
        const gap = i % 5 === 0 ? 0.03 : 0.018;
        if (i === 6 || i === 7) nothing();
        else send(left + step * i, y, gap, i % 3 === 0 ? 'Left' : 'Right');
        await wait();
      }
      const during = window.__paintTest.art.current!.strokes.length;
      for (let i = 0; i < 4; i++) {
        send(left + step * 18, y, 0.13, 'Right');
        await wait();
      }
      return {during, after: window.__paintTest.art.current!.strokes.length};
    },
    area,
  );

  // Nothing committed while the pinch was held, and exactly one stroke after it.
  expect(result.during).toBe(0);
  expect(result.after).toBe(1);
  const stroke = await page.evaluate(() => {
    const s = window.__paintTest.art.current!.strokes[0] as unknown as {points: {x: number}[]};
    return {points: s.points.length, span: s.points.at(-1)!.x - s.points[0].x};
  });
  expect(stroke.points).toBeGreaterThan(6);
  expect(stroke.span).toBeGreaterThan(300);
});

test('a real absence still ends the stroke and needs a fresh pinch', async ({page}) => {
  await page.goto(`/paint${TEST}`);
  await ready(page, true);
  await page.evaluate(async () => {
    const wait = () => new Promise(resolve => setTimeout(resolve, 45));
    const engine = window.__gestureTest.engine.current!;
    const box = document.querySelector('canvas[aria-label="Drawing canvas"]')!.getBoundingClientRect();
    const point = {x: (box.x + box.width / 2) / innerWidth, y: (box.y + box.height / 2) / innerHeight};
    const send = async (pinchRatio: number) => {
      engine.update({point, pose: 'point', pinchRatio}, performance.now());
      await wait();
    };
    for (let i = 0; i < 8; i++) await send(0.9);
    for (let i = 0; i < 4; i++) await send(0.12);
    window.__gestureTest.event({type: 'lost'});
    engine.update(null, performance.now());
    await wait();
    for (let i = 0; i < 3; i++) await send(0.12);
  });
  // The lost hand committed the first stroke; a still-closed hand starts nothing new.
  await expect.poll(() => page.evaluate(() => window.__paintTest.art.current!.strokes.length)).toBe(1);
});

test('the cursor moves into an open dialog and cannot reach the page behind it', async ({page}) => {
  await page.goto(`/${TEST}`);
  await ready(page);
  await enableHandControls(page);
  await expect(guideOf(page)).toContainText('Camera on', {timeout: 60000});

  // A native dialog sits in the browser top layer, like the photo lightbox.
  await page.evaluate(() => {
    const dialog = document.createElement('dialog');
    dialog.setAttribute('data-gesture-scope', '');
    dialog.style.cssText = 'width:420px;height:320px;padding:24px';
    dialog.innerHTML = '<button id="inside" style="width:200px;height:60px">Inside</button>';
    document.body.append(dialog);
    dialog.showModal();
  });

  const inside = await centre(page, '#inside');
  await page.evaluate(({x, y}) => {
    window.__gestureTest.event({type: 'pointer', point: {x: x / innerWidth, y: y / innerHeight}, pose: 'point', selecting: true});
  }, inside);
  const placement = await page.evaluate(() => {
    const dialog = document.querySelector('dialog[open]')!;
    return {inDialog: !!dialog.querySelector('[class*="cursor"]'), highlighted: document.querySelector('#inside')!.className};
  });
  expect(placement.inDialog).toBe(true);
  expect(placement.highlighted).toContain('hover');

  // A link behind the dialog stays untouchable.
  const before = page.url();
  await pinchAt(page, await centre(page, 'header nav a[href="/projects"]'));
  await page.waitForTimeout(300);
  expect(page.url()).toBe(before);

  // Closing puts the cursor back on the page.
  await page.evaluate(() => (document.querySelector('dialog[open]') as HTMLDialogElement).close());
  await page.evaluate(() => window.__gestureTest.event({type: 'pointer', point: {x: 0.5, y: 0.5}, pose: 'point', selecting: true}));
  expect(await page.evaluate(() => !!document.body.querySelector(':scope > [class*="cursor"]'))).toBe(true);
});

test('admin pages get no gesture controls and no camera permission', async ({page}) => {
  const response = await page.goto('/admin/login');
  expect(response!.headers()['permissions-policy']).toContain('camera=()');
  await expect(guideOf(page)).toHaveCount(0);
  await expect(page.getByRole('checkbox', {name: 'Hand controls'})).toHaveCount(0);
  await expect(page.locator('video')).toHaveCount(0);
});

test('the whole paper is reachable, and no ink lands outside it', async ({page}) => {
  await page.goto(`/paint${TEST}`);
  await ready(page, true);

  // The full range of the hand maps onto the paper, corners included.
  const corners = await page.evaluate(async () => {
    const box = document.querySelector('canvas[aria-label="Drawing canvas"]')!.getBoundingClientRect();
    const seen: {x: number; y: number}[] = [];
    for (const point of [
      {x: 0.5, y: 0.5},
      {x: 0.5, y: 0.98},
      {x: 0.98, y: 0.98},
      {x: 0.02, y: 0.02},
    ]) {
      // The cursor eases toward the mapped point, so let it settle before reading.
      for (let i = 0; i < 20; i++) {
        window.__gestureTest.event({type: 'pointer', point, pose: 'point', selecting: true});
        await new Promise(resolve => requestAnimationFrame(() => resolve(null)));
      }
      const cursor = document.querySelector('[class*="cursor"]') as HTMLElement;
      const shift = /translate\(([-\d.]+)px, ([-\d.]+)px\)/.exec(cursor.style.transform)!;
      seen.push({x: Number(shift[1]), y: Number(shift[2])});
    }
    return {box: {left: box.left, top: box.top, right: box.right, bottom: box.bottom}, seen};
  });
  // Middle of the reach is the middle of the paper.
  expect(corners.seen[0].y).toBeGreaterThan(corners.box.top);
  expect(corners.seen[0].y).toBeLessThan(corners.box.bottom);
  // The bottom of the reach clears the bottom of the paper — the reported bug.
  expect(corners.seen[1].y).toBeGreaterThan(corners.box.bottom - 8);
  expect(corners.seen[2].x).toBeGreaterThan(corners.box.right - 8);
  expect(corners.seen[3].y).toBeLessThan(corners.box.top + 8);

  // Drawing off the paper leaves nothing behind: no line along the edge.
  const strokes = await page.evaluate(async () => {
    const wait = () => new Promise(resolve => setTimeout(resolve, 45));
    const engine = window.__gestureTest.engine.current!;
    const send = async (x: number, y: number, pinchRatio: number) => {
      engine.update({point: {x, y}, pose: 'point', pinchRatio}, performance.now());
      await wait();
    };
    for (let i = 0; i < 8; i++) await send(0.3, 0.5, 0.9);
    for (let i = 0; i < 5; i++) await send(0.3 + i * 0.04, 0.5, 0.12);
    // Off the bottom of the reach, well past the paper, still pinched.
    for (let i = 0; i < 8; i++) await send(0.5 + i * 0.06, 1, 0.12);
    for (let i = 0; i < 4; i++) await send(0.9, 1, 0.95);
    const art = window.__paintTest.art.current as unknown as {strokes: {points: {x: number; y: number}[]}[]};
    return art.strokes.map(stroke => ({
      points: stroke.points.length,
      maxY: Math.max(...stroke.points.map(point => point.y)),
      spanX: Math.max(...stroke.points.map(point => point.x)) - Math.min(...stroke.points.map(point => point.x)),
    }));
  });
  // Whatever was drawn stayed on the paper, and nothing raced along the edge.
  for (const stroke of strokes) {
    expect(stroke.maxY).toBeLessThanOrEqual(1000);
    expect(stroke.spanX).toBeLessThan(1400);
  }
});

test('the tool sheet carries every control, including clearing and night paper', async ({page}) => {
  await page.goto(`/paint${TEST}`);
  await ready(page, true);
  const canvas = page.locator('canvas[aria-label="Drawing canvas"]');
  const area = (await canvas.boundingBox())!;
  await page.mouse.move(area.x + 60, area.y + 60);
  await page.mouse.down();
  await page.mouse.move(area.x + 240, area.y + 180, {steps: 8});
  await page.mouse.up();

  await page.evaluate(() => window.__gestureTest.event({type: 'menu'}));
  const sheet = page.getByRole('group', {name: 'Drawing tools'});
  await expect(sheet).toBeVisible();
  for (const name of ['Erase', 'Undo', 'Zoom in', 'Zoom out', 'Night paper', 'Clear', 'Turn off hand painting']) {
    await expect(sheet.getByRole('button', {name, exact: true})).toBeVisible();
  }

  await sheet.getByRole('button', {name: 'Night paper', exact: true}).click();
  await expect(sheet.getByRole('button', {name: 'White paper', exact: true})).toBeVisible();

  // Clearing from the sheet still asks first.
  await sheet.getByRole('button', {name: 'Clear', exact: true}).click();
  await expect(sheet.getByRole('button', {name: 'Keep drawing'})).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__paintTest.art.current!.strokes.length)).toBe(1);
  await sheet.getByRole('button', {name: 'Clear it'}).click();
  await expect.poll(() => page.evaluate(() => window.__paintTest.art.current!.strokes.length)).toBe(0);
});

test('an open sheet takes over the reach so its controls are easy to hit', async ({page}) => {
  await page.goto(`/paint${TEST}`);
  await ready(page, true);
  await page.evaluate(() => window.__gestureTest.event({type: 'menu'}));
  await expect(page.getByRole('group', {name: 'Drawing tools'})).toBeVisible();
  const inside = await page.evaluate(() => {
    const panel = document.querySelector('[data-gesture-sheet]')!.getBoundingClientRect();
    window.__gestureTest.event({type: 'pointer', point: {x: 0.5, y: 0.5}, pose: 'point', selecting: true});
    const cursor = document.querySelector('[class*="cursor"]') as HTMLElement;
    const shift = /translate\(([-\d.]+)px, ([-\d.]+)px\)/.exec(cursor.style.transform)!;
    const x = Number(shift[1]);
    const y = Number(shift[2]);
    return x > panel.left && x < panel.right && y > panel.top && y < panel.bottom;
  });
  expect(inside).toBe(true);
});

test('paint stays inside the viewport on a phone', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await page.goto('/paint');
  await expect(page.locator('canvas[aria-label="Drawing canvas"]')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
