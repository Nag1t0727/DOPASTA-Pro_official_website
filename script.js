'use strict';
// Cache layout between actual size/content changes; scroll frames only read the scroll offset.
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const lightweightMotion = window.matchMedia('(max-width:760px), (pointer:coarse)');
const reveals = [...document.querySelectorAll('.reveal')];
const hero = document.querySelector('.hero');
const header = document.querySelector('.site-header');
const brandStory = document.querySelector('.brand-story');
const brandStage = document.querySelector('.brand-stage');
const brandSymbol = document.querySelector('.brand-symbol');
const brandComposition = document.querySelector('.brand-composition');
const mobileBrandMotion = window.matchMedia('(max-width:760px)');
const brandAura = document.querySelector('.brand-aura');
const brandCue = document.querySelector('.brand-scroll-cue');
const brandLetters = [...document.querySelectorAll('.brand-letter')];
const brandWordmark = document.querySelector('.brand-wordmark');
const flowSection = document.querySelector('.flowstate-feature');
const flowTrack = document.querySelector('.flowstate-track');
const flowStage = document.querySelector('.flowstate-stage');
const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const ease = value => value * value * (3 - 2 * value);
const styleValues = new WeakMap();
function style(element, property, value) {
  if (!element) return;
  let previous = styleValues.get(element);
  if (!previous) { previous = new Map(); styleValues.set(element, previous); }
  if (previous.get(property) === value) return;
  previous.set(property, value); element.style.setProperty(property, value);
}
let frame = 0, layoutDirty = true, viewportHeight = 1, viewportWidth = window.innerWidth, scrollRange = 1;
let storyTop = 0, storyTravel = 1, stageWidth = 1, lastStoryProgress = null;
let flowTop = 0, flowTravel = 1, flowWidth = 1, lastFlowProgress = null;
let revealLayout = [];
const letterDraws = brandLetters.map(() => null);
let bitmapWordmark = null, bitmapLetters = [], bitmapKey = '', bitmapPending = '', bitmapGeneration = 0;
const bitmapDraws = brandLetters.map(() => null);

// Prepare small, bounded PNG sprites once. Scroll frames never redraw SVG text on phones.
function imageReady(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image); image.onerror = reject; image.src = source;
  });
}
async function wordmarkSprite(width, outline, font) {
  const svg = brandWordmark.cloneNode(true);
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svg.setAttribute('width', String(width)); svg.setAttribute('height', String(Math.ceil(width * 190 / 1060)));
  svg.removeAttribute('class'); svg.removeAttribute('style');
  svg.setAttribute('style', `font-family:${font};font-weight:850;font-size:150px;letter-spacing:-5px`);
  svg.querySelectorAll('.brand-letter').forEach((letter, index) => {
    letter.removeAttribute('style'); letter.removeAttribute('class');
    letter.querySelectorAll('text').forEach(text => {
      const isOutline = text.classList.contains('brand-letter-outline');
      if (isOutline !== outline) { text.remove(); return; }
      text.removeAttribute('class'); text.removeAttribute('style');
      text.setAttribute('fill', outline ? 'none' : index < 4 ? '#f2f3f7' : 'url(#wordmark-gradient)');
      if (outline) { text.setAttribute('stroke', 'url(#wordmark-gradient)'); text.setAttribute('stroke-width', '1.4'); }
    });
  });
  const source = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(svg))}`;
  const image = await imageReady(source), canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = Math.ceil(width * 190 / 1060);
  const context = canvas.getContext('2d');
  if (!context) throw Error('Canvas unavailable');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const png = canvas.toDataURL('image/png');
  canvas.width = 1; canvas.height = 1;
  return { source: png, image: await imageReady(png) };
}
function glyphSprite(source, start, end) {
  const left = Math.floor(start / 1060 * source.naturalWidth), right = Math.ceil(end / 1060 * source.naturalWidth);
  const canvas = document.createElement('canvas'); canvas.width = right - left; canvas.height = source.naturalHeight;
  const context = canvas.getContext('2d');
  if (!context) throw Error('Canvas unavailable');
  context.drawImage(source, left, 0, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
  const image = new Image(); image.src = canvas.toDataURL('image/png');
  canvas.width = 1; canvas.height = 1;
  return image;
}
function scheduleBrandBitmap() {
  if (!brandWordmark || !brandComposition || !mobileBrandMotion.matches || reducedMotion.matches) return;
  // Retain retina detail without allocating a viewport-sized high-DPI canvas.
  const width = Math.min(2048, Math.max(640, Math.ceil(stageWidth * .71 * 3.6 * Math.min(devicePixelRatio || 1, 2))));
  const key = String(width);
  if (bitmapKey === key || bitmapPending === key) return;
  const generation = ++bitmapGeneration; bitmapPending = key;
  const prepare = async () => {
    try {
      await document.fonts?.ready;
      const font = getComputedStyle(brandWordmark).fontFamily;
      const outline = await wordmarkSprite(width, true, font), fill = await wordmarkSprite(width, false, font);
      if (generation !== bitmapGeneration) return;
      const wordmark = document.createElement('div');
      wordmark.className = 'brand-bitmap-wordmark'; wordmark.setAttribute('aria-hidden', 'true');
      const letters = brandLetters.map(letter => {
        const text = letter.querySelector('.brand-letter-fill');
        const x = Number(text.getAttribute('x')), letterWidth = Number(text.getAttribute('textLength'));
        // A small padding preserves edge strokes, including the first D.
        const start = Math.max(0, x - 3), end = Math.min(1060, x + letterWidth + 3), span = end - start;
        const cell = document.createElement('span'); cell.className = 'brand-bitmap-letter';
        cell.style.left = `${start / 1060 * 100}%`; cell.style.width = `${span / 1060 * 100}%`;
        const window = document.createElement('span'); window.className = 'brand-bitmap-window';
        const counter = document.createElement('span'); counter.className = 'brand-bitmap-counter';
        const stroke = glyphSprite(outline.image, start, end), color = glyphSprite(fill.image, start, end);
        for (const image of [stroke, color]) { image.alt = ''; image.draggable = false; }
        color.className = 'brand-bitmap-fill'; counter.append(stroke); window.append(counter); cell.append(window, color); wordmark.append(cell);
        return { cell, window, counter, color };
      });
      await Promise.all([...wordmark.querySelectorAll('img')].map(image => image.decode ? image.decode() : imageReady(image.src)));
      if (generation !== bitmapGeneration) return;
      brandComposition.append(wordmark); bitmapWordmark?.remove(); bitmapWordmark = wordmark; bitmapLetters = letters;
      bitmapKey = key; bitmapDraws.fill(null); lastStoryProgress = null; schedulePaint();
    } catch {
      // If a device cannot prepare sprites, retain the readable SVG fallback.
    } finally { if (generation === bitmapGeneration) bitmapPending = ''; }
  };
  if ('requestIdleCallback' in window) window.requestIdleCallback(prepare, { timeout: 1500 });
  else setTimeout(prepare, 80);
}
// offsetTop excludes animated transforms, so reversing a scroll returns the same frame.
function layoutTop(element) {
  let top = 0;
  for (let node = element; node; node = node.offsetParent) top += node.offsetTop;
  return top;
}
function measureLayout() {
  viewportHeight = window.innerHeight; viewportWidth = window.innerWidth;
  scrollRange = Math.max(0, document.documentElement.scrollHeight - viewportHeight);
  // Batch every geometry/style read before making any animation writes.
  revealLayout = reveals.map(element => {
    const anchor = getComputedStyle(element).position === 'sticky' ? element.parentElement : element;
    return { element, top: layoutTop(anchor), delay: element.matches('.feature > :last-child') ? 45 : 0,
      progress: null, enabled: element.classList.contains('scroll-reveal'), active: element.classList.contains('is-revealing') };
  });
  if (brandStory && brandStage) {
    storyTop = layoutTop(brandStory);
    storyTravel = Math.max(1, brandStory.offsetHeight - brandStage.offsetHeight);
    stageWidth = brandStage.clientWidth;
  }
  if (flowTrack && flowStage) {
    flowTop = layoutTop(flowTrack);
    flowTravel = Math.max(1, flowTrack.offsetHeight - flowStage.offsetHeight);
    flowWidth = flowStage.clientWidth;
  }
  lastFlowProgress = null;
  lastStoryProgress = null;
  layoutDirty = false;
  scheduleBrandBitmap();
}
function paintBrandStory(scroll, motion, lightweight) {
  if (!brandStory || !brandStage) return;
  const progress = motion ? Math.round(clamp((scroll - storyTop) / storyTravel) * 100000) / 100000 : 1;
  if (progress === lastStoryProgress) return;
  lastStoryProgress = progress;
  brandStory.classList.toggle('is-brand-active', motion && progress > 0 && progress < 1);
  const closeup = motion && mobileBrandMotion.matches;
  const entrance = ease(clamp(progress / .22));
  const move = ease(clamp((progress - (closeup ? .20 : .24)) / (closeup ? .14 : .26)));
  // Mobile: push into the lettering, track its left-to-right drawing, then pull back.
  // The camera has no scroll-frame layout reads; its transform is based on cached width.
  const push = closeup ? ease(clamp((progress - .28) / .12)) : 0;
  const pull = closeup ? ease(clamp((progress - .86) / .12)) : 1;
  const zoom = push * (1 - pull);
  const scan = clamp((progress - .40) / .43);
  const detail = closeup ? 3.6 : 1;
  const cameraScale = 1 + zoom * (detail - 1);
  const focus = .28 + .71 * (.075 + scan * .85);
  const cameraX = (stageWidth * .5 - stageWidth * focus) * cameraScale * zoom;
  const bitmap = closeup && !!bitmapWordmark;
  brandStory.classList.toggle('has-brand-bitmap', bitmap);
  // Mobile sprites remain at a fixed raster size while the camera moves around them.
  brandComposition?.classList.toggle('is-camera-tracking', closeup && progress > .24 && progress < .99);
  style(brandComposition, 'width', `${detail * 100}%`);
  style(brandComposition, 'left', `${(1 - detail) * 50}%`);
  style(brandComposition, 'transform', `translate(${cameraX.toFixed(3)}px,0) scale(${(cameraScale / detail).toFixed(6)})`);
  const startSize = Math.min(360, stageWidth * .58);
  const endSize = stageWidth * .21;
  // The image's left/width stay fixed during scrolling; only its composited transform moves.
  style(brandSymbol, '--symbol-size', `${startSize * detail}px`);
  style(brandSymbol, '--symbol-shift', `${(-stageWidth * .36 * move * detail).toFixed(3)}px`);
  style(brandSymbol, '--symbol-scale', String((.68 + entrance * .32) * (1 - move * (1 - endSize / startSize))));
  style(brandSymbol, '--symbol-y', `${((1 - entrance) * 70 * detail).toFixed(3)}px`);
  style(brandSymbol, '--symbol-opacity', String(entrance));
  style(brandSymbol, '--symbol-blur', lightweight ? '0px' : `${((1 - entrance) * 16).toFixed(3)}px`);
  style(brandAura, 'opacity', String(entrance * (1 - move * .65) * .7));
  style(brandCue, 'opacity', String(1 - clamp(progress / .18)));
  brandLetters.forEach((letter, i) => {
    const draw = closeup ? clamp((progress - .36 - i * .043) / .105) : clamp((progress - .47 - i * .032) / .17);
    if (bitmap) {
      if (bitmapDraws[i] === draw) return;
      bitmapDraws[i] = draw;
      const { cell, window, counter, color } = bitmapLetters[i];
      const fill = ease(clamp((draw - .48) / .52)), wipe = (1 - ease(draw)) * 100;
      style(window, 'transform', `translate3d(${-wipe}%,0,0)`);
      style(counter, 'transform', `translate3d(${wipe}%,0,0)`);
      style(window, 'opacity', String(clamp(draw * 5) * (1 - fill)));
      style(color, 'opacity', String(fill));
      // Only the two or three letters being revealed need their own layers.
      cell.classList.toggle('is-drawing', draw > 0 && draw < 1);
      return;
    }
    if (letterDraws[i] === draw) return;
    letterDraws[i] = draw;
    const fill = ease(clamp((draw - .48) / .52));
    style(letter, '--letter-dash', String(900 * (1 - draw)));
    style(letter, '--letter-stroke', String(clamp(draw * 5) * (1 - fill)));
    style(letter, '--letter-fill', String(fill));
    style(letter, '--letter-y', `${(1 - ease(draw)) * 12}px`);
  });
}
// JavaScript-free and reduced-motion views retain the finished brand composition.
brandStory?.classList.add('has-scroll-motion');
// The scene is pinned by CSS; every frame uses cached geometry and compositor transforms.
flowSection?.classList.add('has-flow-motion');
function paintFlowstate(scroll, motion, lightweight) {
  if (!flowStage || !flowTrack) return;
  const enabled = motion && viewportHeight >= 680;
  const progress = enabled ? Math.round(clamp((scroll - flowTop) / flowTravel) * 100000) / 100000 : 1;
  if (progress === lastFlowProgress) return;
  lastFlowProgress = progress;
  flowTrack.classList.toggle('is-flow-active', enabled && progress > 0 && progress < 1);
  const enter = ease(clamp(progress / .4));
  const settle = ease(clamp((progress - .68) / .32));
  const focus = ease(clamp((progress - .1) / .32)) * (1 - settle);
  const sweep = Math.sin(progress * Math.PI * 2);
  const stacked = flowWidth <= 760;
  const center = stacked ? 0 : -flowWidth * .22 * focus;
  const x = center + sweep * (lightweight ? 30 : 65);
  const y = (1 - enter) * 95 - Math.sin(progress * Math.PI) * 36;
  const scale = .72 + enter * .28 + focus * (lightweight ? .28 : .48);
  const rotateX = (1 - enter) * 48 - sweep * 12;
  const rotateY = sweep * (lightweight ? 18 : 30);
  const rotateZ = -24 * (1 - enter) + sweep * 18;
  style(flowStage, '--flow-orbit-transform', `translate3d(${x.toFixed(3)}px,${y.toFixed(3)}px,0) rotateX(${rotateX.toFixed(3)}deg) rotateY(${rotateY.toFixed(3)}deg) rotateZ(${rotateZ.toFixed(3)}deg) scale(${scale.toFixed(4)})`);
  style(flowStage, '--flow-copy-transform', `translate3d(${(-focus * (stacked ? 0 : 70)).toFixed(3)}px,${(-focus * (stacked ? 25 : 10)).toFixed(3)}px,0) scale(${(1 - focus * .08).toFixed(4)})`);
  style(flowStage, '--flow-copy-opacity', String(1 - focus));
  style(flowStage, '--flow-darkness', String(.3 + focus * .7));
  style(flowStage, '--flow-ring-offset', String((1 - enter) * 817));
}
function paintReveals() {
  frame = 0;
  if (layoutDirty) measureLayout();
  const scroll = window.scrollY, motion = !reducedMotion.matches, lightweight = lightweightMotion.matches;
  for (const entry of revealLayout) {
    const progress = motion ? clamp((viewportHeight * .96 - (entry.top - scroll) - entry.delay) / (viewportHeight * .25)) : 1;
    const active = motion && progress > 0 && progress < 1;
    if (entry.enabled !== motion) { entry.element.classList.toggle('scroll-reveal', motion); entry.enabled = motion; }
    if (entry.active !== active) { entry.element.classList.toggle('is-revealing', active); entry.active = active; }
    if (entry.progress === progress) continue;
    entry.progress = progress;
    style(entry.element, '--reveal-opacity', String(progress));
    style(entry.element, '--reveal-y', `${(1 - progress) * 36}px`);
  }
  style(hero, '--glow-shift', `${motion ? Math.min(scroll * .15, 160) : 0}px`);
  header?.classList.toggle('is-collapsed', scroll > 110);
  paintBrandStory(scroll, motion, lightweight);
  paintFlowstate(scroll, motion, lightweight);
  style(header, '--page-progress', String(scrollRange > 0 ? clamp(scroll / scrollRange) : 0));
}
function schedulePaint() {
  if (!frame) frame = window.requestAnimationFrame(paintReveals);
}
function invalidateLayout() { layoutDirty = true; schedulePaint(); }
window.addEventListener('scroll', schedulePaint, { passive: true });
window.addEventListener('resize', () => {
  // Safari's address bar changes innerHeight during a swipe without changing document layout.
  // Actual element/width changes are still handled by ResizeObserver and this width check.
  if (window.innerWidth !== viewportWidth) invalidateLayout();
  else { viewportHeight = window.innerHeight; lastFlowProgress = null; schedulePaint(); }
}, { passive: true });
window.addEventListener('pageshow', invalidateLayout);
window.addEventListener('load', invalidateLayout);
document.addEventListener('toggle', invalidateLayout, true);
reducedMotion.addEventListener('change', invalidateLayout);
lightweightMotion.addEventListener('change', invalidateLayout);
if ('ResizeObserver' in window) {
  const layoutObserver = new ResizeObserver(invalidateLayout);
  layoutObserver.observe(document.body);
  if (brandStage) layoutObserver.observe(brandStage);
  if (flowStage) layoutObserver.observe(flowStage);
}
document.fonts?.ready.then(invalidateLayout);
paintReveals();
// Keep keyboard navigation available after the header slides out of sight.
header?.addEventListener('focusin', event => {
  header.classList.toggle('has-keyboard-focus', event.target.matches(':focus-visible'));
});
header?.addEventListener('focusout', event => {
  if (!header.contains(event.relatedTarget)) header.classList.remove('has-keyboard-focus');
});
// Match the app: reveal one answer, then rate recall with four grades.
const revealAnswer = document.querySelector('.quiz-reveal');
const demoAnswer = document.querySelector('#review-demo-answer');
const feedback = document.querySelector('#quiz-feedback');
const grades = [...document.querySelectorAll('[data-review-grade]')];
if (revealAnswer && demoAnswer && feedback) {
  revealAnswer.hidden = false;
  revealAnswer.addEventListener('click', () => {
    demoAnswer.hidden = false;
    revealAnswer.hidden = true;
    revealAnswer.setAttribute('aria-expanded', 'true');
    feedback.textContent = '答えは focus。答えを見る前の手応えを選んでください。';
    grades[0]?.focus({ preventScroll: true });
    schedulePaint();
  });
  for (const button of grades) button.addEventListener('click', () => {
    grades.forEach(grade => grade.setAttribute('aria-pressed', String(grade === button)));
    feedback.textContent = `次回の復習：${button.dataset.interval}。これは初回評価の体験です。復習予定・記録は保存しません。`;
    openQuizCelebration(button);
  });
}
// A visual preview only: no microphone, storage, real timer or notification permission.
const flowDialog = document.querySelector('.flow-demo');
const flowTrigger = document.querySelector('.flow-demo-open');
if (flowDialog && flowTrigger) {
  let flowOverflow = '';
  flowTrigger.hidden = false;
  const dial = document.querySelector('.flowstate-visual .demo-dial');
  if (dial) {
    const preview = dial.cloneNode(true);
    // Cloned SVG definitions must have unique document IDs.
    preview.querySelector('linearGradient')?.setAttribute('id', 'dial-flow-preview');
    preview.querySelector('.demo-dial-progress')?.setAttribute('stroke', 'url(#dial-flow-preview)');
    flowDialog.querySelector('.flow-demo-dial').append(preview);
  }
  flowTrigger.addEventListener('click', () => {
    if (flowDialog.open) return;
    flowOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    flowDialog.showModal();
    flowDialog.querySelector('.flow-demo-close').focus();
  });
  flowDialog.querySelector('.flow-demo-close').addEventListener('click', () => flowDialog.close());
  flowDialog.addEventListener('close', () => {
    document.body.style.overflow = flowOverflow;
    flowTrigger.focus({ preventScroll: true });
  });
}

// Celebrate only while visible; pause in background tabs and for reduced motion.
const achievement = document.querySelector('.achievement-type');
const motionToggle = document.querySelector('.achievement-motion-toggle');
const celebrationWords = [...document.querySelectorAll('.achievement-word')];
if (achievement && motionToggle && celebrationWords.length > 1) {
  let activeWord = 0;
  let inView = false;
  let userPaused = false;
  let rotationTimer = null;
  function updateCelebration() {
    if (rotationTimer !== null) window.clearInterval(rotationTimer);
    rotationTimer = null;
    const playing = inView && !document.hidden && !reducedMotion.matches && !userPaused;
    achievement.classList.toggle('is-playing', playing);
    motionToggle.hidden = reducedMotion.matches;
    motionToggle.textContent = userPaused ? '演出を再開' : '演出を一時停止';
    if (playing) {
      rotationTimer = window.setInterval(() => {
        celebrationWords[activeWord].classList.remove('is-active');
        activeWord = (activeWord + 1) % celebrationWords.length;
        celebrationWords[activeWord].classList.add('is-active');
      }, 3200);
    }
  }
  motionToggle.addEventListener('click', () => {
    userPaused = !userPaused;
    updateCelebration();
  });
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      updateCelebration();
    }, { threshold: 0.25 });
    observer.observe(achievement);
  }
  document.addEventListener('visibilitychange', updateCelebration);
  window.addEventListener('pagehide', () => { inView = false; updateCelebration(); });
  reducedMotion.addEventListener('change', updateCelebration);
  updateCelebration();
}

// Standalone, browser-only sample of the app's completion celebration.
const quizCelebration = document.querySelector('.quiz-celebration');
const praise = [
  ['LETS GOOOOO!', '大きな一勝だ！ 胸を張っていいよ！'],
  ['Boom!', '見事なやり遂げっぷり！ 完璧だよ、相棒。'],
  ['NO WAY!', '本当にやり遂げたね！ その頑張り、すごすぎる！'],
  ['Nailed it!', 'バッチリ決めたね！ まさに伝説。'],
  ['Insane work!', '一気にレベルアップしたね！']
];
let lastPraise = -1;
let celebrationTimer;
let confettiTimer;
let celebrationTrigger;
let previousOverflow = '';
function finishQuizCelebration() {
  clearTimeout(celebrationTimer);
  if (!quizCelebration.open) return;
  quizCelebration.classList.add('show-result');
  quizCelebration.querySelector('.celebration-skip').hidden = true;
  const particles = quizCelebration.querySelector('.celebration-confetti');
  particles.replaceChildren();
  if (!reducedMotion.matches) {
    for (let i = 0; i < 80; i++) {
      const piece = document.createElement('i');
      const left = i % 2 === 0;
      piece.style.cssText = `left:${left ? 0 : 100}%;--dx:${(left ? 1 : -1) * (12 + Math.random() * 85)}vw;--dy:-${45 + Math.random() * 65}vh;--spin:${Math.random() * 1080}deg;--delay:${Math.random() * .5}s;background:hsl(${i * 47 % 360} 90% 65%)`;
      particles.append(piece);
    }
    clearTimeout(confettiTimer);
    confettiTimer = setTimeout(() => particles.replaceChildren(), 4000);
  }
}
function openQuizCelebration(trigger) {
  if (!quizCelebration || quizCelebration.open) return;
  celebrationTrigger = trigger;
  const next = (lastPraise + 1 + Math.floor(Math.random() * (praise.length - 1))) % praise.length;
  lastPraise = next;
  const [title, copy] = praise[next];
  quizCelebration.querySelector('#celebration-title').textContent = title;
  quizCelebration.querySelector('#celebration-copy').textContent = copy;
  const rush = quizCelebration.querySelector('.celebration-rush');
  rush.replaceChildren();
  for (let i = 0; i < 8; i++) {
    const line = document.createElement('span');
    line.textContent = title;
    line.style.setProperty('--row', i);
    rush.append(line);
  }
  quizCelebration.classList.remove('show-result');
  quizCelebration.querySelector('.celebration-skip').hidden = false;
  previousOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  quizCelebration.showModal();
  quizCelebration.querySelector('.celebration-close').focus();
  if (reducedMotion.matches) finishQuizCelebration();
  else celebrationTimer = setTimeout(finishQuizCelebration, 1800);
}
quizCelebration.querySelector('.celebration-close').addEventListener('click', () => quizCelebration.close());
quizCelebration.querySelector('.celebration-done').addEventListener('click', () => quizCelebration.close());
quizCelebration.querySelector('.celebration-skip').addEventListener('click', finishQuizCelebration);
quizCelebration.addEventListener('close', () => {
  clearTimeout(celebrationTimer);
  clearTimeout(confettiTimer);
  quizCelebration.querySelector('.celebration-confetti').replaceChildren();
  document.body.style.overflow = previousOverflow;
  celebrationTrigger?.focus({ preventScroll: true });
});
reducedMotion.addEventListener('change', () => {
  if (reducedMotion.matches && quizCelebration.open) finishQuizCelebration();
});

// Use the app's three arena views; fixtures stay local to the introduction page.
const arenaTabs = [...document.querySelectorAll('[data-arena-mode]')];
const arenaPanel = document.querySelector('#arena-preview-panel');
if (arenaTabs.length && arenaPanel) {
  document.querySelector('.arena-preview-tabs').hidden = false;
  const showArena = button => {
    const template = document.querySelector(`[data-arena-template="${button.dataset.arenaMode}"]`);
    if (!template) return;
    for (const tab of arenaTabs) {
      tab.setAttribute('aria-selected', String(tab === button));
      tab.tabIndex = tab === button ? 0 : -1;
    }
    arenaPanel.replaceChildren(template.content.cloneNode(true));
    arenaPanel.setAttribute('aria-label', `${button.textContent}のランキング`);
    schedulePaint();
  };
  arenaTabs.forEach((button, index) => {
    button.addEventListener('click', () => showArena(button));
    button.addEventListener('keydown', event => {
      const next = event.key === 'ArrowRight' ? (index + 1) % arenaTabs.length : event.key === 'ArrowLeft' ? (index + arenaTabs.length - 1) % arenaTabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? arenaTabs.length - 1 : -1;
      if (next < 0) return;
      event.preventDefault(); showArena(arenaTabs[next]); arenaTabs[next].focus();
    });
  });
}
