/** Optional Telegram delivery. If TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are set, send there; otherwise callers should fall back to stdout. */

export type TelegramConfig = {
  botToken: string
  chatId: string
}

export function getTelegramConfig(): TelegramConfig | null {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim()
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim()
  if (!botToken || !chatId) return null
  return { botToken, chatId }
}

/** Send a plain-text (or Markdown) message to Telegram. */
export async function sendTelegramMessage(
  text: string,
  opts: { parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2'; disableLinkPreview?: boolean } = {},
): Promise<void> {
  const cfg = getTelegramConfig()
  if (!cfg) {
    throw new Error('Telegram is not configured (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID)')
  }

  const url = `https://api.telegram.org/bot${cfg.botToken}/sendMessage`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chat_id: cfg.chatId,
      text,
      parse_mode: opts.parseMode,
      disable_web_page_preview: opts.disableLinkPreview ?? true,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Telegram sendMessage failed: ${res.status} ${body}`)
  }
}
