// =========================================================
// ANOTAÇÕES — lista à esquerda + painel de edição à direita
// =========================================================

let USUARIO_NOTAS = null;
let MATERIAS_NOTAS = [];
let BUSCA_NOTA = '';
let FILTRO_MATERIA_NOTA = '';

let ANOTACOES_CACHE = [];   // últimos dados carregados da lista
let ANOTACAO_ATUAL = null;  // anotação selecionada no painel (null = nenhuma / nova)
let NOTA_SUJA = false;      // true = existem alterações não salvas no painel

(async () => {
  USUARIO_NOTAS = await iniciarPagina('anotacoes');
  if (!USUARIO_NOTAS) return;

  await carregarMateriasParaNotas();
  await carregarAnotacoes();

  document.getElementById('btn-nova-anotacao').addEventListener('click', () => abrirPainelAnotacao(null));

  document.getElementById('busca-anotacao').addEventListener('input', debounce((e) => {
    BUSCA_NOTA = e.target.value.trim();
    carregarAnotacoes();
  }, 300));

  document.getElementById('filtro-materia-nota').addEventListener('change', (e) => {
    FILTRO_MATERIA_NOTA = e.target.value;
    carregarAnotacoes();
  });

  // Campos do painel: qualquer digitação marca a anotação como "suja" e libera o Salvar
  ['detail-titulo', 'detail-conteudo', 'detail-materia', 'detail-data'].forEach(id => {
    document.getElementById(id).addEventListener('input', marcarComoSuja);
  });
  document.getElementById('detail-materia').addEventListener('change', marcarComoSuja);
  document.getElementById('detail-data').addEventListener('change', marcarComoSuja);

  document.getElementById('btn-salvar-nota').addEventListener('click', salvarAnotacaoPainel);
  document.getElementById('btn-excluir-nota').addEventListener('click', () => {
    if (ANOTACAO_ATUAL) excluirAnotacao(ANOTACAO_ATUAL.id);
  });
  document.getElementById('btn-voltar-nota').addEventListener('click', fecharPainelAnotacao);

  // Toolbar de formatação (insere sintaxe markdown no textarea)
  document.getElementById('notes-toolbar').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-md]');
    if (!btn) return;
    aplicarFormatacao(btn.dataset.md);
  });
})();

async function carregarMateriasParaNotas() {
  const { data } = await supabaseClient
    .from('materias')
    .select('*')
    .eq('user_id', USUARIO_NOTAS.id)
    .order('nome', { ascending: true });

  MATERIAS_NOTAS = data || [];

  const selectFiltro = document.getElementById('filtro-materia-nota');
  const selectDetalhe = document.getElementById('detail-materia');

  MATERIAS_NOTAS.forEach(m => {
    selectFiltro.insertAdjacentHTML('beforeend', `<option value="${m.id}">${escapeHTML(m.nome)}</option>`);
    selectDetalhe.insertAdjacentHTML('beforeend', `<option value="${m.id}">${escapeHTML(m.nome)}</option>`);
  });
}

async function carregarAnotacoes() {
  const container = document.getElementById('lista-anotacoes');
  container.innerHTML = `<div class="loading-spinner"></div>`;

  let query = supabaseClient
    .from('anotacoes')
    .select('*, materias(nome, cor)')
    .eq('user_id', USUARIO_NOTAS.id)
    .order('data', { ascending: false });

  if (FILTRO_MATERIA_NOTA) query = query.eq('materia_id', FILTRO_MATERIA_NOTA);
  if (BUSCA_NOTA) query = query.ilike('titulo', `%${BUSCA_NOTA}%`);

  const { data, error } = await query;

  if (error) {
    container.innerHTML = `<div class="empty-state"><p>Erro ao carregar anotações.</p></div>`;
    return;
  }

  ANOTACOES_CACHE = data || [];

  if (!ANOTACOES_CACHE.length) {
    container.innerHTML = `<div class="empty-state"><p>Nenhuma anotação encontrada.</p></div>`;
  } else {
    container.innerHTML = ANOTACOES_CACHE.map(a => `
      <div class="note-list-item${ANOTACAO_ATUAL && ANOTACAO_ATUAL.id === a.id ? ' is-active' : ''}"
           style="--nota-cor:${a.materias?.cor || '#4F7DF3'}"
           data-id="${a.id}">
        <div class="note-list-item__title">${escapeHTML(a.titulo)}</div>
        <div class="note-list-item__materia">${a.materias?.nome ? escapeHTML(a.materias.nome) : 'Sem matéria'}</div>
        <div class="note-list-item__tempo">${tempoRelativo(a.data)}</div>
      </div>
    `).join('');

    container.querySelectorAll('.note-list-item').forEach(item => {
      item.addEventListener('click', () => {
        const anotacao = ANOTACOES_CACHE.find(a => a.id === item.dataset.id);
        abrirPainelAnotacao(anotacao);
      });
    });
  }

  // Mantém o destaque do item ativo mesmo após recarregar a lista (ex: após salvar)
  destacarItemAtivo();
}

function destacarItemAtivo() {
  document.querySelectorAll('.note-list-item').forEach(el => {
    el.classList.toggle('is-active', !!ANOTACAO_ATUAL && el.dataset.id === ANOTACAO_ATUAL.id);
  });
}

function abrirPainelAnotacao(anotacao) {
  // Se há alterações não salvas, confirma antes de trocar de anotação
  if (NOTA_SUJA) {
    const continuar = confirm('Você tem alterações não salvas. Deseja descartá-las?');
    if (!continuar) return;
  }

  ANOTACAO_ATUAL = anotacao || null;

  document.getElementById('notes-detail-empty').style.display = 'none';
  document.getElementById('notes-detail-editor').style.display = 'flex';

  document.getElementById('detail-titulo').value = anotacao?.titulo || '';
  document.getElementById('detail-conteudo').value = anotacao?.conteudo || '';
  document.getElementById('detail-materia').value = anotacao?.materia_id || '';
  document.getElementById('detail-data').value = anotacao?.data || hojeISO();

  document.getElementById('btn-excluir-nota').style.display = anotacao ? '' : 'none';

  // No mobile, o editor desliza por cima da lista (como no Bloco de Notas)
  document.getElementById('notes-layout').classList.add('is-editing');

  marcarComoLimpa();
  destacarItemAtivo();
  document.getElementById('detail-titulo').focus();
}

// Fecha o editor e volta para a lista (botão "Voltar", usado no mobile)
function fecharPainelAnotacao() {
  if (NOTA_SUJA) {
    const continuar = confirm('Você tem alterações não salvas. Deseja descartá-las?');
    if (!continuar) return;
  }

  ANOTACAO_ATUAL = null;
  document.getElementById('notes-layout').classList.remove('is-editing');
  marcarComoLimpa();
  destacarItemAtivo();
}

function marcarComoSuja() {
  NOTA_SUJA = true;
  const btnSalvar = document.getElementById('btn-salvar-nota');
  const status = document.getElementById('notes-status');
  btnSalvar.disabled = false;
  status.textContent = 'Alterações não salvas';
  status.classList.add('is-dirty');
}

function marcarComoLimpa() {
  NOTA_SUJA = false;
  const btnSalvar = document.getElementById('btn-salvar-nota');
  const status = document.getElementById('notes-status');
  btnSalvar.disabled = true;
  status.textContent = 'Salvo automaticamente';
  status.classList.remove('is-dirty');
}

async function salvarAnotacaoPainel() {
  const titulo = document.getElementById('detail-titulo').value.trim();
  if (!titulo) {
    mostrarToast('Dê um título para a anotação.', 'error');
    document.getElementById('detail-titulo').focus();
    return;
  }

  const payload = {
    titulo,
    conteudo: document.getElementById('detail-conteudo').value.trim(),
    materia_id: document.getElementById('detail-materia').value || null,
    data: document.getElementById('detail-data').value || hojeISO(),
    user_id: USUARIO_NOTAS.id,
  };

  const btnSalvar = document.getElementById('btn-salvar-nota');
  btnSalvar.disabled = true;
  btnSalvar.textContent = 'Salvando...';

  const query = ANOTACAO_ATUAL
    ? supabaseClient.from('anotacoes').update(payload).eq('id', ANOTACAO_ATUAL.id).select('*, materias(nome, cor)').single()
    : supabaseClient.from('anotacoes').insert(payload).select('*, materias(nome, cor)').single();

  const { data, error } = await query;

  btnSalvar.textContent = 'Salvar';

  if (error) {
    mostrarToast('Erro ao salvar anotação.', 'error');
    btnSalvar.disabled = false;
    return;
  }

  ANOTACAO_ATUAL = data;
  mostrarToast(ANOTACAO_ATUAL ? 'Anotação salva!' : 'Anotação criada!', 'success');
  marcarComoLimpa();
  document.getElementById('btn-excluir-nota').style.display = '';
  await carregarAnotacoes();
}

async function excluirAnotacao(id) {
  if (!confirm('Excluir esta anotação?')) return;

  const { error } = await supabaseClient.from('anotacoes').delete().eq('id', id);
  if (error) {
    mostrarToast('Erro ao excluir anotação.', 'error');
    return;
  }

  mostrarToast('Anotação excluída.', 'success');
  ANOTACAO_ATUAL = null;
  document.getElementById('notes-detail-editor').style.display = 'none';
  document.getElementById('notes-detail-empty').style.display = 'flex';
  document.getElementById('notes-layout').classList.remove('is-editing');
  marcarComoLimpa();
  await carregarAnotacoes();
}

// Insere sintaxe markdown no textarea de conteúdo, em torno do texto selecionado
function aplicarFormatacao(tipo) {
  const textarea = document.getElementById('detail-conteudo');
  const inicio = textarea.selectionStart;
  const fim = textarea.selectionEnd;
  const selecionado = textarea.value.slice(inicio, fim);

  let antes = '', depois = '', textoPadrao = 'texto';

  switch (tipo) {
    case 'bold': antes = '**'; depois = '**'; textoPadrao = 'negrito'; break;
    case 'italic': antes = '_'; depois = '_'; textoPadrao = 'itálico'; break;
    case 'underline': antes = '<u>'; depois = '</u>'; textoPadrao = 'sublinhado'; break;
    case 'h1': antes = '# '; depois = ''; textoPadrao = 'Título'; break;
    case 'h2': antes = '## '; depois = ''; textoPadrao = 'Subtítulo'; break;
    case 'ul': antes = '- '; depois = ''; textoPadrao = 'item'; break;
    case 'ol': antes = '1. '; depois = ''; textoPadrao = 'item'; break;
    case 'quote': antes = '> '; depois = ''; textoPadrao = 'citação'; break;
    case 'code': antes = '`'; depois = '`'; textoPadrao = 'código'; break;
  }

  const conteudoNovo = selecionado || textoPadrao;
  const novoValor = textarea.value.slice(0, inicio) + antes + conteudoNovo + depois + textarea.value.slice(fim);
  textarea.value = novoValor;

  const novaPosicaoInicio = inicio + antes.length;
  const novaPosicaoFim = novaPosicaoInicio + conteudoNovo.length;
  textarea.focus();
  textarea.setSelectionRange(novaPosicaoInicio, novaPosicaoFim);

  marcarComoSuja();
}

// "Hoje", "Ontem", "X dias atrás", "X semana(s) atrás", "X mês(es) atrás"
function tempoRelativo(dataISO) {
  if (!dataISO) return '';

  const data = new Date(dataISO + 'T00:00:00');
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const diffMs = hoje - data;
  const diffDias = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDias <= 0) return 'Hoje';
  if (diffDias === 1) return 'Ontem';
  if (diffDias < 7) return `${diffDias} dias atrás`;

  const semanas = Math.floor(diffDias / 7);
  if (diffDias < 30) return semanas === 1 ? '1 semana atrás' : `${semanas} semanas atrás`;

  const meses = Math.floor(diffDias / 30);
  if (meses < 12) return meses === 1 ? '1 mês atrás' : `${meses} meses atrás`;

  const anos = Math.floor(diffDias / 365);
  return anos === 1 ? '1 ano atrás' : `${anos} anos atrás`;
}
