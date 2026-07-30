// =========================================================
// MATÉRIAS — CRUD e visualização de detalhe
// =========================================================

let USUARIO_ATUAL = null;
let MATERIAS_CACHE = [];
let HORARIOS_FORM_ATUAL = []; // linhas de horário sendo editadas no modal: {dia, inicio, fim}
let HORARIOS_POR_MATERIA = {}; // cache: materia_id -> array de horários

const DIAS_SEMANA_HORARIO = [
  { valor: 1, label: 'Seg' },
  { valor: 2, label: 'Ter' },
  { valor: 3, label: 'Qua' },
  { valor: 4, label: 'Qui' },
  { valor: 5, label: 'Sex' },
  { valor: 6, label: 'Sáb' },
];

// Janela de aulas da semana (Seg a Sáb): 19:30 às 23:00, com intervalo 21:00-21:20
const AULA_INICIO = '19:30';
const AULA_FIM = '23:00';
const INTERVALO_INICIO = '21:00';
const INTERVALO_FIM = '21:20';

const TIPOS_MATERIA = {
  presencial: { label: 'Presencial', icone: 'presencial' },
  ead: { label: 'EAD', icone: 'ead' },
};

function minutosDoDia(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

// =========================================================
// INICIALIZAÇÃO
// =========================================================

(async () => {
  USUARIO_ATUAL = await iniciarPagina('materias');
  if (!USUARIO_ATUAL) return;

  montarSeletorCores();
  await carregarMaterias();

  document.getElementById('btn-nova-materia').addEventListener('click', () => abrirModalMateria());
  document.getElementById('form-materia').addEventListener('submit', salvarMateria);
  document.getElementById('btn-fechar-detalhe').addEventListener('click', fecharDetalhe);
  document.getElementById('btn-add-horario').addEventListener('click', () => {
    adicionarLinhaHorario();
    renderHorariosForm();
  });

  // Se veio com ?id= na URL, já abre o detalhe daquela matéria
  const params = new URLSearchParams(window.location.search);
  const idParam = params.get('id');
  if (idParam) abrirDetalheMateria(idParam);
})();

// =========================================================
// SELETOR DE CORES
// =========================================================

function montarSeletorCores() {
  const container = document.getElementById('color-options');
  container.innerHTML = CORES_MATERIA.map((cor, i) => `
    <div class="color-dot ${i === 0 ? 'selected' : ''}" style="background:${cor}" data-cor="${cor}"></div>
  `).join('');
  container.querySelectorAll('.color-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      container.querySelectorAll('.color-dot').forEach(d => d.classList.remove('selected'));
      dot.classList.add('selected');
    });
  });
}

function corSelecionada() {
  return document.querySelector('#color-options .color-dot.selected')?.dataset.cor || CORES_MATERIA[0];
}

function selecionarCor(cor) {
  const container = document.getElementById('color-options');
  container.querySelectorAll('.color-dot').forEach(d => {
    d.classList.toggle('selected', d.dataset.cor === cor);
  });
}

// =========================================================
// HORÁRIOS DO FORMULÁRIO
// =========================================================

function adicionarLinhaHorario(dia = 1, inicio = '', fim = '') {
  HORARIOS_FORM_ATUAL.push({ dia, inicio, fim });
}

function removerLinhaHorario(idx) {
  HORARIOS_FORM_ATUAL.splice(idx, 1);
  renderHorariosForm();
}

function atualizarLinhaHorario(idx, campo, valor) {
  HORARIOS_FORM_ATUAL[idx][campo] = campo === 'dia' ? Number(valor) : valor;
}

function renderHorariosForm() {
  const container = document.getElementById('horarios-container');
  if (!HORARIOS_FORM_ATUAL.length) {
    container.innerHTML = `<div class="text-muted text-sm">Nenhum horário adicionado.</div>`;
    return;
  }

  container.innerHTML = HORARIOS_FORM_ATUAL.map((h, idx) => `
    <div class="horario-row" data-idx="${idx}">
      <select class="input horario-dia" style="max-width:90px;" data-idx="${idx}">
        ${DIAS_SEMANA_HORARIO.map(d => `<option value="${d.valor}" ${d.valor === h.dia ? 'selected' : ''}>${d.label}</option>`).join('')}
      </select>
      <input type="time" class="input horario-inicio" style="max-width:120px;" data-idx="${idx}" value="${h.inicio}">
      <span class="text-muted">até</span>
      <input type="time" class="input horario-fim" style="max-width:120px;" data-idx="${idx}" value="${h.fim}">
      <button type="button" class="btn-remover-horario" data-idx="${idx}" title="Remover">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  `).join('');

  container.querySelectorAll('.horario-dia').forEach(el => {
    el.addEventListener('change', () => atualizarLinhaHorario(Number(el.dataset.idx), 'dia', el.value));
  });
  container.querySelectorAll('.horario-inicio').forEach(el => {
    el.addEventListener('change', () => atualizarLinhaHorario(Number(el.dataset.idx), 'inicio', el.value));
  });
  container.querySelectorAll('.horario-fim').forEach(el => {
    el.addEventListener('change', () => atualizarLinhaHorario(Number(el.dataset.idx), 'fim', el.value));
  });
  container.querySelectorAll('.btn-remover-horario').forEach(el => {
    el.addEventListener('click', () => removerLinhaHorario(Number(el.dataset.idx)));
  });
}

// =========================================================
// VALIDAÇÃO DE CONFLITOS
// =========================================================

function horariosSobrepoem(inicioA, fimA, inicioB, fimB) {
  return minutosDoDia(inicioA) < minutosDoDia(fimB) && minutosDoDia(inicioB) < minutosDoDia(fimA);
}

function encontrarConflitoExistente(dia, inicio, fim, materiaIdIgnorar) {
  for (const materiaId in HORARIOS_POR_MATERIA) {
    if (materiaId === materiaIdIgnorar) continue;
    const horarios = HORARIOS_POR_MATERIA[materiaId] || [];
    for (const h of horarios) {
      if (h.dia_semana !== dia) continue;
      if (horariosSobrepoem(inicio, fim, h.hora_inicio.slice(0, 5), h.hora_fim.slice(0, 5))) {
        const materia = MATERIAS_CACHE.find(m => m.id === materiaId);
        return materia ? materia.nome : 'outra matéria';
      }
    }
  }
  return null;
}

function encontrarConflitoNoFormulario(linhas) {
  for (let i = 0; i < linhas.length; i++) {
    for (let j = i + 1; j < linhas.length; j++) {
      const a = linhas[i], b = linhas[j];
      if (a.dia === b.dia && horariosSobrepoem(a.inicio, a.fim, b.inicio, b.fim)) {
        return true;
      }
    }
  }
  return false;
}

// =========================================================
// FORMATADORES
// =========================================================

function formatarHorarios(lista) {
  if (!lista || !lista.length) return '';
  return lista
    .slice()
    .sort((a, b) => a.dia_semana - b.dia_semana || a.hora_inicio.localeCompare(b.hora_inicio))
    .map(h => {
      const label = DIAS_SEMANA_HORARIO.find(d => d.valor === h.dia_semana)?.label || '';
      return `${label} ${h.hora_inicio.slice(0, 5)}-${h.hora_fim.slice(0, 5)}`;
    })
    .join(', ');
}

// =========================================================
// CARREGAR MATÉRIAS
// =========================================================

async function carregarMaterias() {
  const container = document.getElementById('lista-materias');
  const { data, error } = await supabaseClient
    .from('materias')
    .select('*')
    .eq('user_id', USUARIO_ATUAL.id)
    .order('nome', { ascending: true });

  if (error) {
    mostrarToast('Erro ao carregar matérias.', 'error');
    return;
  }

  MATERIAS_CACHE = data;

  const { data: horarios, error: errorHorarios } = await supabaseClient
    .from('materia_horarios')
    .select('*')
    .eq('user_id', USUARIO_ATUAL.id)
    .order('dia_semana', { ascending: true })
    .order('hora_inicio', { ascending: true });

  HORARIOS_POR_MATERIA = {};
  if (!errorHorarios && horarios) {
    horarios.forEach(h => {
      if (!HORARIOS_POR_MATERIA[h.materia_id]) HORARIOS_POR_MATERIA[h.materia_id] = [];
      HORARIOS_POR_MATERIA[h.materia_id].push(h);
    });
  }

  renderGradeHoraria();

  if (!data.length) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
        </svg>
        <p>Nenhuma matéria cadastrada ainda.</p>
        <p style="font-size:13px;">Clique em "Nova matéria" para começar.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = data.map(m => {
    const horarioTexto = formatarHorarios(HORARIOS_POR_MATERIA[m.id]);
    const tipoInfo = TIPOS_MATERIA[m.tipo] || TIPOS_MATERIA.presencial;
    const tipoIcon = tipoInfo.icone === 'presencial' ? `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
      </svg>
    ` : `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
        <line x1="8" y1="21" x2="16" y2="21"/>
        <line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
    `;
    return `
    <div class="materia-card" style="border-top-color:${m.cor}" data-id="${m.id}">
      <div class="materia-card__top">
        <div>
          <div class="materia-card__name">${escapeHTML(m.nome)}
            <span class="grade-badge ${m.tipo || 'presencial'}">${tipoIcon} ${tipoInfo.label}</span>
          </div>
          <div class="materia-card__prof">${escapeHTML(m.professor || 'Sem professor definido')}</div>
        </div>
        <div class="item-row__actions">
          <button class="btn-icon btn-edit" data-id="${m.id}" title="Editar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button class="btn-icon btn-delete" data-id="${m.id}" title="Excluir">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              <line x1="10" y1="11" x2="10" y2="17"/>
              <line x1="14" y1="11" x2="14" y2="17"/>
            </svg>
          </button>
        </div>
      </div>
      ${horarioTexto ? `
        <div class="materia-card__horario">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          ${escapeHTML(horarioTexto)}
        </div>
      ` : ''}
    </div>
  `;
  }).join('');

  container.querySelectorAll('.materia-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.btn-edit') || e.target.closest('.btn-delete')) return;
      abrirDetalheMateria(card.dataset.id);
    });
  });

  container.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const materia = MATERIAS_CACHE.find(m => m.id === btn.dataset.id);
      abrirModalMateria(materia);
    });
  });

  container.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      excluirMateria(btn.dataset.id);
    });
  });
}

// =========================================================
// GRADE HORÁRIA (mini visualização)
// =========================================================

function renderGradeHoraria() {
  const container = document.getElementById('grade-horaria');
  if (!container) return;

  const totalMin = minutosDoDia(AULA_FIM) - minutosDoDia(AULA_INICIO);
  const intervaloTopo = ((minutosDoDia(INTERVALO_INICIO) - minutosDoDia(AULA_INICIO)) / totalMin) * 100;
  const intervaloAltura = ((minutosDoDia(INTERVALO_FIM) - minutosDoDia(INTERVALO_INICIO)) / totalMin) * 100;

  const temAlgumHorario = Object.values(HORARIOS_POR_MATERIA).some(lista => lista && lista.length);
  if (!temAlgumHorario) {
    container.innerHTML = `<div class="grade-vazio">Adicione horários às suas matérias para ver a grade da semana.</div>`;
    return;
  }

  const marcas = [AULA_INICIO, INTERVALO_INICIO, INTERVALO_FIM, AULA_FIM];
  const eixoHtml = `
    <div class="grade-eixo">
      ${marcas.map(m => {
        const topo = ((minutosDoDia(m) - minutosDoDia(AULA_INICIO)) / totalMin) * 100;
        return `<span style="top:${topo}%">${m}</span>`;
      }).join('')}
    </div>`;

  const colunasHtml = DIAS_SEMANA_HORARIO.map(dia => {
    const blocos = [];
    MATERIAS_CACHE.forEach(m => {
      (HORARIOS_POR_MATERIA[m.id] || []).forEach(h => {
        if (h.dia_semana !== dia.valor) return;
        const inicio = h.hora_inicio.slice(0, 5);
        const fim = h.hora_fim.slice(0, 5);
        const topo = ((minutosDoDia(inicio) - minutosDoDia(AULA_INICIO)) / totalMin) * 100;
        const altura = ((minutosDoDia(fim) - minutosDoDia(inicio)) / totalMin) * 100;
        blocos.push(`
          <div class="grade-bloco" data-id="${m.id}" style="top:${topo}%; height:${altura}%; background:${m.cor}" title="${escapeHTML(m.nome)} · ${inicio}-${fim}">
            <div class="grade-bloco__nome">${escapeHTML(m.nome)}</div>
            <div>${inicio}-${fim}</div>
          </div>
        `);
      });
    });

    return `
      <div class="grade-col">
        <div class="grade-col__header">${dia.label}</div>
        <div class="grade-col__body">
          <div class="grade-intervalo" style="top:${intervaloTopo}%; height:${intervaloAltura}%;">intervalo</div>
          ${blocos.join('')}
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `<div class="grade-wrap">${eixoHtml}${colunasHtml}</div>`;

  container.querySelectorAll('.grade-bloco').forEach(el => {
    el.addEventListener('click', () => abrirDetalheMateria(el.dataset.id));
  });
}

// =========================================================
// MODAL - ABRIR / SALVAR
// =========================================================

function abrirModalMateria(materia = null) {
  document.getElementById('modal-materia-titulo').textContent = materia ? 'Editar matéria' : 'Nova matéria';
  document.getElementById('materia-id').value = materia?.id || '';
  document.getElementById('materia-nome').value = materia?.nome || '';
  document.getElementById('materia-professor').value = materia?.professor || '';
  selecionarCor(materia?.cor || CORES_MATERIA[0]);

  const tipoAtual = materia?.tipo || 'presencial';
  document.querySelectorAll('input[name="materia-tipo"]').forEach(r => {
    r.checked = r.value === tipoAtual;
  });

  const existentes = (materia && HORARIOS_POR_MATERIA[materia.id]) || [];
  HORARIOS_FORM_ATUAL = existentes.length
    ? existentes
        .slice()
        .sort((a, b) => a.dia_semana - b.dia_semana || a.hora_inicio.localeCompare(b.hora_inicio))
        .map(h => ({ dia: h.dia_semana, inicio: h.hora_inicio.slice(0, 5), fim: h.hora_fim.slice(0, 5) }))
    : [];
  if (!HORARIOS_FORM_ATUAL.length) adicionarLinhaHorario();
  renderHorariosForm();

  abrirModal('modal-materia');
}

async function salvarMateria(e) {
  e.preventDefault();
  const id = document.getElementById('materia-id').value;

  const linhasValidas = HORARIOS_FORM_ATUAL.filter(h => h.dia && h.inicio && h.fim);
  if (HORARIOS_FORM_ATUAL.length && linhasValidas.length !== HORARIOS_FORM_ATUAL.length) {
    mostrarToast('Preencha dia, início e fim de todos os horários (ou remova a linha vazia).', 'error');
    return;
  }
  const horarioInvalido = linhasValidas.find(h => h.inicio >= h.fim);
  if (horarioInvalido) {
    mostrarToast('O horário de início deve ser antes do horário de fim.', 'error');
    return;
  }

  const foraDaJanela = linhasValidas.find(
    h => h.inicio < AULA_INICIO || h.fim > AULA_FIM
  );
  if (foraDaJanela) {
    mostrarToast(`Os horários devem estar entre ${AULA_INICIO} e ${AULA_FIM}.`, 'error');
    return;
  }

  if (encontrarConflitoNoFormulario(linhasValidas)) {
    mostrarToast('Há dois horários se sobrepondo aqui mesmo no formulário. Ajuste antes de salvar.', 'error');
    return;
  }

  const materiaIdAtual = id || null;
  for (const h of linhasValidas) {
    const conflito = encontrarConflitoExistente(h.dia, h.inicio, h.fim, materiaIdAtual);
    if (conflito) {
      const diaLabel = DIAS_SEMANA_HORARIO.find(d => d.valor === h.dia)?.label || '';
      mostrarToast(`Conflito de horário: "${conflito}" já ocupa ${diaLabel} ${h.inicio}-${h.fim}.`, 'error');
      return;
    }
  }

  const tipo = document.querySelector('input[name="materia-tipo"]:checked')?.value || 'presencial';

  const payload = {
    nome: document.getElementById('materia-nome').value.trim(),
    professor: document.getElementById('materia-professor').value.trim(),
    cor: corSelecionada(),
    tipo,
    user_id: USUARIO_ATUAL.id,
  };

  const query = id
    ? supabaseClient.from('materias').update(payload).eq('id', id).select().single()
    : supabaseClient.from('materias').insert(payload).select().single();

  const { data: materiaSalva, error } = await query;

  if (error) {
    mostrarToast('Erro ao salvar matéria.', 'error');
    return;
  }

  const materiaId = materiaSalva.id;

  const { error: errorDelete } = await supabaseClient
    .from('materia_horarios')
    .delete()
    .eq('materia_id', materiaId);

  if (errorDelete) {
    mostrarToast('Matéria salva, mas houve erro ao atualizar os horários.', 'error');
    fecharModal('modal-materia');
    await carregarMaterias();
    return;
  }

  if (linhasValidas.length) {
    const { error: errorInsert } = await supabaseClient.from('materia_horarios').insert(
      linhasValidas.map(h => ({
        user_id: USUARIO_ATUAL.id,
        materia_id: materiaId,
        dia_semana: h.dia,
        hora_inicio: h.inicio,
        hora_fim: h.fim,
      }))
    );
    if (errorInsert) {
      mostrarToast('Matéria salva, mas houve erro ao salvar os horários.', 'error');
      fecharModal('modal-materia');
      await carregarMaterias();
      return;
    }
  }

  mostrarToast(id ? 'Matéria atualizada!' : 'Matéria criada!', 'success');
  fecharModal('modal-materia');
  await carregarMaterias();
}

// =========================================================
// EXCLUIR MATÉRIA
// =========================================================

async function excluirMateria(id) {
  if (!confirm('Excluir esta matéria? As tarefas e anotações vinculadas ficarão sem matéria associada.')) return;

  const { error } = await supabaseClient.from('materias').delete().eq('id', id);
  if (error) {
    mostrarToast('Erro ao excluir matéria.', 'error');
    return;
  }
  mostrarToast('Matéria excluída.', 'success');
  fecharDetalhe();
  await carregarMaterias();
}

// =========================================================
// DETALHE DA MATÉRIA
// =========================================================

function posicionarDetalheAposCard(id) {
  const container = document.getElementById('lista-materias');
  const detalheEl = document.getElementById('detalhe-materia');
  const cards = Array.from(container.querySelectorAll('.materia-card'));
  const idx = cards.findIndex(c => c.dataset.id === id);

  // Se não achou o card (ex: veio direto por link com ?id=), deixa o
  // painel no final da lista, como antes.
  if (idx === -1) {
    container.insertAdjacentElement('afterend', detalheEl);
    return;
  }

  // Descobre quantas colunas o grid tem no momento (3 no desktop, 1 no
  // celular) para inserir o painel logo após o ÚLTIMO card da mesma
  // linha do card clicado — assim ele aparece imediatamente abaixo,
  // ocupando a linha inteira, sem precisar rolar a página para baixo.
  const colunas = getComputedStyle(container).gridTemplateColumns.split(' ').length || 1;
  const fimDaLinha = Math.min(idx - (idx % colunas) + colunas - 1, cards.length - 1);
  cards[fimDaLinha].insertAdjacentElement('afterend', detalheEl);
}

async function abrirDetalheMateria(id) {
  const materia = MATERIAS_CACHE.find(m => m.id === id) || await buscarMateriaPorId(id);
  if (!materia) return;

  posicionarDetalheAposCard(id);

  document.getElementById('detalhe-materia').classList.remove('hidden');
  document.getElementById('detalhe-cor').style.background = materia.cor;
  document.getElementById('detalhe-nome').textContent = materia.nome;
  const horarioTexto = formatarHorarios(HORARIOS_POR_MATERIA[materia.id]);
  const tipoInfo = TIPOS_MATERIA[materia.tipo] || TIPOS_MATERIA.presencial;
  const tipoIcon = tipoInfo.icone === 'presencial' ? '🏛️' : '💻';
  document.getElementById('detalhe-info').textContent =
    [`${tipoIcon} ${tipoInfo.label}`, materia.professor, horarioTexto].filter(Boolean).join(' · ');

  document.getElementById('detalhe-materia').scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  const [{ data: tarefas }, { data: anotacoes }] = await Promise.all([
    supabaseClient.from('tarefas').select('*').eq('materia_id', id).eq('user_id', USUARIO_ATUAL.id)
      .order('data_entrega', { ascending: true }),
    supabaseClient.from('anotacoes').select('*').eq('materia_id', id).eq('user_id', USUARIO_ATUAL.id)
      .order('data', { ascending: false }),
  ]);

  const tarefasEl = document.getElementById('detalhe-tarefas');
  tarefasEl.innerHTML = (tarefas && tarefas.length)
    ? tarefas.map(t => {
        const statusInfo = STATUS_INFO[t.status] || STATUS_INFO.pendente;
        return `
          <div class="item-row">
            <div class="item-row__main">
              <div class="item-row__title ${t.status === 'concluida' ? 'done' : ''}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;flex-shrink:0;">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
                ${escapeHTML(t.titulo)}
              </div>
              <div class="item-row__meta">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:12px;height:12px;flex-shrink:0;">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                ${formatarDataRelativa(t.data_entrega)}
              </div>
            </div>
            <span class="badge badge-${t.status || 'pendente'}">${statusInfo.label}</span>
          </div>
        `;
      }).join('')
    : `
      <div class="empty-state">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
        <p>Nenhuma tarefa para esta matéria.</p>
      </div>
    `;

  const anotacoesEl = document.getElementById('detalhe-anotacoes');
  anotacoesEl.innerHTML = (anotacoes && anotacoes.length)
    ? anotacoes.map(a => `
      <div class="item-row">
        <div class="item-row__main">
          <div class="item-row__title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;flex-shrink:0;">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
            ${escapeHTML(a.titulo)}
          </div>
          <div class="item-row__meta">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:12px;height:12px;flex-shrink:0;">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            ${formatarDataRelativa(a.data)}
          </div>
        </div>
      </div>
    `).join('')
    : `
      <div class="empty-state">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10 9 9 9 8 9"/>
        </svg>
        <p>Nenhuma anotação para esta matéria.</p>
      </div>
    `;
}

async function buscarMateriaPorId(id) {
  const { data } = await supabaseClient.from('materias').select('*').eq('id', id).single();
  return data;
}

function fecharDetalhe() {
  document.getElementById('detalhe-materia').classList.add('hidden');
  history.replaceState(null, '', 'materias.html');
}
