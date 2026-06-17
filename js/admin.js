(function () {
  var sb = window.sb;
  var areaLogin = document.getElementById("area-login");
  var areaPainel = document.getElementById("area-painel");
  var formLogin = document.getElementById("form-login");
  var erroLogin = document.getElementById("erro-login");

  function mostrarPainel(autenticado) {
    areaLogin.style.display = autenticado ? "none" : "block";
    areaPainel.style.display = autenticado ? "block" : "none";
    if (autenticado) { carregarTudo(); }
  }

  formLogin.addEventListener("submit", async function (e) {
    e.preventDefault();
    erroLogin.style.display = "none";
    var email = document.getElementById("email").value;
    var password = document.getElementById("password").value;
    var res = await sb.auth.signInWithPassword({ email: email, password: password });
    if (res.error) {
      erroLogin.textContent = "Credenciais inválidas.";
      erroLogin.style.display = "block";
      return;
    }
    mostrarPainel(true);
  });

  document.getElementById("btn-logout").addEventListener("click", async function () {
    await sb.auth.signOut();
    mostrarPainel(false);
  });

  // Placeholders preenchidos nas Tasks 9 e 10.
  async function carregarResultados() {}
  async function carregarPerguntas() {}
  async function carregarTudo() {
    await carregarResultados();
    await carregarPerguntas();
  }
  window.__carregarTudo = carregarTudo; // usado pelas tarefas seguintes

  // Sessão persistida.
  sb.auth.getSession().then(function (res) {
    mostrarPainel(!!(res.data && res.data.session));
  });
})();
