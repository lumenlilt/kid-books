/** 星星爆開＋一顆飛進 HUD 的計數。純 DOM＋Web Animations，不碰 3D。 */
export function burstStars(from: Element, to: Element, container: HTMLElement, count = 10): Promise<void> {
  const fr = from.getBoundingClientRect();
  const tr = to.getBoundingClientRect();
  const cr = container.getBoundingClientRect();
  const cx = fr.left + fr.width / 2 - cr.left;
  const cy = fr.top + fr.height / 2 - cr.top;
  const tx = tr.left + tr.width / 2 - cr.left;
  const ty = tr.top + tr.height / 2 - cr.top;
  const anims: Promise<unknown>[] = [];
  for (let i = 0; i < count; i += 1) {
    const s = document.createElement('span');
    s.className = 'star-particle';
    s.textContent = '⭐';
    s.style.left = `${cx}px`;
    s.style.top = `${cy}px`;
    container.append(s);
    const a = (i / count) * Math.PI * 2 + Math.random() * 0.5;
    const dist = 80 + Math.random() * 90;
    const dx = Math.cos(a) * dist;
    const dy = Math.sin(a) * dist - 40;
    const anim = s.animate(
      [
        { transform: 'translate(-50%,-50%) scale(0.3)', opacity: 1 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1.1)`, opacity: 1, offset: 0.6 },
        { transform: `translate(calc(-50% + ${dx * 1.2}px), calc(-50% + ${dy + 60}px)) scale(0.6)`, opacity: 0 },
      ],
      { duration: 900 + Math.random() * 300, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'forwards' },
    );
    anims.push(anim.finished.then(() => s.remove()));
  }
  const flyer = document.createElement('span');
  flyer.className = 'star-particle star-flyer';
  flyer.textContent = '⭐';
  flyer.style.left = `${cx}px`;
  flyer.style.top = `${cy}px`;
  container.append(flyer);
  const fly = flyer.animate(
    [
      { transform: 'translate(-50%,-50%) scale(1.6)', opacity: 1 },
      { transform: `translate(calc(-50% + ${tx - cx}px), calc(-50% + ${ty - cy}px)) scale(0.8)`, opacity: 1 },
    ],
    { duration: 800, delay: 350, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' },
  );
  anims.push(
    fly.finished.then(() => {
      flyer.remove();
      to.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { duration: 320, easing: 'ease-out' });
    }),
  );
  return Promise.all(anims).then(() => undefined);
}
