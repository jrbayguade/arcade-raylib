// State switcher and device scaling for the static mockups.
document.querySelectorAll('.states').forEach((bar) => {
  const root = document.querySelector(bar.dataset.target);
  const show = (button) => {
    bar.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === button));
    root.querySelectorAll('[data-state]').forEach((el) => {
      el.classList.toggle('active', el.dataset.state.split(' ').includes(button.dataset.show));
    });
    // replay entrance animations
    root.querySelectorAll('.replay-anim').forEach((el) => { el.style.animation = 'none'; void el.offsetWidth; el.style.animation = ''; });
  };
  bar.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-show]');
    if (b) show(b);
  });
  show(bar.querySelector('button[data-show]'));
});

function fit() {
  document.querySelectorAll('.device').forEach((d) => {
    const w = Number(d.dataset.w), h = Number(d.dataset.h);
    const avail = d.parentElement.clientWidth;
    const s = Math.min(1, avail / w);
    d.style.width = `${w}px`;
    d.style.height = `${h}px`;
    d.style.transform = `scale(${s})`;
    d.style.margin = '0';
    d.parentElement.style.height = `${h * s + 24}px`;
  });
}
addEventListener('resize', fit);
fit();
