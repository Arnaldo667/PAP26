# Inquérito de Satisfação Esprodouro — Design

**Data:** 2026-06-17
**Autor:** Esprodouro (geral@esprodouro.com) + Claude Code

## Objetivo

Aplicação web para recolher o grau de satisfação relativamente à Esprodouro
através de um questionário iterativo (uma pergunta de cada vez), com painel de
administração protegido para consultar resultados e gerir perguntas.

## Stack tecnológica

- **Frontend:** HTML + CSS + JavaScript estático (sem framework / sem build).
- **Backend / dados / auth:** Supabase (`@supabase/supabase-js` via CDN no browser).
- **Alojamento:** qualquer estático (Vercel, Netlify, etc.).
- **Gráficos:** renderizados em HTML/CSS (barras), sem dependências pesadas.

O projeto Supabase já existe; serão fornecidos `URL` e `anon key` num
`js/config.js`. O utilizador admin é criado no painel do Supabase.

## Páginas

1. **`index.html` — Landing page**
   - Cabeçalho (logótipo) + rodapé (tarja).
   - Mensagem de boas-vindas e botão "Iniciar questionário".
   - Se `localStorage` indicar que o dispositivo já respondeu, mostra mensagem
     "Já respondeu a este inquérito. Obrigado!" e esconde o botão de iniciar.

2. **`questionario.html` — Perguntas (iterativo)**
   - Carrega da BD as perguntas `ativas`, ordenadas por `ordem`.
   - Mostra **uma pergunta de cada vez** com barra de progresso (ex.: "3 de 8").
   - **4 botões grandes**, com o valor (`grau`) associado:
     - Muito Satisfeito → 4
     - Satisfeito → 3
     - Insatisfeito → 2
     - Muito Insatisfeito → 1
   - Ao clicar num botão, guarda a escolha em memória e avança automaticamente
     para a pergunta seguinte. Permite voltar à pergunta anterior.
   - Na última pergunta, ao responder, submete tudo e segue para a conclusão.
   - Se o dispositivo já respondeu (localStorage), redireciona para `index.html`.

3. **`conclusao.html` — Conclusão**
   - Grava no Supabase: cria 1 linha em `responses` e N linhas em `answers`.
     (A submissão é acionada no fim do questionário; esta página confirma.)
   - Marca `localStorage` (`esprodouro_inquerito_respondido = true`) para impedir
     nova submissão no mesmo navegador.
   - Mensagem de agradecimento.

4. **`admin.html` — Administração**
   - **Login** via Supabase Auth (email + password). Sessão persistida.
   - Após autenticação:
     - **Resultados:** total de respostas; por pergunta, média do grau e
       distribuição (barras) por cada um dos 4 graus.
     - **Gestão de perguntas:** listar, adicionar, editar texto/ordem,
       ativar/desativar perguntas.
     - Botão de terminar sessão (logout).
   - Sem sessão válida, mostra apenas o formulário de login.

Todas as páginas partilham um **cabeçalho** com fundo na cor da marca (vermelho
Esprodouro) e o logótipo branco (`Imagens/AF_LogoEsprodouro2025White-01.png`), e
um **rodapé** com a tarja (`Imagens/Tarja Geral 2025-2026.png`). O cabeçalho
tem fundo azul escuro `#171927`. O cabeçalho e
rodapé são injetados por um pequeno script partilhado (`js/layout.js`) para
evitar duplicação.

## Modelo de dados (Supabase / PostgreSQL)

### `questions`
| coluna       | tipo        | notas                                  |
|--------------|-------------|----------------------------------------|
| `id`         | uuid (PK)   | default `gen_random_uuid()`            |
| `texto`      | text        | enunciado da pergunta                  |
| `ordem`      | int         | ordem de apresentação                  |
| `ativa`      | boolean     | default `true`                         |
| `created_at` | timestamptz | default `now()`                        |

### `responses`
| coluna       | tipo        | notas                       |
|--------------|-------------|-----------------------------|
| `id`         | uuid (PK)   | default `gen_random_uuid()` |
| `created_at` | timestamptz | default `now()`             |

### `answers`
| coluna        | tipo        | notas                                         |
|---------------|-------------|-----------------------------------------------|
| `id`          | uuid (PK)   | default `gen_random_uuid()`                   |
| `response_id` | uuid (FK)   | → `responses.id`, `on delete cascade`         |
| `question_id` | uuid (FK)   | → `questions.id`                              |
| `grau`        | int         | 1–4 (check constraint)                        |
| `created_at`  | timestamptz | default `now()`                               |

## Segurança (RLS)

RLS ativado em todas as tabelas.

- **`questions`**
  - SELECT público apenas das ativas (`ativa = true`).
  - INSERT/UPDATE/DELETE apenas para `authenticated` (admin).
  - SELECT de todas (incl. inativas) para `authenticated`.
- **`responses`** e **`answers`**
  - INSERT público (anon) — permite submeter respostas.
  - SELECT apenas para `authenticated` (admin vê resultados).
  - Sem UPDATE/DELETE público.

A `anon key` é pública por natureza; a proteção real está nas políticas RLS.

## Regra "só uma vez"

- Mecanismo escolhido: **por dispositivo/navegador** via `localStorage`.
- Após submissão bem-sucedida, grava `esprodouro_inquerito_respondido = "true"`.
- Landing e questionário verificam essa marca e impedem nova resposta.
- Limitação aceite: contornável trocando de navegador/dispositivo ou limpando
  o armazenamento. Adequado a inquérito anónimo.

## Respondentes

Anónimo / público geral. Não são recolhidos dados pessoais nem identificação.

## Aspeto visual

- Cor do cabeçalho: **azul escuro `#171927`**, para o logótipo branco
  contrastar. Vermelho da marca (do "DOURO" do logótipo) como cor de destaque;
  cinza/neutros para o restante.
- Botões de grau grandes, com cores intuitivas (verde→vermelho do mais
  satisfeito ao menos satisfeito), acessíveis (contraste e tamanho de toque).
- Responsivo (telemóvel e desktop).

## Estrutura de ficheiros

```
/
├── index.html
├── questionario.html
├── conclusao.html
├── admin.html
├── css/
│   └── styles.css
├── js/
│   ├── config.js        (URL + anon key do Supabase — placeholders)
│   ├── supabase.js      (inicialização do cliente)
│   ├── layout.js        (injeção de cabeçalho + rodapé)
│   ├── questionario.js
│   ├── conclusao.js     (ou submissão integrada no questionario.js)
│   └── admin.js
├── Imagens/             (logótipo + tarja — já existentes)
└── supabase/
    └── schema.sql       (criação de tabelas + RLS + perguntas exemplo)
```

## Fora de âmbito (YAGNI)

- Tabela detalhada de respostas individuais e exportação CSV.
- Códigos/tokens únicos por respondente.
- Recolha de dados do respondente (curso, tipo).
- Multi-idioma.

## Setup necessário (utilizador)

1. Correr `supabase/schema.sql` no SQL Editor do projeto Supabase.
2. Criar o utilizador admin em Authentication → Users (email + password).
3. Preencher `js/config.js` com o `Project URL` e a `anon public key`.
4. Publicar os ficheiros estáticos.
