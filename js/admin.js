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
  async function carregarResultados() {
    var elTotal = document.getElementById("total-respostas");
    var elResultados = document.getElementById("resultados");
    elResultados.innerHTML = "";

    var rCount = await sb.from("responses").select("*", { count: "exact", head: true });
    var total = rCount.count || 0;
    elTotal.textContent = "Total de respostas: " + total;

    var qRes = await sb.from("questions").select("id, texto, ordem").order("ordem", { ascending: true });
    var aRes = await sb.from("answers").select("question_id, grau");
    if (qRes.error || aRes.error) {
      elResultados.innerHTML = '<p class="erro">Erro ao carregar resultados.</p>';
      console.error(qRes.error || aRes.error);
      return;
    }

    var rotulos = { 4: "Muito Satisfeito", 3: "Satisfeito", 2: "Insatisfeito", 1: "Muito Insatisfeito" };
    var cores = { 4: "#1f9d55", 3: "#67b346", 2: "#e8852b", 1: "#d23a34" };

    qRes.data.forEach(function (q) {
      var desta = aRes.data.filter(function (a) { return a.question_id === q.id; });
      var n = desta.length;
      var soma = desta.reduce(function (s, a) { return s + a.grau; }, 0);
      var media = n ? (soma / n) : 0;
      var contagem = { 1: 0, 2: 0, 3: 0, 4: 0 };
      desta.forEach(function (a) { contagem[a.grau]++; });

      var barras = [4, 3, 2, 1].map(function (g) {
        var pct = n ? Math.round((contagem[g] / n) * 100) : 0;
        return (
          '<div class="barra-linha">' +
            '<span class="barra-rotulo">' + rotulos[g] + "</span>" +
            '<span class="barra-track"><span class="barra-valor" style="width:' + pct + "%;background:" + cores[g] + '"></span></span>' +
            '<span class="barra-num">' + contagem[g] + "</span>" +
          "</div>"
        );
      }).join("");

      var card = document.createElement("div");
      card.className = "resultado-pergunta";
      card.innerHTML =
        "<h3>" + q.texto + "</h3>" +
        '<div class="resultado-meta">' + n + " respostas · média " + media.toFixed(2) + " / 4</div>" +
        barras;
      elResultados.appendChild(card);
    });
  }
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
