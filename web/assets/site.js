/* TAMV Online Network — mejoras progresivas del sitio institucional.
   Sin dependencias. El sitio funciona completo sin JavaScript: cada bloque de
   este archivo añade comportamiento que la página ya describe, y ninguno es
   necesario para leer o navegar el contenido. */
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

  /* Formulario de contacto: compone el mensaje mailto: que la página promete.
     Sin JavaScript el <form> conserva su action="mailto:" y la dirección directa
     sigue visible, así que el trámite no depende de este bloque. */
  var form = document.getElementById('form-contacto');
  if (form) {
    var es = (document.documentElement.lang || 'es').toLowerCase().indexOf('en') !== 0;
    var estado = document.getElementById('form-estado');
    var directo = document.getElementById('correo-redactado');
    var destino = (function () {
      var m = /^mailto:([^?]+)/.exec(form.getAttribute('action') || '');
      return m ? m[1] : '';
    })();
    var original = directo ? directo.getAttribute('href') : '';
    var limpio = directo ? directo.textContent : '';
    // Límite prudente: varios clientes rechazan URLs de correo muy largas.
    var MAX = 1800;
    var L = es
      ? {
          asunto: 'TAMV Online Network · ',
          nombre: 'Nombre o firma: ',
          correo: 'Correo de respuesta: ',
          motivo: 'Motivo: ',
          redactado: 'Abrir el borrador redactado en su cliente de correo',
          abierto: 'Mensaje redactado: su cliente de correo debería abrirse con el borrador ya escrito. Revíselo y envíelo usted; esta página no lo almacena en ningún servidor.',
          largo: 'El mensaje supera lo que un cliente de correo admite en una URL, así que no se abre solo. Cópielo y escríbalo a la dirección visible en esta página.',
          fallo: 'No se pudo redactar el mensaje. Escriba directamente a la dirección que aparece en esta página.'
        }
      : {
          asunto: 'TAMV Online Network · ',
          nombre: 'Name or signature: ',
          correo: 'Reply address: ',
          motivo: 'Reason: ',
          redactado: 'Open the composed draft in your email client',
          abierto: 'Message composed: your email client should open with the draft already written. Review it and send it yourself; this page stores nothing on any server.',
          largo: 'The message exceeds what an email client accepts in a URL, so it is not opened automatically. Copy it and write to the address shown on this page.',
          fallo: 'The message could not be composed. Write directly to the address shown on this page.'
        };

    form.addEventListener('submit', function (ev) {
      if (!destino) return;                    // sin dirección: que actúe el action nativo
      if (!form.checkValidity()) return;       // la validación nativa ya marca los campos
      ev.preventDefault();

      var valor = function (n) {
        var c = form.elements[n];
        return c ? String(c.value).trim() : '';
      };
      var select = form.elements.asunto;
      var motivoTxt = select && select.selectedIndex >= 0
        ? String(select.options[select.selectedIndex].text).trim()
        : valor('asunto');

      var cuerpo = [
        valor('mensaje'),
        '',
        L.nombre + valor('nombre'),
        L.correo + valor('correo'),
        L.motivo + motivoTxt
      ].join('\r\n');
      var uri = 'mailto:' + destino
        + '?subject=' + encodeURIComponent(L.asunto + motivoTxt)
        + '&body=' + encodeURIComponent(cuerpo);

      if (uri.length > MAX) {
        if (directo) { directo.setAttribute('href', original); directo.textContent = limpio; }
        if (estado) estado.textContent = L.largo;
        return;                                // no se navega: el enlace directo sigue sirviendo
      }

      if (directo) { directo.setAttribute('href', uri); directo.textContent = L.redactado; }
      if (estado) estado.textContent = L.abierto;
      try {
        window.location.assign(uri);
      } catch (err) {
        if (estado) estado.textContent = L.fallo;
      }
    });
  }
})();
