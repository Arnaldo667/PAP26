(function () {
  var VOTO_TOKEN = "esprodouro_voto_token";

  var perguntas = [];     // [{id, texto, ordem}]
  var respostas = {};     // { question_id: grau }
  var indice = 0;
  var resetToken = null;  // token de reset atual (estado do inquérito)

  var elTexto = document.getElementById("pergunta-texto");
  var elProgTexto = document.getElementById("progresso-texto");
  var elProgFill = document.getElementById("progresso-fill");
  var elAnterior = document.getElementById("btn-anterior");
  var elArea = document.getElementById("pergunta-area");
  var elEstado = document.getElementById("estado");

  function bloquear() {
    var progresso = document.querySelector(".progresso");
    if (progresso) { progresso.style.display = "none"; }
    elArea.style.display = "none";
    elEstado.style.display = "block";
    elEstado.innerHTML =
      "Já respondeu a este inquérito neste dispositivo. Obrigado pela sua " +
      'participação!<br><br><a class="btn" href="index.html">Voltar ao início</a>';
  }

  function mostrarPergunta() {
    var q = perguntas[indice];
    elTexto.textContent = q.texto;
    elProgTexto.textContent = "Pergunta " + (indice + 1) + " de " + perguntas.length;
    elProgFill.style.width = ((indice) / perguntas.length * 100) + "%";
    elAnterior.style.visibility = indice === 0 ? "hidden" : "visible";
  }

  function escolher(grau) {
    respostas[perguntas[indice].id] = grau;
    if (indice < perguntas.length - 1) {
      indice++;
      mostrarPergunta();
    } else {
      submeter();
    }
  }

  function anterior() {
    if (indice > 0) { indice--; mostrarPergunta(); }
  }

  async function submeter() {
    elArea.style.display = "none";
    elEstado.style.display = "block";
    elEstado.textContent = "A submeter as suas respostas…";

    var responseId = crypto.randomUUID();
    var rInsert = await window.sb.from("responses").insert({ id: responseId });
    if (rInsert.error) { return falhar(rInsert.error); }

    var linhas = Object.keys(respostas).map(function (qid) {
      return { response_id: responseId, question_id: qid, grau: respostas[qid] };
    });
    var aInsert = await window.sb.from("answers").insert(linhas);
    if (aInsert.error) { return falhar(aInsert.error); }

    // Regista o token de reset sob o qual votou; se o admin fizer reset,
    // o token muda e este dispositivo volta a poder votar.
    localStorage.setItem(VOTO_TOKEN, resetToken);
    window.location.replace("conclusao.html");
  }

  function falhar(error) {
    console.error(error);
    elEstado.className = "erro";
    elEstado.textContent =
      "Ocorreu um erro ao submeter. Verifique a ligação e tente novamente.";
    elArea.style.display = "block";
  }

  async function carregar() {
    // Estado do inquérito (token de reset). Se a tabela ainda não existir,
    // usa um valor de recurso para o bloqueio continuar a funcionar.
    var metaRes = await window.sb.from("survey_meta").select("reset_token").limit(1).maybeSingle();
    resetToken = (metaRes && metaRes.data && metaRes.data.reset_token) || "sem-token";

    // Já votou nesta ronda neste dispositivo?
    if (localStorage.getItem(VOTO_TOKEN) === resetToken) {
      bloquear();
      return;
    }

    var res = await window.sb
      .from("questions")
      .select("id, texto, ordem")
      .eq("ativa", true)
      .order("ordem", { ascending: true });

    if (res.error) {
      elProgTexto.textContent = "";
      elTexto.textContent = "Não foi possível carregar as perguntas.";
      console.error(res.error);
      return;
    }
    perguntas = res.data || [];
    if (perguntas.length === 0) {
      elArea.style.display = "none";
      elProgTexto.textContent = "";
      elEstado.style.display = "block";
      elEstado.textContent = "Não há perguntas disponíveis de momento.";
      return;
    }
    mostrarPergunta();
  }

  document.querySelectorAll(".grau-btn").forEach(function (b) {
    b.addEventListener("click", function () {
      escolher(parseInt(b.getAttribute("data-grau"), 10));
    });
  });
  elAnterior.addEventListener("click", anterior);

  carregar();
})();
