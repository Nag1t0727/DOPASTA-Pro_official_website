'use strict';
// Progress follows viewport position; content stays visible when JavaScript is unavailable.
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const reveals = [...document.querySelectorAll('.reveal')];
const hero = document.querySelector('.hero');
const header = document.querySelector('.site-header');
let frame = 0;
const brandStory = document.querySelector('.brand-story');
const brandStage = document.querySelector('.brand-stage');
const brandLetters = [...document.querySelectorAll('.brand-letter')];
const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const ease = value => value * value * (3 - 2 * value);
let storyTop = 0;
let storyTravel = 1;
let stageWidth = 1;
function measureBrandStory() {
  if (!brandStory || !brandStage) return;
  storyTop = layoutTop(brandStory);
  storyTravel = Math.max(1, brandStory.offsetHeight - brandStage.offsetHeight);
  stageWidth = brandStage.clientWidth;
}
function paintBrandStory(scroll, motion) {
  if (!brandStory || !brandStage) return;
  const progress = motion ? clamp((scroll - storyTop) / storyTravel) : 1;
  // Pure scroll-derived values: stopping or reversing the gesture preserves the exact frame.
  const entrance = ease(clamp(progress / .22));
  const move = ease(clamp((progress - .24) / .26));
  const startSize = Math.min(360, stageWidth * .58);
  const endSize = stageWidth * .21;
  brandStage.style.setProperty('--symbol-x', `${stageWidth * (.5 - .36 * move)}px`);
  brandStage.style.setProperty('--symbol-size', `${startSize}px`);
  brandStage.style.setProperty('--symbol-scale', String((.68 + entrance * .32) * (1 - move * (1 - endSize / startSize))));
  brandStage.style.setProperty('--symbol-y', `${(1 - entrance) * 70}px`);
  brandStage.style.setProperty('--symbol-opacity', String(entrance));
  brandStage.style.setProperty('--symbol-blur', `${(1 - entrance) * 16}px`);
  brandStage.style.setProperty('--aura-opacity', String(entrance * (1 - move * .65) * .7));
  brandStage.style.setProperty('--cue-opacity', String(1 - clamp(progress / .18)));
  brandStage.style.setProperty('--finish', String(ease(clamp((progress - .85) / .12))));
  brandLetters.forEach((letter, i) => {
    const draw = clamp((progress - .47 - i * .032) / .17);
    const fill = ease(clamp((draw - .48) / .52));
    letter.style.setProperty('--letter-dash', String(900 * (1 - draw)));
    letter.style.setProperty('--letter-stroke', String(clamp(draw * 5) * (1 - fill)));
    letter.style.setProperty('--letter-fill', String(fill));
    letter.style.setProperty('--letter-y', `${(1 - ease(draw)) * 12}px`);
  });
}
// Static final composition is the safe default when scripting or motion is unavailable.
brandStory?.classList.add('has-scroll-motion');
// Layout coordinates exclude animated transforms, avoiding feedback/jitter while scrolling.
function layoutTop(element) {
  let top = 0;
  for (let node = element; node; node = node.offsetParent) top += node.offsetTop;
  return top;
}
function paintReveals() {
  frame = 0;
  const height = window.innerHeight;
  const scroll = window.scrollY;
  const motion = !reducedMotion.matches;
  for (const element of reveals) {
    if (!motion) {
      element.classList.remove('scroll-reveal');
      continue;
    }
    // Sticky visuals use the section entrance as their stable scroll anchor.
    const sticky = getComputedStyle(element).position === 'sticky';
    const top = layoutTop(sticky ? element.parentElement : element) - scroll;
    const delay = element.matches('.feature > :last-child') ? 45 : 0;
    const progress = Math.max(0, Math.min(1, (height * 0.96 - top - delay) / (height * 0.25)));
    element.classList.add('scroll-reveal');
    element.style.setProperty('--reveal-opacity', String(progress));
    element.style.setProperty('--reveal-y', `${(1 - progress) * 36}px`);
  }
  hero?.style.setProperty('--glow-shift', `${motion ? Math.min(scroll * 0.15, 160) : 0}px`);
  header?.classList.toggle('is-collapsed', scroll > 110);
  paintBrandStory(scroll, motion);
  const range = document.documentElement.scrollHeight - height;
  header?.style.setProperty('--page-progress', String(range > 0 ? Math.max(0, Math.min(1, scroll / range)) : 0));
}
function schedulePaint() {
  if (!frame) frame = window.requestAnimationFrame(paintReveals);
}
window.addEventListener('scroll', schedulePaint, { passive: true });
window.addEventListener('resize', () => { measureBrandStory(); schedulePaint(); }, { passive: true });
window.addEventListener('pageshow', schedulePaint);
window.addEventListener('load', () => { measureBrandStory(); schedulePaint(); });
document.addEventListener('toggle', schedulePaint, true);
reducedMotion.addEventListener('change', schedulePaint);
if ('ResizeObserver' in window && brandStory) {
  const layoutObserver = new ResizeObserver(() => { measureBrandStory(); schedulePaint(); });
  layoutObserver.observe(document.body);
}
document.fonts?.ready.then(() => { measureBrandStory(); schedulePaint(); });
measureBrandStory();
paintReveals();
// Keep keyboard navigation available after the header slides out of sight.
header?.addEventListener('focusin', event => {
  header.classList.toggle('has-keyboard-focus', event.target.matches(':focus-visible'));
});
header?.addEventListener('focusout', event => {
  if (!header.contains(event.relatedTarget)) header.classList.remove('has-keyboard-focus');
});
const answers = document.querySelectorAll('[data-answer]');
const feedback = document.querySelector('#quiz-feedback');
for (const button of answers) {
  button.addEventListener('click', () => {
    for (const answer of answers) {
      answer.classList.remove('correct', 'wrong');
      answer.removeAttribute('aria-pressed');
    }
    const correct = button.dataset.answer === 'true';
    button.classList.add(correct ? 'correct' : 'wrong');
    button.setAttribute('aria-pressed', 'true');
    if (correct) openQuizCelebration(button);
    feedback.textContent = correct ? '正解！ focus = 集中する。ひとつ、思い出せました。' : 'もう一度。「集中する」に合う単語を選んでみましょう。';
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
