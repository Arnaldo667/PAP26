// Injeta cabeçalho (logótipo) e rodapé (tarja) em todas as páginas.
(function () {
  var LOGO = encodeURI("Imagens/AF_LogoEsprodouro2025White-01.png");
  var TARJA = encodeURI("Imagens/Tarja Geral 2025-2026.png");

  function render() {
    var header = document.createElement("header");
    header.className = "site-header";
    header.innerHTML =
      '<img class="logo" src="' + LOGO + '" alt="Esprodouro — Escola Profissional do Alto Douro">';
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
