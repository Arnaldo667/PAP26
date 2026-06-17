(function () {
  var sb = window.sb;
  var areaLogin = document.getElementById("area-login");
  var areaPainel = document.getElementById("area-painel");
  var formLogin = document.getElementById("form-login");
  var erroLogin = document.getElementById("erro-login");

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

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
        "<h3>" + escapeHtml(q.texto) + "</h3>" +
        '<div class="resultado-meta">' + n + " respostas · média " + media.toFixed(2) + " / 4</div>" +
        barras;
      elResultados.appendChild(card);
    });
  }
  async function carregarPerguntas() {
    var lista = document.getElementById("lista-perguntas");
    lista.innerHTML = "";
    var res = await sb.from("questions").select("*").order("ordem", { ascending: true });
    if (res.error) {
      lista.innerHTML = '<p class="erro">Erro ao carregar perguntas.</p>';
      return;
    }
    res.data.forEach(function (q) {
      var row = document.createElement("div");
      row.className = "q-admin" + (q.ativa ? "" : " q-inativa");
      row.innerHTML =
        '<input type="number" value="' + q.ordem + '" title="Ordem">' +
        '<input type="text" value="' + escapeHtml(q.texto) + '">' +
        '<button class="btn btn-secundario btn-guardar">Guardar</button>' +
        '<button class="btn btn-secundario btn-toggle">' + (q.ativa ? "Desativar" : "Ativar") + "</button>";

      var inputOrdem = row.querySelector('input[type="number"]');
      var inputTexto = row.querySelector('input[type="text"]');

      row.querySelector(".btn-guardar").addEventListener("click", async function () {
        var up = await sb.from("questions")
          .update({ texto: inputTexto.value, ordem: parseInt(inputOrdem.value, 10) || 0 })
          .eq("id", q.id);
        if (up.error) { alert("Erro ao guardar."); console.error(up.error); return; }
        carregarPerguntas();
      });

      row.querySelector(".btn-toggle").addEventListener("click", async function () {
        var up = await sb.from("questions").update({ ativa: !q.ativa }).eq("id", q.id);
        if (up.error) { alert("Erro ao alterar estado."); console.error(up.error); return; }
        carregarPerguntas();
      });

      lista.appendChild(row);
    });
  }
  async function carregarTudo() {
    await carregarResultados();
    await carregarPerguntas();
  }
  document.getElementById("btn-adicionar").addEventListener("click", async function () {
    var texto = document.getElementById("nova-pergunta").value.trim();
    var ordem = parseInt(document.getElementById("nova-ordem").value, 10) || 0;
    if (!texto) { return; }
    var ins = await sb.from("questions").insert({ texto: texto, ordem: ordem, ativa: true });
    if (ins.error) { alert("Erro ao adicionar."); console.error(ins.error); return; }
    document.getElementById("nova-pergunta").value = "";
    document.getElementById("nova-ordem").value = "0";
    carregarPerguntas();
  });

  // Sessão persistida.
  sb.auth.getSession().then(function (res) {
    mostrarPainel(!!(res.data && res.data.session));
  });
})();
