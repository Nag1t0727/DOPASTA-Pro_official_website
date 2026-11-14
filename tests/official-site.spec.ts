import { test, expect } from '@playwright/test';

for (const width of [320, 390, 1440]) {
  test(`official site works at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page).toHaveTitle(/DOPASTA Pro/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const images = await page.locator('img').evaluateAll(nodes => nodes.every(node => (node as HTMLImageElement).complete && (node as HTMLImageElement).naturalWidth > 0));
    expect(images).toBe(true);
    await page.screenshot({ path: `test-results/official-${width}.png` });
    await page.getByRole('link', { name: 'クイズを体験する' }).click();
    await page.locator('[data-answer="false"]').first().click();
    await expect(page.locator('#quiz-feedback')).toContainText('もう一度');
    await page.locator('[data-answer="true"]').click();
    await expect(page.locator('#quiz-feedback')).toContainText('正解！');
    await expect(page.locator('.quiz-celebration')).toBeVisible();
    await expect(page.locator('.quiz-celebration')).toHaveClass(/show-result/);
    await expect(page.locator('.celebration-confetti i')).toHaveCount(80);
    await page.keyboard.press('Escape');
    await expect(page.locator('.quiz-celebration')).not.toBeVisible();
    await expect(page.locator('[data-answer="true"]')).toBeFocused();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.locator('[data-answer="true"]').click();
    await expect(page.locator('.celebration-confetti i')).toHaveCount(0);
    await page.locator('.celebration-done').click();
    await expect(page.locator('.sound-steps article')).toHaveCount(3);
    await page.getByText('学習データはどこに保存されますか？', { exact: true }).click();
    await expect(page.locator('details[open]')).toContainText('サーバーに保存');
    const target = page.locator('#connect .feature-copy');
    await target.scrollIntoViewIfNeeded();
    await expect(target).toHaveCSS('opacity', '1');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(page.locator('h1 .reveal').first()).toHaveCSS('opacity', '1');
  });
}

test('official content is accessible without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:5178/');
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('#features .statement')).toHaveCSS('opacity', '1');
  await context.close();
});


for (const width of [390, 1440]) {
  test(`scroll brand choreography and navigation at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await page.addStyleTag({ content: 'html{scroll-behavior:auto!important}' });
    const nav = await page.locator('.site-header nav').boundingBox();
    expect(nav).not.toBeNull();
    expect(Math.abs(nav!.x + nav!.width / 2 - width / 2)).toBeLessThan(2);
    const seek = async (progress: number) => {
      await page.evaluate(p => {
        const story = document.querySelector('.brand-story') as HTMLElement;
        const stage = document.querySelector('.brand-stage') as HTMLElement;
        window.scrollTo(0, story.getBoundingClientRect().top + scrollY + (story.offsetHeight - stage.offsetHeight) * p);
      }, progress);
      await expect.poll(() => page.locator('.site-header').getAttribute('class')).toContain('is-collapsed');
      await page.waitForTimeout(80);
    };
    await seek(.35);
    const symbol = await page.locator('.brand-symbol').boundingBox();
    expect(symbol!.width).toBeGreaterThan(0);
    await expect(page.locator('.brand-letter-fill').last()).toHaveCSS('opacity', '0');
    await seek(.97);
    await expect(page.locator('.brand-letter-fill').last()).toHaveCSS('opacity', '1');
    expect(await page.locator('.site-header').evaluate(e => e.getBoundingClientRect().bottom)).toBeLessThan(0);
    await expect(page.locator('.header-accent')).toHaveCSS('height', '4px');
    await seek(.68);
    const letter = page.locator('.brand-letter').nth(5);
    const midway = await letter.getAttribute('style');
    await seek(.3);
    await seek(.68);
    expect(await letter.getAttribute('style')).toBe(midway);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(page.locator('.brand-letter-fill').last()).toHaveCSS('opacity', '1');
    await page.evaluate(() => scrollTo(0, 0));
    await expect(page.locator('.site-header')).not.toHaveClass(/is-collapsed/);
    await page.locator('.site-header nav a[href="#faq"]').click();
    await expect.poll(() => page.locator('#faq').evaluate(e => Math.abs(e.getBoundingClientRect().top))).toBeLessThan(160);
  });
}
