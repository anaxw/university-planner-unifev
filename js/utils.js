// =========================================================
// UTILITÁRIOS COMPARTILHADOS
// =========================================================

const CORES_MATERIA = [
  '#E53935', // Vermelho
  '#FB8C00', // Laranja
  '#F9A825', // Âmbar
  '#FDD835', // Amarelo
  '#9CCC65', // Verde-limão
  '#43A047', // Verde
  '#00897B', // Verde-azulado (teal)
  '#00ACC1', // Ciano
  '#1E88E5', // Azul
  '#3949AB', // Índigo
  '#8E24AA', // Roxo
  '#D81B60', // Rosa/magenta
  '#6D4C41', // Marrom
  '#546E7A', // Cinza-azulado (slate)
  '#827717', // Verde-oliva
];

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

// =========================================================
// UTILITÁRIOS DE DATA/HORA — HORÁRIO DE BRASÍLIA (fonte única)
// Todas as páginas devem usar estas funções em vez de `new Date()`
// puro, para não depender do fuso configurado no dispositivo.
// =========================================================

/** Retorna um objeto Date cujos campos (getFullYear/getMonth/getDate/
 * getHours/getMinutes) já refletem o horário de Brasília (America/Sao_Paulo). */
function getAgoraBrasilia() {
  const agora = new Date();
  return new Date(agora.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
}

/** Converte 'YYYY-MM-DD' (+ 'HH:MM' opcional) para um instante real
 * no horário de Brasília (UTC-3), respeitando corretamente o fuso. */
function criarDataBrasilia(dataStr, horaStr = '23:59:59') {
  if (!dataStr) return null;

  try {
    const horaFinal = horaStr || '23:59:59';
    const data = new Date(`${dataStr}T${horaFinal}-03:00`);

    if (isNaN(data.getTime())) {
      const partes = dataStr.split('-');
      const horaPartes = horaFinal.split(':');
      return new Date(
        parseInt(partes[0]),
        parseInt(partes[1]) - 1,
        parseInt(partes[2]),
        parseInt(horaPartes[0]),
        parseInt(horaPartes[1]),
        parseInt(horaPartes[2] || 0),
      );
    }

    return data;
  } catch (error) {
    console.error('Erro ao criar data Brasília:', error);
    return null;
  }
}

/** Formata 'YYYY-MM-DD' para 'DD/MM/AAAA' */
function formatarData(dataStr) {
  if (!dataStr) return '';
  const [ano, mes, dia] = dataStr.split('-');
  return `${dia}/${mes}/${ano}`;
}

/** Formata uma data/timestamp (ISO ou Date) para o padrão brasileiro,
 * exibindo hora/minuto no horário de Brasília quando `incluirHora` for true. */
function formatarDataBrasilia(data, incluirHora = false) {
  if (!data) return '';
  try {
    const str = String(data);
    // mesma proteção: string só-de-data vira UTC-midnight, então força hora local
    const agora = new Date(str.length <= 10 ? `${str}T00:00:00` : str);
    if (isNaN(agora.getTime())) return String(data);
    const d = new Date(agora.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));

    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const ano = d.getFullYear();

    if (incluirHora) {
      const hora = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      return `${dia}/${mes}/${ano} ${hora}:${min}`;
    }

    return `${dia}/${mes}/${ano}`;
  } catch {
    return String(data);
  }
}

/** Formata data para exibição relativa curta (ex: "Hoje", "Amanhã", "12 Jun"),
 * sempre comparando contra o "hoje" no horário de Brasília. */
function formatarDataRelativa(dataStr) {
  if (!dataStr) return '';
  const hoje = getAgoraBrasilia();
  hoje.setHours(0, 0, 0, 0);
  const data = new Date(dataStr + 'T00:00:00');
  const diffDias = Math.round((data - hoje) / 86400000);

  if (diffDias === 0) return 'Hoje';
  if (diffDias === 1) return 'Amanhã';
  if (diffDias === -1) return 'Ontem';
  if (diffDias > 1 && diffDias < 7) return `Em ${diffDias} dias`;
  if (diffDias < 0) return `Atrasada (${formatarData(dataStr)})`;
  return `${data.getDate()} ${MESES[data.getMonth()].slice(0, 3)}`;
}

/** Formata data de forma relativa mais detalhada (usada em tarefas),
 * no horário de Brasília. */
function formatarDataRelativaBrasilia(dataStr) {
  if (!dataStr) return 'Sem data';

  try {
    // Importante: NÃO usar `new Date(dataStr)` aqui. Uma string só de
    // data ("YYYY-MM-DD") é interpretada pelo JS como meia-noite em UTC,
    // o que "puxa" a data um dia para trás quando lida no fuso de
    // Brasília (UTC-3). Por isso anexamos T00:00:00 (sem offset), que o
    // JS interpreta como meia-noite no fuso local do dispositivo.
    const data = new Date(dataStr.length <= 10 ? `${dataStr}T00:00:00` : dataStr);
    if (isNaN(data.getTime())) return String(dataStr);

    const agora = getAgoraBrasilia();
    const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    const dataComparacao = new Date(data.getFullYear(), data.getMonth(), data.getDate());
    const diffDias = Math.floor((dataComparacao - hoje) / (1000 * 60 * 60 * 24));

    if (diffDias < 0) {
      const dias = Math.abs(diffDias);
      if (dias === 0) return 'Hoje (atrasado)';
      if (dias === 1) return 'Ontem';
      return `${dias} dias atrás`;
    }

    if (diffDias === 0) return 'Hoje';
    if (diffDias === 1) return 'Amanhã';
    if (diffDias < 7) return `${diffDias} dias`;
    if (diffDias < 30) return `${Math.floor(diffDias / 7)} semanas`;
    if (diffDias < 365) return `${Math.floor(diffDias / 30)} meses`;
    return `${Math.floor(diffDias / 365)} anos`;
  } catch {
    return String(dataStr);
  }
}

/** Formata hora no padrão HH:MM */
function formatarHoraBrasilia(hora) {
  if (!hora) return '';
  try {
    const [h, m] = hora.split(':');
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  } catch {
    return hora;
  }
}

/** Formata data completa com hora no padrão brasileiro, no horário de Brasília. */
function formatarDataCompletaBrasilia(dataStr, horaStr = null) {
  if (!dataStr) return '';
  try {
    const data = criarDataBrasilia(dataStr, horaStr);
    if (!data) return String(dataStr);

    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const ano = data.getFullYear();
    const hora = String(data.getHours()).padStart(2, '0');
    const min = String(data.getMinutes()).padStart(2, '0');

    return `${dia}/${mes}/${ano} às ${hora}:${min}`;
  } catch {
    return String(dataStr);
  }
}

/** Retorna 'YYYY-MM-DD' do dia de hoje, sempre no horário de Brasília. */
function hojeISO() {
  const d = getAgoraBrasilia();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/** Escapa texto para uso seguro dentro de innerHTML */
function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

/** Gera as iniciais de um nome/email para o avatar */
function iniciais(nome) {
  if (!nome) return '?';
  const partes = nome.trim().split(/\s+/);
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

/** Exibe uma notificação toast temporária */
function mostrarToast(mensagem, tipo = 'default') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${tipo === 'default' ? '' : tipo}`.trim();
  toast.textContent = mensagem;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

/** Labels e classes de prioridade */
const PRIORIDADE_INFO = {
  baixa: { label: 'Baixa', classe: 'badge-gray' },
  media: { label: 'Média', classe: 'badge-warning' },
  alta: { label: 'Alta', classe: 'badge-danger' },
};

const STATUS_INFO = {
  pendente: { label: 'Pendente', classe: 'badge-warning' },
  concluida: { label: 'Concluída', classe: 'badge-success' },
};

/** Abre/fecha um modal pelo id */
function abrirModal(id) {
  document.getElementById(id).classList.add('open');
}
function fecharModal(id) {
  document.getElementById(id).classList.remove('open');
}

/** Fecha modal ao clicar fora do conteúdo */
document.addEventListener('click', (e) => {
  if (e.target.classList && e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
  }
});

/** Debounce simples para campos de busca */
function debounce(fn, delay = 300) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
