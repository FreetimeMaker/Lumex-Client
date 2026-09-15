export function initRouter() {
  const buttons = [...document.querySelectorAll('[data-route]')];
  const pages = [...document.querySelectorAll('.page')];

  const navigate = (route) => {
    for (const page of pages) page.classList.toggle('active', page.id === route);
    for (const button of buttons) button.classList.toggle('active', button.dataset.route === route);
  };

  for (const button of buttons) {
    button.addEventListener('click', () => navigate(button.dataset.route));
  }

  document.addEventListener('click', (event) => {
    const target = event.target.closest('[data-route-target]');
    if (target) navigate(target.dataset.routeTarget);
  });
}
