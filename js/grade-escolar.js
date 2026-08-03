// =========================================================
// GRADE ESCOLAR — grade visual da semana (somente leitura)
// Reflete os horários cadastrados em Matérias
// =========================================================

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

let USUARIO_ATUAL = null;
let MATERIAS_CACHE = [];
let HORARIOS_POR_MATERIA = {};

// =========================================================
// UTILITÁRIOS
// =========================================================

function minutosDoDia(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function escapeHTML(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function mostrarToast(mensagem, tipo = 'info') {
  // Função simples de toast - adapte conforme seu sistema
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 8px;
    background: ${tipo === 'error' ? '#ef4444' : '#4F7DF3'};
    color: white;
    font-weight: 500;
    font-size: 14px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 9999;
    max-width: 400px;
    animation: slideIn 0.3s ease;
  `;
  toast.textContent = mensagem;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// =========================================================
// INICIALIZAÇÃO
// =========================================================

(async () => {
  USUARIO_ATUAL = await iniciarPagina('grade');
  if (!USUARIO_ATUAL) return;
  
  await carregarDadosUsuario();
  await carregarGrade();
})();

// =========================================================
// CARREGAMENTO DOS DADOS DO USUÁRIO
// =========================================================

async function carregarDadosUsuario() {
  try {
    const { data, error } = await supabaseClient
      .from('usuarios')
      .select('curso, periodo, nome')
      .eq('id', USUARIO_ATUAL.id)
      .single();

    if (error) throw error;

    if (data) {
      const inputCurso = document.getElementById('input-curso');
      const inputPeriodo = document.getElementById('input-periodo');
      const nomeAluno = document.getElementById('grade-print-nome-valor');

      if (inputCurso && data.curso) {
        inputCurso.value = data.curso;
      }

      if (inputPeriodo && data.periodo) {
        inputPeriodo.value = `${data.periodo}º período`;
      }

      if (nomeAluno && data.nome) {
        nomeAluno.textContent = data.nome;
      }
    }
  } catch (error) {
    console.error('Erro ao carregar dados do usuário:', error);
  }
}

// =========================================================
// CARREGAMENTO DE DADOS
// =========================================================

async function carregarGrade() {
  try {
    const { data: materias, error } = await supabaseClient
      .from('materias')
      .select('*')
      .eq('user_id', USUARIO_ATUAL.id)
      .order('nome', { ascending: true });

    if (error) throw error;

    MATERIAS_CACHE = materias || [];

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
  } catch (error) {
    console.error('Erro ao carregar grade:', error);
    mostrarToast('Erro ao carregar a grade.', 'error');
    document.getElementById('grade-horaria').innerHTML = `
      <div class="grade-vazio">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p>Erro ao carregar os dados. Tente novamente.</p>
      </div>
    `;
  }
}

// =========================================================
// ÍCONES DE TIPO (Presencial / EAD)
// =========================================================

function iconeTipo(tipo) {
  const tipoInfo = TIPOS_MATERIA[tipo] || TIPOS_MATERIA.presencial;
  return tipoInfo.icone === 'presencial' ? `
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
}

// =========================================================
// RENDERIZAÇÃO DA GRADE HORÁRIA
// =========================================================

function renderGradeHoraria() {
  const container = document.getElementById('grade-horaria');
  if (!container) return;

  const totalMin = minutosDoDia(AULA_FIM) - minutosDoDia(AULA_INICIO);
  const intervaloTopo = ((minutosDoDia(INTERVALO_INICIO) - minutosDoDia(AULA_INICIO)) / totalMin) * 100;
  const intervaloAltura = ((minutosDoDia(INTERVALO_FIM) - minutosDoDia(INTERVALO_INICIO)) / totalMin) * 100;

  const temAlgumHorario = Object.values(HORARIOS_POR_MATERIA).some(lista => lista && lista.length);
  if (!temAlgumHorario) {
    container.innerHTML = `
      <div class="grade-vazio">
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
          <path d="M8 14h.01"/>
          <path d="M12 14h.01"/>
          <path d="M16 14h.01"/>
          <path d="M8 18h.01"/>
          <path d="M12 18h.01"/>
          <path d="M16 18h.01"/>
        </svg>
        <p>Nenhum horário cadastrado ainda.</p>
        <p style="font-size:13px;">Vá em <a href="materias.html">Matérias</a> e adicione os horários das suas disciplinas para ver a grade da semana aqui.</p>
      </div>
    `;
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
    const horariosDoDia = [];
    
    MATERIAS_CACHE.forEach(m => {
      (HORARIOS_POR_MATERIA[m.id] || []).forEach(h => {
        if (h.dia_semana === dia.valor) {
          horariosDoDia.push({
            materia: m,
            horario: h
          });
        }
      });
    });

    // Ordena por horário de início
    horariosDoDia.sort((a, b) => 
      minutosDoDia(a.horario.hora_inicio) - minutosDoDia(b.horario.hora_inicio)
    );

    horariosDoDia.forEach(({ materia, horario }) => {
      const inicio = horario.hora_inicio.slice(0, 5);
      const fim = horario.hora_fim.slice(0, 5);
      
      const inicioMin = minutosDoDia(inicio);
      const fimMin = minutosDoDia(fim);
      const intervaloInicioMin = minutosDoDia(INTERVALO_INICIO);
      const intervaloFimMin = minutosDoDia(INTERVALO_FIM);
      
      // Pula horários que estão dentro do intervalo
      if (inicioMin >= intervaloInicioMin && fimMin <= intervaloFimMin) {
        return;
      }
      
      let topoDisplay = inicioMin;
      let alturaDisplay = fimMin - inicioMin;
      
      // Se o horário cruza o intervalo, ajusta para mostrar apenas a parte fora
      if (inicioMin < intervaloInicioMin && fimMin > intervaloInicioMin && fimMin <= intervaloFimMin) {
        alturaDisplay = intervaloInicioMin - inicioMin;
      } else if (inicioMin >= intervaloInicioMin && inicioMin < intervaloFimMin && fimMin > intervaloFimMin) {
        topoDisplay = intervaloFimMin;
        alturaDisplay = fimMin - intervaloFimMin;
      }
      
      const topo = ((topoDisplay - minutosDoDia(AULA_INICIO)) / totalMin) * 100;
      const altura = (alturaDisplay / totalMin) * 100;
      
      const tipoInfo = TIPOS_MATERIA[materia.tipo] || TIPOS_MATERIA.presencial;
      const professorHtml = materia.professor
        ? `<div class="grade-bloco__professor">${escapeHTML(materia.professor)}</div>`
        : '';
        
      blocos.push(`
        <div class="grade-bloco" data-id="${materia.id}" style="top:${topo}%; height:${altura}%; background:${materia.cor || '#4F7DF3'}" title="${escapeHTML(materia.nome)}${materia.professor ? ' · ' + escapeHTML(materia.professor) : ''} · ${inicio}-${fim}">
          <div class="grade-bloco__nome">${escapeHTML(materia.nome)}</div>
          <div class="grade-bloco__horario">${inicio}-${fim}</div>
          ${professorHtml}
          <span class="grade-badge ${materia.tipo || 'presencial'}">
            ${iconeTipo(materia.tipo)}
            ${tipoInfo.label}
          </span>
        </div>
      `);
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

  const mobileHtml = renderGradeMobile();

  container.innerHTML = `
    <div class="grade-wrap">${eixoHtml}${colunasHtml}</div>
    <div class="grade-dias-mobile">${mobileHtml}</div>
  `;

  // Evento de clique nos blocos (versão desktop)
  container.querySelectorAll('.grade-bloco').forEach(el => {
    el.addEventListener('click', () => {
      window.location.href = `materias.html?id=${el.dataset.id}`;
    });
  });

  // Evento de clique nos itens (versão mobile)
  container.querySelectorAll('.grade-item-mobile').forEach(el => {
    el.addEventListener('click', () => {
      window.location.href = `materias.html?id=${el.dataset.id}`;
    });
  });
}

// =========================================================
// RENDERIZAÇÃO DA GRADE — VERSÃO MOBILE (dias empilhados)
// =========================================================

function renderGradeMobile() {
  const nomesDiaCompleto = {
    1: 'Segunda-feira',
    2: 'Terça-feira',
    3: 'Quarta-feira',
    4: 'Quinta-feira',
    5: 'Sexta-feira',
    6: 'Sábado',
  };

  return DIAS_SEMANA_HORARIO.map(dia => {
    const aulas = [];
    MATERIAS_CACHE.forEach(m => {
      (HORARIOS_POR_MATERIA[m.id] || []).forEach(h => {
        if (h.dia_semana !== dia.valor) return;
        
        const inicioMin = minutosDoDia(h.hora_inicio);
        const fimMin = minutosDoDia(h.hora_fim);
        const intervaloInicioMin = minutosDoDia(INTERVALO_INICIO);
        const intervaloFimMin = minutosDoDia(INTERVALO_FIM);
        
        if (inicioMin >= intervaloInicioMin && fimMin <= intervaloFimMin) {
          return;
        }
        
        aulas.push({
          tipoEvento: 'aula',
          inicio: h.hora_inicio.slice(0, 5),
          fim: h.hora_fim.slice(0, 5),
          materia: m,
        });
      });
    });

    if (!aulas.length) {
      return `
        <div class="grade-dia-card">
          <div class="grade-dia-card__header">
            <span class="grade-dia-card__nome">${nomesDiaCompleto[dia.valor]}</span>
            <span class="grade-dia-card__contagem">Sem aulas</span>
          </div>
        </div>
      `;
    }

    aulas.sort((a, b) => minutosDoDia(a.inicio) - minutosDoDia(b.inicio));

    const eventos = [
      ...aulas,
      { tipoEvento: 'intervalo', inicio: INTERVALO_INICIO, fim: INTERVALO_FIM },
    ].sort((a, b) => minutosDoDia(a.inicio) - minutosDoDia(b.inicio));

    const itensHtml = eventos.map(ev => {
      if (ev.tipoEvento === 'intervalo') {
        return `<div class="grade-intervalo-mobile">Intervalo · ${ev.inicio}–${ev.fim}</div>`;
      }
      const m = ev.materia;
      const tipoInfo = TIPOS_MATERIA[m.tipo] || TIPOS_MATERIA.presencial;
      const professorHtml = m.professor
        ? `<div class="grade-item-mobile__professor">${escapeHTML(m.professor)}</div>`
        : '';

      return `
        <div class="grade-item-mobile" data-id="${m.id}" style="border-left-color:${m.cor || '#4F7DF3'}">
          <div class="grade-item-mobile__info">
            <div class="grade-item-mobile__nome">${escapeHTML(m.nome)}</div>
            <div class="grade-item-mobile__horario">${ev.inicio}–${ev.fim}</div>
            ${professorHtml}
          </div>
          <span class="grade-badge ${m.tipo || 'presencial'}">
            ${iconeTipo(m.tipo)}
            ${tipoInfo.label}
          </span>
        </div>
      `;
    }).join('');

    return `
      <div class="grade-dia-card">
        <div class="grade-dia-card__header">
          <span class="grade-dia-card__nome">${nomesDiaCompleto[dia.valor]}</span>
          <span class="grade-dia-card__contagem">${aulas.length} aula${aulas.length > 1 ? 's' : ''}</span>
        </div>
        <div class="grade-dia-card__body">
          ${itensHtml}
        </div>
      </div>
    `;
  }).join('');
}

// =========================================================
// DOWNLOAD DA GRADE COMO IMAGEM
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
  const btnBaixar = document.getElementById('btn-baixar-grade');
  if (!btnBaixar) return;

  btnBaixar.addEventListener('click', async () => {
    try {
      btnBaixar.disabled = true;
      btnBaixar.innerHTML = 'Gerando imagem...';

      const element = document.getElementById('grade-print-area');
      if (!element) {
        throw new Error('Elemento não encontrado');
      }

      await new Promise(resolve => setTimeout(resolve, 200));

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: element.scrollWidth,
        height: element.scrollHeight,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
      });

      const link = document.createElement('a');
      link.download = `grade-escolar-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      mostrarToast('Imagem baixada com sucesso!', 'success');

    } catch (error) {
      console.error('Erro ao gerar imagem:', error);
      mostrarToast('Erro ao gerar a imagem. Tente novamente.', 'error');
    } finally {
      btnBaixar.disabled = false;
      btnBaixar.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Baixar imagem
      `;
    }
  });
});
