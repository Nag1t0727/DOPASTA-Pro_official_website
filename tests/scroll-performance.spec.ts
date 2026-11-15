import { test, expect } from '@playwright/test';

for (const width of [320, 390, 1440]) test(`cached scrolling preserves the brand drawing at ${width}px`, async ({ page, context }) => {
  await page.setViewportSize({ width, height: 844 });
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.goto('/');
  await page.addStyleTag({ content: 'html{scroll-behavior:auto!important}' });
  const metrics = await page.evaluate(async () => {
    await document.fonts.ready;
    const next = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    const story = document.querySelector('.brand-story') as HTMLElement, stage = document.querySelector('.brand-stage') as HTMLElement;
    const top = story.getBoundingClientRect().top + scrollY, travel = story.offsetHeight - stage.offsetHeight;
    scrollTo(0, top + travel * .47); await next(); await next(); await next();
    let reads = 0;
    const computed = window.getComputedStyle;
    window.getComputedStyle = (...args) => { if (args[0].matches('.reveal')) reads++; return computed(...args); };
    const offset = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetTop')!;
    Object.defineProperty(HTMLElement.prototype, 'offsetTop', { ...offset, get() { reads++; return offset.get!.call(this); } });
    for (let i = 1; i <= 24; i++) { scrollTo(0, top + travel * (.47 + .36 * i / 24)); await next(); }
    await next(); await next();
    window.getComputedStyle = computed; Object.defineProperty(HTMLElement.prototype, 'offsetTop', offset);
    scrollTo(0, top + travel * .98); await next(); await next();
    return { reads, finalLeft: (document.querySelector('.brand-symbol') as HTMLElement).style.left, viewportWidth: document.documentElement.scrollWidth };
  });
  expect(metrics.reads).toBe(0); expect(metrics.finalLeft).toBe(''); expect(metrics.viewportWidth).toBeLessThanOrEqual(width);
  await expect(page.locator('.brand-letter-fill').last()).toHaveCSS('opacity', '1');
  await page.screenshot({ path: test.info().outputPath(`brand-final-${width}.png`) });
  if (width < 760) { await expect(page.locator('.brand-symbol')).toHaveCSS('filter', 'none'); await expect(page.locator('.brand-aura')).toHaveCSS('filter', 'none'); }
  const idleMutations = await page.evaluate(async () => {
    const next = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    const story = document.querySelector('.brand-story') as HTMLElement;
    const start = story.getBoundingClientRect().top + scrollY + story.offsetHeight + 100;
    scrollTo(0, start); await next(); await next(); await next();
    let changes = 0;
    const observer = new MutationObserver(records => { changes += records.length; });
    observer.observe(story, { subtree: true, attributes: true, attributeFilter: ['style', 'class'] });
    for (let i = 1; i <= 12; i++) { scrollTo(0, start + i * 20); await next(); }
    await next(); await next(); observer.disconnect(); return changes;
  });
  expect(idleMutations).toBe(0);
  await page.emulateMedia({ reducedMotion: 'reduce' }); await expect(page.locator('.brand-letter-fill').last()).toHaveCSS('opacity', '1');
  await page.emulateMedia({ reducedMotion: 'no-preference' }); await page.setViewportSize({ width: width < 760 ? 430 : 1100, height: 900 });
  await page.evaluate(() => { const story = document.querySelector('.brand-story') as HTMLElement, stage = document.querySelector('.brand-stage') as HTMLElement; scrollTo(0, story.getBoundingClientRect().top + scrollY + (story.offsetHeight - stage.offsetHeight) * .98); });
  await expect(page.locator('.brand-letter-fill').last()).toHaveCSS('opacity', '1');
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }); await cdp.detach();
});
