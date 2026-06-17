// Garante coerência: só vê esta página quem completou o inquérito.
(function () {
  if (!localStorage.getItem("esprodouro_voto_token")) {
    window.location.replace("index.html");
  }
})();
