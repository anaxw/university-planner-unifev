// =========================================================
// CONFIGURAÇÕES — perfil, senha e logout
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
  document.getElementById('form-lembretes').addEventListener('submit', salvarPreferenciasLembretes);
})();

async function carregarPreferenciasTelegram() {
  const { data, error } = await supabaseClient
    .from('usuarios')
    .select('telegram_chat_id, lembrete_dias, lembrete_horas, lembrete_minutos, lembretes_ativos')
    .eq('id', USUARIO_CONFIG.id)
    .single();

  if (error || !data) return;

  const vinculado = !!data.telegram_chat_id;
  document.getElementById('telegram-status').textContent = vinculado ? 'Conectado' : 'Não conectado';
  document.getElementById('telegram-status').className = `badge ${vinculado ? 'badge-success' : 'badge-gray'}`;
  document.getElementById('telegram-nao-vinculado').classList.toggle('hidden', vinculado);
  document.getElementById('telegram-vinculado').classList.toggle('hidden', !vinculado);

  if (vinculado) {
    document.getElementById('lembrete-dias').value = String(data.lembrete_dias ?? 1);
    document.getElementById('lembrete-horas').value = String(data.lembrete_horas ?? 0);
    document.getElementById('lembrete-minutos').value = String(data.lembrete_minutos ?? 0);
    document.getElementById('lembretes-ativo').value = String(data.lembretes_ativos ?? true);
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

async function salvarPreferenciasLembretes(e) {
  e.preventDefault();
  const payload = {
    lembrete_dias: Number(document.getElementById('lembrete-dias').value) || 0,
    lembrete_horas: Number(document.getElementById('lembrete-horas').value) || 0,
    lembrete_minutos: Number(document.getElementById('lembrete-minutos').value) || 0,
    lembretes_ativos: document.getElementById('lembretes-ativo').value === 'true',
  };

  const { error } = await supabaseClient
    .from('usuarios')
    .update(payload)
    .eq('id', USUARIO_CONFIG.id);

  if (error) {
    mostrarToast('Erro ao salvar preferências de lembretes.', 'error');
    return;
  }
  mostrarToast('Preferências de lembretes salvas!', 'success');
}

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
