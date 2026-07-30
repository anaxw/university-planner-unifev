const { createClient } = require('@supabase/supabase-js');
const { processarUpdate } = require('./telegrambot');

module.exports = async function handler(req, res) {
  // Telegram envia apenas POST
  if (req.method !== 'POST') {
    return res.status(200).json({ ok: true });
  }

  // Validação do Secret Token
  const segredo = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (segredo) {
    const recebido = req.headers['x-telegram-bot-api-secret-token'];

    if (recebido !== segredo) {
      return res.status(401).json({
        ok: false,
        erro: 'Não autorizado',
      });
    }
  }

  try {
    const faltando = [
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'TELEGRAM_BOT_TOKEN',
    ].filter((v) => !process.env[v]);

    if (faltando.length) {
      console.error(
        `Variáveis de ambiente faltando: ${faltando.join(', ')}`
      );

      return res.status(200).json({
        ok: false,
      });
    }

    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const update = req.body;

    // Encaminha todo update para o bot
    await processarUpdate(supabaseAdmin, update);

    return res.status(200).json({
      ok: true,
    });

  } catch (err) {
    console.error('Erro no webhook do Telegram:', err);

    // Sempre responder 200 para o Telegram não reenviar
    return res.status(200).json({
      ok: false,
    });
  }
};
