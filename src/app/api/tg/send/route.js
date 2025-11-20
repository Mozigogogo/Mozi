export async function POST(req) {
  try {
    const body = await req.json();
    const { chatId, text, parseMode = 'HTML', disableWebPagePreview = true } = body || {};

    if (!chatId) {
      return new Response(JSON.stringify({ ok: false, error: 'chatId is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const token = process.env.TG_BOT_TOKEN || '8322914400:AAHdQw2bpxe1QbTwtCnDNmCc5TK-tdQnsOY';
    const url = `https://api.telegram.org/bot${token}/sendMessage`;

    const payload = {
      chat_id: chatId,
      text: text || '✅ 已绑定 Telegram 推送（测试消息）',
      parse_mode: parseMode,
      disable_web_page_preview: disableWebPagePreview,
    };

    const tgRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await tgRes.json();
    const status = tgRes.ok ? 200 : 500;

    return new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err?.message || 'Unknown error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}