// Garante coerência: só vê esta página quem completou o inquérito.
(function () {
  if (localStorage.getItem("esprodouro_inquerito_respondido") !== "true") {
    window.location.replace("index.html");
  }
})();
