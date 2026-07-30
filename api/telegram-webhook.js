// =========================================================
// WEBHOOK DO TELEGRAM
// Recebe as mensagens enviadas ao bot e vincula a conta do
// usuário (telegram_chat_id) quando ele manda /start <codigo>.
//
// Configure o webhook UMA VEZ, abrindo esta URL no navegador
// (troque SEU_TOKEN e SEU_DOMINIO):
//
//   https://api.telegram.org/botSEU_TOKEN/setWebhook?url=https://SEU_DOMINIO/api/telegram-webhook
//
// Opcionalmente, para garantir que só o Telegram consiga chamar
// este endpoint, defina TELEGRAM_WEBHOOK_SECRET nas variáveis de
// ambiente e adicione &secret_token=SEU_SEGREDO na URL acima.
// =========================================================

const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  // O Telegram sempre chama via POST — qualquer outro método só confirma que a rota existe
  if (req.method !== 'POST') {
    return res.status(200).json({ ok: true });
  }

  const segredo = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (segredo) {
    const recebido = req.headers['x-telegram-bot-api-secret-token'];
    if (recebido !== segredo) {
      return res.status(401).json({ ok: false, erro: 'Não autorizado' });
    }
  }

  try {
    const faltando = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'TELEGRAM_BOT_TOKEN']
      .filter((nome) => !process.env[nome]);

    if (faltando.length > 0) {
      console.error(`Variáveis de ambiente faltando na Vercel: ${faltando.join(', ')}`);
      return res.status(200).json({ ok: false });
    }

    const update = req.body;
    const mensagem = update?.message;

    // Ignora updates sem texto (fotos, stickers, edições, etc.)
    if (!mensagem?.text) {
      return res.status(200).json({ ok: true });
    }

    const chatId = String(mensagem.chat.id);
    const texto = mensagem.text.trim();

    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    );

    if (texto.startsWith('/start')) {
      const codigo = texto.replace('/start', '').trim().toUpperCase();

      if (!codigo) {
        await enviarTelegram(chatId,
          'Olá! Para vincular sua conta, gere um código na página de Configurações do sistema e envie /start seguido do código aqui.');
        return res.status(200).json({ ok: true });
      }

      const { data: usuario, error: errBusca } = await supabaseAdmin
        .from('usuarios')
        .select('id, nome')
        .eq('telegram_link_code', codigo)
        .maybeSingle();

      if (errBusca || !usuario) {
        await enviarTelegram(chatId, '❌ Código inválido ou expirado. Gere um novo código nas Configurações do sistema.');
        return res.status(200).json({ ok: true });
      }

      const { error: errUpdate } = await supabaseAdmin
        .from('usuarios')
        .update({ telegram_chat_id: chatId, telegram_link_code: null })
        .eq('id', usuario.id);

      if (errUpdate) {
        await enviarTelegram(chatId, '❌ Não consegui concluir a vinculação. Tente novamente em instantes.');
        return res.status(200).json({ ok: true });
      }

      const nome = usuario.nome ? `, ${usuario.nome}` : '';
      await enviarTelegram(chatId, `✅ Conta vinculada com sucesso${nome}! A partir de agora você recebe seus lembretes por aqui.`);
      return res.status(200).json({ ok: true });
    }

    // Qualquer outra mensagem: responde com uma dica curta
    await enviarTelegram(chatId, 'Para vincular sua conta, gere um código nas Configurações do sistema e envie /start seguido do código.');
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Erro no webhook do Telegram:', err);
    // Sempre responde 200 para o Telegram não ficar reenviando o mesmo update
    return res.status(200).json({ ok: false });
  }
};

async function enviarTelegram(chatId, mensagem) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: mensagem }),
    });
  } catch (err) {
    console.error('Erro ao enviar mensagem Telegram:', err);
  }
}
