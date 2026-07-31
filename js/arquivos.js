// =========================================================
// ARQUIVOS.JS — Página de gerenciamento de arquivos
// =========================================================

let USUARIO_ATUAL = null;
let ARQUIVOS_CACHE = [];
let MATERIAS_CACHE = [];

// DOM Elements
const listaArquivosEl = document.getElementById('lista-arquivos');
const searchInput = document.getElementById('search-input');
const filterMateria = document.getElementById('filter-materia');
const filterTipo = document.getElementById('filter-tipo');
const uploadForm = document.getElementById('upload-form');
const fileInput = document.getElementById('file-input');
const fileTitle = document.getElementById('file-title');
const fileDescription = document.getElementById('file-description');
const fileMateria = document.getElementById('file-materia');

// =========================================================
// INICIALIZAÇÃO
// =========================================================

(async () => {
  USUARIO_ATUAL = await iniciarPagina('arquivos');
  if (!USUARIO_ATUAL) return;

  await Promise.all([
    carregarMaterias(),
    carregarArquivos()
  ]);

  setupEventListeners();

  // Se veio de "Ver todos" na página de matérias (?materia=ID), pré-filtra
  const params = new URLSearchParams(window.location.search);
  const materiaParam = params.get('materia');
  if (materiaParam) {
    filterMateria.value = materiaParam;
    aplicarFiltros();
  }
})();

// =========================================================
// CARREGAMENTO DE DADOS
// =========================================================

async function carregarMaterias() {
  const { data, error } = await supabaseClient
    .from('materias')
    .select('id, nome, cor')
    .eq('user_id', USUARIO_ATUAL.id)
    .order('nome');

  if (error) {
    console.error('Erro ao carregar matérias:', error);
    return;
  }

  MATERIAS_CACHE = data || [];

  // Preencher selects
  const selects = [filterMateria, fileMateria];
  selects.forEach(select => {
    const currentValue = select.value;
    select.innerHTML = '<option value="">Todas as matérias</option>';
    MATERIAS_CACHE.forEach(m => {
      const option = document.createElement('option');
      option.value = m.id;
      option.textContent = m.nome;
      select.appendChild(option);
    });
    if (currentValue && MATERIAS_CACHE.some(m => m.id === currentValue)) {
      select.value = currentValue;
    }
  });
}

async function carregarArquivos() {
  try {
    const { data, error } = await supabaseClient
      .from('arquivos')
      .select(`
        *,
        materias!left (nome, cor)
      `)
      .eq('usuario_id', USUARIO_ATUAL.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    ARQUIVOS_CACHE = data || [];
    renderizarArquivos(ARQUIVOS_CACHE);
  } catch (error) {
    console.error('Erro ao carregar arquivos:', error);
    mostrarToast('Erro ao carregar arquivos', 'error');
  }
}

// =========================================================
// RENDERIZAÇÃO
// =========================================================

function renderizarArquivos(filtrados) {
  if (!filtrados || filtrados.length === 0) {
    listaArquivosEl.innerHTML = `
      <div class="empty-state-arquivos">
        <div class="empty-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
        </div>
        <h3>Nenhum arquivo encontrado</h3>
        <p>Clique em "Novo arquivo" para fazer upload</p>
      </div>
    `;
    return;
  }

  listaArquivosEl.innerHTML = filtrados.map(arquivo => {
    const tipo = getTipoArquivo(arquivo.nome_arquivo);
    const tipoClass = getTipoClass(arquivo.nome_arquivo);
    const data = formatarData(arquivo.created_at);
    const materiaNome = arquivo.materias?.nome || 'Sem matéria';
    const tamanho = formatarTamanho(arquivo.tamanho_bytes);
    const corMateria = arquivo.materias?.cor || '#6b7280';

    return `
      <div class="arquivo-card" data-id="${arquivo.id}" style="border-left-color: ${corMateria}">
        <div class="arquivo-card__header">
          <h4 class="arquivo-card__title">${escapeHTML(arquivo.titulo)}</h4>
          <span class="arquivo-card__tipo ${tipoClass}">${getTipoLabel(tipo)}</span>
        </div>
        ${arquivo.descricao ? `<p class="arquivo-card__descricao">${escapeHTML(arquivo.descricao)}</p>` : ''}
        <span class="arquivo-card__materia">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
          ${escapeHTML(materiaNome)}
        </span>
        <div class="arquivo-card__footer">
          <span>${data} • ${tamanho}</span>
          <div class="arquivo-card__actions">
            <button class="btn-download" data-id="${arquivo.id}" title="Baixar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </button>
            <button class="btn-delete" data-id="${arquivo.id}" title="Excluir">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                <line x1="10" y1="11" x2="10" y2="17"/>
                <line x1="14" y1="11" x2="14" y2="17"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Eventos
  document.querySelectorAll('.arquivo-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      const id = card.dataset.id;
      const arquivo = ARQUIVOS_CACHE.find(a => a.id === id);
      if (arquivo) abrirDetalhes(arquivo);
    });
  });

  document.querySelectorAll('.btn-download').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const arquivo = ARQUIVOS_CACHE.find(a => a.id === id);
      if (arquivo) baixarArquivo(arquivo);
    });
  });

  document.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const arquivo = ARQUIVOS_CACHE.find(a => a.id === id);
      if (!arquivo) return;
      const ok = await confirmarAcao({
        titulo: 'Excluir arquivo',
        mensagem: `Tem certeza que deseja excluir "${arquivo.titulo}"? Esta ação não pode ser desfeita.`,
        tipo: 'danger',
        textoConfirmar: 'Excluir',
      });
      if (ok) excluirArquivo(arquivo);
    });
  });
}

// =========================================================
// FILTROS
// =========================================================

function aplicarFiltros() {
  const searchTerm = searchInput.value.toLowerCase().trim();
  const materiaId = filterMateria.value;
  const tipo = filterTipo.value;

  let filtrados = ARQUIVOS_CACHE;

  if (searchTerm) {
    filtrados = filtrados.filter(a => 
      a.titulo.toLowerCase().includes(searchTerm) ||
      (a.descricao && a.descricao.toLowerCase().includes(searchTerm))
    );
  }

  if (materiaId) {
    filtrados = filtrados.filter(a => a.materia_id === materiaId);
  }

  if (tipo) {
    filtrados = filtrados.filter(a => getTipoArquivo(a.nome_arquivo) === tipo);
  }

  renderizarArquivos(filtrados);
}

// =========================================================
// UPLOAD
// =========================================================

async function fazerUpload(file, titulo, descricao, materiaId) {
  try {
    mostrarToast('Fazendo upload...', 'info');

    // Gerar nome único
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `${USUARIO_ATUAL.id}/${fileName}`;

    // Upload para Storage
    const { error: uploadError } = await supabaseClient.storage
      .from('arquivos')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // Salvar no banco
    const { data, error } = await supabaseClient
      .from('arquivos')
      .insert({
        titulo,
        descricao: descricao || null,
        materia_id: materiaId || null,
        usuario_id: USUARIO_ATUAL.id,
        nome_arquivo: file.name,
        caminho_arquivo: filePath,
        tipo_arquivo: file.type,
        tamanho_bytes: file.size
      })
      .select()
      .single();

    if (error) {
      // Rollback: deletar do storage
      await supabaseClient.storage.from('arquivos').remove([filePath]);
      throw error;
    }

    mostrarToast('Arquivo enviado com sucesso!', 'success');
    fecharModal('upload-modal');
    await carregarArquivos();

  } catch (error) {
    console.error('Erro no upload:', error);
    mostrarToast(`Erro ao enviar arquivo: ${error.message}`, 'error');
  }
}

// =========================================================
// DOWNLOAD
// =========================================================

async function baixarArquivo(arquivo) {
  try {
    mostrarToast('Baixando arquivo...', 'info');

    const { data, error } = await supabaseClient.storage
      .from('arquivos')
      .download(arquivo.caminho_arquivo);

    if (error) throw error;

    const blob = new Blob([data], { type: arquivo.tipo_arquivo || 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = arquivo.nome_arquivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    mostrarToast('Download iniciado!', 'success');
  } catch (error) {
    console.error('Erro no download:', error);
    mostrarToast(`Erro ao baixar arquivo: ${error.message}`, 'error');
  }
}

// =========================================================
// EXCLUIR
// =========================================================

async function excluirArquivo(arquivo) {
  try {
    // Deletar do storage
    const { error: storageError } = await supabaseClient.storage
      .from('arquivos')
      .remove([arquivo.caminho_arquivo]);

    if (storageError) throw storageError;

    // Deletar do banco
    const { error } = await supabaseClient
      .from('arquivos')
      .delete()
      .eq('id', arquivo.id);

    if (error) throw error;

    mostrarToast('Arquivo excluído com sucesso!', 'success');
    await carregarArquivos();
  } catch (error) {
    console.error('Erro ao excluir arquivo:', error);
    mostrarToast(`Erro ao excluir arquivo: ${error.message}`, 'error');
  }
}

// =========================================================
// DETALHES
// =========================================================

function abrirDetalhes(arquivo) {
  const content = document.getElementById('detail-content');
  const tipo = getTipoArquivo(arquivo.nome_arquivo);
  const data = formatarData(arquivo.created_at);
  const tamanho = formatarTamanho(arquivo.tamanho_bytes);
  const materiaNome = arquivo.materias?.nome || 'Sem matéria';

  content.innerHTML = `
    <div class="detail-header">
      <h4 class="detail-title">${escapeHTML(arquivo.titulo)}</h4>
      <span class="badge">${getTipoLabel(tipo)}</span>
    </div>
    <div class="detail-info">
      ${arquivo.descricao ? `<p><strong>Descrição:</strong> ${escapeHTML(arquivo.descricao)}</p>` : ''}
      <p><strong>Matéria:</strong> ${escapeHTML(materiaNome)}</p>
      <p><strong>Nome do arquivo:</strong> ${escapeHTML(arquivo.nome_arquivo)}</p>
      <p><strong>Tamanho:</strong> ${tamanho}</p>
      <p><strong>Enviado em:</strong> ${data}</p>
    </div>
    <div class="detail-actions">
      <button class="btn btn-primary" id="detail-download">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Baixar
      </button>
      <button class="btn btn-danger" id="detail-delete">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          <line x1="10" y1="11" x2="10" y2="17"/>
          <line x1="14" y1="11" x2="14" y2="17"/>
        </svg>
        Excluir
      </button>
    </div>
  `;

  document.getElementById('detail-download').addEventListener('click', () => {
    baixarArquivo(arquivo);
    fecharModal('detail-modal');
  });

  document.getElementById('detail-delete').addEventListener('click', async () => {
    const ok = await confirmarAcao({
      titulo: 'Excluir arquivo',
      mensagem: `Tem certeza que deseja excluir "${arquivo.titulo}"? Esta ação não pode ser desfeita.`,
      tipo: 'danger',
      textoConfirmar: 'Excluir',
    });
    if (ok) {
      excluirArquivo(arquivo);
      fecharModal('detail-modal');
    }
  });

  abrirModal('detail-modal');
}

// =========================================================
// UTILITÁRIOS
// =========================================================

function getTipoArquivo(nome) {
  const ext = nome.split('.').pop().toLowerCase();
  const tipos = {
    'pdf': 'pdf',
    'doc': 'doc', 'docx': 'doc',
    'xls': 'xls', 'xlsx': 'xls',
    'ppt': 'ppt', 'pptx': 'ppt',
    'jpg': 'img', 'jpeg': 'img', 'png': 'img', 'gif': 'img', 'bmp': 'img', 'svg': 'img', 'webp': 'img',
    'zip': 'zip', 'rar': 'zip', '7z': 'zip', 'gz': 'zip',
    'txt': 'txt', 'log': 'txt', 'md': 'txt',
    'mp4': 'video', 'avi': 'video', 'mov': 'video', 'mkv': 'video', 'webm': 'video',
    'mp3': 'audio', 'wav': 'audio', 'flac': 'audio', 'aac': 'audio', 'ogg': 'audio'
  };
  return tipos[ext] || 'outro';
}

function getTipoClass(nome) {
  return getTipoArquivo(nome);
}

function getTipoLabel(tipo) {
  const labels = {
    'pdf': 'PDF',
    'doc': 'DOC',
    'xls': 'XLS',
    'ppt': 'PPT',
    'img': 'Imagem',
    'zip': 'ZIP',
    'txt': 'Texto',
    'video': 'Vídeo',
    'audio': 'Áudio',
    'outro': 'Outro'
  };
  return labels[tipo] || tipo;
}

function formatarTamanho(bytes) {
  if (!bytes) return 'Desconhecido';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

function getCorMateria(materiaId) {
  if (!materiaId) return '#6b7280';
  const materia = MATERIAS_CACHE.find(m => m.id === materiaId);
  return materia?.cor || '#6b7280';
}

// =========================================================
// EVENT LISTENERS
// =========================================================

function setupEventListeners() {
  // Upload
  document.getElementById('btn-upload').addEventListener('click', () => {
    fileInput.value = '';
    fileTitle.value = '';
    fileDescription.value = '';
    fileMateria.value = '';
    abrirModal('upload-modal');
  });

  // Fechar modal ao clicar fora
  document.getElementById('upload-modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) fecharModal('upload-modal');
  });

  document.getElementById('detail-modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) fecharModal('detail-modal');
  });

  // Form upload
  uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const file = fileInput.files[0];
    if (!file) {
      mostrarToast('Selecione um arquivo', 'error');
      return;
    }

    const titulo = fileTitle.value.trim();
    if (!titulo) {
      mostrarToast('Digite um título para o arquivo', 'error');
      return;
    }

    const descricao = fileDescription.value.trim();
    const materiaId = fileMateria.value || null;

    await fazerUpload(file, titulo, descricao, materiaId);
  });

  // Filtros
  searchInput.addEventListener('input', aplicarFiltros);
  filterMateria.addEventListener('change', aplicarFiltros);
  filterTipo.addEventListener('change', aplicarFiltros);
}
