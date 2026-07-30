// =========================================================
// CONFIGURAÇÃO DO SUPABASE
// Preencha com as credenciais do seu projeto (Settings > API).
// =========================================================

const SUPABASE_URL = 'https://kabzioiudnhaulcwkkox.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_09l6n3WwayNx3FxL4vEjPg_RZGN-xJd';

// O SDK do Supabase é carregado via CDN (ver <script> nas páginas HTML)
// e fica disponível globalmente como `window.supabase`.
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
