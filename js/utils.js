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

/** Formata 'YYYY-MM-DD' para 'DD/MM/AAAA' */
function formatarData(dataStr) {
  if (!dataStr) return '';
  const [ano, mes, dia] = dataStr.split('-');
  return `${dia}/${mes}/${ano}`;
}

/** Formata data para exibição relativa curta (ex: "Hoje", "Amanhã", "12 Jun") */
function formatarDataRelativa(dataStr) {
  if (!dataStr) return '';
  const hoje = new Date();
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

/** Retorna 'YYYY-MM-DD' de hoje */
function hojeISO() {
  const d = new Date();
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
