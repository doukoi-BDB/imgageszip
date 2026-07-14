document.addEventListener('DOMContentLoaded', () => {
  const button = document.querySelector('[data-menu]');
  const menu = document.querySelector('[data-mobile-menu]');
  if (button && menu) button.addEventListener('click', () => menu.classList.toggle('hidden'));
});
