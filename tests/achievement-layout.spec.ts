import { test, expect } from '@playwright/test';

for (const width of [320, 390, 768, 1024, 1440]) {
  test(`achievement text and animation have separate readable regions at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const section = page.locator('.achievement');
    const showcase = section.locator('.achievement-showcase');
    const copy = section.locator('.achievement-copy');
    for (const block of await section.locator('.reveal').all()) {
      await block.scrollIntoViewIfNeeded();
      await expect(block).toHaveCSS('opacity', '1');
    }
    await expect(copy).toHaveCSS('text-align', 'left');
    await expect(copy.locator('.body-copy')).toHaveCount(2);
    await expect(copy.locator('h3')).toHaveText(['季節限定のお楽しみも。', '集中度は、振り返りの目安。']);
    const visualBox = await showcase.boundingBox();
    const textBox = await copy.boundingBox();
    expect(visualBox).not.toBeNull();
    expect(textBox).not.toBeNull();
    if (width > 900) {
      expect(textBox!.x).toBeGreaterThanOrEqual(visualBox!.x + visualBox!.width + 30);
    } else {
      expect(textBox!.y).toBeGreaterThanOrEqual(visualBox!.y + visualBox!.height + 28);
    }
    expect(textBox!.width).toBeLessThanOrEqual(640);
    for (const paragraph of await copy.locator('p').all()) {
      expect(await paragraph.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
      expect(await paragraph.evaluate(node => parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(15);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const link = copy.getByRole('link', { name: 'スコアと環境音チェックについて' });
    await expect(link).toHaveAttribute('href', '#focus-score');
    await section.screenshot({ path: `test-results/achievement-after-${width}.png`, style: '.site-header,.header-accent,.skip{visibility:hidden!important}' });
  });
}

for (const width of [390, 1440]) {
  test(`achievement words stay inside their panel and can pause at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    const section = page.locator('.achievement');
    const visual = section.locator('.achievement-showcase');
    const type = section.locator('.achievement-type');
    await type.scrollIntoViewIfNeeded();
    await expect(type).toHaveClass(/is-playing/);
    const pause = section.getByRole('button', { name: '演出を一時停止' });
    await pause.click();
    await expect(type).not.toHaveClass(/is-playing/);
    // The extremes of the word rotation must leave room inside the panel.
    for (let i = 0; i < 4; i++) {
      await page.locator('.achievement-word').evaluateAll((nodes, active) => nodes.forEach((node, index) => node.classList.toggle('is-active', index === active)), i);
      await page.waitForTimeout(700);
      const word = await section.locator('.achievement-word.is-active').boundingBox();
      const panel = await visual.boundingBox();
      expect(word!.x).toBeGreaterThanOrEqual(panel!.x + 5);
      expect(word!.x + word!.width).toBeLessThanOrEqual(panel!.x + panel!.width - 5);
      expect(word!.y).toBeGreaterThanOrEqual(panel!.y + 5);
      expect(word!.y + word!.height).toBeLessThanOrEqual(panel!.y + panel!.height - 5);
    }
    await section.getByRole('button', { name: '演出を再開' }).click();
    await expect(type).toHaveClass(/is-playing/);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(type).not.toHaveClass(/is-playing/);
    await expect(section.locator('.achievement-motion-toggle')).toBeHidden();
  });
}

test('achievement description remains readable without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 1000 } });
  try {
    const page = await context.newPage();
    await page.goto('/');
    const copy = page.locator('.achievement-copy');
    await expect(copy).toContainText('毎回違う達成の瞬間');
    await expect(copy.locator('.body-copy').first()).toHaveCSS('text-align', 'left');
    await expect(page.locator('.achievement-word.is-active')).toHaveCSS('opacity', '1');
    await expect(page.locator('.achievement-motion-toggle')).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  } finally { await context.close(); }
});
