import { test, expect } from '@playwright/test';

for (const width of [320, 390, 768, 1024, 1440]) {
  test(`official site works at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page).toHaveTitle(/DOPASTA Pro/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect.poll(() => page.locator('img').evaluateAll(nodes => nodes.every(node => (node as HTMLImageElement).complete && (node as HTMLImageElement).naturalWidth > 0))).toBe(true);
    await page.screenshot({ path: `test-results/official-${width}.png` });
    await page.getByRole('link', { name: '復習を体験する' }).click();
    await expect(page.locator('#review-demo-answer')).toBeHidden();
    await page.getByRole('button', { name: '答えを見る', exact: true }).click();
    await expect(page.locator('.review-demo-solution')).toHaveText('focus');
    await expect(page.locator('[data-review-grade]')).toHaveCount(4);
    await page.locator('[data-review-grade="5"]').click();
    await expect(page.locator('#quiz-feedback')).toContainText('6日後');
    await expect(page.locator('.quiz-celebration')).toBeVisible();
    await expect(page.locator('.quiz-celebration')).toHaveClass(/show-result/);
    await expect(page.locator('.celebration-confetti i')).toHaveCount(80);
    await page.keyboard.press('Escape');
    await expect(page.locator('.quiz-celebration')).not.toBeVisible();
    await expect(page.locator('[data-review-grade="5"]')).toBeFocused();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const [grade, interval] of [['4', '3日後'], ['3', '1日後'], ['2', '10分後']]) {
      await page.locator(`[data-review-grade="${grade}"]`).click();
      await expect(page.locator('#quiz-feedback')).toContainText(interval);
      await expect(page.locator('.celebration-confetti i')).toHaveCount(0);
      await page.locator('.celebration-done').click();
    }
    const storageBefore = await page.evaluate(() => JSON.stringify(localStorage));
    const openFlow = page.getByRole('button', { name: 'flowstate MODEを体験' });
    await openFlow.click();
    await expect(page.locator('.flow-demo')).toBeVisible();
    await expect(page.locator('.flow-demo .demo-dial strong')).toHaveText('12:34');
    await expect(page.locator('.flow-demo')).toHaveCSS('background-color', 'rgb(0, 0, 0)');
    await page.keyboard.press('Escape');
    await expect(page.locator('.flow-demo')).not.toBeVisible();
    await expect(openFlow).toBeFocused();
    await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
    await openFlow.click();
    await page.locator('.flow-demo-close').click();
    expect(await page.evaluate(() => JSON.stringify(localStorage))).toBe(storageBefore);
    await expect(page.locator('.presence-cards article')).toHaveCount(4);
    await expect(page.locator('#presence .status-preview')).toHaveText(['学習中', '一時停止中', 'オンライン', 'オフライン']);
    await expect(page.locator('#presence h2, #presence h3, #presence .eyebrow')).toHaveCount(0);
    await page.locator('#presence').screenshot({ path: `test-results/presence-${width}.png`, style: '.site-header,.header-accent,.skip{visibility:hidden!important}' });
    for (const section of ['materials', 'flowstate', 'presence', 'reports', 'community', 'notifications', 'how', 'faq']) {
      await page.locator(`#${section}`).scrollIntoViewIfNeeded();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    const headings = page.locator('#how .steps h3');
    await expect(headings).toHaveText(['アカウントをつくる', '教材を選んで、集中', '振り返って、記録']);
    expect(await page.locator('main > section').last().getAttribute('id')).toBe('faq');
    await expect(page.locator('#reports')).toContainText('学習時間 × 集中度');
    expect(await page.locator('[data-answer]').count()).toBe(0);
    const duplicateIds = await page.locator('[id]').evaluateAll(nodes => nodes.map(n => n.id).filter((id, i, ids) => ids.indexOf(id) !== i));
    expect(duplicateIds).toEqual([]);
    const brokenAnchors = await page.locator('a[href^="#"]').evaluateAll(nodes => nodes.map(n => n.getAttribute('href')!).filter(href => href.length > 1 && !document.getElementById(href.slice(1))));
    expect(brokenAnchors).toEqual([]);
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
  await expect(page.locator('#flowstate')).toContainText('flowstate MODE');
  await expect(page.locator('#recall')).toContainText('わかる・ぎりわかる・あやしい・わからない');
  await expect(page.locator('.flow-demo-open')).toBeHidden();
  await page.getByText('自分の教材や問題を登録できますか？', { exact: true }).click();
  await expect(page.locator('details[open]')).toContainText('2列CSV');
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
    await expect.poll(() => page.locator('.site-header').evaluate(e => e.getBoundingClientRect().bottom)).toBeLessThan(0);
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

for (const width of [320, 390, 1440]) {
  test(`app chart layout and arena views at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.locator('.team-bars, .report-demo-chart')).toHaveCount(0);
    await expect(page.locator('body')).not.toContainText('このページのグラフは説明用のサンプルです。');
    const panel = page.locator('#arena-preview-panel');
    const checkAxis = async () => {
      for (const index of [0, 1, 2]) {
        const rows = panel.locator('.network-ranks').nth(index);
        await expect(rows.locator('li')).toHaveCount(3);
        const bases = await rows.locator('.network-rank-track').evaluateAll(nodes => nodes.map(n => n.getBoundingClientRect().bottom));
        expect(Math.max(...bases) - Math.min(...bases)).toBeLessThan(1);
        for (const track of await rows.locator('.network-rank-track').all()) await expect(track).toHaveCSS('height', index === 2 ? '95px' : '180px');
      }
    };
    for (const label of ['チーム内対戦', 'チーム対抗戦', '全体']) {
      await page.getByRole('tab', { name: label, exact: true }).click();
      await expect(page.getByRole('tab', { name: label, exact: true })).toHaveAttribute('aria-selected', 'true');
      await expect(panel).toHaveAttribute('aria-label', `${label}のランキング`);
      await checkAxis();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await page.getByRole('tab', { name: '全体', exact: true }).press('ArrowLeft');
    await expect(page.getByRole('tab', { name: 'チーム対抗戦', exact: true })).toBeFocused();
    await panel.locator('.network-rank-label').first().evaluate(n => n.textContent = 'とても長い名前のチームを表示した場合でも同じ位置から棒を描画します');
    await checkAxis();
    await page.getByRole('tab', { name: 'チーム内対戦', exact: true }).click();
    await expect(page.locator('.report-column')).toHaveCount(7);
    await expect(page.locator('.report-chart-preview .report-big-total')).toHaveText('3時間45分0秒');
    const reportBases = await page.locator('.report-bar-track').evaluateAll(nodes => nodes.map(n => n.getBoundingClientRect().bottom));
    expect(Math.max(...reportBases) - Math.min(...reportBases)).toBeLessThan(1);
    const reportScroll = page.locator('.report-chart-scroll');
    if (width < 600) {
      expect(await reportScroll.evaluate(n => n.scrollWidth > n.clientWidth)).toBe(true);
      await reportScroll.evaluate(n => n.scrollLeft = n.scrollWidth);
      expect(await reportScroll.evaluate(n => n.scrollLeft)).toBeGreaterThan(0);
    }
    if (width === 390 || width === 1440) {
      await page.addStyleTag({ content: '.site-header,.header-accent,.skip{visibility:hidden!important}' });
      await page.locator('.arena-preview').screenshot({ path: `test-results/arena-${width}.png` });
      await reportScroll.evaluate(n => n.scrollLeft = 0);
      await page.locator('.report-visual').screenshot({ path: `test-results/report-${width}.png` });
    }
  });
}
