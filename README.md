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
