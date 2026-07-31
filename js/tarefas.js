// =========================================================
// TAREFAS — CRUD, filtros por status e matéria
// =========================================================

let USUARIO_TAREFAS = null;
let MATERIAS_TAREFAS = [];
let FILTRO_STATUS = 'pendente';
let FILTRO_MATERIA = '';
let ORDENACAO = 'data';

const PESO_PRIORIDADE = { alta: 3, media: 2, baixa: 1 };
const BUCKET_ANEXOS = 'anexos-tarefas';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

let ANEXOS_ATUAIS = [];
let ARQUIVOS_PENDENTES = [];
let TAREFA_EDITANDO = null;

// =========================================================
// UTILITÁRIOS DE DATA/HORA - HORÁRIO BRASÍLIA
// (getAgoraBrasilia, criarDataBrasilia, formatarDataBrasilia,
// formatarDataRelativaBrasilia, formatarHoraBrasilia e
// formatarDataCompletaBrasilia agora vivem em js/utils.js,
// carregado antes deste arquivo em todas as páginas)
// =========================================================

/**
 * Verifica se uma data/hora está atrasada (considerando horário de Brasília)
 */
function isTarefaAtrasada(tarefa) {
  if (tarefa.status === 'concluida') return false;
  if (!tarefa.data_entrega) return false;
  
  try {
    const dataEntrega = criarDataBrasilia(tarefa.data_entrega, tarefa.hora_entrega);
    if (!dataEntrega) return false;
    
    const agora = getAgoraBrasilia();
    return dataEntrega < agora;
  } catch (error) {
    console.error('Erro ao verificar atraso da tarefa:', error);
    return false;
  }
}

/**
 * Verifica se uma tarefa está próxima do vencimento (menos de 24h)
 */
function isTarefaProximoVencer(tarefa) {
  if (tarefa.status === 'concluida') return false;
  if (!tarefa.data_entrega) return false;
  if (isTarefaAtrasada(tarefa)) return false;
  
  try {
    const dataEntrega = criarDataBrasilia(tarefa.data_entrega, tarefa.hora_entrega);
    if (!dataEntrega) return false;
    
    const agora = getAgoraBrasilia();
    const diffHoras = (dataEntrega - agora) / (1000 * 60 * 60);
    
    return diffHoras > 0 && diffHoras <= 24;
  } catch (error) {
    return false;
  }
}

// =========================================================
// INICIALIZAÇÃO
// =========================================================

(async () => {
  try {
    USUARIO_TAREFAS = await iniciarPagina('tarefas');
    if (!USUARIO_TAREFAS) return;

    await carregarMateriasParaSelect();
    await carregarTarefas();

    configurarEventListeners();
    configurarModalAnexos();

  } catch (error) {
    console.error('Erro na inicialização:', error);
    mostrarToast('Erro ao carregar a página.', 'error');
  }
})();

// =========================================================
// CONFIGURAÇÃO DE EVENTOS
// =========================================================

function configurarEventListeners() {
  document.getElementById('btn-nova-tarefa').addEventListener('click', () => abrirModalTarefa());
  document.getElementById('form-tarefa').addEventListener('submit', salvarTarefa);

  document.querySelectorAll('#tabs-status .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#tabs-status .tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      FILTRO_STATUS = tab.dataset.filtro;
      carregarTarefas();
    });
  });

  document.getElementById('filtro-materia').addEventListener('change', (e) => {
    FILTRO_MATERIA = e.target.value;
    carregarTarefas();
  });

  document.getElementById('ordenar-tarefas').addEventListener('change', (e) => {
    ORDENACAO = e.target.value;
    carregarTarefas();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      fecharModal('modal-tarefa');
    }
  });

  document.getElementById('modal-tarefa').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
      fecharModal('modal-tarefa');
    }
  });
}

function configurarModalAnexos() {
  const inputAnexo = document.getElementById('input-anexo');
  const btnAdicionar = document.getElementById('btn-adicionar-anexo');

  btnAdicionar.addEventListener('click', () => {
    inputAnexo.click();
  });

  inputAnexo.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    
    const validFiles = files.filter(file => {
      if (file.size > MAX_FILE_SIZE) {
        mostrarToast(`${file.name} excede 10MB`, 'error');
        return false;
      }

      const tiposPermitidos = [
        'application/pdf',
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'application/zip',
        'application/x-rar-compressed'
      ];

      if (!tiposPermitidos.includes(file.type) && !file.name.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|zip|rar|jpg|jpeg|png|gif|webp)$/i)) {
        mostrarToast(`${file.name} não é um tipo suportado`, 'error');
        return false;
      }

      return true;
    });

    if (validFiles.length > 0) {
      if (ARQUIVOS_PENDENTES.length + validFiles.length > 10) {
        mostrarToast('Máximo de 10 arquivos por tarefa', 'error');
        const limite = 10 - ARQUIVOS_PENDENTES.length;
        if (limite > 0) {
          ARQUIVOS_PENDENTES.push(...validFiles.slice(0, limite));
        }
      } else {
        ARQUIVOS_PENDENTES.push(...validFiles);
      }
      
      renderizarAnexos();
      mostrarToast(`${validFiles.length} arquivo(s) adicionado(s)`, 'success');
    }

    e.target.value = '';
  });

  const containerAnexos = document.getElementById('lista-anexos');
  containerAnexos.addEventListener('dragover', (e) => {
    e.preventDefault();
    containerAnexos.style.borderColor = '#3B82F6';
    containerAnexos.style.backgroundColor = '#EFF6FF';
  });

  containerAnexos.addEventListener('dragleave', () => {
    containerAnexos.style.borderColor = '#D1D5DB';
    containerAnexos.style.backgroundColor = '';
  });

  containerAnexos.addEventListener('drop', (e) => {
    e.preventDefault();
    containerAnexos.style.borderColor = '#D1D5DB';
    containerAnexos.style.backgroundColor = '';

    const files = Array.from(e.dataTransfer.files);
    const inputEvent = new Event('change');
    Object.defineProperty(inputEvent, 'target', {
      value: { files: files }
    });
    document.getElementById('input-anexo').dispatchEvent(inputEvent);
  });
}

// =========================================================
// CARREGAMENTO DE DADOS
// =========================================================

async function carregarMateriasParaSelect() {
  try {
    const { data, error } = await supabaseClient
      .from('materias')
      .select('*')
      .eq('user_id', USUARIO_TAREFAS.id)
      .order('nome', { ascending: true });

    if (error) throw error;

    MATERIAS_TAREFAS = data || [];

    const selectFiltro = document.getElementById('filtro-materia');
    const selectForm = document.getElementById('tarefa-materia');

    while (selectFiltro.options.length > 1) selectFiltro.remove(1);
    while (selectForm.options.length > 1) selectForm.remove(1);

    MATERIAS_TAREFAS.forEach(m => {
      const optionFiltro = document.createElement('option');
      optionFiltro.value = m.id;
      optionFiltro.textContent = escapeHTML(m.nome);
      selectFiltro.appendChild(optionFiltro);

      const optionForm = document.createElement('option');
      optionForm.value = m.id;
      optionForm.textContent = escapeHTML(m.nome);
      selectForm.appendChild(optionForm);
    });

  } catch (error) {
    console.error('Erro ao carregar matérias:', error);
    mostrarToast('Erro ao carregar matérias.', 'error');
  }
}

async function carregarTarefas() {
  const container = document.getElementById('lista-tarefas');
  container.innerHTML = `<div class="loading-spinner"></div>`;

  try {
    let query = supabaseClient
      .from('tarefas')
      .select('*, materias(nome, cor)')
      .eq('user_id', USUARIO_TAREFAS.id);

    if (FILTRO_STATUS !== 'todas') {
      query = query.eq('status', FILTRO_STATUS);
    }

    if (FILTRO_MATERIA) {
      query = query.eq('materia_id', FILTRO_MATERIA);
    }

    const { data, error } = await query;

    if (error) throw error;

    if (!data || data.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
          <p style="font-weight: 500;">Nenhuma tarefa encontrada</p>
          <p style="color: #6B7280; font-size: 14px; margin-top: 4px;">
            ${FILTRO_STATUS !== 'todas' ? `Nenhuma tarefa ${FILTRO_STATUS} com esses filtros.` : 'Comece criando sua primeira tarefa!'}
          </p>
          ${FILTRO_STATUS !== 'todas' ? `
            <button class="btn btn-primary btn-sm" style="margin-top: 12px;" onclick="document.getElementById('btn-nova-tarefa').click()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;margin-right:4px;">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Criar tarefa
            </button>
          ` : ''}
        </div>
      `;
      return;
    }

    ordenarTarefas(data);

    container.innerHTML = data.map(t => linhaTarefaHTML(t)).join('');

    container.querySelectorAll('.checkbox').forEach(cb => {
      cb.addEventListener('click', () => alternarStatus(cb.dataset.id, cb.dataset.status));
    });

    container.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', () => {
        const tarefa = data.find(t => t.id === btn.dataset.id);
        if (tarefa) abrirModalTarefa(tarefa);
      });
    });

    container.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', () => excluirTarefa(btn.dataset.id));
    });

    container.querySelectorAll('.btn-details').forEach(btn => {
      btn.addEventListener('click', () => {
        const tarefa = data.find(t => t.id === btn.dataset.id);
        if (tarefa) mostrarDetalhesTarefa(tarefa);
      });
    });

  } catch (error) {
    console.error('Erro ao carregar tarefas:', error);
    container.innerHTML = `
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p style="color: #EF4444;">Erro ao carregar tarefas</p>
        <p style="color: #6B7280; font-size: 14px;">${escapeHTML(error.message)}</p>
        <button class="btn btn-primary btn-sm" style="margin-top: 12px;" onclick="carregarTarefas()">
          Tentar novamente
        </button>
      </div>
    `;
  }
}

function ordenarTarefas(data) {
  if (ORDENACAO === 'prioridade') {
    data.sort((a, b) => {
      const diff = (PESO_PRIORIDADE[b.prioridade] || 0) - (PESO_PRIORIDADE[a.prioridade] || 0);
      if (diff !== 0) return diff;
      
      if (!a.data_entrega && !b.data_entrega) return 0;
      if (!a.data_entrega) return 1;
      if (!b.data_entrega) return -1;
      
      const dataA = criarDataBrasilia(a.data_entrega, a.hora_entrega);
      const dataB = criarDataBrasilia(b.data_entrega, b.hora_entrega);
      
      if (!dataA && !dataB) return 0;
      if (!dataA) return 1;
      if (!dataB) return -1;
      
      return dataA - dataB;
    });
  } else {
    data.sort((a, b) => {
      if (!a.data_entrega && !b.data_entrega) return 0;
      if (!a.data_entrega) return 1;
      if (!b.data_entrega) return -1;
      
      const dataA = criarDataBrasilia(a.data_entrega, a.hora_entrega);
      const dataB = criarDataBrasilia(b.data_entrega, b.hora_entrega);
      
      if (!dataA && !dataB) return 0;
      if (!dataA) return 1;
      if (!dataB) return -1;
      
      return dataA - dataB;
    });
  }
}

// =========================================================
// RENDERIZAÇÃO HTML
// =========================================================

function linhaTarefaHTML(t) {
  const pInfo = PRIORIDADE_INFO[t.prioridade] || PRIORIDADE_INFO.media;
  const concluida = t.status === 'concluida';
  const isProva = t.tipo === 'prova';
  const isAtrasada = isTarefaAtrasada(t);
  const isProximo = isTarefaProximoVencer(t);
  const temAnexos = t.anexos_count > 0;

  const statusIcon = isAtrasada ? `
    <span class="status-atrasada">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;margin-right:2px;">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      Atrasada
    </span>
  ` : isProximo ? `
    <span class="status-proximo">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;margin-right:2px;">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
      Vence em breve
    </span>
  ` : '';

  return `
    <div class="item-row ${concluida ? 'item-row--concluida' : ''} ${isAtrasada ? 'item-row--atrasada' : ''}">
      <div class="checkbox ${concluida ? 'checked' : ''}" data-id="${t.id}" data-status="${t.status}">
        ${concluida ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
      </div>
      
      <div class="item-row__color" style="background:${t.materias?.cor || '#E5E7EB'}"></div>
      
      <div class="item-row__main">
        <div class="item-row__title ${concluida ? 'done' : ''}">
          ${isProva ? `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;margin-right:4px;">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <polyline points="9 12 11 14 15 10"/>
            </svg>
          ` : `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;margin-right:4px;">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          `}
          ${escapeHTML(t.titulo)}
          ${statusIcon}
          ${temAnexos ? `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;margin-left:4px;color:#6B7280;">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
            </svg>
          ` : ''}
        </div>
        <div class="item-row__meta">
          ${t.materias?.nome ? `<span style="color:${t.materias.cor || '#6B7280'}">●</span> ${escapeHTML(t.materias.nome)} · ` : ''}
          ${t.data_entrega ? formatarDataRelativaBrasilia(t.data_entrega) : 'Sem data definida'}
          ${t.hora_entrega ? ` às ${formatarHoraBrasilia(t.hora_entrega)}` : ''}
          ${t.descricao ? ` · ${escapeHTML(t.descricao.substring(0, 50))}${t.descricao.length > 50 ? '...' : ''}` : ''}
        </div>
      </div>
      
      <span class="badge ${pInfo.classe}">${pInfo.label}</span>
      
      <div class="item-row__actions">
        <button class="btn-icon btn-details" data-id="${t.id}" title="Ver detalhes">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </button>
        <button class="btn-icon btn-edit" data-id="${t.id}" title="Editar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button class="btn-icon btn-delete" data-id="${t.id}" title="Excluir">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            <line x1="10" y1="11" x2="10" y2="17"/>
            <line x1="14" y1="11" x2="14" y2="17"/>
          </svg>
        </button>
      </div>
    </div>
  `;
}

// =========================================================
// OPERAÇÕES CRUD
// =========================================================

async function alternarStatus(id, statusAtual) {
  try {
    const novoStatus = statusAtual === 'concluida' ? 'pendente' : 'concluida';
    
    const { error } = await supabaseClient
      .from('tarefas')
      .update({ status: novoStatus })
      .eq('id', id);

    if (error) throw error;

    mostrarToast(novoStatus === 'concluida' ? '✅ Tarefa concluída!' : '↩️ Tarefa reaberta', 'success');
    await carregarTarefas();

  } catch (error) {
    console.error('Erro ao alternar status:', error);
    mostrarToast('Erro ao atualizar tarefa.', 'error');
  }
}

function abrirModalTarefa(tarefa = null) {
  TAREFA_EDITANDO = tarefa;
  
  document.getElementById('modal-tarefa-titulo').innerHTML = tarefa ? `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;margin-right:6px;">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
    Editar tarefa
  ` : `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;margin-right:6px;">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
    Nova tarefa
  `;
  
  document.getElementById('tarefa-id').value = tarefa?.id || '';
  document.getElementById('tarefa-titulo').value = tarefa?.titulo || '';
  document.getElementById('tarefa-descricao').value = tarefa?.descricao || '';
  document.getElementById('tarefa-materia').value = tarefa?.materia_id || '';
  document.getElementById('tarefa-tipo').value = tarefa?.tipo || 'tarefa';
  document.getElementById('tarefa-data').value = tarefa?.data_entrega || '';
  document.getElementById('tarefa-hora').value = tarefa?.hora_entrega || '';
  document.getElementById('tarefa-prioridade').value = tarefa?.prioridade || 'media';

  ARQUIVOS_PENDENTES = [];
  ANEXOS_ATUAIS = [];
  
  if (tarefa?.id) {
    carregarAnexos(tarefa.id);
  } else {
    renderizarAnexos();
  }

  abrirModal('modal-tarefa');
  
  setTimeout(() => {
    document.getElementById('tarefa-titulo').focus();
  }, 100);
}

async function carregarAnexos(tarefaId) {
  try {
    const { data, error } = await supabaseClient
      .from('tarefas_anexos')
      .select('*')
      .eq('tarefa_id', tarefaId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    if (!data) return;

    ANEXOS_ATUAIS = await Promise.all(
      data.map(async (anexo) => {
        try {
          const { data: signed } = await supabaseClient.storage
            .from(BUCKET_ANEXOS)
            .createSignedUrl(anexo.caminho, 60 * 60);
          
          return { 
            ...anexo, 
            url: signed?.signedUrl || null,
            url_disponivel: !!signed?.signedUrl
          };
        } catch (err) {
          console.error('Erro ao gerar URL do anexo:', err);
          return { ...anexo, url: null, url_disponivel: false };
        }
      })
    );

    renderizarAnexos();

  } catch (error) {
    console.error('Erro ao carregar anexos:', error);
    mostrarToast('Erro ao carregar anexos.', 'error');
  }
}

function renderizarAnexos() {
  const container = document.getElementById('lista-anexos');
  if (!container) return;

  const itensExistentes = ANEXOS_ATUAIS.map((a) => `
    <div class="item-row" data-id="${a.id}">
      <div class="item-row__main">
        ${a.url_disponivel ? `
          <div class="item-row__title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;margin-right:4px;">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
            </svg>
            <a href="${a.url}" target="_blank" rel="noopener noreferrer">${escapeHTML(a.nome_arquivo)}</a>
          </div>
        ` : `
          <div class="item-row__title" style="color: #6B7280;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;margin-right:4px;">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
            </svg>
            ${escapeHTML(a.nome_arquivo)} (indisponível)
          </div>
        `}
        <div class="item-row__meta">
          ${a.tamanho ? formatarTamanho(a.tamanho) : ''}
          ${a.tipo ? ` · ${a.tipo}` : ''}
        </div>
      </div>
      <div class="item-row__actions">
        <button type="button" class="btn-remover-anexo" data-id="${a.id}" title="Excluir anexo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            <line x1="10" y1="11" x2="10" y2="17"/>
            <line x1="14" y1="11" x2="14" y2="17"/>
          </svg>
        </button>
      </div>
    </div>
  `).join('');

  const itensPendentes = ARQUIVOS_PENDENTES.map((f, i) => `
    <div class="item-row" data-index="${i}" style="opacity: 0.7;">
      <div class="item-row__main">
        <div class="item-row__title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;margin-right:4px;">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
          ${escapeHTML(f.name)}
        </div>
        <div class="item-row__meta">
          ${formatarTamanho(f.size)} · ⏳ pendente
        </div>
      </div>
      <div class="item-row__actions">
        <button type="button" class="btn-remover-pendente" data-index="${i}" title="Remover">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>
  `).join('');

  const total = ANEXOS_ATUAIS.length + ARQUIVOS_PENDENTES.length;

  if (total === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 16px;">
        <p style="color: #6B7280; font-size: 14px;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;margin-right:6px;">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
          </svg>
          Nenhum anexo
        </p>
        <p style="color: #9CA3AF; font-size: 12px;">Arraste arquivos ou clique em "Adicionar arquivo"</p>
      </div>
    `;
  } else {
    container.innerHTML = `
      <div style="margin-bottom: 8px; font-size: 12px; color: #6B7280;">
        ${total} arquivo(s) (${ANEXOS_ATUAIS.length} salvos, ${ARQUIVOS_PENDENTES.length} pendentes)
      </div>
      ${itensExistentes}
      ${itensPendentes}
    `;
  }

  container.querySelectorAll('.btn-remover-anexo').forEach((btn) => {
    btn.addEventListener('click', () => excluirAnexoExistente(btn.dataset.id));
  });

  container.querySelectorAll('.btn-remover-pendente').forEach((btn) => {
    btn.addEventListener('click', () => {
      const index = Number(btn.dataset.index);
      ARQUIVOS_PENDENTES.splice(index, 1);
      renderizarAnexos();
      mostrarToast('Arquivo removido', 'info');
    });
  });
}

async function excluirAnexoExistente(anexoId) {
  const anexo = ANEXOS_ATUAIS.find((a) => a.id === anexoId);
  if (!anexo) return;

  if (!confirm(`Excluir o anexo "${anexo.nome_arquivo}"?`)) return;

  try {
    const { error: storageError } = await supabaseClient.storage
      .from(BUCKET_ANEXOS)
      .remove([anexo.caminho]);

    if (storageError) {
      console.warn('Erro ao remover do storage:', storageError);
    }

    const { error: dbError } = await supabaseClient
      .from('tarefas_anexos')
      .delete()
      .eq('id', anexoId);

    if (dbError) throw dbError;

    ANEXOS_ATUAIS = ANEXOS_ATUAIS.filter((a) => a.id !== anexoId);
    renderizarAnexos();
    mostrarToast('Anexo excluído', 'success');

  } catch (error) {
    console.error('Erro ao excluir anexo:', error);
    mostrarToast('Erro ao excluir anexo.', 'error');
  }
}

async function enviarAnexosPendentes(tarefaId) {
  if (!ARQUIVOS_PENDENTES.length) return;

  let sucessos = 0;
  let erros = 0;

  for (const arquivo of ARQUIVOS_PENDENTES) {
    try {
      const nomeSanitizado = sanitizarNomeArquivo(arquivo.name);
      const timestamp = Date.now();
      const caminho = `${USUARIO_TAREFAS.id}/${tarefaId}/${timestamp}_${nomeSanitizado}`;

      const { error: erroUpload } = await supabaseClient.storage
        .from(BUCKET_ANEXOS)
        .upload(caminho, arquivo, {
          cacheControl: '3600',
          upsert: false
        });

      if (erroUpload) {
        console.error('Erro no upload:', erroUpload);
        erros++;
        mostrarToast(`Erro ao enviar ${arquivo.name}`, 'error');
        continue;
      }

      const { error: erroInsert } = await supabaseClient
        .from('tarefas_anexos')
        .insert({
          tarefa_id: tarefaId,
          user_id: USUARIO_TAREFAS.id,
          nome_arquivo: arquivo.name,
          caminho: caminho,
          tipo: arquivo.type || null,
          tamanho: arquivo.size || null,
        });

      if (erroInsert) {
        console.error('Erro ao salvar registro:', erroInsert);
        await supabaseClient.storage.from(BUCKET_ANEXOS).remove([caminho]);
        erros++;
        mostrarToast(`Erro ao registrar ${arquivo.name}`, 'error');
        continue;
      }

      sucessos++;

    } catch (error) {
      console.error('Erro inesperado:', error);
      erros++;
      mostrarToast(`Erro ao enviar ${arquivo.name}`, 'error');
    }
  }

  ARQUIVOS_PENDENTES = [];

  if (sucessos > 0) {
    mostrarToast(`${sucessos} arquivo(s) enviado(s) com sucesso${erros > 0 ? ` (${erros} falhas)` : ''}`, 'success');
  }

  return { sucessos, erros };
}

async function salvarTarefa(e) {
  e.preventDefault();

  const submitBtn = e.target.querySelector('[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Salvando...';

  try {
    const id = document.getElementById('tarefa-id').value;
    const payload = {
      titulo: document.getElementById('tarefa-titulo').value.trim(),
      descricao: document.getElementById('tarefa-descricao').value.trim() || null,
      materia_id: document.getElementById('tarefa-materia').value || null,
      tipo: document.getElementById('tarefa-tipo').value,
      data_entrega: document.getElementById('tarefa-data').value || null,
      hora_entrega: document.getElementById('tarefa-hora').value || null,
      prioridade: document.getElementById('tarefa-prioridade').value,
      user_id: USUARIO_TAREFAS.id
    };

    if (!payload.titulo) {
      mostrarToast('O título é obrigatório', 'error');
      document.getElementById('tarefa-titulo').focus();
      submitBtn.disabled = false;
      submitBtn.textContent = 'Salvar';
      return;
    }

    let idTarefa = id;
    let error;

    if (id) {
      const { error: updateError } = await supabaseClient
        .from('tarefas')
        .update(payload)
        .eq('id', id);

      error = updateError;
    } else {
      const { data, error: insertError } = await supabaseClient
        .from('tarefas')
        .insert({ ...payload, status: 'pendente' })
        .select('id')
        .single();

      error = insertError;
      if (data) idTarefa = data.id;
    }

    if (error) throw error;

    if (ARQUIVOS_PENDENTES.length) {
      await enviarAnexosPendentes(idTarefa);
    }

    const mensagem = id ? 'Tarefa atualizada!' : 'Tarefa criada!';
    mostrarToast(mensagem, 'success');

    fecharModal('modal-tarefa');
    await carregarTarefas();

  } catch (error) {
    console.error('Erro ao salvar tarefa:', error);
    mostrarToast(`Erro ao salvar: ${error.message}`, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Salvar';
  }
}

async function excluirTarefa(id) {
  if (!confirm('Tem certeza que deseja excluir esta tarefa?\nEsta ação não pode ser desfeita.')) return;

  try {
    const { data: anexos } = await supabaseClient
      .from('tarefas_anexos')
      .select('caminho')
      .eq('tarefa_id', id);

    if (anexos && anexos.length > 0) {
      const caminhos = anexos.map(a => a.caminho);
      await supabaseClient.storage.from(BUCKET_ANEXOS).remove(caminhos);
    }

    await supabaseClient
      .from('tarefas_anexos')
      .delete()
      .eq('tarefa_id', id);

    const { error } = await supabaseClient
      .from('tarefas')
      .delete()
      .eq('id', id);

    if (error) throw error;

    mostrarToast('Tarefa excluída', 'success');
    await carregarTarefas();

  } catch (error) {
    console.error('Erro ao excluir tarefa:', error);
    mostrarToast('Erro ao excluir tarefa.', 'error');
  }
}

// =========================================================
// FUNÇÕES AUXILIARES
// =========================================================

function sanitizarNomeArquivo(nome) {
  return nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .substring(0, 200);
}

function formatarTamanho(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

function mostrarDetalhesTarefa(tarefa) {
  const pInfo = PRIORIDADE_INFO[tarefa.prioridade] || PRIORIDADE_INFO.media;
  const statusLabel = tarefa.status === 'concluida' ? 'Concluída' : 'Pendente';
  const tipoLabel = tarefa.tipo === 'prova' ? 'Prova' : 'Tarefa';
  const isAtrasada = isTarefaAtrasada(tarefa);
  const isProximo = isTarefaProximoVencer(tarefa);
  
  let statusExtra = '';
  if (isAtrasada) statusExtra = ' <span style="color:#EF4444;font-size:12px;">● Atrasada</span>';
  else if (isProximo) statusExtra = ' <span style="color:#F59E0B;font-size:12px;">● Vence em breve</span>';
  
  const detalhes = `
    <div style="max-width: 500px; padding: 8px;">
      <h3 style="margin: 0 0 12px 0;display:flex;align-items:center;gap:6px;">
        ${escapeHTML(tarefa.titulo)}
        ${statusExtra}
      </h3>
      
      <div style="display: grid; gap: 8px; font-size: 14px;">
        <div><strong>Tipo:</strong> ${tipoLabel}</div>
        <div><strong>Status:</strong> ${statusLabel}</div>
        <div><strong>Prioridade:</strong> <span class="badge ${pInfo.classe}">${pInfo.label}</span></div>
        
        ${tarefa.materias?.nome ? `
          <div><strong>Matéria:</strong> 
            <span style="color:${tarefa.materias.cor || '#6B7280'}">●</span> 
            ${escapeHTML(tarefa.materias.nome)}
          </div>
        ` : ''}
        
        ${tarefa.data_entrega ? `
          <div><strong>Data/Hora:</strong> ${formatarDataCompletaBrasilia(tarefa.data_entrega, tarefa.hora_entrega)}</div>
        ` : ''}
        
        ${tarefa.descricao ? `
          <div style="margin-top: 8px; border-top: 1px solid #E5E7EB; padding-top: 8px;">
            <strong>Descrição:</strong>
            <p style="margin: 4px 0 0 0; white-space: pre-wrap;">${escapeHTML(tarefa.descricao)}</p>
          </div>
        ` : ''}
        
        <div style="margin-top: 8px; border-top: 1px solid #E5E7EB; padding-top: 8px; font-size: 12px; color: #6B7280;">
          Criado em: ${formatarDataCompletaBrasilia(tarefa.created_at)}
        </div>
      </div>
    </div>
  `;

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style.display = 'flex';
  modal.innerHTML = `
    <div class="modal" style="max-width: 500px;">
      <div class="modal-header">
        <h3>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;margin-right:6px;">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          Detalhes da tarefa
        </h3>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="modal-body">
        ${detalhes}
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Fechar</button>
        <button class="btn btn-primary" onclick="
          const id = '${tarefa.id}';
          this.closest('.modal-overlay').remove();
          const tarefaData = ${JSON.stringify(tarefa).replace(/</g, '\\u003c')};
          abrirModalTarefa(tarefaData);
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;margin-right:4px;">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          Editar
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}

// =========================================================
// TOAST (fallback)
// =========================================================

if (typeof mostrarToast !== 'function') {
  window.mostrarToast = function(mensagem, tipo = 'info') {
    const toast = document.createElement('div');
    const cores = {
      success: '#10B981',
      error: '#EF4444',
      warning: '#F59E0B',
      info: '#3B82F6'
    };
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 8px;
      color: white;
      font-weight: 500;
      z-index: 9999;
      max-width: 400px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      animation: slideIn 0.3s ease;
      background: ${cores[tipo] || cores.info};
    `;
    toast.textContent = mensagem;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  };

  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
}

// =========================================================
// PRIORIDADE_INFO (fallback)
// =========================================================

if (typeof PRIORIDADE_INFO === 'undefined') {
  window.PRIORIDADE_INFO = {
    alta: { label: 'Alta', classe: 'badge-danger' },
    media: { label: 'Média', classe: 'badge-warning' },
    baixa: { label: 'Baixa', classe: 'badge-success' }
  };
}

// =========================================================
// FUNÇÕES DE MODAL (fallback)
// =========================================================

if (typeof abrirModal !== 'function') {
  window.abrirModal = function(id) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    }
  };
}

if (typeof fecharModal !== 'function') {
  window.fecharModal = function(id) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.style.display = 'none';
      document.body.style.overflow = '';
    }
  };
}

if (typeof escapeHTML !== 'function') {
  window.escapeHTML = function(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  };
}

if (typeof formatarDataRelativa !== 'function') {
  window.formatarDataRelativa = formatarDataRelativaBrasilia;
}

// =========================================================
// FUNÇÕES DE INICIALIZAÇÃO (fallback)
// =========================================================

if (typeof iniciarPagina !== 'function') {
  window.iniciarPagina = async function(pagina) {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) {
        window.location.href = 'login.html';
        return null;
      }
      return user;
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error);
      window.location.href = 'login.html';
      return null;
    }
  };
}

// =========================================================
// EXPORTA FUNÇÕES PARA USO GLOBAL
// =========================================================

window.carregarTarefas = carregarTarefas;
window.abrirModalTarefa = abrirModalTarefa;
window.fecharModal = fecharModal;
window.salvarTarefa = salvarTarefa;
window.excluirTarefa = excluirTarefa;
window.alternarStatus = alternarStatus;
window.mostrarDetalhesTarefa = mostrarDetalhesTarefa;
window.isTarefaAtrasada = isTarefaAtrasada;
window.isTarefaProximoVencer = isTarefaProximoVencer;
window.formatarDataBrasilia = formatarDataBrasilia;
window.formatarDataRelativaBrasilia = formatarDataRelativaBrasilia;
window.formatarDataCompletaBrasilia = formatarDataCompletaBrasilia;
window.formatarHoraBrasilia = formatarHoraBrasilia;
window.getAgoraBrasilia = getAgoraBrasilia;
window.criarDataBrasilia = criarDataBrasilia;
