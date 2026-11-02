/* TAMV Online Network — mejoras progresivas del sitio institucional.
   Sin dependencias. El sitio funciona completo sin JavaScript. */
(function () {
  'use strict';

  // Navegación móvil
  var toggle = document.querySelector('.nav-toggle');
  var menu = document.querySelector('nav.primary ul');
  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      var open = menu.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  // Año dinámico en el pie
  var year = document.querySelector('[data-year]');
  if (year) {
    var y = new Date().getFullYear();
    year.textContent = String(y);
    var from = document.querySelector('[data-year-from]');
    if (from) from.textContent = '2020–' + y;
  }

  // Enlace activo en la navegación (respaldo del aria-current estático)
  var here = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('nav.primary a').forEach(function (a) {
    var target = a.getAttribute('href').split('/').pop();
    if (target === here) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });

  // Tablas: anunciar desplazamiento horizontal al teclado
  document.querySelectorAll('.table-scroll').forEach(function (box) {
    if (box.scrollWidth > box.clientWidth) {
      box.setAttribute('tabindex', '0');
      box.setAttribute('role', 'region');
      box.setAttribute('aria-label', box.dataset.label || 'Tabla de metadatos, desplazable horizontalmente');
    }
  });
})();
