// =========================================================
// SIDEBAR — menu lateral fixo, reutilizado em todas as páginas internas
// =========================================================

const ICONES = {
  dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>',
  materias: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
  tarefas: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 11 3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
  anotacoes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="16" y2="11"/></svg>',
  grade: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="9" x2="9" y2="21"/><line x1="15" y1="9" x2="15" y2="21"/></svg>',
  calendario: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  configuracoes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
  arquivos: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>',
};

const ITENS_MENU = [
  { id: 'dashboard', label: 'Dashboard', href: 'dashboard.html' },
  { id: 'materias', label: 'Matérias', href: 'materias.html' },
  { id: 'grade', label: 'Grade Escolar', href: 'grade-escolar.html' },
  { id: 'tarefas', label: 'Tarefas', href: 'tarefas.html' },
  { id: 'anotacoes', label: 'Anotações', href: 'anotacoes.html' },
  { id: 'calendario', label: 'Calendário', href: 'calendario.html' },
  { id: 'arquivos', label: 'Arquivos', href: 'arquivos.html' },
  { id: 'configuracoes', label: 'Configurações', href: 'configuracoes.html' },
];

/** Monta o HTML da sidebar e injeta no elemento #sidebar-root da página */
function renderizarSidebar(paginaAtiva, usuario) {
  const root = document.getElementById('sidebar-root');
  if (!root) return;

  const nome = usuario?.user_metadata?.nome || usuario?.email || 'Usuário';
  const email = usuario?.email || '';

  const linksHTML = ITENS_MENU.map(item => `
    <a class="sidebar__link ${item.id === paginaAtiva ? 'active' : ''}" href="${item.href}">
      ${ICONES[item.id]}
      <span>${item.label}</span>
    </a>
  `).join('');

  root.innerHTML = `
    <div class="sidebar__overlay" id="sidebar-overlay"></div>
    <aside class="sidebar" id="sidebar">
      <div class="sidebar__brand">
        <div class="sidebar__brand-icon">🎓</div>
        <span>Rotina Faculdade</span>
      </div>
      <nav class="sidebar__nav">
        ${linksHTML}
      </nav>
      <div class="sidebar__footer">
        <div class="sidebar__user">
          <div class="sidebar__avatar">${escapeHTML(iniciais(nome))}</div>
          <div class="sidebar__user-info">
            <div class="sidebar__user-name">${escapeHTML(nome)}</div>
            <div class="sidebar__user-email">${escapeHTML(email)}</div>
          </div>
          <button class="sidebar__logout" id="btn-logout" aria-label="Sair" data-tooltip="Sair">
            ${ICONES.logout}
          </button>
        </div>
      </div>
    </aside>
  `;

  document.getElementById('btn-logout').addEventListener('click', logout);

  const overlay = document.getElementById('sidebar-overlay');
  overlay.addEventListener('click', () => {
    document.getElementById('sidebar').classList.remove('open');
    overlay.classList.remove('open');
  });
}

/** Botão de menu mobile (hambúrguer) presente no topbar de cada página */
function ativarMenuMobile() {
  const btn = document.getElementById('mobile-toggle');
  if (!btn) return;
  btn.innerHTML = ICONES.menu;
  btn.addEventListener('click', () => {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('sidebar-overlay').classList.add('open');
  });
}

/**
 * Função de inicialização padrão para páginas internas:
 * confere sessão, renderiza sidebar e ativa o menu mobile.
 * Retorna o usuário autenticado.
 */
async function iniciarPagina(paginaAtiva) {
  const usuario = await exigirSessao();
  if (!usuario) return null;
  renderizarSidebar(paginaAtiva, usuario);
  ativarMenuMobile();
  return usuario;
}