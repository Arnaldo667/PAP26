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

  document.getElementById("btn-reset").addEventListener("click", async function () {
    if (!confirm(
      "Reiniciar os votos?\n\nIsto apaga TODAS as respostas e a contagem volta a " +
      "zero. Quem já tinha respondido poderá votar novamente. Esta ação é irreversível."
    )) { return; }

    var btn = this;
    btn.disabled = true;

    // 1) Apagar todas as respostas (cascata nas answers).
    var del = await sb.from("responses").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    // 2) Mudar o token de reset → reativa a votação em todos os dispositivos.
    var upd = await sb.from("survey_meta").update({ reset_token: crypto.randomUUID() }).eq("id", true);

    btn.disabled = false;
    if (del.error || upd.error) {
      alert("Ocorreu um erro ao reiniciar os votos.");
      console.error(del.error || upd.error);
      return;
    }
    alert("Votos reiniciados. A contagem está a zero e todos podem votar de novo.");
    carregarTudo();
  });

  var GRAUS = [4, 3, 2, 1];
  var ROTULOS = ["Muito Satisfeito", "Satisfeito", "Insatisfeito", "Muito Insatisfeito"];
  var CORES = ["#1f9d55", "#67b346", "#e8852b", "#d23a34"];
  var graficos = []; // instâncias Chart.js a destruir entre recargas

  function contar(answers) {
    var c = { 1: 0, 2: 0, 3: 0, 4: 0 };
    answers.forEach(function (a) { if (c[a.grau] != null) { c[a.grau]++; } });
    return c;
  }

  function media(answers) {
    if (!answers.length) { return 0; }
    var soma = answers.reduce(function (s, a) { return s + a.grau; }, 0);
    return soma / answers.length;
  }

  function criarDonut(canvas, contagem) {
    graficos.push(new Chart(canvas, {
      type: "doughnut",
      data: {
        labels: ROTULOS,
        datasets: [{
          data: GRAUS.map(function (g) { return contagem[g]; }),
          backgroundColor: CORES,
          borderWidth: 1,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "bottom" } },
      },
    }));
  }

  async function carregarResultados() {
    var elTotal = document.getElementById("total-respostas");
    var elResultados = document.getElementById("resultados");

    graficos.forEach(function (g) { g.destroy(); });
    graficos = [];
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
    var perguntas = qRes.data;
    var answers = aRes.data;

    // 1) Satisfação global (donut com todas as respostas).
    criarDonut(document.getElementById("g-global"), contar(answers));

    // 2) Média por pergunta (barras).
    graficos.push(new Chart(document.getElementById("g-medias"), {
      type: "bar",
      data: {
        labels: perguntas.map(function (q, i) { return "P" + (i + 1); }),
        datasets: [{
          label: "Média (1–4)",
          data: perguntas.map(function (q) {
            return media(answers.filter(function (a) { return a.question_id === q.id; }));
          }),
          backgroundColor: "#171927",
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { min: 0, max: 4, ticks: { stepSize: 1 } } },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: function (items) { return perguntas[items[0].dataIndex].texto; },
              label: function (it) { return "Média: " + it.parsed.y.toFixed(2) + " / 4"; },
            },
          },
        },
      },
    }));

    // 3) Donut por pergunta — criar o DOM primeiro, depois instanciar os gráficos
    //    (Chart.js precisa do canvas já no documento e com dimensões definidas).
    var grid = document.createElement("div");
    grid.className = "donut-grid";
    var porCriar = [];

    perguntas.forEach(function (q, i) {
      var desta = answers.filter(function (a) { return a.question_id === q.id; });

      var card = document.createElement("div");
      card.className = "donut-card";

      var h3 = document.createElement("h3");
      h3.textContent = "P" + (i + 1) + " — " + q.texto;

      var meta = document.createElement("div");
      meta.className = "resultado-meta";
      meta.textContent = desta.length + " respostas · média " + media(desta).toFixed(2) + " / 4";

      var wrap = document.createElement("div");
      wrap.className = "donut-wrap";
      var canvas = document.createElement("canvas");
      wrap.appendChild(canvas);

      card.appendChild(h3);
      card.appendChild(meta);
      card.appendChild(wrap);
      grid.appendChild(card);

      porCriar.push({ canvas: canvas, contagem: contar(desta) });
    });

    elResultados.appendChild(grid);
    porCriar.forEach(function (item) { criarDonut(item.canvas, item.contagem); });
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
