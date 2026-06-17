// Injeta cabeçalho (logótipo) e rodapé (tarja) em todas as páginas.
(function () {
  var LOGO = encodeURI("Imagens/AF_LogoEsprodouro2025White-01.png");
  var TARJA = encodeURI("Imagens/Tarja Geral 2025-2026.png");

  // Na página de admin o botão volta à landing; nas restantes vai para o admin.
  var noAdmin = /admin\.html$/.test(window.location.pathname);
  var navHref = noAdmin ? "index.html" : "admin.html";
  var navTexto = noAdmin ? "← Início" : "Admin";

  function render() {
    var header = document.createElement("header");
    header.className = "site-header";
    header.innerHTML =
      '<div class="header-info">' +
        "<strong>Arnaldo Gouveia</strong>" +
        "<span>PAP 2026</span>" +
        "<span>TEAC-5</span>" +
      "</div>" +
      '<img class="logo" src="' + LOGO + '" alt="Esprodouro — Escola Profissional do Alto Douro">' +
      '<a class="header-nav" href="' + navHref + '">' + navTexto + "</a>";
    document.body.insertBefore(header, document.body.firstChild);

    var footer = document.createElement("footer");
    footer.className = "site-footer";
    footer.innerHTML =
      '<img class="tarja" src="' + TARJA + '" alt="Certificações e financiamentos">';
    document.body.appendChild(footer);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render);
  } else {
    render();
  }
})();
