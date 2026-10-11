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
    await page.getByText('学習データはどこに保存されますか？', { exact: true }).click();
    await expect(page.locator('details[open]')).toContainText('端末間の同期は未対応');
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
