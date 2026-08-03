const TOKEN = () => process.env.TELEGRAM_BOT_TOKEN;

// ---------------------------------------------------------
// CHAMADAS À API DO TELEGRAM
// ---------------------------------------------------------

async function chamarTelegram(metodo, payload) {
  try {
    const resposta = await fetch(`https://api.telegram.org/bot${TOKEN()}/${metodo}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const dados = await resposta.json();
    if (!dados.ok) {
      console.error(`Telegram API (${metodo}) retornou erro:`, dados);
    }
    return dados;
  } catch (err) {
    console.error(`Erro ao chamar ${metodo} do Telegram:`, err);
    return null;
  }
}

function enviarMensagem(chatId, texto, teclado) {
  return chamarTelegram('sendMessage', {
    chat_id: chatId,
    text: texto,
    parse_mode: 'HTML',
    reply_markup: teclado || { remove_keyboard: false },
  });
}

function editarMensagem(chatId, messageId, texto, teclado) {
  return chamarTelegram('editMessageText', {
    chat_id: chatId,
    message_id: messageId,
    text: texto,
    parse_mode: 'HTML',
    reply_markup: teclado || { inline_keyboard: [] },
  });
}

function responderCallback(callbackQueryId, texto, alerta) {
  return chamarTelegram('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text: texto || undefined,
    show_alert: !!alerta,
  });
}

function escapeHTML(texto) {
  if (!texto) return '';
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ---------------------------------------------------------
// ARQUIVOS: download do Telegram e helpers de mídia
// ---------------------------------------------------------

const BUCKET_ARQUIVOS = 'arquivos';
const TAMANHO_MAXIMO_ARQUIVO = 20 * 1024 * 1024; // 20MB — limite da API padrão do Telegram para getFile

async function obterArquivoTelegram(fileId) {
  try {
    const resposta = await fetch(`https://api.telegram.org/bot${TOKEN()}/getFile?file_id=${fileId}`);
    const dados = await resposta.json();
    if (!dados.ok) {
      console.error('Erro ao obter file_path do Telegram:', dados);
      return null;
    }
    return dados.result; // { file_id, file_path, file_size, ... }
  } catch (err) {
    console.error('Erro ao chamar getFile do Telegram:', err);
    return null;
  }
}

async function baixarBytesTelegram(filePath) {
  try {
    const resposta = await fetch(`https://api.telegram.org/file/bot${TOKEN()}/${filePath}`);
    if (!resposta.ok) {
      console.error('Erro ao baixar arquivo do Telegram:', resposta.status);
      return null;
    }
    const arrayBuffer = await resposta.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err) {
    console.error('Erro ao baixar bytes do Telegram:', err);
    return null;
  }
}

function sanitizarNomeArquivo(nome) {
  return String(nome || 'arquivo')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-zA-Z0-9._-]/g, '_');
}

// Extrai o file_id/nome/tipo/tamanho de uma mensagem do Telegram, seja ela
// um documento, foto, vídeo, áudio ou nota de voz.
function extrairArquivoDaMensagem(mensagem) {
  if (mensagem.document) {
    return {
      file_id: mensagem.document.file_id,
      nome_arquivo: mensagem.document.file_name || `documento_${Date.now()}`,
      tipo_arquivo: mensagem.document.mime_type || null,
      tamanho_bytes: mensagem.document.file_size || null,
    };
  }
  if (mensagem.photo && mensagem.photo.length > 0) {
    const maior = mensagem.photo[mensagem.photo.length - 1]; // Telegram manda várias resoluções; a última é a maior
    return {
      file_id: maior.file_id,
      nome_arquivo: `foto_${Date.now()}.jpg`,
      tipo_arquivo: 'image/jpeg',
      tamanho_bytes: maior.file_size || null,
    };
  }
  if (mensagem.video) {
    return {
      file_id: mensagem.video.file_id,
      nome_arquivo: mensagem.video.file_name || `video_${Date.now()}.mp4`,
      tipo_arquivo: mensagem.video.mime_type || 'video/mp4',
      tamanho_bytes: mensagem.video.file_size || null,
    };
  }
  if (mensagem.audio) {
    return {
      file_id: mensagem.audio.file_id,
      nome_arquivo: mensagem.audio.file_name || `audio_${Date.now()}.mp3`,
      tipo_arquivo: mensagem.audio.mime_type || 'audio/mpeg',
      tamanho_bytes: mensagem.audio.file_size || null,
    };
  }
  if (mensagem.voice) {
    return {
      file_id: mensagem.voice.file_id,
      nome_arquivo: `voz_${Date.now()}.ogg`,
      tipo_arquivo: mensagem.voice.mime_type || 'audio/ogg',
      tamanho_bytes: mensagem.voice.file_size || null,
    };
  }
  return null;
}

// ---------------------------------------------------------
// ESTADO DA CONVERSA (formulários em andamento)
// ---------------------------------------------------------

async function obterEstado(supabaseAdmin, chatId) {
  const { data, error } = await supabaseAdmin
    .from('bot_estado')
    .select('*')
    .eq('chat_id', chatId)
    .maybeSingle();

  if (error) {
    console.error('Erro ao buscar estado do bot:', error);
    return null;
  }
  return data;
}

async function salvarEstado(supabaseAdmin, chatId, userId, fluxo, passo, dados) {
  const { error } = await supabaseAdmin
    .from('bot_estado')
    .upsert({
      chat_id: chatId,
      user_id: userId,
      fluxo,
      passo,
      dados: dados || {},
      updated_at: new Date().toISOString(),
    });

  if (error) console.error('Erro ao salvar estado do bot:', error);
}

async function limparEstado(supabaseAdmin, chatId) {
  const { error } = await supabaseAdmin
    .from('bot_estado')
    .delete()
    .eq('chat_id', chatId);

  if (error) console.error('Erro ao limpar estado do bot:', error);
}

// ---------------------------------------------------------
// BUSCA DE USUÁRIO
// ---------------------------------------------------------

async function obterUsuarioPorChatId(supabaseAdmin, chatId) {
  const { data, error } = await supabaseAdmin
    .from('usuarios')
    .select('id, nome, telegram_chat_id')
    .eq('telegram_chat_id', chatId)
    .maybeSingle();

  if (error) {
    console.error('Erro ao buscar usuário pelo chat_id:', error);
    return null;
  }
  return data;
}

// ---------------------------------------------------------
// TECLADOS (menus)
// ---------------------------------------------------------

function teclaMenuPrincipal() {
  return {
    inline_keyboard: [
      [{ text: '📋 Tarefas', callback_data: 'menu_tarefas' }],
      [{ text: '📝 Anotações', callback_data: 'menu_anotacoes' }],
      [{ text: '📁 Arquivos', callback_data: 'menu_arquivos' }],
    ],
  };
}

function teclaMenuTarefas() {
  return {
    inline_keyboard: [
      [{ text: '➕ Adicionar tarefa', callback_data: 'tarefas_add_start' }],
      [{ text: '📄 Listar tarefas', callback_data: 'tarefas_listar_menu' }],
      [{ text: '✅ Finalizar tarefa', callback_data: 'tarefas_finalizar_menu' }],
      [{ text: '⬅️ Voltar', callback_data: 'menu_principal' }],
    ],
  };
}

function teclaListarTarefasMenu() {
  return {
    inline_keyboard: [
      [{ text: '📚 Por matéria', callback_data: 'tarefas_listar_por_materia' }],
      [{ text: '🗂️ Todas as matérias', callback_data: 'tarefas_listar_todas' }],
      [{ text: '⬅️ Voltar', callback_data: 'menu_tarefas' }],
    ],
  };
}

function teclaMenuAnotacoes() {
  return {
    inline_keyboard: [
      [{ text: '➕ Adicionar anotação', callback_data: 'anotacoes_add_start' }],
      [{ text: '📄 Listar anotações', callback_data: 'anotacoes_listar_menu' }],
      [{ text: '🗑️ Apagar anotação', callback_data: 'anotacoes_apagar_menu' }],
      [{ text: '⬅️ Voltar', callback_data: 'menu_principal' }],
    ],
  };
}

function teclaListarAnotacoesMenu() {
  return {
    inline_keyboard: [
      [{ text: '📚 Por matéria', callback_data: 'anotacoes_listar_por_materia' }],
      [{ text: '🗂️ Todas as matérias', callback_data: 'anotacoes_listar_todas' }],
      [{ text: '⬅️ Voltar', callback_data: 'menu_anotacoes' }],
    ],
  };
}

function truncar(texto, tamanho) {
  if (!texto) return texto;
  return texto.length > tamanho ? `${texto.slice(0, tamanho - 1)}…` : texto;
}

function teclaMaterias(materias, prefixoCallback, opcoes) {
  const { incluirSemMateria, voltarCallback } = opcoes || {};
  const linhas = materias.map((m) => ([{
    text: `${truncar(m.nome, 28)}`,
    callback_data: `${prefixoCallback}${m.id}`,
  }]));

  if (incluirSemMateria) {
    linhas.push([{ text: '— Sem matéria —', callback_data: `${prefixoCallback}sem` }]);
  }

  linhas.push([{ text: '⬅️ Voltar', callback_data: voltarCallback || 'menu_tarefas' }]);
  return { inline_keyboard: linhas };
}

function teclaTipo() {
  return {
    inline_keyboard: [
      [
        { text: '📌 Tarefa', callback_data: 'tarefas_add_tipo_tarefa' },
        { text: '📝 Prova', callback_data: 'tarefas_add_tipo_prova' },
      ],
      [{ text: '❌ Cancelar', callback_data: 'tarefas_add_cancelar' }],
    ],
  };
}

function teclaPrioridade() {
  return {
    inline_keyboard: [
      [
        { text: '🟢 Baixa', callback_data: 'tarefas_add_prior_baixa' },
        { text: '🟡 Média', callback_data: 'tarefas_add_prior_media' },
        { text: '🔴 Alta', callback_data: 'tarefas_add_prior_alta' },
      ],
      [{ text: '❌ Cancelar', callback_data: 'tarefas_add_cancelar' }],
    ],
  };
}

function teclaListaAnotacoes(anotacoes, voltarCallback) {
  const linhas = anotacoes.map((a) => ([{
    text: `${truncar(a.titulo, 26)} (${formatarDataBr(a.data)})`,
    callback_data: `anotacoes_ver_${a.id}`,
  }]));
  linhas.push([{ text: '⬅️ Voltar', callback_data: voltarCallback || 'menu_anotacoes' }]);
  return { inline_keyboard: linhas };
}

function teclaConfirmarCancelar(confirmarCb, cancelarCb) {
  return {
    inline_keyboard: [
      [
        { text: '✅ Confirmar', callback_data: confirmarCb },
        { text: '❌ Cancelar', callback_data: cancelarCb },
      ],
    ],
  };
}

// ---------------------------------------------------------
// HELPERS DE DATA/HORA (formato brasileiro DD/MM/AAAA e HH:MM)
// ---------------------------------------------------------

function parseDataBr(texto) {
  const m = texto.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return undefined; // formato inválido
  const [, dia, mes, ano] = m;
  const d = new Date(Number(ano), Number(mes) - 1, Number(dia));
  if (d.getFullYear() !== Number(ano) || d.getMonth() !== Number(mes) - 1 || d.getDate() !== Number(dia)) {
    return undefined; // data inexistente (ex: 31/02)
  }
  return `${ano}-${mes}-${dia}`;
}

function formatarDataBr(isoDate) {
  if (!isoDate) return 'sem data';
  const [ano, mes, dia] = isoDate.split('-');
  return `${dia}/${mes}/${ano}`;
}

function hojeIso() {
  const d = new Date();
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function parseHora(texto) {
  const m = texto.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return undefined;
  const hora = Number(m[1]);
  const minuto = Number(m[2]);
  if (hora > 23 || minuto > 59) return undefined;
  return `${String(hora).padStart(2, '0')}:${m[2]}`;
}

const LABEL_TIPO = { tarefa: 'Tarefa', prova: 'Prova' };
const LABEL_PRIORIDADE = { baixa: '🟢 Baixa', media: '🟡 Média', alta: '🔴 Alta' };

// ---------------------------------------------------------
// MENU PRINCIPAL / TAREFAS (telas simples)
// ---------------------------------------------------------

async function mostrarMenuPrincipal(supabaseAdmin, chatId, messageId) {
  await limparEstado(supabaseAdmin, chatId);
  const texto = '🏠 <b>Menu principal</b>\n\nO que você deseja fazer?';
  if (messageId) return editarMensagem(chatId, messageId, texto, teclaMenuPrincipal());
  return enviarMensagem(chatId, texto, teclaMenuPrincipal());
}

async function mostrarMenuTarefas(supabaseAdmin, chatId, messageId) {
  await limparEstado(supabaseAdmin, chatId);
  const texto = '📋 <b>Tarefas</b>\n\nEscolha uma opção:';
  if (messageId) return editarMensagem(chatId, messageId, texto, teclaMenuTarefas());
  return enviarMensagem(chatId, texto, teclaMenuTarefas());
}

// Usado quando uma ação é concluída (tarefa adicionada, finalizada, listagem
// exibida, etc.): deixa o resultado fixo na mensagem editada (sem botões) e
// manda o menu principal como mensagem nova, reiniciando o bot do início.
async function finalizarAcao(supabaseAdmin, chatId, messageId, textoResultado) {
  await editarMensagem(chatId, messageId, textoResultado, { inline_keyboard: [] });
  await limparEstado(supabaseAdmin, chatId);
  return enviarMensagem(chatId, '🏠 <b>Menu principal</b>\n\nO que você deseja fazer?', teclaMenuPrincipal());
}

// ---------------------------------------------------------
// 1.1 ADICIONAR TAREFA
// ---------------------------------------------------------

async function iniciarAdicionarTarefa(supabaseAdmin, chatId, messageId, usuario) {
  const { data: materias, error } = await supabaseAdmin
    .from('materias')
    .select('id, nome')
    .eq('user_id', usuario.id)
    .order('nome', { ascending: true });

  if (error) {
    console.error('Erro ao buscar matérias:', error);
    return editarMensagem(chatId, messageId, '❌ Erro ao buscar suas matérias. Tente novamente.', teclaMenuTarefas());
  }

  await salvarEstado(supabaseAdmin, chatId, usuario.id, 'tarefa_add', 'materia', {});

  const texto = '➕ <b>Nova tarefa</b>\n\nQual matéria é essa tarefa?';
  const teclado = (materias && materias.length > 0)
    ? teclaMaterias(materias, 'tarefas_add_materia_', { incluirSemMateria: true, voltarCallback: 'tarefas_add_cancelar' })
    : { inline_keyboard: [
        [{ text: '— Sem matéria —', callback_data: 'tarefas_add_materia_sem' }],
        [{ text: '❌ Cancelar', callback_data: 'tarefas_add_cancelar' }],
      ] };

  return editarMensagem(chatId, messageId, texto, teclado);
}

async function receberMateriaTarefa(supabaseAdmin, chatId, messageId, usuario, materiaIdBruto) {
  const materiaId = materiaIdBruto === 'sem' ? null : materiaIdBruto;
  await salvarEstado(supabaseAdmin, chatId, usuario.id, 'tarefa_add', 'titulo', { materia_id: materiaId });

  const texto = '✏️ Qual o <b>título</b> da tarefa?\n\n<i>Digite o texto para continuar, ou /cancelar para desistir.</i>';
  return editarMensagem(chatId, messageId, texto, { inline_keyboard: [[{ text: '❌ Cancelar', callback_data: 'tarefas_add_cancelar' }]] });
}

async function receberTituloTarefa(supabaseAdmin, chatId, usuario, estado, texto) {
  const titulo = texto.trim();
  if (!titulo) {
    return enviarMensagem(chatId, '⚠️ O título não pode ficar vazio. Digite o título da tarefa:');
  }
  const dados = { ...estado.dados, titulo };
  await salvarEstado(supabaseAdmin, chatId, usuario.id, 'tarefa_add', 'descricao', dados);
  return enviarMensagem(
    chatId,
    '📝 Quer adicionar uma <b>descrição</b>?\n\nDigite o texto, ou envie <b>-</b> para pular.',
  );
}

async function receberDescricaoTarefa(supabaseAdmin, chatId, usuario, estado, texto) {
  const descricao = texto.trim() === '-' ? null : texto.trim();
  const dados = { ...estado.dados, descricao };
  await salvarEstado(supabaseAdmin, chatId, usuario.id, 'tarefa_add', 'tipo', dados);
  return enviarMensagem(chatId, '📌 Isso é uma <b>tarefa</b> ou uma <b>prova</b>?', teclaTipo());
}

async function receberTipoTarefa(supabaseAdmin, chatId, messageId, usuario, estado, tipo) {
  const dados = { ...estado.dados, tipo };
  await salvarEstado(supabaseAdmin, chatId, usuario.id, 'tarefa_add', 'prioridade', dados);
  return editarMensagem(chatId, messageId, '🎯 Qual a <b>prioridade</b>?', teclaPrioridade());
}

async function receberPrioridadeTarefa(supabaseAdmin, chatId, messageId, usuario, estado, prioridade) {
  const dados = { ...estado.dados, prioridade };
  await salvarEstado(supabaseAdmin, chatId, usuario.id, 'tarefa_add', 'data_entrega', dados);
  return editarMensagem(
    chatId,
    messageId,
    '📅 Qual a <b>data de entrega</b>?\n\nDigite no formato <b>DD/MM/AAAA</b>, ou envie <b>-</b> para não definir data.',
    { inline_keyboard: [[{ text: '❌ Cancelar', callback_data: 'tarefas_add_cancelar' }]] },
  );
}

async function receberDataTarefa(supabaseAdmin, chatId, usuario, estado, texto) {
  const bruto = texto.trim();
  let dataEntrega = null;
  if (bruto !== '-') {
    const iso = parseDataBr(bruto);
    if (iso === undefined) {
      return enviarMensagem(chatId, '⚠️ Data inválida. Use o formato <b>DD/MM/AAAA</b> (ex: 25/12/2026), ou envie <b>-</b> para pular.');
    }
    dataEntrega = iso;
  }
  const dados = { ...estado.dados, data_entrega: dataEntrega };
  await salvarEstado(supabaseAdmin, chatId, usuario.id, 'tarefa_add', 'hora_entrega', dados);
  return enviarMensagem(chatId, '⏰ Algum <b>horário</b> específico?\n\nDigite no formato <b>HH:MM</b>, ou envie <b>-</b> para pular.');
}

async function receberHoraTarefa(supabaseAdmin, chatId, usuario, estado, texto) {
  const bruto = texto.trim();
  let horaEntrega = null;
  if (bruto !== '-') {
    const hora = parseHora(bruto);
    if (hora === undefined) {
      return enviarMensagem(chatId, '⚠️ Horário inválido. Use o formato <b>HH:MM</b> (ex: 23:59), ou envie <b>-</b> para pular.');
    }
    horaEntrega = hora;
  }
  const dados = { ...estado.dados, hora_entrega: horaEntrega };
  return mostrarResumoTarefa(supabaseAdmin, chatId, usuario, dados);
}

async function nomeMateria(supabaseAdmin, materiaId) {
  if (!materiaId) return 'Sem matéria';
  const { data } = await supabaseAdmin.from('materias').select('nome').eq('id', materiaId).maybeSingle();
  return data?.nome || 'Sem matéria';
}

async function mostrarResumoTarefa(supabaseAdmin, chatId, usuario, dados) {
  await salvarEstado(supabaseAdmin, chatId, usuario.id, 'tarefa_add', 'confirmar', dados);

  const materia = await nomeMateria(supabaseAdmin, dados.materia_id);
  const texto = [
    '📋 <b>Confira os dados da tarefa:</b>',
    '',
    `<b>Matéria:</b> ${escapeHTML(materia)}`,
    `<b>Título:</b> ${escapeHTML(dados.titulo)}`,
    `<b>Descrição:</b> ${escapeHTML(dados.descricao) || '—'}`,
    `<b>Tipo:</b> ${LABEL_TIPO[dados.tipo] || dados.tipo}`,
    `<b>Prioridade:</b> ${LABEL_PRIORIDADE[dados.prioridade] || dados.prioridade}`,
    `<b>Entrega:</b> ${formatarDataBr(dados.data_entrega)}${dados.hora_entrega ? ` às ${dados.hora_entrega}` : ''}`,
    '',
    'Confirmar criação?',
  ].join('\n');

  return enviarMensagem(chatId, texto, teclaConfirmarCancelar('tarefas_add_confirmar', 'tarefas_add_cancelar'));
}

async function confirmarAdicionarTarefa(supabaseAdmin, chatId, messageId, usuario, estado) {
  const dados = estado.dados || {};
  const payload = {
    user_id: usuario.id,
    materia_id: dados.materia_id || null,
    titulo: dados.titulo,
    descricao: dados.descricao || null,
    tipo: dados.tipo || 'tarefa',
    prioridade: dados.prioridade || 'media',
    data_entrega: dados.data_entrega || null,
    hora_entrega: dados.hora_entrega || null,
    status: 'pendente',
  };

  const { error } = await supabaseAdmin.from('tarefas').insert(payload);
  await limparEstado(supabaseAdmin, chatId);

  if (error) {
    console.error('Erro ao inserir tarefa via bot:', error);
    return editarMensagem(chatId, messageId, '❌ Não consegui salvar a tarefa. Tente novamente.', teclaMenuTarefas());
  }

  return finalizarAcao(supabaseAdmin, chatId, messageId, `✅ Tarefa "<b>${escapeHTML(dados.titulo)}</b>" adicionada com sucesso!`);
}

// ---------------------------------------------------------
// 1.2 LISTAR TAREFAS
// ---------------------------------------------------------

async function mostrarListarTarefasMenu(supabaseAdmin, chatId, messageId) {
  await limparEstado(supabaseAdmin, chatId);
  return editarMensagem(chatId, messageId, '📄 <b>Listar tarefas</b>\n\nComo você quer ver?', teclaListarTarefasMenu());
}

async function mostrarSelecionarMateriaParaListar(supabaseAdmin, chatId, messageId, usuario) {
  const { data: materias, error } = await supabaseAdmin
    .from('materias')
    .select('id, nome')
    .eq('user_id', usuario.id)
    .order('nome', { ascending: true });

  if (error || !materias || materias.length === 0) {
    return editarMensagem(chatId, messageId, 'Você ainda não tem matérias cadastradas.', teclaListarTarefasMenu());
  }

  return editarMensagem(
    chatId,
    messageId,
    '📚 Escolha a matéria:',
    teclaMaterias(materias, 'tarefas_listar_mat_', { voltarCallback: 'tarefas_listar_menu' }),
  );
}

function formatarLinhaTarefa(t) {
  const marcador = t.tipo === 'prova' ? '📝' : '📌';
  const prazo = t.data_entrega
    ? `${formatarDataBr(t.data_entrega)}${t.hora_entrega ? ` ${t.hora_entrega}` : ''}`
    : 'sem data';
  return `${marcador} ${escapeHTML(t.titulo)} — <i>${prazo}</i> (${LABEL_PRIORIDADE[t.prioridade] || t.prioridade})`;
}

async function listarTarefasPorMateria(supabaseAdmin, chatId, messageId, usuario, materiaId) {
  const { data: tarefas, error } = await supabaseAdmin
    .from('tarefas')
    .select('id, titulo, tipo, prioridade, data_entrega, hora_entrega')
    .eq('user_id', usuario.id)
    .eq('materia_id', materiaId)
    .eq('status', 'pendente')
    .order('data_entrega', { ascending: true, nullsFirst: false });

  const materia = await nomeMateria(supabaseAdmin, materiaId);

  if (error) {
    return editarMensagem(chatId, messageId, '❌ Erro ao buscar tarefas.', teclaListarTarefasMenu());
  }

  if (!tarefas || tarefas.length === 0) {
    return finalizarAcao(supabaseAdmin, chatId, messageId, `Nenhuma tarefa pendente em <b>${escapeHTML(materia)}</b>. 🎉`);
  }

  const texto = [`📚 <b>${escapeHTML(materia)}</b>`, '', ...tarefas.map(formatarLinhaTarefa)].join('\n');
  return finalizarAcao(supabaseAdmin, chatId, messageId, texto);
}

async function listarTodasTarefas(supabaseAdmin, chatId, messageId, usuario) {
  const { data: tarefas, error } = await supabaseAdmin
    .from('tarefas')
    .select('id, titulo, tipo, prioridade, data_entrega, hora_entrega, materias(nome)')
    .eq('user_id', usuario.id)
    .eq('status', 'pendente')
    .order('data_entrega', { ascending: true, nullsFirst: false });

  if (error) {
    return editarMensagem(chatId, messageId, '❌ Erro ao buscar tarefas.', teclaListarTarefasMenu());
  }

  if (!tarefas || tarefas.length === 0) {
    return finalizarAcao(supabaseAdmin, chatId, messageId, 'Nenhuma tarefa pendente. 🎉');
  }

  const grupos = new Map();
  for (const t of tarefas) {
    const nomeMat = t.materias?.nome || 'Sem matéria';
    if (!grupos.has(nomeMat)) grupos.set(nomeMat, []);
    grupos.get(nomeMat).push(t);
  }

  const partes = ['🗂️ <b>Todas as tarefas pendentes</b>', ''];
  for (const [nomeMat, lista] of grupos) {
    partes.push(`<b>${escapeHTML(nomeMat)}</b>`);
    partes.push(...lista.map(formatarLinhaTarefa));
    partes.push('');
  }

  return finalizarAcao(supabaseAdmin, chatId, messageId, partes.join('\n').trim());
}

// ---------------------------------------------------------
// 1.3 FINALIZAR TAREFA
// ---------------------------------------------------------

async function mostrarFinalizarSelecionarMateria(supabaseAdmin, chatId, messageId, usuario) {
  // Só mostra matérias que tenham ao menos uma tarefa pendente
  const { data: tarefas, error } = await supabaseAdmin
    .from('tarefas')
    .select('materia_id, materias(id, nome)')
    .eq('user_id', usuario.id)
    .eq('status', 'pendente');

  if (error) {
    return editarMensagem(chatId, messageId, '❌ Erro ao buscar tarefas.', teclaMenuTarefas());
  }

  if (!tarefas || tarefas.length === 0) {
    return editarMensagem(chatId, messageId, 'Você não tem nenhuma tarefa pendente. 🎉', teclaMenuTarefas());
  }

  const materiasMap = new Map();
  let temSemMateria = false;
  for (const t of tarefas) {
    if (t.materia_id && t.materias) {
      materiasMap.set(t.materia_id, t.materias.nome);
    } else {
      temSemMateria = true;
    }
  }

  const materias = Array.from(materiasMap.entries()).map(([id, nome]) => ({ id, nome }));
  materias.sort((a, b) => a.nome.localeCompare(b.nome));

  const linhas = materias.map((m) => ([{ text: truncar(m.nome, 28), callback_data: `tarefas_finalizar_mat_${m.id}` }]));
  if (temSemMateria) linhas.push([{ text: '— Sem matéria —', callback_data: 'tarefas_finalizar_mat_sem' }]);
  linhas.push([{ text: '⬅️ Voltar', callback_data: 'menu_tarefas' }]);

  return editarMensagem(chatId, messageId, '✅ <b>Finalizar tarefa</b>\n\nQual matéria?', { inline_keyboard: linhas });
}

async function mostrarFinalizarSelecionarTarefa(supabaseAdmin, chatId, messageId, usuario, materiaIdBruto) {
  const materiaId = materiaIdBruto === 'sem' ? null : materiaIdBruto;

  let query = supabaseAdmin
    .from('tarefas')
    .select('id, titulo, data_entrega')
    .eq('user_id', usuario.id)
    .eq('status', 'pendente')
    .order('data_entrega', { ascending: true, nullsFirst: false });

  query = materiaId ? query.eq('materia_id', materiaId) : query.is('materia_id', null);

  const { data: tarefas, error } = await query;

  if (error || !tarefas || tarefas.length === 0) {
    return editarMensagem(chatId, messageId, 'Nenhuma tarefa pendente nessa matéria.', teclaMenuTarefas());
  }

  const linhas = tarefas.map((t) => ([{
    text: `${truncar(t.titulo, 30)}${t.data_entrega ? ` (${formatarDataBr(t.data_entrega)})` : ''}`,
    callback_data: `tarefas_finalizar_sel_${t.id}`,
  }]));
  linhas.push([{ text: '⬅️ Voltar', callback_data: 'tarefas_finalizar_menu' }]);

  return editarMensagem(chatId, messageId, '✅ Qual tarefa foi concluída?', { inline_keyboard: linhas });
}

async function confirmarFinalizarTarefa(supabaseAdmin, chatId, messageId, tarefaId) {
  const { data: tarefa } = await supabaseAdmin.from('tarefas').select('titulo').eq('id', tarefaId).maybeSingle();
  const titulo = tarefa?.titulo || 'esta tarefa';

  return editarMensagem(
    chatId,
    messageId,
    `Concluir "<b>${escapeHTML(titulo)}</b>"?`,
    teclaConfirmarCancelar(`tarefas_finalizar_ok_${tarefaId}`, 'tarefas_finalizar_cancel'),
  );
}

async function executarFinalizarTarefa(supabaseAdmin, chatId, messageId, usuario, tarefaId) {
  const { data, error } = await supabaseAdmin
    .from('tarefas')
    .update({ status: 'concluida' })
    .eq('id', tarefaId)
    .eq('user_id', usuario.id)
    .select('titulo')
    .maybeSingle();

  if (error || !data) {
    return editarMensagem(chatId, messageId, '❌ Não consegui concluir essa tarefa.', teclaMenuTarefas());
  }

  return finalizarAcao(supabaseAdmin, chatId, messageId, `🎉 Tarefa "<b>${escapeHTML(data.titulo)}</b>" concluída!`);
}

// ---------------------------------------------------------
// 2. ANOTAÇÕES
// ---------------------------------------------------------

async function mostrarMenuAnotacoes(supabaseAdmin, chatId, messageId) {
  await limparEstado(supabaseAdmin, chatId);
  const texto = '📝 <b>Anotações</b>\n\nEscolha uma opção:';
  if (messageId) return editarMensagem(chatId, messageId, texto, teclaMenuAnotacoes());
  return enviarMensagem(chatId, texto, teclaMenuAnotacoes());
}

// --- 2.1 ADICIONAR ANOTAÇÃO ---

async function iniciarAdicionarAnotacao(supabaseAdmin, chatId, messageId, usuario) {
  const { data: materias, error } = await supabaseAdmin
    .from('materias')
    .select('id, nome')
    .eq('user_id', usuario.id)
    .order('nome', { ascending: true });

  if (error) {
    console.error('Erro ao buscar matérias:', error);
    return editarMensagem(chatId, messageId, '❌ Erro ao buscar suas matérias. Tente novamente.', teclaMenuAnotacoes());
  }

  await salvarEstado(supabaseAdmin, chatId, usuario.id, 'anotacao_add', 'materia', {});

  const texto = '➕ <b>Nova anotação</b>\n\nQual matéria é essa anotação?';
  const teclado = (materias && materias.length > 0)
    ? teclaMaterias(materias, 'anotacoes_add_materia_', { incluirSemMateria: true, voltarCallback: 'anotacoes_add_cancelar' })
    : { inline_keyboard: [
        [{ text: '— Sem matéria —', callback_data: 'anotacoes_add_materia_sem' }],
        [{ text: '❌ Cancelar', callback_data: 'anotacoes_add_cancelar' }],
      ] };

  return editarMensagem(chatId, messageId, texto, teclado);
}

async function receberMateriaAnotacao(supabaseAdmin, chatId, messageId, usuario, materiaIdBruto) {
  const materiaId = materiaIdBruto === 'sem' ? null : materiaIdBruto;
  await salvarEstado(supabaseAdmin, chatId, usuario.id, 'anotacao_add', 'titulo', { materia_id: materiaId });

  const texto = '✏️ Qual o <b>título</b> da anotação?\n\n<i>Digite o texto para continuar, ou /cancelar para desistir.</i>';
  return editarMensagem(chatId, messageId, texto, { inline_keyboard: [[{ text: '❌ Cancelar', callback_data: 'anotacoes_add_cancelar' }]] });
}

async function receberTituloAnotacao(supabaseAdmin, chatId, usuario, estado, texto) {
  const titulo = texto.trim();
  if (!titulo) {
    return enviarMensagem(chatId, '⚠️ O título não pode ficar vazio. Digite o título da anotação:');
  }
  const dados = { ...estado.dados, titulo };
  await salvarEstado(supabaseAdmin, chatId, usuario.id, 'anotacao_add', 'conteudo', dados);
  return enviarMensagem(
    chatId,
    '📝 Digite o <b>conteúdo</b> da anotação, ou envie <b>-</b> para deixar em branco.',
  );
}

async function receberConteudoAnotacao(supabaseAdmin, chatId, usuario, estado, texto) {
  const conteudo = texto.trim() === '-' ? null : texto.trim();
  const dados = { ...estado.dados, conteudo, data: hojeIso() };
  return mostrarResumoAnotacao(supabaseAdmin, chatId, usuario, dados);
}

async function mostrarResumoAnotacao(supabaseAdmin, chatId, usuario, dados) {
  await salvarEstado(supabaseAdmin, chatId, usuario.id, 'anotacao_add', 'confirmar', dados);

  const materia = await nomeMateria(supabaseAdmin, dados.materia_id);
  const texto = [
    '📝 <b>Confira os dados da anotação:</b>',
    '',
    `<b>Matéria:</b> ${escapeHTML(materia)}`,
    `<b>Título:</b> ${escapeHTML(dados.titulo)}`,
    `<b>Conteúdo:</b> ${dados.conteudo ? escapeHTML(dados.conteudo) : '—'}`,
    `<b>Data:</b> ${formatarDataBr(dados.data)}`,
    '',
    'Confirmar criação?',
  ].join('\n');

  return enviarMensagem(chatId, texto, teclaConfirmarCancelar('anotacoes_add_confirmar', 'anotacoes_add_cancelar'));
}

async function confirmarAdicionarAnotacao(supabaseAdmin, chatId, messageId, usuario, estado) {
  const dados = estado.dados || {};
  const payload = {
    user_id: usuario.id,
    materia_id: dados.materia_id || null,
    titulo: dados.titulo,
    conteudo: dados.conteudo || null,
    data: dados.data || hojeIso(),
  };

  const { error } = await supabaseAdmin.from('anotacoes').insert(payload);
  await limparEstado(supabaseAdmin, chatId);

  if (error) {
    console.error('Erro ao inserir anotação via bot:', error);
    return editarMensagem(chatId, messageId, '❌ Não consegui salvar a anotação. Tente novamente.', teclaMenuAnotacoes());
  }

  return finalizarAcao(supabaseAdmin, chatId, messageId, `✅ Anotação "<b>${escapeHTML(dados.titulo)}</b>" adicionada com sucesso!`);
}

// --- 2.2 LISTAR / VER ANOTAÇÕES ---

async function mostrarListarAnotacoesMenu(supabaseAdmin, chatId, messageId) {
  await limparEstado(supabaseAdmin, chatId);
  return editarMensagem(chatId, messageId, '📄 <b>Listar anotações</b>\n\nComo você quer ver?', teclaListarAnotacoesMenu());
}

async function mostrarSelecionarMateriaParaListarAnotacoes(supabaseAdmin, chatId, messageId, usuario) {
  const { data: materias, error } = await supabaseAdmin
    .from('materias')
    .select('id, nome')
    .eq('user_id', usuario.id)
    .order('nome', { ascending: true });

  if (error || !materias || materias.length === 0) {
    return editarMensagem(chatId, messageId, 'Você ainda não tem matérias cadastradas.', teclaListarAnotacoesMenu());
  }

  return editarMensagem(
    chatId,
    messageId,
    '📚 Escolha a matéria:',
    teclaMaterias(materias, 'anotacoes_listar_mat_', { incluirSemMateria: true, voltarCallback: 'anotacoes_listar_menu' }),
  );
}

async function listarAnotacoesPorMateria(supabaseAdmin, chatId, messageId, usuario, materiaIdBruto) {
  const materiaId = materiaIdBruto === 'sem' ? null : materiaIdBruto;

  let query = supabaseAdmin
    .from('anotacoes')
    .select('id, titulo, data')
    .eq('user_id', usuario.id)
    .order('data', { ascending: false });

  query = materiaId ? query.eq('materia_id', materiaId) : query.is('materia_id', null);

  const { data: anotacoes, error } = await query;
  const materia = await nomeMateria(supabaseAdmin, materiaId);

  if (error) {
    return editarMensagem(chatId, messageId, '❌ Erro ao buscar anotações.', teclaListarAnotacoesMenu());
  }

  if (!anotacoes || anotacoes.length === 0) {
    return editarMensagem(chatId, messageId, `Nenhuma anotação em <b>${escapeHTML(materia)}</b>.`, teclaListarAnotacoesMenu());
  }

  return editarMensagem(
    chatId,
    messageId,
    `📚 <b>${escapeHTML(materia)}</b>\n\nToque para ver o conteúdo completo:`,
    teclaListaAnotacoes(anotacoes, 'anotacoes_listar_menu'),
  );
}

async function listarTodasAnotacoes(supabaseAdmin, chatId, messageId, usuario) {
  const { data: anotacoes, error } = await supabaseAdmin
    .from('anotacoes')
    .select('id, titulo, data, materias(nome)')
    .eq('user_id', usuario.id)
    .order('data', { ascending: false });

  if (error) {
    return editarMensagem(chatId, messageId, '❌ Erro ao buscar anotações.', teclaListarAnotacoesMenu());
  }

  if (!anotacoes || anotacoes.length === 0) {
    return editarMensagem(chatId, messageId, 'Você ainda não tem nenhuma anotação.', teclaListarAnotacoesMenu());
  }

  const linhas = anotacoes.map((a) => ([{
    text: `${truncar(a.materias?.nome || 'Sem matéria', 12)} · ${truncar(a.titulo, 20)} (${formatarDataBr(a.data)})`,
    callback_data: `anotacoes_ver_${a.id}`,
  }]));
  linhas.push([{ text: '⬅️ Voltar', callback_data: 'anotacoes_listar_menu' }]);

  return editarMensagem(chatId, messageId, '🗂️ <b>Todas as anotações</b>\n\nToque para ver o conteúdo completo:', { inline_keyboard: linhas });
}

async function verAnotacao(supabaseAdmin, chatId, messageId, usuario, anotacaoId) {
  const { data: anotacao, error } = await supabaseAdmin
    .from('anotacoes')
    .select('id, titulo, conteudo, data, materias(nome)')
    .eq('id', anotacaoId)
    .eq('user_id', usuario.id)
    .maybeSingle();

  if (error || !anotacao) {
    return editarMensagem(chatId, messageId, '❌ Não encontrei essa anotação.', teclaMenuAnotacoes());
  }

  const texto = [
    `📝 <b>${escapeHTML(anotacao.titulo)}</b>`,
    `<i>${escapeHTML(anotacao.materias?.nome || 'Sem matéria')} · ${formatarDataBr(anotacao.data)}</i>`,
    '',
    anotacao.conteudo ? escapeHTML(anotacao.conteudo) : '<i>Sem conteúdo.</i>',
  ].join('\n');

  return editarMensagem(chatId, messageId, texto, {
    inline_keyboard: [
      [{ text: '🗑️ Apagar', callback_data: `anotacoes_apagar_direto_${anotacao.id}` }],
      [{ text: '⬅️ Voltar', callback_data: 'menu_anotacoes' }],
    ],
  });
}

// --- 2.3 APAGAR ANOTAÇÃO ---

async function mostrarApagarSelecionarMateria(supabaseAdmin, chatId, messageId, usuario) {
  // Só mostra matérias que tenham ao menos uma anotação
  const { data: anotacoes, error } = await supabaseAdmin
    .from('anotacoes')
    .select('materia_id, materias(id, nome)')
    .eq('user_id', usuario.id);

  if (error) {
    return editarMensagem(chatId, messageId, '❌ Erro ao buscar anotações.', teclaMenuAnotacoes());
  }

  if (!anotacoes || anotacoes.length === 0) {
    return editarMensagem(chatId, messageId, 'Você não tem nenhuma anotação. 🎉', teclaMenuAnotacoes());
  }

  const materiasMap = new Map();
  let temSemMateria = false;
  for (const a of anotacoes) {
    if (a.materia_id && a.materias) {
      materiasMap.set(a.materia_id, a.materias.nome);
    } else {
      temSemMateria = true;
    }
  }

  const materias = Array.from(materiasMap.entries()).map(([id, nome]) => ({ id, nome }));
  materias.sort((a, b) => a.nome.localeCompare(b.nome));

  const linhas = materias.map((m) => ([{ text: truncar(m.nome, 28), callback_data: `anotacoes_apagar_mat_${m.id}` }]));
  if (temSemMateria) linhas.push([{ text: '— Sem matéria —', callback_data: 'anotacoes_apagar_mat_sem' }]);
  linhas.push([{ text: '⬅️ Voltar', callback_data: 'menu_anotacoes' }]);

  return editarMensagem(chatId, messageId, '🗑️ <b>Apagar anotação</b>\n\nQual matéria?', { inline_keyboard: linhas });
}

async function mostrarApagarSelecionarAnotacao(supabaseAdmin, chatId, messageId, usuario, materiaIdBruto) {
  const materiaId = materiaIdBruto === 'sem' ? null : materiaIdBruto;

  let query = supabaseAdmin
    .from('anotacoes')
    .select('id, titulo, data')
    .eq('user_id', usuario.id)
    .order('data', { ascending: false });

  query = materiaId ? query.eq('materia_id', materiaId) : query.is('materia_id', null);

  const { data: anotacoes, error } = await query;

  if (error || !anotacoes || anotacoes.length === 0) {
    return editarMensagem(chatId, messageId, 'Nenhuma anotação nessa matéria.', teclaMenuAnotacoes());
  }

  const linhas = anotacoes.map((a) => ([{
    text: `${truncar(a.titulo, 30)} (${formatarDataBr(a.data)})`,
    callback_data: `anotacoes_apagar_sel_${a.id}`,
  }]));
  linhas.push([{ text: '⬅️ Voltar', callback_data: 'anotacoes_apagar_menu' }]);

  return editarMensagem(chatId, messageId, '🗑️ Qual anotação apagar?', { inline_keyboard: linhas });
}

async function confirmarApagarAnotacao(supabaseAdmin, chatId, messageId, anotacaoId) {
  const { data: anotacao } = await supabaseAdmin.from('anotacoes').select('titulo').eq('id', anotacaoId).maybeSingle();
  const titulo = anotacao?.titulo || 'esta anotação';

  return editarMensagem(
    chatId,
    messageId,
    `Apagar "<b>${escapeHTML(titulo)}</b>"? Essa ação não pode ser desfeita.`,
    teclaConfirmarCancelar(`anotacoes_apagar_ok_${anotacaoId}`, 'anotacoes_apagar_cancel'),
  );
}

async function executarApagarAnotacao(supabaseAdmin, chatId, messageId, usuario, anotacaoId) {
  const { data, error } = await supabaseAdmin
    .from('anotacoes')
    .delete()
    .eq('id', anotacaoId)
    .eq('user_id', usuario.id)
    .select('titulo')
    .maybeSingle();

  if (error || !data) {
    return editarMensagem(chatId, messageId, '❌ Não consegui apagar essa anotação.', teclaMenuAnotacoes());
  }

  return finalizarAcao(supabaseAdmin, chatId, messageId, `🗑️ Anotação "<b>${escapeHTML(data.titulo)}</b>" apagada.`);
}

// ---------------------------------------------------------
// ROTEADOR DE CALLBACKS (cliques em botões)
// ---------------------------------------------------------

async function tratarCallback(supabaseAdmin, callbackQuery) {
  const chatId = String(callbackQuery.message.chat.id);
  const messageId = callbackQuery.message.message_id;
  const data = callbackQuery.data || '';

  await responderCallback(callbackQuery.id);

  const usuario = await obterUsuarioPorChatId(supabaseAdmin, chatId);
  if (!usuario) {
    return editarMensagem(chatId, messageId, 'Sua conta não está mais vinculada. Envie /start seguido do código nas Configurações do sistema.');
  }

  if (data === 'menu_em_breve') {
    return responderCallback(callbackQuery.id, '🔧 Em breve!', true);
  }
  if (data === 'menu_principal') return mostrarMenuPrincipal(supabaseAdmin, chatId, messageId);
  if (data === 'menu_tarefas') return mostrarMenuTarefas(supabaseAdmin, chatId, messageId);

  if (data === 'tarefas_add_start') return iniciarAdicionarTarefa(supabaseAdmin, chatId, messageId, usuario);
  if (data === 'tarefas_add_cancelar') {
    await limparEstado(supabaseAdmin, chatId);
    return mostrarMenuTarefas(supabaseAdmin, chatId, messageId);
  }
  if (data.startsWith('tarefas_add_materia_')) {
    return receberMateriaTarefa(supabaseAdmin, chatId, messageId, usuario, data.replace('tarefas_add_materia_', ''));
  }
  if (data.startsWith('tarefas_add_tipo_')) {
    const estado = await obterEstado(supabaseAdmin, chatId);
    return receberTipoTarefa(supabaseAdmin, chatId, messageId, usuario, estado, data.replace('tarefas_add_tipo_', ''));
  }
  if (data.startsWith('tarefas_add_prior_')) {
    const estado = await obterEstado(supabaseAdmin, chatId);
    return receberPrioridadeTarefa(supabaseAdmin, chatId, messageId, usuario, estado, data.replace('tarefas_add_prior_', ''));
  }
  if (data === 'tarefas_add_confirmar') {
    const estado = await obterEstado(supabaseAdmin, chatId);
    return confirmarAdicionarTarefa(supabaseAdmin, chatId, messageId, usuario, estado);
  }

  if (data === 'tarefas_listar_menu') return mostrarListarTarefasMenu(supabaseAdmin, chatId, messageId);
  if (data === 'tarefas_listar_por_materia') return mostrarSelecionarMateriaParaListar(supabaseAdmin, chatId, messageId, usuario);
  if (data === 'tarefas_listar_todas') return listarTodasTarefas(supabaseAdmin, chatId, messageId, usuario);
  if (data.startsWith('tarefas_listar_mat_')) {
    return listarTarefasPorMateria(supabaseAdmin, chatId, messageId, usuario, data.replace('tarefas_listar_mat_', ''));
  }

  if (data === 'tarefas_finalizar_menu') return mostrarFinalizarSelecionarMateria(supabaseAdmin, chatId, messageId, usuario);
  if (data.startsWith('tarefas_finalizar_mat_')) {
    return mostrarFinalizarSelecionarTarefa(supabaseAdmin, chatId, messageId, usuario, data.replace('tarefas_finalizar_mat_', ''));
  }
  if (data.startsWith('tarefas_finalizar_sel_')) {
    return confirmarFinalizarTarefa(supabaseAdmin, chatId, messageId, data.replace('tarefas_finalizar_sel_', ''));
  }
  if (data.startsWith('tarefas_finalizar_ok_')) {
    return executarFinalizarTarefa(supabaseAdmin, chatId, messageId, usuario, data.replace('tarefas_finalizar_ok_', ''));
  }
  if (data === 'tarefas_finalizar_cancel') return mostrarMenuTarefas(supabaseAdmin, chatId, messageId);

  if (data === 'menu_anotacoes') return mostrarMenuAnotacoes(supabaseAdmin, chatId, messageId);

  if (data === 'anotacoes_add_start') return iniciarAdicionarAnotacao(supabaseAdmin, chatId, messageId, usuario);
  if (data === 'anotacoes_add_cancelar') {
    await limparEstado(supabaseAdmin, chatId);
    return mostrarMenuAnotacoes(supabaseAdmin, chatId, messageId);
  }
  if (data.startsWith('anotacoes_add_materia_')) {
    return receberMateriaAnotacao(supabaseAdmin, chatId, messageId, usuario, data.replace('anotacoes_add_materia_', ''));
  }
  if (data === 'anotacoes_add_confirmar') {
    const estado = await obterEstado(supabaseAdmin, chatId);
    return confirmarAdicionarAnotacao(supabaseAdmin, chatId, messageId, usuario, estado);
  }

  if (data === 'anotacoes_listar_menu') return mostrarListarAnotacoesMenu(supabaseAdmin, chatId, messageId);
  if (data === 'anotacoes_listar_por_materia') return mostrarSelecionarMateriaParaListarAnotacoes(supabaseAdmin, chatId, messageId, usuario);
  if (data === 'anotacoes_listar_todas') return listarTodasAnotacoes(supabaseAdmin, chatId, messageId, usuario);
  if (data.startsWith('anotacoes_listar_mat_')) {
    return listarAnotacoesPorMateria(supabaseAdmin, chatId, messageId, usuario, data.replace('anotacoes_listar_mat_', ''));
  }
  if (data.startsWith('anotacoes_ver_')) {
    return verAnotacao(supabaseAdmin, chatId, messageId, usuario, data.replace('anotacoes_ver_', ''));
  }

  if (data === 'anotacoes_apagar_menu') return mostrarApagarSelecionarMateria(supabaseAdmin, chatId, messageId, usuario);
  if (data.startsWith('anotacoes_apagar_mat_')) {
    return mostrarApagarSelecionarAnotacao(supabaseAdmin, chatId, messageId, usuario, data.replace('anotacoes_apagar_mat_', ''));
  }
  if (data.startsWith('anotacoes_apagar_direto_')) {
    return confirmarApagarAnotacao(supabaseAdmin, chatId, messageId, data.replace('anotacoes_apagar_direto_', ''));
  }
  if (data.startsWith('anotacoes_apagar_sel_')) {
    return confirmarApagarAnotacao(supabaseAdmin, chatId, messageId, data.replace('anotacoes_apagar_sel_', ''));
  }
  if (data.startsWith('anotacoes_apagar_ok_')) {
    return executarApagarAnotacao(supabaseAdmin, chatId, messageId, usuario, data.replace('anotacoes_apagar_ok_', ''));
  }
  if (data === 'anotacoes_apagar_cancel') return mostrarMenuAnotacoes(supabaseAdmin, chatId, messageId);

  // Callback não reconhecido
  return mostrarMenuPrincipal(supabaseAdmin, chatId, messageId);
}

// ---------------------------------------------------------
// ROTEADOR DE MENSAGENS DE TEXTO
// ---------------------------------------------------------

async function tratarMensagemTexto(supabaseAdmin, chatId, usuario, texto) {
  if (texto === '/menu') return mostrarMenuPrincipal(supabaseAdmin, chatId);
  if (texto === '/cancelar') {
    const estadoAtual = await obterEstado(supabaseAdmin, chatId);
    await limparEstado(supabaseAdmin, chatId);
    if (estadoAtual?.fluxo === 'anotacao_add') return mostrarMenuAnotacoes(supabaseAdmin, chatId);
    return mostrarMenuTarefas(supabaseAdmin, chatId);
  }

  const estado = await obterEstado(supabaseAdmin, chatId);

  if (estado?.fluxo === 'tarefa_add') {
    switch (estado.passo) {
      case 'titulo': return receberTituloTarefa(supabaseAdmin, chatId, usuario, estado, texto);
      case 'descricao': return receberDescricaoTarefa(supabaseAdmin, chatId, usuario, estado, texto);
      case 'data_entrega': return receberDataTarefa(supabaseAdmin, chatId, usuario, estado, texto);
      case 'hora_entrega': return receberHoraTarefa(supabaseAdmin, chatId, usuario, estado, texto);
      default: break; // passos controlados por botão (materia/tipo/prioridade/confirmar) ignoram texto solto
    }
    return enviarMensagem(chatId, 'Use os botões acima para continuar, ou /cancelar para desistir.');
  }

  if (estado?.fluxo === 'anotacao_add') {
    switch (estado.passo) {
      case 'titulo': return receberTituloAnotacao(supabaseAdmin, chatId, usuario, estado, texto);
      case 'conteudo': return receberConteudoAnotacao(supabaseAdmin, chatId, usuario, estado, texto);
      default: break; // passos controlados por botão (materia/confirmar) ignoram texto solto
    }
    return enviarMensagem(chatId, 'Use os botões acima para continuar, ou /cancelar para desistir.');
  }

  // Sem fluxo ativo e não é comando reconhecido: mostra o menu principal
  return mostrarMenuPrincipal(supabaseAdmin, chatId);
}

// ---------------------------------------------------------
// VINCULAÇÃO DE CONTA (/start CODIGO) — igual ao webhook original
// ---------------------------------------------------------

async function tratarStart(supabaseAdmin, chatId, texto) {
  const codigo = texto.replace('/start', '').trim().toUpperCase();

  if (!codigo) {
    await enviarMensagem(chatId, 'Olá! Para vincular sua conta, gere um código na página de Configurações do sistema e envie /start seguido do código aqui.');
    return;
  }

  const { data: usuario, error: errBusca } = await supabaseAdmin
    .from('usuarios')
    .select('id, nome')
    .eq('telegram_link_code', codigo)
    .maybeSingle();

  if (errBusca || !usuario) {
    await enviarMensagem(chatId, '❌ Código inválido ou expirado. Gere um novo código nas Configurações do sistema.');
    return;
  }

  const { error: errUpdate } = await supabaseAdmin
    .from('usuarios')
    .update({ telegram_chat_id: chatId, telegram_link_code: null })
    .eq('id', usuario.id);

  if (errUpdate) {
    await enviarMensagem(chatId, '❌ Não consegui concluir a vinculação. Tente novamente em instantes.');
    return;
  }

  const nome = usuario.nome ? `, ${usuario.nome}` : '';
  await enviarMensagem(chatId, `✅ Conta vinculada com sucesso${nome}! A partir de agora você recebe seus lembretes por aqui.`);
  await mostrarMenuPrincipal(supabaseAdmin, chatId);
}

// ---------------------------------------------------------
// PONTO DE ENTRADA
// ---------------------------------------------------------

async function processarUpdate(supabaseAdmin, update) {
  if (update.callback_query) {
    return tratarCallback(supabaseAdmin, update.callback_query);
  }

  const mensagem = update.message;
  if (!mensagem?.text) return; // ignora fotos, stickers, edições, etc.

  const chatId = String(mensagem.chat.id);
  const texto = mensagem.text.trim();

  if (texto.startsWith('/start')) {
    return tratarStart(supabaseAdmin, chatId, texto);
  }

  const usuario = await obterUsuarioPorChatId(supabaseAdmin, chatId);
  if (!usuario) {
    return enviarMensagem(chatId, 'Para vincular sua conta, gere um código nas Configurações do sistema e envie /start seguido do código.');
  }

  return tratarMensagemTexto(supabaseAdmin, chatId, usuario, texto);
}

module.exports = { processarUpdate };
