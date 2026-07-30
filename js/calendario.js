// =========================================================
// CALENDÁRIO — visão mensal com tarefas, provas e eventos
// =========================================================

let USUARIO_CAL = null;
let MES_ATUAL = new Date().getMonth();
let ANO_ATUAL = new Date().getFullYear();
let DIA_SELECIONADO = null;
let ITENS_DO_MES = {}; // { 'YYYY-MM-DD': [ {titulo, tipo, cor, origem} ] }

// =========================================================
// INICIALIZAÇÃO
// =========================================================

(async () => {
  USUARIO_CAL = await iniciarPagina('calendario');
  if (!USUARIO_CAL) return;

  await renderizarCalendario();

  document.getElementById('mes-anterior').addEventListener('click', () => mudarMes(-1));
  document.getElementById('mes-proximo').addEventListener('click', () => mudarMes(1));
  document.getElementById('form-evento').addEventListener('submit', salvarEvento);
})();

// =========================================================
// NAVEGAÇÃO
// =========================================================

function mudarMes(delta) {
  MES_ATUAL += delta;
  if (MES_ATUAL < 0) { MES_ATUAL = 11; ANO_ATUAL--; }
  if (MES_ATUAL > 11) { MES_ATUAL = 0; ANO_ATUAL++; }
  renderizarCalendario();
}

// =========================================================
// RENDERIZAÇÃO DO CALENDÁRIO
// =========================================================

async function renderizarCalendario() {
  document.getElementById('mes-atual-label').textContent = `${MESES[MES_ATUAL]} de ${ANO_ATUAL}`;

  const inicioMes = new Date(ANO_ATUAL, MES_ATUAL, 1);
  const fimMes = new Date(ANO_ATUAL, MES_ATUAL + 1, 0);
  const inicioISO = isoDateCal(inicioMes);
  const fimISO = isoDateCal(fimMes);

  try {
    const [{ data: tarefas }, { data: eventos }] = await Promise.all([
      supabaseClient.from('tarefas')
        .select('id, titulo, data_entrega, tipo, materias(cor)')
        .eq('user_id', USUARIO_CAL.id)
        .gte('data_entrega', inicioISO)
        .lte('data_entrega', fimISO),
      supabaseClient.from('eventos')
        .select('*')
        .eq('user_id', USUARIO_CAL.id)
        .gte('data', inicioISO)
        .lte('data', fimISO),
    ]);

    ITENS_DO_MES = {};

    // Adicionar tarefas
    (tarefas || []).forEach(t => {
      if (!t.data_entrega) return;
      if (!ITENS_DO_MES[t.data_entrega]) ITENS_DO_MES[t.data_entrega] = [];
      ITENS_DO_MES[t.data_entrega].push({
        titulo: t.titulo,
        tipo: t.tipo,
        cor: t.materias?.cor || '#4F7DF3',
        origem: 'tarefa',
        id: t.id,
      });
    });

    // Adicionar eventos
    (eventos || []).forEach(e => {
      if (!ITENS_DO_MES[e.data]) ITENS_DO_MES[e.data] = [];
      ITENS_DO_MES[e.data].push({
        titulo: e.titulo,
        tipo: e.tipo,
        cor: e.cor || '#4F7DF3',
        origem: 'evento',
        id: e.id,
        descricao: e.descricao,
      });
    });

    const container = document.getElementById('calendario-completo');
    const primeiroDiaSemana = inicioMes.getDay();
    const totalDias = fimMes.getDate();

    let html = `<div class="calendar-grid">`;
    
    // Dias da semana
    DIAS_SEMANA.forEach(d => {
      html += `<div class="calendar-weekday">${d}</div>`;
    });

    // Dias vazios antes do início do mês
    for (let i = 0; i < primeiroDiaSemana; i++) {
      html += `<div class="calendar-day other-month"></div>`;
    }

    // Dias do mês
    for (let dia = 1; dia <= totalDias; dia++) {
      const dataAtual = new Date(ANO_ATUAL, MES_ATUAL, dia);
      const iso = isoDateCal(dataAtual);
      const isHoje = iso === hojeISO();
      const isSelecionado = iso === DIA_SELECIONADO;
      const itens = ITENS_DO_MES[iso] || [];

      html += `
        <div class="calendar-day ${isHoje ? 'today' : ''} ${isSelecionado ? 'selected' : ''}" data-data="${iso}">
          <span class="calendar-day__num">${dia}</span>
          <div class="calendar-day__dots">
            ${itens.slice(0, 4).map(it => 
              `<span class="calendar-day__dot" style="background:${it.cor}"></span>`
            ).join('')}
            ${itens.length > 4 ? `<span class="calendar-day__dot" style="background:var(--text-muted);font-size:8px;display:flex;align-items:center;justify-content:center;border:none;">+${itens.length - 4}</span>` : ''}
          </div>
        </div>
      `;
    }

    html += `</div>`;
    container.innerHTML = html;

    // Eventos de clique nos dias
    container.querySelectorAll('.calendar-day[data-data]').forEach(el => {
      el.addEventListener('click', () => selecionarDia(el.dataset.data));
    });

    // Restaurar seleção se houver
    if (DIA_SELECIONADO) {
      selecionarDia(DIA_SELECIONADO);
    }

  } catch (error) {
    console.error('Erro ao renderizar calendário:', error);
    document.getElementById('calendario-completo').innerHTML = `
      <div class="empty-state">
        <p>Erro ao carregar calendário. Tente novamente.</p>
      </div>
    `;
  }
}

// =========================================================
// SELEÇÃO DE DIA
// =========================================================

function selecionarDia(iso) {
  DIA_SELECIONADO = iso;
  
  // Atualizar visual do dia selecionado
  document.querySelectorAll('.calendar-day.selected').forEach(el => {
    el.classList.remove('selected');
  });
  const diaEl = document.querySelector(`.calendar-day[data-data="${iso}"]`);
  if (diaEl) diaEl.classList.add('selected');

  const [ano, mes, dia] = iso.split('-');
  document.getElementById('dia-selecionado-label').textContent = `${dia}/${mes}/${ano}`;

  const itens = ITENS_DO_MES[iso] || [];
  const container = document.getElementById('lista-dia-selecionado');

  if (itens.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <p>Nada agendado para este dia.</p>
      </div>
      <button class="btn-add-event" id="btn-add-evento-dia">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Adicionar evento
      </button>
    `;
  } else {
    const listaHTML = itens.map(it => {
      const tipoIcon = it.tipo === 'prova' ? `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          <polyline points="9 12 11 14 15 10"/>
        </svg>
      ` : it.tipo === 'tarefa' ? `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
      ` : `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      `;
      
      const origemLabel = it.origem === 'tarefa' ? 'Tarefa/Prova' : 'Evento';
      
      return `
        <div class="item-row">
          <div class="item-row__color" style="background:${it.cor}"></div>
          <div class="item-row__main">
            <div class="item-row__title">${tipoIcon}${escapeHTML(it.titulo)}</div>
            <div class="item-row__meta">${origemLabel}</div>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      ${listaHTML}
      <button class="btn-add-event" id="btn-add-evento-dia">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Adicionar evento
      </button>
    `;
  }

  document.getElementById('btn-add-evento-dia').addEventListener('click', () => {
    document.getElementById('evento-data').value = iso;
    document.getElementById('evento-titulo').value = '';
    document.getElementById('evento-descricao').value = '';
    document.getElementById('evento-tipo').value = 'evento';
    abrirModal('modal-evento');
    document.getElementById('evento-titulo').focus();
  });
}

// =========================================================
// SALVAR EVENTO
// =========================================================

async function salvarEvento(e) {
  e.preventDefault();
  
  const titulo = document.getElementById('evento-titulo').value.trim();
  if (!titulo) {
    mostrarToast('Digite um título para o evento.', 'error');
    document.getElementById('evento-titulo').focus();
    return;
  }

  const payload = {
    titulo,
    descricao: document.getElementById('evento-descricao').value.trim() || null,
    tipo: document.getElementById('evento-tipo').value,
    data: document.getElementById('evento-data').value,
    cor: '#4F7DF3',
    user_id: USUARIO_CAL.id,
  };

  try {
    const { error } = await supabaseClient.from('eventos').insert(payload);

    if (error) throw error;

    mostrarToast('Evento adicionado com sucesso!', 'success');
    fecharModal('modal-evento');
    await renderizarCalendario();
  } catch (error) {
    console.error('Erro ao salvar evento:', error);
    mostrarToast('Erro ao salvar evento. Tente novamente.', 'error');
  }
}

// =========================================================
// UTILITÁRIOS
// =========================================================

function isoDateCal(d) {
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}