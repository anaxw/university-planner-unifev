// =========================================================
// CONFIGURAÇÕES — perfil, senha, logout e lembretes via Telegram
// =========================================================

let USUARIO_CONFIG = null;

(async () => {
  USUARIO_CONFIG = await iniciarPagina('configuracoes');
  if (!USUARIO_CONFIG) return;

  document.getElementById('perfil-nome').value = USUARIO_CONFIG.user_metadata?.nome || '';
  document.getElementById('perfil-email').value = USUARIO_CONFIG.email || '';

  document.getElementById('form-perfil').addEventListener('submit', salvarPerfil);
  document.getElementById('form-senha').addEventListener('submit', alterarSenha);

  await carregarPreferenciasTelegram();
  document.getElementById('btn-gerar-codigo').addEventListener('click', gerarCodigoVinculacao);
  document.getElementById('btn-desvincular-telegram').addEventListener('click', desvincularTelegram);
  document.getElementById('lembretes-ativo').addEventListener('change', salvarStatusLembretes);
  document.getElementById('btn-add-regra').addEventListener('click', adicionarRegra);
})();

async function carregarPreferenciasTelegram() {
  const { data, error } = await supabaseClient
    .from('usuarios')
    .select('telegram_chat_id, lembretes_ativos')
    .eq('id', USUARIO_CONFIG.id)
    .single();

  if (error || !data) return;

  const vinculado = !!data.telegram_chat_id;
  document.getElementById('telegram-status').textContent = vinculado ? 'Conectado' : 'Não conectado';
  document.getElementById('telegram-status').className = `badge ${vinculado ? 'badge-success' : 'badge-gray'}`;
  document.getElementById('telegram-nao-vinculado').classList.toggle('hidden', vinculado);
  document.getElementById('telegram-vinculado').classList.toggle('hidden', !vinculado);

  if (vinculado) {
    document.getElementById('lembretes-ativo').value = String(data.lembretes_ativos ?? true);
    await carregarRegrasLembrete();
  }
}

async function gerarCodigoVinculacao() {
  const codigo = Array.from({ length: 6 }, () =>
    'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]
  ).join('');

  const { error } = await supabaseClient
    .from('usuarios')
    .update({ telegram_link_code: codigo })
    .eq('id', USUARIO_CONFIG.id);

  if (error) {
    mostrarToast('Erro ao gerar código.', 'error');
    return;
  }

  document.getElementById('telegram-codigo').value = codigo;
  document.getElementById('telegram-codigo-area').classList.remove('hidden');
  mostrarToast('Código gerado! Envie /start seguido dele para o bot no Telegram.', 'success');
}

async function desvincularTelegram() {
  const ok = await confirmarAcao({
    titulo: 'Desvincular Telegram',
    mensagem: 'Tem certeza que deseja desvincular sua conta do Telegram? Você deixará de receber lembretes por lá.',
    tipo: 'warning',
    textoConfirmar: 'Desvincular',
  });
  if (!ok) return;

  const { error } = await supabaseClient
    .from('usuarios')
    .update({ telegram_chat_id: null, telegram_link_code: null })
    .eq('id', USUARIO_CONFIG.id);

  if (error) {
    mostrarToast('Erro ao desvincular Telegram.', 'error');
    return;
  }

  mostrarToast('Telegram desvinculado.', 'success');
  await carregarPreferenciasTelegram();
}

async function salvarStatusLembretes() {
  const ativo = document.getElementById('lembretes-ativo').value === 'true';

  const { error } = await supabaseClient
    .from('usuarios')
    .update({ lembretes_ativos: ativo })
    .eq('id', USUARIO_CONFIG.id);

  if (error) {
    mostrarToast('Erro ao salvar preferência de lembretes.', 'error');
    return;
  }
  mostrarToast(ativo ? 'Lembretes ativados.' : 'Lembretes desativados.', 'success');
}

// ---------------------------------------------------------
// Regras de lembrete (múltiplos avisos por tarefa)
// ---------------------------------------------------------

async function carregarRegrasLembrete() {
  const { data, error } = await supabaseClient
    .from('lembrete_regras')
    .select('id, dias, horas, minutos')
    .eq('user_id', USUARIO_CONFIG.id)
    .order('created_at', { ascending: true });

  if (error) {
    mostrarToast('Erro ao carregar lembretes configurados.', 'error');
    return;
  }

  renderizarRegras(data || []);
}

function antecedenciaMinutos(regra) {
  return (regra.dias || 0) * 1440 + (regra.horas || 0) * 60 + (regra.minutos || 0);
}

function formatarRegra(regra) {
  const partes = [];
  if (regra.dias) partes.push(`${regra.dias} dia${regra.dias > 1 ? 's' : ''}`);
  if (regra.horas) partes.push(`${regra.horas} hora${regra.horas > 1 ? 's' : ''}`);
  if (regra.minutos) partes.push(`${regra.minutos} minuto${regra.minutos > 1 ? 's' : ''}`);
  return partes.length ? `${partes.join(' e ')} antes` : 'No momento do vencimento';
}

function renderizarRegras(regras) {
  const lista = document.getElementById('lista-regras');
  lista.innerHTML = '';

  if (regras.length === 0) {
    const vazio = document.createElement('li');
    vazio.className = 'text-muted text-sm';
    vazio.textContent = 'Nenhum aviso configurado ainda — adicione um abaixo.';
    lista.appendChild(vazio);
    return;
  }

  regras
    .slice()
    .sort((a, b) => antecedenciaMinutos(b) - antecedenciaMinutos(a))
    .forEach((regra) => {
      const li = document.createElement('li');
      li.className = 'flex items-center gap-8 mb-8';
      li.style.justifyContent = 'space-between';
      li.style.padding = '8px 12px';
      li.style.background = '#F8F9FB';
      li.style.borderRadius = '8px';

      const texto = document.createElement('span');
      texto.className = 'flex items-center gap-8';
      texto.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        ${formatarRegra(regra)}
      `;

      const btnRemover = document.createElement('button');
      btnRemover.type = 'button';
      btnRemover.className = 'btn-icon btn-delete';
      btnRemover.title = 'Remover lembrete';
      btnRemover.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          <line x1="10" y1="11" x2="10" y2="17"/>
          <line x1="14" y1="11" x2="14" y2="17"/>
        </svg>
      `;
      btnRemover.addEventListener('click', () => removerRegra(regra.id));

      li.appendChild(texto);
      li.appendChild(btnRemover);
      lista.appendChild(li);
    });
}

async function adicionarRegra() {
  const dias = Number(document.getElementById('regra-dias').value) || 0;
  const horas = Number(document.getElementById('regra-horas').value) || 0;
  const minutos = Number(document.getElementById('regra-minutos').value) || 0;

  if (dias === 0 && horas === 0 && minutos === 0) {
    mostrarToast('Defina ao menos dias, horas ou minutos.', 'error');
    return;
  }

  const { error } = await supabaseClient
    .from('lembrete_regras')
    .insert({ user_id: USUARIO_CONFIG.id, dias, horas, minutos });

  if (error) {
    mostrarToast('Erro ao adicionar lembrete.', 'error');
    return;
  }

  document.getElementById('regra-dias').value = '0';
  document.getElementById('regra-horas').value = '0';
  document.getElementById('regra-minutos').value = '0';

  mostrarToast('Lembrete adicionado!', 'success');
  await carregarRegrasLembrete();
}

async function removerRegra(id) {
  const ok = await confirmarAcao({
    titulo: 'Remover lembrete',
    mensagem: 'Tem certeza que deseja remover este lembrete?',
    tipo: 'danger',
    textoConfirmar: 'Remover',
  });
  if (!ok) return;

  const { error } = await supabaseClient
    .from('lembrete_regras')
    .delete()
    .eq('id', id)
    .eq('user_id', USUARIO_CONFIG.id);

  if (error) {
    mostrarToast('Erro ao remover lembrete.', 'error');
    return;
  }

  mostrarToast('Lembrete removido.', 'success');
  await carregarRegrasLembrete();
}

// ---------------------------------------------------------
// Perfil e senha
// ---------------------------------------------------------

async function salvarPerfil(e) {
  e.preventDefault();
  const nome = document.getElementById('perfil-nome').value.trim();

  const { error: errAuth } = await supabaseClient.auth.updateUser({ data: { nome } });
  const { error: errPerfil } = await supabaseClient
    .from('usuarios')
    .update({ nome })
    .eq('id', USUARIO_CONFIG.id);

  if (errAuth || errPerfil) {
    mostrarToast('Erro ao salvar perfil.', 'error');
    return;
  }
  mostrarToast('Perfil atualizado!', 'success');
}

async function alterarSenha(e) {
  e.preventDefault();
  const novaSenha = document.getElementById('nova-senha').value;
  const confirmar = document.getElementById('confirmar-senha').value;

  if (novaSenha !== confirmar) {
    mostrarToast('As senhas não coincidem.', 'error');
    return;
  }

  const { error } = await supabaseClient.auth.updateUser({ password: novaSenha });

  if (error) {
    mostrarToast('Erro ao atualizar senha.', 'error');
    return;
  }
  mostrarToast('Senha atualizada com sucesso!', 'success');
  document.getElementById('form-senha').reset();
}
