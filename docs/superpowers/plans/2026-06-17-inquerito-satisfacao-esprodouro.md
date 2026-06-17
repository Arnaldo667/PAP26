# Inquérito de Satisfação Esprodouro — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir um inquérito de satisfação iterativo da Esprodouro (landing → perguntas → conclusão) com painel de admin protegido, em HTML/CSS/JS estático sobre Supabase.

**Architecture:** Site estático de 4 páginas (`index`, `questionario`, `conclusao`, `admin`). Cabeçalho/rodapé partilhados injetados por `js/layout.js`. Dados e autenticação no Supabase via `@supabase/supabase-js` (CDN). Segurança por RLS: perguntas ativas públicas, respostas inseríveis por anónimos, leitura/gestão só por admin autenticado. O `id` da resposta é gerado no cliente (`crypto.randomUUID()`) para não exigir SELECT público. Regra "só uma vez" por `localStorage`.

**Tech Stack:** HTML5, CSS3, JavaScript (ES modules não necessários — scripts clássicos), Supabase JS v2 (CDN), PostgreSQL (Supabase).

> **Nota sobre verificação:** Não há test runner — é um site estático. A "verificação" de cada tarefa é manual no browser, servindo os ficheiros com `python3 -m http.server 8000` (executar a partir da raiz do projeto) e abrindo `http://localhost:8000/<pagina>.html`. As tarefas dependentes do Supabase só verificam totalmente após o `js/config.js` ter `url` e `anonKey` reais e o `schema.sql` ter sido corrido.

---

## Estrutura de ficheiros

```
/
├── index.html              Landing page
├── questionario.html       Perguntas (iterativo)
├── conclusao.html          Conclusão
├── admin.html              Login + resultados + gestão de perguntas
├── css/styles.css          Estilos partilhados
├── js/config.js            URL + anon key do Supabase (placeholders)
├── js/supabase.js          Inicialização do cliente (window.sb)
├── js/layout.js            Injeção de cabeçalho + rodapé
├── js/questionario.js      Lógica do questionário + submissão
├── js/conclusao.js         Guarda + mensagem de conclusão
├── js/admin.js             Auth + resultados + gestão de perguntas
├── supabase/schema.sql     Tabelas + RLS + grants + perguntas exemplo
├── Imagens/                Logótipo + tarja (já existentes)
└── README.md               Instruções de setup
```

---

## Task 1: Base de dados — schema.sql

**Files:**
- Create: `supabase/schema.sql`

- [ ] **Step 1: Escrever o schema SQL completo**

Create `supabase/schema.sql`:

```sql
-- ============================================================
-- Inquérito de Satisfação Esprodouro — schema + RLS
-- Correr no SQL Editor do projeto Supabase.
-- ============================================================

-- Tabelas -----------------------------------------------------
create table if not exists public.questions (
  id         uuid primary key default gen_random_uuid(),
  texto      text not null,
  ordem      int  not null default 0,
  ativa      boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.responses (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table if not exists public.answers (
  id          uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.responses(id) on delete cascade,
  question_id uuid not null references public.questions(id),
  grau        int  not null check (grau between 1 and 4),
  created_at  timestamptz not null default now()
);

-- Grants (RLS continua a ser a barreira real) -----------------
grant select, insert on public.questions to anon, authenticated;
grant update, delete on public.questions to authenticated;
grant insert on public.responses to anon, authenticated;
grant select on public.responses to authenticated;
grant insert on public.answers to anon, authenticated;
grant select on public.answers to authenticated;

-- RLS ---------------------------------------------------------
alter table public.questions enable row level security;
alter table public.responses enable row level security;
alter table public.answers   enable row level security;

-- questions
drop policy if exists questions_select_public_active on public.questions;
create policy questions_select_public_active on public.questions
  for select to anon using (ativa = true);

drop policy if exists questions_select_auth_all on public.questions;
create policy questions_select_auth_all on public.questions
  for select to authenticated using (true);

drop policy if exists questions_modify_auth on public.questions;
create policy questions_modify_auth on public.questions
  for all to authenticated using (true) with check (true);

-- responses
drop policy if exists responses_insert_public on public.responses;
create policy responses_insert_public on public.responses
  for insert to anon, authenticated with check (true);

drop policy if exists responses_select_auth on public.responses;
create policy responses_select_auth on public.responses
  for select to authenticated using (true);

-- answers
drop policy if exists answers_insert_public on public.answers;
create policy answers_insert_public on public.answers
  for insert to anon, authenticated with check (true);

drop policy if exists answers_select_auth on public.answers;
create policy answers_select_auth on public.answers
  for select to authenticated using (true);

-- Perguntas exemplo (apagar/editar à vontade no admin) --------
insert into public.questions (texto, ordem) values
  ('Como avalia a sua satisfação global com a Esprodouro?', 1),
  ('Como avalia as instalações e os equipamentos?', 2),
  ('Como avalia o desempenho dos professores/formadores?', 3),
  ('Como avalia o atendimento dos serviços administrativos (secretaria)?', 4),
  ('Como avalia a comunicação e a informação prestada pela escola?', 5),
  ('Como avalia a oferta formativa e as atividades?', 6),
  ('Como avalia o ambiente e a relação na comunidade escolar?', 7),
  ('Recomendaria a Esprodouro a outras pessoas?', 8);
```

- [ ] **Step 2: Verificar (manual, pelo utilizador)**

Correr o conteúdo no SQL Editor do Supabase. Esperado: execução sem erros; em Table Editor aparecem `questions` (8 linhas), `responses` (0), `answers` (0); RLS ativo nas 3 tabelas.

- [ ] **Step 3: Commit**

```bash
git add supabase/schema.sql
git commit -m "feat: schema Supabase (tabelas, RLS, perguntas exemplo)"
```

---

## Task 2: Configuração e cliente Supabase

**Files:**
- Create: `js/config.js`
- Create: `js/supabase.js`

- [ ] **Step 1: Criar config.js com placeholders**

Create `js/config.js`:

```js
// Preencher com os valores do projeto Supabase:
// Project Settings → API → Project URL e anon public key.
window.SUPABASE_CONFIG = {
  url: "https://SEU_PROJETO.supabase.co",
  anonKey: "SUA_ANON_PUBLIC_KEY",
};
```

- [ ] **Step 2: Criar supabase.js (inicializa window.sb)**

Create `js/supabase.js`:

```js
// Requer: <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
// e <script src="js/config.js"></script> carregados antes deste ficheiro.
(function () {
  if (!window.supabase || !window.SUPABASE_CONFIG) {
    console.error("Supabase ou config não carregados.");
    return;
  }
  window.sb = window.supabase.createClient(
    window.SUPABASE_CONFIG.url,
    window.SUPABASE_CONFIG.anonKey
  );
})();
```

- [ ] **Step 3: Commit**

```bash
git add js/config.js js/supabase.js
git commit -m "feat: config e inicialização do cliente Supabase"
```

---

## Task 3: Estilos partilhados

**Files:**
- Create: `css/styles.css`

- [ ] **Step 1: Escrever os estilos**

Create `css/styles.css`:

```css
:root {
  --azul-escuro: #171927;
  --vermelho: #e2001a;
  --cinza: #555;
  --cinza-claro: #f4f4f6;
  --branco: #fff;
  --raio: 12px;
  --sombra: 0 2px 10px rgba(0, 0, 0, 0.08);
}

* { box-sizing: border-box; }

html, body { margin: 0; padding: 0; }

body {
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  color: #1d1d22;
  background: var(--cinza-claro);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Cabeçalho */
.site-header {
  background: var(--azul-escuro);
  padding: 18px 24px;
  text-align: center;
}
.site-header .logo { height: 56px; max-width: 90%; object-fit: contain; }

/* Rodapé */
.site-footer {
  margin-top: auto;
  background: var(--branco);
  padding: 18px 16px;
  text-align: center;
  border-top: 1px solid #e3e3e8;
}
.site-footer .tarja { width: 100%; max-width: 1100px; height: auto; }

/* Conteúdo */
main {
  flex: 1;
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  padding: 32px 20px;
}

h1 { color: var(--azul-escuro); font-size: 1.8rem; }
p.lead { font-size: 1.1rem; color: var(--cinza); }

/* Botões gerais */
.btn {
  display: inline-block;
  border: none;
  border-radius: var(--raio);
  padding: 14px 28px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  background: var(--vermelho);
  color: var(--branco);
  text-decoration: none;
}
.btn:hover { filter: brightness(0.95); }
.btn-secundario { background: #e6e6ec; color: #333; }

/* Cartão */
.cartao {
  background: var(--branco);
  border-radius: var(--raio);
  box-shadow: var(--sombra);
  padding: 28px;
}

/* Progresso */
.progresso { margin-bottom: 22px; }
.progresso-texto { font-size: 0.95rem; color: var(--cinza); margin-bottom: 8px; }
.progresso-barra { height: 8px; background: #e6e6ec; border-radius: 999px; overflow: hidden; }
.progresso-fill { height: 100%; background: var(--vermelho); width: 0; transition: width 0.25s ease; }

/* Pergunta */
.pergunta-texto { font-size: 1.45rem; color: var(--azul-escuro); margin: 8px 0 28px; }

/* Botões de grau */
.graus { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.grau-btn {
  border: 2px solid transparent;
  border-radius: var(--raio);
  padding: 26px 16px;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--branco);
  cursor: pointer;
  transition: transform 0.08s ease, box-shadow 0.15s ease;
}
.grau-btn:hover { transform: translateY(-2px); box-shadow: var(--sombra); }
.grau-4 { background: #1f9d55; } /* Muito Satisfeito */
.grau-3 { background: #67b346; } /* Satisfeito */
.grau-2 { background: #e8852b; } /* Insatisfeito */
.grau-1 { background: #d23a34; } /* Muito Insatisfeito */

.nav-pergunta { margin-top: 22px; display: flex; justify-content: space-between; }

/* Admin */
.login-form { max-width: 360px; margin: 0 auto; display: flex; flex-direction: column; gap: 12px; }
.login-form input { padding: 12px; border: 1px solid #ccc; border-radius: 8px; font-size: 1rem; }
.erro { color: var(--vermelho); font-weight: 600; }

.resultado-pergunta { background: var(--branco); border-radius: var(--raio); box-shadow: var(--sombra); padding: 20px; margin-bottom: 16px; }
.resultado-pergunta h3 { margin: 0 0 6px; color: var(--azul-escuro); font-size: 1.1rem; }
.resultado-meta { color: var(--cinza); font-size: 0.9rem; margin-bottom: 12px; }
.barra-linha { display: flex; align-items: center; gap: 10px; margin: 6px 0; font-size: 0.9rem; }
.barra-rotulo { width: 150px; flex: none; }
.barra-track { flex: 1; background: #eee; border-radius: 999px; height: 18px; overflow: hidden; }
.barra-valor { height: 100%; border-radius: 999px; }
.barra-num { width: 40px; text-align: right; flex: none; }

.q-admin { display: flex; align-items: center; gap: 10px; background: var(--branco); padding: 12px; border-radius: 8px; box-shadow: var(--sombra); margin-bottom: 8px; }
.q-admin input[type="text"] { flex: 1; padding: 8px; border: 1px solid #ccc; border-radius: 6px; }
.q-admin input[type="number"] { width: 64px; padding: 8px; border: 1px solid #ccc; border-radius: 6px; }
.q-inativa { opacity: 0.5; }

@media (max-width: 520px) {
  .graus { grid-template-columns: 1fr; }
  .site-header .logo { height: 44px; }
}
```

- [ ] **Step 2: Commit**

```bash
git add css/styles.css
git commit -m "feat: estilos partilhados"
```

---

## Task 4: Cabeçalho e rodapé partilhados

**Files:**
- Create: `js/layout.js`

- [ ] **Step 1: Escrever layout.js**

Create `js/layout.js`:

```js
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
```

- [ ] **Step 2: Verificar (manual)**

Será verificado ao abrir as páginas nas tarefas seguintes: o cabeçalho azul `#171927` com o logótipo branco aparece no topo e a tarja no fundo.

- [ ] **Step 3: Commit**

```bash
git add js/layout.js
git commit -m "feat: cabeçalho e rodapé partilhados"
```

---

## Task 5: Landing page

**Files:**
- Create: `index.html`

- [ ] **Step 1: Escrever index.html**

Create `index.html`:

```html
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Inquérito de Satisfação — Esprodouro</title>
  <link rel="stylesheet" href="css/styles.css">
</head>
<body>
  <main>
    <div class="cartao">
      <h1>Inquérito de Satisfação</h1>
      <div id="conteudo-inicio">
        <p class="lead">
          A sua opinião é importante para a Esprodouro. Este questionário é
          anónimo e demora cerca de 2 minutos.
        </p>
        <a class="btn" href="questionario.html">Iniciar questionário</a>
      </div>
      <p id="ja-respondeu" class="lead" style="display:none">
        Já respondeu a este inquérito neste dispositivo. Obrigado pela sua
        participação!
      </p>
    </div>
  </main>

  <script src="js/layout.js"></script>
  <script>
    if (localStorage.getItem("esprodouro_inquerito_respondido") === "true") {
      document.getElementById("conteudo-inicio").style.display = "none";
      document.getElementById("ja-respondeu").style.display = "block";
    }
  </script>
</body>
</html>
```

- [ ] **Step 2: Verificar (manual)**

A partir da raiz do projeto: `python3 -m http.server 8000`, abrir `http://localhost:8000/index.html`. Esperado: cabeçalho azul com logótipo, cartão com botão "Iniciar questionário", rodapé com a tarja. Em DevTools → Console: `localStorage.setItem("esprodouro_inquerito_respondido","true")` e recarregar → mostra a mensagem de "já respondeu". Limpar depois: `localStorage.clear()`.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: landing page"
```

---

## Task 6: Questionário iterativo

**Files:**
- Create: `questionario.html`
- Create: `js/questionario.js`

- [ ] **Step 1: Escrever questionario.html**

Create `questionario.html`:

```html
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Questionário — Esprodouro</title>
  <link rel="stylesheet" href="css/styles.css">
</head>
<body>
  <main>
    <div class="cartao" id="cartao">
      <div class="progresso">
        <div class="progresso-texto" id="progresso-texto">A carregar…</div>
        <div class="progresso-barra"><div class="progresso-fill" id="progresso-fill"></div></div>
      </div>

      <div id="pergunta-area">
        <p class="pergunta-texto" id="pergunta-texto"></p>
        <div class="graus">
          <button class="grau-btn grau-4" data-grau="4">Muito Satisfeito</button>
          <button class="grau-btn grau-3" data-grau="3">Satisfeito</button>
          <button class="grau-btn grau-2" data-grau="2">Insatisfeito</button>
          <button class="grau-btn grau-1" data-grau="1">Muito Insatisfeito</button>
        </div>
        <div class="nav-pergunta">
          <button class="btn btn-secundario" id="btn-anterior" style="visibility:hidden">← Anterior</button>
          <span></span>
        </div>
      </div>

      <p id="estado" class="lead" style="display:none"></p>
    </div>
  </main>

  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script src="js/config.js"></script>
  <script src="js/supabase.js"></script>
  <script src="js/layout.js"></script>
  <script src="js/questionario.js"></script>
</body>
</html>
```

- [ ] **Step 2: Escrever js/questionario.js**

Create `js/questionario.js`:

```js
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
```

- [ ] **Step 3: Verificar (manual, requer config + schema)**

Com `js/config.js` preenchido e `schema.sql` corrido: abrir `http://localhost:8000/questionario.html`. Esperado: surge a 1ª pergunta com a barra de progresso e os 4 botões grandes; clicar avança; "Anterior" volta; na última, ao escolher, submete e redireciona para `conclusao.html`. No Supabase, `responses` ganha 1 linha e `answers` ganha N linhas (grau 1–4).

- [ ] **Step 4: Commit**

```bash
git add questionario.html js/questionario.js
git commit -m "feat: questionário iterativo com submissão"
```

---

## Task 7: Página de conclusão

**Files:**
- Create: `conclusao.html`
- Create: `js/conclusao.js`

- [ ] **Step 1: Escrever conclusao.html**

Create `conclusao.html`:

```html
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Obrigado — Esprodouro</title>
  <link rel="stylesheet" href="css/styles.css">
</head>
<body>
  <main>
    <div class="cartao" style="text-align:center">
      <h1>Obrigado!</h1>
      <p class="lead">
        As suas respostas foram registadas com sucesso. Agradecemos a sua
        participação e o contributo para melhorarmos a Esprodouro.
      </p>
    </div>
  </main>

  <script src="js/layout.js"></script>
  <script src="js/conclusao.js"></script>
</body>
</html>
```

- [ ] **Step 2: Escrever js/conclusao.js**

Create `js/conclusao.js`:

```js
// Garante coerência: só vê esta página quem completou o inquérito.
(function () {
  if (localStorage.getItem("esprodouro_inquerito_respondido") !== "true") {
    window.location.replace("index.html");
  }
})();
```

- [ ] **Step 3: Verificar (manual)**

Após submeter o questionário, é redirecionado para aqui e vê a mensagem de agradecimento. Abrir `conclusao.html` diretamente sem a flag (`localStorage.clear()`) → redireciona para `index.html`.

- [ ] **Step 4: Commit**

```bash
git add conclusao.html js/conclusao.js
git commit -m "feat: página de conclusão com guarda"
```

---

## Task 8: Admin — autenticação

**Files:**
- Create: `admin.html`
- Create: `js/admin.js`

- [ ] **Step 1: Escrever admin.html**

Create `admin.html`:

```html
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Administração — Esprodouro</title>
  <link rel="stylesheet" href="css/styles.css">
</head>
<body>
  <main>
    <!-- Login -->
    <div class="cartao" id="area-login">
      <h1>Administração</h1>
      <form class="login-form" id="form-login">
        <input type="email" id="email" placeholder="Email" required autocomplete="username">
        <input type="password" id="password" placeholder="Palavra-passe" required autocomplete="current-password">
        <button class="btn" type="submit">Entrar</button>
        <p class="erro" id="erro-login" style="display:none"></p>
      </form>
    </div>

    <!-- Painel -->
    <div id="area-painel" style="display:none">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px">
        <h1 style="margin:0">Resultados</h1>
        <button class="btn btn-secundario" id="btn-logout">Terminar sessão</button>
      </div>

      <p class="lead" id="total-respostas">—</p>
      <div id="resultados"></div>

      <h1 style="margin-top:36px">Gestão de perguntas</h1>
      <div id="lista-perguntas"></div>
      <div class="q-admin" style="margin-top:12px">
        <input type="text" id="nova-pergunta" placeholder="Texto da nova pergunta">
        <input type="number" id="nova-ordem" placeholder="Ordem" value="0">
        <button class="btn" id="btn-adicionar">Adicionar</button>
      </div>
    </div>
  </main>

  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script src="js/config.js"></script>
  <script src="js/supabase.js"></script>
  <script src="js/layout.js"></script>
  <script src="js/admin.js"></script>
</body>
</html>
```

- [ ] **Step 2: Escrever js/admin.js (apenas auth nesta tarefa)**

Create `js/admin.js`:

```js
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
```

- [ ] **Step 3: Verificar (manual, requer admin criado)**

Criar utilizador admin no Supabase (Authentication → Users). Abrir `http://localhost:8000/admin.html`: login com credenciais erradas → "Credenciais inválidas"; login correto → mostra o painel; "Terminar sessão" → volta ao login; recarregar com sessão ativa → continua no painel.

- [ ] **Step 4: Commit**

```bash
git add admin.html js/admin.js
git commit -m "feat: admin com autenticação Supabase"
```

---

## Task 9: Admin — resultados (resumo + gráficos)

**Files:**
- Modify: `js/admin.js`

- [ ] **Step 1: Implementar carregarResultados()**

Em `js/admin.js`, substituir a função vazia `async function carregarResultados() {}` por:

```js
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
```

- [ ] **Step 2: Verificar (manual)**

Com pelo menos uma submissão feita: entrar no admin. Esperado: "Total de respostas: N" e, por pergunta, um cartão com a média (x.xx/4) e 4 barras (uma por grau) com contagens corretas.

- [ ] **Step 3: Commit**

```bash
git add js/admin.js
git commit -m "feat: admin resultados com resumo e gráficos"
```

---

## Task 10: Admin — gestão de perguntas

**Files:**
- Modify: `js/admin.js`

- [ ] **Step 1: Implementar carregarPerguntas() e ações**

Em `js/admin.js`, substituir a função vazia `async function carregarPerguntas() {}` por:

```js
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
        '<input type="text" value="' + (q.texto || "").replace(/"/g, "&quot;") + '">' +
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
```

- [ ] **Step 2: Ligar o botão "Adicionar"**

Em `js/admin.js`, imediatamente antes da linha `window.__carregarTudo = carregarTudo;`, adicionar:

```js
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
```

- [ ] **Step 3: Verificar (manual)**

No admin: a lista mostra todas as perguntas (ativas e inativas, estas esbatidas). Editar texto/ordem + "Guardar" persiste. "Desativar"/"Ativar" alterna e a pergunta deixa/volta a aparecer no questionário público. "Adicionar" cria nova pergunta. Confirmar no Table Editor do Supabase.

- [ ] **Step 4: Commit**

```bash
git add js/admin.js
git commit -m "feat: admin gestão de perguntas (criar, editar, ativar/desativar)"
```

---

## Task 11: README com instruções de setup

**Files:**
- Create: `README.md`

- [ ] **Step 1: Escrever README.md**

Create `README.md`:

```markdown
# Inquérito de Satisfação — Esprodouro

Site estático (HTML/CSS/JS) com Supabase para recolher e analisar a satisfação.

## Páginas
- `index.html` — landing page
- `questionario.html` — perguntas (uma de cada vez, 4 botões de grau)
- `conclusao.html` — agradecimento
- `admin.html` — login + resultados + gestão de perguntas

## Setup (uma vez)
1. **Base de dados:** no projeto Supabase, abrir SQL Editor e correr `supabase/schema.sql`.
2. **Admin:** em Authentication → Users → Add user, criar o utilizador admin (email + palavra-passe).
3. **Chaves:** em Project Settings → API, copiar o *Project URL* e a *anon public key* para `js/config.js`.

## Correr localmente
A partir da raiz do projeto:
```
python3 -m http.server 8000
```
Abrir http://localhost:8000/

## Publicar
Carregar todos os ficheiros para qualquer alojamento estático (Vercel, Netlify, etc.).
Garantir que a pasta `Imagens/` e o `js/config.js` preenchido vão junto.

## Notas
- A regra "só responder uma vez" usa `localStorage` (por dispositivo/navegador); é anónima e contornável trocando de navegador.
- A segurança dos dados está nas políticas RLS do Supabase: o público só lê perguntas ativas e insere respostas; ler resultados e gerir perguntas exige login de admin.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: README com instruções de setup"
```

---

## Verificação final (end-to-end)

- [ ] Com `js/config.js` preenchido, `schema.sql` corrido e admin criado:
  1. `index.html` → "Iniciar" → responder a todas as perguntas → `conclusao.html`.
  2. Tentar reabrir `questionario.html` → redireciona para `index.html` ("já respondeu").
  3. `admin.html` → login → ver total e gráficos refletindo a resposta dada.
  4. Gerir perguntas: adicionar/editar/desativar; confirmar efeito no questionário (após `localStorage.clear()` para poder responder de novo).
  5. Cabeçalho azul `#171927` com logótipo branco e rodapé com a tarja em todas as páginas.

---

## Cobertura do spec (self-review)

- Landing page → Task 5 ✓
- Perguntas iterativas, 4 botões de grau → Task 6 ✓
- Página de conclusão → Task 7 ✓
- Admin com Supabase Auth → Task 8 ✓
- Resultados (resumo + gráficos) → Task 9 ✓
- Perguntas geríveis no admin → Task 10 ✓
- Supabase + RLS → Task 1 ✓
- "Só uma vez" por localStorage → Tasks 5, 6, 7 ✓
- Cabeçalho (logótipo, azul #171927) + rodapé (tarja) → Tasks 3, 4 ✓
- Respondentes anónimos → sem recolha de dados pessoais ✓
```
