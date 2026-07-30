# Rotina Faculdade 🎓

Sistema web simples e pessoal para organizar sua rotina da faculdade: matérias, tarefas, provas, anotações e calendário — tudo em um só lugar.

Construído apenas com **HTML5 + CSS3 + JavaScript (ES6) + Supabase**, sem frameworks.

## Estrutura do projeto

```
faculdade-planner/
├── index.html            → Login / Cadastro / Recuperação de senha
├── dashboard.html         → Visão geral
├── materias.html          → Gerenciar matérias
├── tarefas.html           → Gerenciar tarefas e provas
├── anotacoes.html         → Anotações de aula
├── calendario.html        → Calendário mensal
├── configuracoes.html     → Perfil, senha e lembretes via Telegram
├── vercel.json
├── api/
│   ├── lembretes.js           → Job que envia os avisos via Telegram
│   └── telegram-webhook.js    → Recebe mensagens do bot e vincula a conta
├── css/
│   ├── style.css          → Layout, sidebar, tema
│   └── components.css     → Botões, cards, modais, badges etc.
├── js/
│   ├── supabaseClient.js  → Configuração da conexão com o Supabase
│   ├── utils.js           → Funções auxiliares (datas, toasts, etc.)
│   ├── auth.js            → Login, cadastro, recuperação de senha, guarda de sessão
│   ├── sidebar.js          → Menu lateral reutilizável
│   ├── dashboard.js
│   ├── materias.js
│   ├── tarefas.js
│   ├── anotacoes.js
│   ├── calendario.js
│   └── configuracoes.js
├── components/            → (reservado para componentes futuros)
├── assets/                → (reservado para imagens/ícones)
└── sql/
    ├── schema.sql             → Script para criar as tabelas no Supabase
    └── migracao_telegram.sql  → Campos e tabela para os lembretes via Telegram
```

## 1. Criar o projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e crie um novo projeto (gratuito).
2. Vá em **SQL Editor** → cole todo o conteúdo do arquivo `sql/schema.sql` → execute.
   Isso cria as tabelas `usuarios`, `materias`, `tarefas`, `anotacoes`, `eventos`, todas com **Row Level Security** ativado e políticas que garantem que cada pessoa só vê seus próprios dados.
3. Vá em **Authentication → Providers** e confirme que o login por **Email** está habilitado.
4. (Opcional) Em **Authentication → Email Templates**, personalize os e-mails de confirmação e recuperação de senha.
5. Em **Authentication → URL Configuration**, adicione a URL do seu site (ex: `https://seu-projeto.vercel.app`) em "Redirect URLs" — necessário para o link de recuperação de senha funcionar.

## 2. Conectar o front-end ao Supabase

Abra `js/supabaseClient.js` e substitua:

```js
const SUPABASE_URL = 'https://SEU-PROJETO.supabase.co';
const SUPABASE_ANON_KEY = 'SUA_CHAVE_ANON_PUBLICA';
```

Essas informações estão em **Project Settings → API** no painel do Supabase. Use a chave **anon/public** (nunca a `service_role`).

## 3. Rodar localmente

Como é um site estático, basta servir os arquivos com qualquer servidor HTTP simples, por exemplo:

```bash
npx serve .
# ou
python3 -m http.server 5500
```

Depois acesse `http://localhost:5500` (ou a porta indicada).

> Abrir o `index.html` direto pelo navegador (`file://`) pode causar problemas de CORS com o Supabase — prefira sempre um servidor local.

## 4. Publicar na Vercel

1. Suba esta pasta para um repositório no GitHub (ou importe a pasta direto).
2. Na Vercel, clique em **New Project** → importe o repositório.
3. Como é um projeto estático (sem build), configure:
   - **Framework Preset:** Other
   - **Build Command:** (deixe vazio)
   - **Output Directory:** `.` (raiz)
4. Clique em **Deploy**.

## Funcionalidades

- **Login/Cadastro/Recuperação de senha** via Supabase Auth.
- **Dashboard** com próximas tarefas, próximas provas, últimas anotações, calendário do mês e lista de matérias.
- **Matérias**: criar, editar, excluir; cada matéria tem nome, professor, horário e cor. Clicar em uma matéria mostra suas tarefas e anotações.
- **Tarefas**: criar, editar, excluir, marcar como concluída; filtros por pendentes/concluídas/matéria; suporte a tipo "prova".
- **Anotações**: criar, editar, excluir; pesquisa por título; filtro por matéria.
- **Calendário**: visão mensal com tarefas, provas e eventos; clique em um dia para ver ou adicionar um evento.
- **Configurações**: editar nome do perfil, alterar senha e configurar lembretes via Telegram (com antecedência em dias/horas/minutos).

Todos os dados são isolados por usuário através de Row Level Security no Postgres — cada pessoa só acessa o que é seu.

## 5. Lembretes via Telegram (opcional)

O sistema pode avisar em um chat do Telegram quando uma tarefa/prova estiver perto de vencer, com a antecedência (dias, horas e minutos) que cada usuário configurar. São duas funções serverless: uma que envia os avisos (`api/lembretes.js`) e outra que recebe as mensagens do bot para vincular a conta (`api/telegram-webhook.js`).

### 5.1. Rodar a migração no Supabase
No **SQL Editor** do Supabase, rode também o arquivo `sql/migracao_telegram.sql` (além do `schema.sql`). Ele adiciona os campos de vinculação/antecedência na tabela `usuarios` e cria a tabela `lembretes_enviados` (evita mandar o mesmo aviso duas vezes).

### 5.2. Criar o bot no Telegram
1. No Telegram, procure o **@BotFather** e mande `/newbot`, seguindo as instruções.
2. Guarde o **token** que ele te der (algo como `123456789:ABCdefGhIJKlmNoPQRstuVWxyz`).
3. Anote também o **@username** do bot — é o que os usuários vão procurar no Telegram para se vincular.

### 5.3. Configurar variáveis de ambiente na Vercel
No painel do seu projeto na Vercel: **Settings → Environment Variables**, adicione:

| Nome | Valor |
|---|---|
| `SUPABASE_URL` | a mesma URL do seu projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | a chave **service_role** (Project Settings → API — **nunca** coloque essa chave no front-end/js/) |
| `CRON_SECRET` | qualquer texto aleatório, só para você (ex: gerado em [1password.com/password-generator](https://1password.com/password-generator)) |
| `TELEGRAM_BOT_TOKEN` | o token do bot que o BotFather te deu |
| `TELEGRAM_WEBHOOK_SECRET` | (opcional) outro texto aleatório, só para validar que o webhook vem mesmo do Telegram |

Depois de configurar, faça um novo deploy para as variáveis entrarem em vigor.

### 5.4. Registrar o webhook (uma única vez)
Depois do deploy, abra esta URL no navegador uma vez (trocando pelos seus valores):

```
https://api.telegram.org/bot<SEU_TOKEN>/setWebhook?url=https://seu-projeto.vercel.app/api/telegram-webhook
```

Se você definiu `TELEGRAM_WEBHOOK_SECRET`, adicione `&secret_token=SEU_SEGREDO` no final da URL acima.

A resposta deve trazer `"ok":true`. A partir daqui, toda mensagem enviada ao bot chega automaticamente nessa função.

### 5.5. Vincular a conta (cada usuário faz isso na primeira vez)
1. Na página **Configurações** do sistema, clicar em "Gerar código de vinculação".
2. Abrir o Telegram, procurar pelo @username do bot e mandar `/start CODIGO` (o código que apareceu na tela).
3. O bot responde confirmando a vinculação — a partir daí a tela de Configurações mostra "Conectado".
4. Ainda em Configurações, definir com quantos dias/horas/minutos de antecedência quer ser avisado.

### 5.6. Agendar a execução do job de lembretes
Como o aviso agora pode ser configurado em minutos/horas de antecedência, rodar uma vez por dia não é suficiente — e o **plano gratuito (Hobby) da Vercel só permite cron jobs uma vez por dia**. Duas opções:

**Opção A — Serviço externo gratuito (recomendado no plano Hobby):**
Use um agendador como [cron-job.org](https://cron-job.org) para chamar a cada 5–15 minutos:
```
GET https://seu-projeto.vercel.app/api/lembretes
Header: Authorization: Bearer SEU_CRON_SECRET
```

**Opção B — Plano Pro da Vercel:**
Adicione ao `vercel.json`:
```json
{
  "crons": [
    { "path": "/api/lembretes", "schedule": "*/15 * * * *" }
  ]
}
```

### 5.7. Testar manualmente
Você pode forçar a execução da função a qualquer momento acessando (substituindo pelo seu domínio e pelo seu `CRON_SECRET`):

```
curl -H "Authorization: Bearer SEU_CRON_SECRET" https://seu-projeto.vercel.app/api/lembretes
```

A resposta mostra quantos lembretes foram enviados nessa execução.
