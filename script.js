'use strict';
// Progress follows viewport position; content stays visible when JavaScript is unavailable.
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const reveals = [...document.querySelectorAll('.reveal')];
const hero = document.querySelector('.hero');
const header = document.querySelector('.site-header');
let frame = 0;
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
  const range = document.documentElement.scrollHeight - height;
  header?.style.setProperty('--page-progress', String(range > 0 ? Math.max(0, Math.min(1, scroll / range)) : 0));
}
function schedulePaint() {
  if (!frame) frame = window.requestAnimationFrame(paintReveals);
}
window.addEventListener('scroll', schedulePaint, { passive: true });
window.addEventListener('resize', schedulePaint, { passive: true });
window.addEventListener('pageshow', schedulePaint);
window.addEventListener('load', schedulePaint);
document.addEventListener('toggle', schedulePaint, true);
reducedMotion.addEventListener('change', schedulePaint);
paintReveals();
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
    feedback.textContent = correct ? '正解！ focus = 集中する。ひとつ、思い出せました。' : 'もう一度。「集中する」に合う単語を選んでみましょう。';
  });
}
