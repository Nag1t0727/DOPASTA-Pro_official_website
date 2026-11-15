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
const brandAura = document.querySelector('.brand-aura');
const brandCue = document.querySelector('.brand-scroll-cue');
const brandLetters = [...document.querySelectorAll('.brand-letter')];
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
let frame = 0, layoutDirty = true, viewportHeight = 1, scrollRange = 1;
let storyTop = 0, storyTravel = 1, stageWidth = 1, lastStoryProgress = null;
let revealLayout = [];
const letterDraws = brandLetters.map(() => null);
// offsetTop excludes animated transforms, so reversing a scroll returns the same frame.
function layoutTop(element) {
  let top = 0;
  for (let node = element; node; node = node.offsetParent) top += node.offsetTop;
  return top;
}
function measureLayout() {
  viewportHeight = window.innerHeight;
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
  lastStoryProgress = null;
  layoutDirty = false;
}
function paintBrandStory(scroll, motion, lightweight) {
  if (!brandStory || !brandStage) return;
  const progress = motion ? Math.round(clamp((scroll - storyTop) / storyTravel) * 100000) / 100000 : 1;
  if (progress === lastStoryProgress) return;
  lastStoryProgress = progress;
  brandStory.classList.toggle('is-brand-active', motion && progress > 0 && progress < 1);
  const entrance = ease(clamp(progress / .22));
  const move = ease(clamp((progress - .24) / .26));
  const startSize = Math.min(360, stageWidth * .58);
  const endSize = stageWidth * .21;
  // The image's left/width stay fixed during scrolling; only its composited transform moves.
  style(brandSymbol, '--symbol-size', `${startSize}px`);
  style(brandSymbol, '--symbol-shift', `${(-stageWidth * .36 * move).toFixed(3)}px`);
  style(brandSymbol, '--symbol-scale', String((.68 + entrance * .32) * (1 - move * (1 - endSize / startSize))));
  style(brandSymbol, '--symbol-y', `${((1 - entrance) * 70).toFixed(3)}px`);
  style(brandSymbol, '--symbol-opacity', String(entrance));
  style(brandSymbol, '--symbol-blur', lightweight ? '0px' : `${((1 - entrance) * 16).toFixed(3)}px`);
  style(brandAura, 'opacity', String(entrance * (1 - move * .65) * .7));
  style(brandCue, 'opacity', String(1 - clamp(progress / .18)));
  brandLetters.forEach((letter, i) => {
    const draw = clamp((progress - .47 - i * .032) / .17);
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
  style(header, '--page-progress', String(scrollRange > 0 ? clamp(scroll / scrollRange) : 0));
}
function schedulePaint() {
  if (!frame) frame = window.requestAnimationFrame(paintReveals);
}
function invalidateLayout() { layoutDirty = true; schedulePaint(); }
window.addEventListener('scroll', schedulePaint, { passive: true });
window.addEventListener('resize', invalidateLayout, { passive: true });
window.addEventListener('pageshow', invalidateLayout);
window.addEventListener('load', invalidateLayout);
document.addEventListener('toggle', invalidateLayout, true);
reducedMotion.addEventListener('change', invalidateLayout);
lightweightMotion.addEventListener('change', invalidateLayout);
if ('ResizeObserver' in window) {
  const layoutObserver = new ResizeObserver(invalidateLayout);
  layoutObserver.observe(document.body);
  if (brandStage) layoutObserver.observe(brandStage);
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
