import { test, expect } from '@playwright/test';

test.use({ deviceScaleFactor: 3, isMobile: true, hasTouch: true });
for (const width of [320, 390, 430]) test(`mobile lettering reuses sprites without redrawing SVG at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 844 });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.addStyleTag({ content: 'html{scroll-behavior:auto!important}' });
  await expect(page.locator('.brand-bitmap-wordmark')).toHaveCount(1);
  await expect.poll(() => page.locator('.brand-bitmap-wordmark img').evaluateAll(images => images.length===20 && images.every(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth>0 && (image as HTMLImageElement).naturalWidth<=256))).toBe(true);
  const metrics = await page.evaluate(async () => {
    const next = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    const story = document.querySelector<HTMLElement>('.brand-story')!, stage = document.querySelector<HTMLElement>('.brand-stage')!;
    const top = story.getBoundingClientRect().top + scrollY, travel = story.offsetHeight-stage.offsetHeight;
    scrollTo(0,top+travel*.43); await next(); await next(); await next();
    let svgWrites = 0, canvasDraws = 0;
    const original = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function(...args: Parameters<typeof original>) { canvasDraws++; return original.apply(this,args); };
    const observer = new MutationObserver(records => { svgWrites += records.length; });
    observer.observe(document.querySelector('.brand-wordmark')!,{subtree:true,attributes:true});
    const first = document.querySelector('.brand-bitmap-wordmark');
    for(let i=0;i<36;i++) {scrollTo(0,top+travel*(.43+i/35*.55)); await next();}
    await next(); await next(); observer.disconnect(); CanvasRenderingContext2D.prototype.drawImage=original;
    return {svgWrites,canvasDraws,sameBitmap:first===document.querySelector('.brand-bitmap-wordmark')};
  });
  expect(metrics).toEqual({svgWrites:0,canvasDraws:0,sameBitmap:true});
  await expect(page.locator('.brand-wordmark')).toHaveCSS('visibility','hidden');
  await expect(page.locator('.brand-bitmap-fill').last()).toHaveCSS('opacity','1');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:test.info().outputPath(`mobile-brand-${width}.png`)});
  await page.evaluate(()=>{(window as any).preparedBrand=document.querySelector('.brand-bitmap-wordmark');});
  await page.setViewportSize({width,height:740});
  await page.evaluate(async()=>{for(let i=0;i<4;i++)await new Promise(requestAnimationFrame);});
  expect(await page.evaluate(()=>(window as any).preparedBrand===document.querySelector('.brand-bitmap-wordmark'))).toBe(true);
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect(page.locator('.brand-wordmark')).toHaveCSS('visibility','visible');
  await expect(page.locator('.brand-letter-fill').last()).toHaveCSS('opacity','1');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await expect(page.locator('.brand-bitmap-wordmark')).toBeVisible();
  expect(errors).toEqual([]);
});
