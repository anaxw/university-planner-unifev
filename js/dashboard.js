// =========================================================
// DASHBOARD — Página inicial com visão geral
// =========================================================

let USUARIO_DASH = null;

// =========================================================
// INICIALIZAÇÃO
// =========================================================

(async () => {
  USUARIO_DASH = await iniciarPagina('dashboard');
  if (!USUARIO_DASH) return;

  const nome = USUARIO_DASH.user_metadata?.nome?.split(' ')[0] || USUARIO_DASH.email.split('@')[0];
  document.getElementById('saudacao').innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
    Olá, ${nome}!
  `;
  
  document.getElementById('data-hoje').textContent = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', 
    day: 'numeric', 
    month: 'long',
    timeZone: 'America/Sao_Paulo',
  });

  await Promise.all([
    carregarProximasTarefas(),
    carregarProximasProvas(),
    carregarUltimasAnotacoes(),
    carregarMateriasDashboard(),
  ]);

  await renderizarMiniCalendario();
})();

// =========================================================
// PRÓXIMAS TAREFAS
// =========================================================

async function carregarProximasTarefas() {
  const container = document.getElementById('lista-proximas-tarefas');
  
  try {
    const { data, error } = await supabaseClient
      .from('tarefas')
      .select('*, materias(nome, cor)')
      .eq('user_id', USUARIO_DASH.id)
      .eq('status', 'pendente')
      .eq('tipo', 'tarefa')
      .order('data_entrega', { ascending: true })
      .limit(5);

    if (error) throw error;
    
    if (!data || !data.length) {
      container.innerHTML = vazioHTML('Nenhuma tarefa pendente', 'check');
      return;
    }

    container.innerHTML = data.map(t => itemTarefaHTML(t)).join('');
  } catch (error) {
    console.error('Erro ao carregar tarefas:', error);
    container.innerHTML = erroHTML();
  }
}

// =========================================================
// PRÓXIMAS PROVAS
// =========================================================

async function carregarProximasProvas() {
  const container = document.getElementById('lista-proximas-provas');
  
  try {
    const { data, error } = await supabaseClient
      .from('tarefas')
      .select('*, materias(nome, cor)')
      .eq('user_id', USUARIO_DASH.id)
      .eq('status', 'pendente')
      .eq('tipo', 'prova')
      .order('data_entrega', { ascending: true })
      .limit(5);

    if (error) throw error;
    
    if (!data || !data.length) {
      container.innerHTML = vazioHTML('Nenhuma prova agendada', 'clipboard');
      return;
    }

    container.innerHTML = data.map(t => itemTarefaHTML(t)).join('');
  } catch (error) {
    console.error('Erro ao carregar provas:', error);
    container.innerHTML = erroHTML();
  }
}

// =========================================================
// ÚLTIMAS ANOTAÇÕES
// =========================================================

async function carregarUltimasAnotacoes() {
  const container = document.getElementById('lista-ultimas-anotacoes');
  
  try {
    const { data, error } = await supabaseClient
      .from('anotacoes')
      .select('*, materias(nome, cor)')
      .eq('user_id', USUARIO_DASH.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) throw error;
    
    if (!data || !data.length) {
      container.innerHTML = vazioHTML('Nenhuma anotação ainda', 'file');
      return;
    }

    container.innerHTML = data.map(a => `
      <div class="item-row">
        <div class="item-row__color" style="background:${a.materias?.cor || '#E5E7EB'}"></div>
        <div class="item-row__main">
          <div class="item-row__title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
            ${escapeHTML(a.titulo)}
          </div>
          <div class="item-row__meta">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            ${a.materias?.nome ? escapeHTML(a.materias.nome) + ' · ' : ''}${formatarDataRelativa(a.data)}
          </div>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Erro ao carregar anotações:', error);
    container.innerHTML = erroHTML();
  }
}

// =========================================================
// MATÉRIAS
// =========================================================

async function carregarMateriasDashboard() {
  const container = document.getElementById('lista-materias-dashboard');
  
  try {
    const { data, error } = await supabaseClient
      .from('materias')
      .select('*')
      .eq('user_id', USUARIO_DASH.id)
      .order('nome', { ascending: true });

    if (error) throw error;
    
    if (!data || !data.length) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1;">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
          <p>Você ainda não cadastrou nenhuma matéria.</p>
          <a href="materias.html" class="btn btn-primary btn-sm mt-8" style="display:inline-flex;align-items:center;gap:6px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Adicionar matéria
          </a>
        </div>
      `;
      return;
    }

    container.innerHTML = data.map(m => `
      <a href="materias.html?id=${m.id}" class="materia-card" style="border-top-color:${m.cor || '#4F7DF3'}">
        <div class="materia-card__name">${escapeHTML(m.nome)}</div>
        <div class="materia-card__prof">${escapeHTML(m.professor || 'Sem professor definido')}</div>
        ${m.horario ? `
          <div class="materia-card__horario">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            ${escapeHTML(m.horario)}
          </div>
        ` : ''}
      </a>
    `).join('');
  } catch (error) {
    console.error('Erro ao carregar matérias:', error);
    container.innerHTML = erroHTML();
  }
}

// =========================================================
// MINI CALENDÁRIO
// =========================================================

async function renderizarMiniCalendario() {
  const hoje = getAgoraBrasilia();
  const container = document.getElementById('mini-calendario');

  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

  try {
    const [{ data: tarefas }, { data: eventos }] = await Promise.all([
      supabaseClient.from('tarefas')
        .select('data_entrega')
        .eq('user_id', USUARIO_DASH.id)
        .gte('data_entrega', isoDate(inicioMes))
        .lte('data_entrega', isoDate(fimMes)),
      supabaseClient.from('eventos')
        .select('data')
        .eq('user_id', USUARIO_DASH.id)
        .gte('data', isoDate(inicioMes))
        .lte('data', isoDate(fimMes)),
    ]);

    const diasComEventos = new Set([
      ...(tarefas || []).map(t => t.data_entrega),
      ...(eventos || []).map(e => e.data),
    ]);

    const primeiroDiaSemana = inicioMes.getDay();
    const totalDias = fimMes.getDate();

    let html = `<div class="calendar-grid">`;
    DIAS_SEMANA.forEach(d => html += `<div class="calendar-weekday">${d}</div>`);

    for (let i = 0; i < primeiroDiaSemana; i++) {
      html += `<div class="calendar-day other-month"></div>`;
    }

    for (let dia = 1; dia <= totalDias; dia++) {
      const dataAtual = new Date(hoje.getFullYear(), hoje.getMonth(), dia);
      const iso = isoDate(dataAtual);
      const isHoje = iso === hojeISO();
      const temEvento = diasComEventos.has(iso);
      html += `
        <div class="calendar-day ${isHoje ? 'today' : ''}">
          <span class="calendar-day__num">${dia}</span>
          ${temEvento ? '<div class="calendar-day__dots"><span class="calendar-day__dot" style="background:var(--primary)"></span></div>' : ''}
        </div>
      `;
    }

    html += `</div>`;
    container.innerHTML = html;
  } catch (error) {
    console.error('Erro ao renderizar mini calendário:', error);
    container.innerHTML = `<div class="empty-state"><p>Erro ao carregar calendário</p></div>`;
  }
}

// =========================================================
// UTILITÁRIOS DE RENDERIZAÇÃO
// =========================================================

function itemTarefaHTML(t) {
  const pInfo = PRIORIDADE_INFO[t.prioridade] || PRIORIDADE_INFO.media;
  const tipoIcon = t.tipo === 'prova' ? `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <polyline points="9 12 11 14 15 10"/>
    </svg>
  ` : `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  `;
  
  return `
    <div class="item-row">
      <div class="item-row__color" style="background:${t.materias?.cor || '#E5E7EB'}"></div>
      <div class="item-row__main">
        <div class="item-row__title">
          ${tipoIcon}
          ${escapeHTML(t.titulo)}
        </div>
        <div class="item-row__meta">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          ${t.materias?.nome ? escapeHTML(t.materias.nome) + ' · ' : ''}${formatarDataRelativa(t.data_entrega)}
        </div>
      </div>
      <span class="badge ${pInfo.classe}">${pInfo.label}</span>
    </div>
  `;
}

function vazioHTML(msg, type = 'default') {
  const icons = {
    'default': `
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    `,
    'check': `
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    `,
    'clipboard': `
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
        <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
        <line x1="12" y1="11" x2="12" y2="17"/>
        <line x1="9" y1="14" x2="15" y2="14"/>
      </svg>
    `,
    'file': `
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
    `
  };
  
  return `
    <div class="empty-state">
      ${icons[type] || icons.default}
      <p>${escapeHTML(msg)}</p>
    </div>
  `;
}

function erroHTML() {
  return `
    <div class="empty-state">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <p>Erro ao carregar dados.</p>
    </div>
  `;
}

// =========================================================
// UTILITÁRIOS
// =========================================================

function isoDate(d) {
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}
