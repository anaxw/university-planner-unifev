// =========================================================
// AUTENTICAÇÃO — usado em index.html (login/cadastro/recuperação)
// =========================================================

/**
 * Garante que existe uma sessão ativa. Se não houver, redireciona para o login.
 * Deve ser chamada no início de toda página protegida (dashboard, materias, etc).
 * Retorna o objeto `user` do Supabase quando autenticado.
 */
async function exigirSessao() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = 'index.html';
    return null;
  }
  return session.user;
}

/** Encerra a sessão e volta para o login */
async function logout() {
  await supabaseClient.auth.signOut();
  window.location.href = 'index.html';
}

// ---------- Somente executa na página de login (index.html) ----------
if (document.body.dataset.page === 'login') {

  (async () => {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) window.location.href = 'dashboard.html';
  })();

  const formLogin = document.getElementById('form-login');
  const formCadastro = document.getElementById('form-cadastro');
  const formRecuperar = document.getElementById('form-recuperar');

  const painelLogin = document.getElementById('painel-login');
  const painelCadastro = document.getElementById('painel-cadastro');
  const painelRecuperar = document.getElementById('painel-recuperar');

  function mostrarPainel(painel) {
    [painelLogin, painelCadastro, painelRecuperar].forEach(p => p.classList.add('hidden'));
    painel.classList.remove('hidden');
  }

  document.getElementById('link-cadastro')?.addEventListener('click', (e) => {
    e.preventDefault();
    mostrarPainel(painelCadastro);
  });
  document.getElementById('link-voltar-login')?.addEventListener('click', (e) => {
    e.preventDefault();
    mostrarPainel(painelLogin);
  });
  document.getElementById('link-esqueci-senha')?.addEventListener('click', (e) => {
    e.preventDefault();
    mostrarPainel(painelRecuperar);
  });
  document.getElementById('link-voltar-login-2')?.addEventListener('click', (e) => {
    e.preventDefault();
    mostrarPainel(painelLogin);
  });

  formLogin?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = formLogin.querySelector('button[type="submit"]');
    const email = document.getElementById('login-email').value.trim();
    const senha = document.getElementById('login-senha').value;

    btn.disabled = true;
    btn.textContent = 'Entrando...';

    const { error } = await supabaseClient.auth.signInWithPassword({ email, password: senha });

    if (error) {
      mostrarToast(traduzErro(error.message), 'error');
      btn.disabled = false;
      btn.textContent = 'Entrar';
      return;
    }

    window.location.href = 'dashboard.html';
  });

  formCadastro?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = formCadastro.querySelector('button[type="submit"]');
    const nome = document.getElementById('cadastro-nome').value.trim();
    const email = document.getElementById('cadastro-email').value.trim();
    const senha = document.getElementById('cadastro-senha').value;

    btn.disabled = true;
    btn.textContent = 'Criando conta...';

    const { error } = await supabaseClient.auth.signUp({
      email,
      password: senha,
      options: { data: { nome } },
    });

    if (error) {
      mostrarToast(traduzErro(error.message), 'error');
      btn.disabled = false;
      btn.textContent = 'Criar conta';
      return;
    }

    mostrarToast('Conta criada! Verifique seu e-mail para confirmar.', 'success');
    mostrarPainel(painelLogin);
    btn.disabled = false;
    btn.textContent = 'Criar conta';
  });

  formRecuperar?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = formRecuperar.querySelector('button[type="submit"]');
    const email = document.getElementById('recuperar-email').value.trim();

    btn.disabled = true;
    btn.textContent = 'Enviando...';

    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/configuracoes.html',
    });

    if (error) {
      mostrarToast(traduzErro(error.message), 'error');
    } else {
      mostrarToast('Enviamos um link de recuperação para o seu e-mail.', 'success');
      mostrarPainel(painelLogin);
    }
    btn.disabled = false;
    btn.textContent = 'Enviar link de recuperação';
  });
}

function traduzErro(msg) {
  const mapa = {
    'Invalid login credentials': 'E-mail ou senha inválidos.',
    'User already registered': 'Já existe uma conta com este e-mail.',
    'Password should be at least 6 characters': 'A senha deve ter pelo menos 6 caracteres.',
    'Email not confirmed': 'Confirme seu e-mail antes de entrar.',
  };
  return mapa[msg] || msg;
}
