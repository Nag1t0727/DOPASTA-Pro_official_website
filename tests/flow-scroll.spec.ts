import { test, expect } from '@playwright/test';

for (const width of [320, 390, 768, 1440]) test(`flowstate scroll scene is reversible, bounded and interactive at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 844 });
  await page.goto('/');
  await page.addStyleTag({ content: 'html{scroll-behavior:auto!important}' });
  await page.evaluate(() => document.fonts.ready);
  await expect.poll(() => page.locator('img').evaluateAll(images => images.every(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
  const track = page.locator('.flowstate-track'), stage = page.locator('.flowstate-stage');
  await expect(stage).toHaveCSS('position', 'sticky');
  const seek = async (progress: number) => {
    await track.evaluate((node, progress) => {
      const stage = node.querySelector('.flowstate-stage') as HTMLElement;
      scrollTo(0, node.getBoundingClientRect().top + scrollY + (node.clientHeight - stage.clientHeight) * progress);
    }, progress);
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  };
  await seek(.12);
  const first = await stage.getAttribute('style');
  await page.screenshot({ path: `test-results/flow-enter-${width}.png` });
  await seek(.52);
  const middle = await stage.getAttribute('style');
  expect(middle).not.toBe(first);
  await expect(page.locator('.flowstate-copy')).toHaveCSS('opacity', '0');
  const box = await stage.boundingBox();
  expect(Math.abs(box!.y)).toBeLessThan(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `test-results/flow-focus-${width}.png` });
  await seek(.12); expect(await stage.getAttribute('style')).toBe(first);
  await seek(.52); expect(await stage.getAttribute('style')).toBe(middle);
  // Instrument only scrolling; geometry is measured once before this window.
  const reads = await page.evaluate(async () => {
    const next = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    let reads = 0;
    const offset = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetTop')!;
    const rect = Element.prototype.getBoundingClientRect, computed = window.getComputedStyle;
    Object.defineProperty(HTMLElement.prototype, 'offsetTop', { ...offset, get() { reads++; return offset.get!.call(this); } });
    Element.prototype.getBoundingClientRect = function () { reads++; return rect.call(this); };
    window.getComputedStyle = (...args) => { reads++; return computed(...args); };
    const start = scrollY;
    for (let i = 1; i <= 18; i++) { scrollTo(0, start + i * 6); await next(); }
    await next();
    Object.defineProperty(HTMLElement.prototype, 'offsetTop', offset);
    Element.prototype.getBoundingClientRect = rect; window.getComputedStyle = computed;
    return reads;
  });
  expect(reads).toBe(0);
  await seek(.99);
  await page.screenshot({ path: `test-results/flow-settle-${width}.png` });
  const trigger = page.getByRole('button', { name: 'flowstate MODEを体験' });
  await trigger.click(); await expect(page.locator('.flow-demo')).toBeVisible();
  await page.keyboard.press('Escape'); await expect(trigger).toBeFocused();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(stage).toHaveCSS('position', 'static');
  await expect(page.locator('.flowstate-orbit')).toHaveCSS('transform', 'none');
  await expect(page.locator('.flowstate-copy')).toHaveCSS('opacity', '1');
  await expect(page.locator('.flowstate-ambient')).toBeHidden();
});

test('short screens keep flowstate content and controls in normal document flow', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto('/');
  await expect(page.locator('.flowstate-stage')).toHaveCSS('position', 'static');
  const trigger = page.getByRole('button', { name: 'flowstate MODEを体験' });
  await trigger.click(); await expect(page.locator('.flow-demo')).toBeVisible();
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
