// =========================================================
// JOB DE LEMBRETES — envia avisos de tarefas/provas via Telegram
// Chamado periodicamente (cron da Vercel ou um agendador externo).
// =========================================================

const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  const segredoEsperado = process.env.CRON_SECRET;
  const auth = req.headers['authorization'];
  if (segredoEsperado && auth !== `Bearer ${segredoEsperado}`) {
    return res.status(401).json({ erro: 'Não autorizado' });
  }

  const faltando = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'TELEGRAM_BOT_TOKEN']
    .filter((nome) => !process.env[nome]);

  if (faltando.length > 0) {
    return res.status(500).json({
      ok: false,
      erro: `Variáveis de ambiente faltando na Vercel: ${faltando.join(', ')}`,
    });
  }

  try {
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    );

    const agora = new Date();

    const { data: usuarios, error: errUsuarios } = await supabaseAdmin
      .from('usuarios')
      .select('id, nome, telegram_chat_id, lembrete_dias, lembrete_horas, lembrete_minutos, lembretes_ativos')
      .eq('lembretes_ativos', true)
      .not('telegram_chat_id', 'is', null);

    if (errUsuarios) throw errUsuarios;

    let totalEnviados = 0;

    for (const usuario of usuarios) {
      const antecedenciaMin =
        (usuario.lembrete_dias ?? 0) * 1440 +
        (usuario.lembrete_horas ?? 0) * 60 +
        (usuario.lembrete_minutos ?? 0);

      // Busca todas as tarefas/provas pendentes com data de entrega definida
      const { data: tarefas, error: errTarefas } = await supabaseAdmin
        .from('tarefas')
        .select('id, titulo, tipo, data_entrega, hora_entrega')
        .eq('user_id', usuario.id)
        .eq('status', 'pendente')
        .not('data_entrega', 'is', null);

      if (errTarefas) {
        console.error('Erro ao buscar tarefas do usuário', usuario.id, errTarefas);
        continue;
      }

      for (const tarefa of tarefas) {
        const dataHoraEntrega = criarDataBrasilia(tarefa.data_entrega, tarefa.hora_entrega);
        const dataHoraAviso = new Date(dataHoraEntrega.getTime() - antecedenciaMin * 60000);

        // Ainda não chegou o momento configurado de avisar
        if (agora < dataHoraAviso) continue;

        // Evita enviar o mesmo aviso mais de uma vez
        const { data: jaEnviado } = await supabaseAdmin
          .from('lembretes_enviados')
          .select('id')
          .eq('tarefa_id', tarefa.id)
          .maybeSingle();

        if (jaEnviado) continue;

        const nome = usuario.nome || 'Você';
        const rotulo = tarefa.tipo === 'prova' ? 'prova' : 'tarefa';
        const prazo = formatarPrazo(antecedenciaMin);
        const mensagem = `📚 ${nome}, sua ${rotulo} "${tarefa.titulo}" vence ${prazo}!`;

        const enviado = await enviarTelegram(usuario.telegram_chat_id, mensagem);

        if (enviado) {
          await supabaseAdmin.from('lembretes_enviados').insert({
            user_id: usuario.id,
            tarefa_id: tarefa.id,
          });
          totalEnviados++;
        }
      }
    }

    return res.status(200).json({ ok: true, lembretes_enviados: totalEnviados });
  } catch (err) {
    console.error('Erro no job de lembretes:', err);
    return res.status(500).json({ ok: false, erro: err.message });
  }
};

async function enviarTelegram(chatId, mensagem) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  try {
    const resposta = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: mensagem }),
    });
    const dados = await resposta.json();
    if (!dados.ok) console.error('Telegram recusou o envio:', dados.description);
    return dados.ok === true;
  } catch (err) {
    console.error('Erro ao enviar Telegram para', chatId, err);
    return false;
  }
}

// Combina data (YYYY-MM-DD) + hora (HH:MM ou HH:MM:SS) no horário de Brasília.
// Sem hora definida, assume o fim do dia (23:59:59), igual ao front-end.
function criarDataBrasilia(dataStr, horaStr) {
  const horaFinal = horaStr || '23:59:59';
  return new Date(`${dataStr}T${horaFinal}-03:00`);
}

function formatarPrazo(antecedenciaMin) {
  if (antecedenciaMin <= 0) return 'agora';
  const dias = Math.floor(antecedenciaMin / 1440);
  const horas = Math.floor((antecedenciaMin % 1440) / 60);
  const minutos = antecedenciaMin % 60;

  const partes = [];
  if (dias > 0) partes.push(`${dias} dia${dias > 1 ? 's' : ''}`);
  if (horas > 0) partes.push(`${horas} hora${horas > 1 ? 's' : ''}`);
  if (minutos > 0) partes.push(`${minutos} minuto${minutos > 1 ? 's' : ''}`);

  return partes.length ? `em ${partes.join(' e ')}` : 'em breve';
}
