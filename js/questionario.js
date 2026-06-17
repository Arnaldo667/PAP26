(function () {
  var FLAG = "esprodouro_inquerito_respondido";

  // Bloqueia repetição no mesmo dispositivo.
  if (localStorage.getItem(FLAG) === "true") {
    window.location.replace("index.html");
    return;
  }

  var perguntas = [];     // [{id, texto, ordem}]
  var respostas = {};     // { question_id: grau }
  var indice = 0;

  var elTexto = document.getElementById("pergunta-texto");
  var elProgTexto = document.getElementById("progresso-texto");
  var elProgFill = document.getElementById("progresso-fill");
  var elAnterior = document.getElementById("btn-anterior");
  var elArea = document.getElementById("pergunta-area");
  var elEstado = document.getElementById("estado");

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

    localStorage.setItem(FLAG, "true");
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
