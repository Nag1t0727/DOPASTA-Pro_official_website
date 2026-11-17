import { test, expect } from '@playwright/test';

for (const width of [320, 390, 430, 1440]) test(`brand camera tracks the drawing and returns to the full logo at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 844 });
  await page.goto('/');
  await page.addStyleTag({ content: 'html{scroll-behavior:auto!important}' });
  await page.evaluate(() => document.fonts.ready);
  async function seek(progress: number) {
    return page.evaluate(async value => {
      const story = document.querySelector<HTMLElement>('.brand-story')!;
      const stage = document.querySelector<HTMLElement>('.brand-stage')!;
      scrollTo(0, story.getBoundingClientRect().top + scrollY + (story.offsetHeight - stage.offsetHeight) * value);
      for (let i = 0; i < 3; i++) await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      const camera = document.querySelector<HTMLElement>('.brand-composition')!;
      const transform = new DOMMatrixReadOnly(getComputedStyle(camera).transform);
      return { scale: transform.a * parseFloat(camera.style.width) / 100, x: transform.e, transform: camera.style.transform };
    }, progress);
  }
  await seek(.16);
  await expect(page.locator('.brand-symbol')).toHaveCSS('opacity', /0\.[78]/);
  const early = await seek(.44);
  const closeupWidth = (await page.locator('.brand-wordmark').boundingBox())!.width;
  await page.screenshot({ path: test.info().outputPath(`brand-closeup-left-${width}.png`) });
  const middle = await seek(.64);
  const late = await seek(.82);
  await page.screenshot({ path: test.info().outputPath(`brand-closeup-right-${width}.png`) });
  const final = await seek(.99);
  const finalWidth = (await page.locator('.brand-wordmark').boundingBox())!.width;
  if (width <= 760) {
    expect(early.scale).toBeCloseTo(3.6, 2);
    expect(middle.scale).toBeCloseTo(3.6, 2);
    expect(late.x).toBeLessThan(early.x - width);
    expect(closeupWidth / finalWidth).toBeCloseTo(3.6, 1);
  } else expect(early.scale).toBe(1);
  expect(final.scale).toBeCloseTo(1, 5); expect(final.x).toBe(0);
  await expect(page.locator('.brand-letter-fill').last()).toHaveCSS('opacity', '1');
  for (const selector of ['.brand-symbol', '.brand-wordmark']) {
    const box = (await page.locator(selector).boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(width);
  }
  await page.screenshot({ path: test.info().outputPath(`brand-pulled-back-${width}.png`) });
  await seek(.64); const reversed = await seek(.3); expect(reversed.scale).toBeLessThan(middle.scale + .001);
  expect((await seek(.64)).transform).toBe(middle.transform);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.brand-composition')).toHaveCSS('transform', 'none');
  await expect(page.locator('.brand-letter-fill').last()).toHaveCSS('opacity', '1');
});
