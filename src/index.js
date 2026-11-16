const express = require('express');
const { createBot } = require('./bot');
const { openDatabase } = require('./database');

async function main() {
  const token = process.env.BOT_TOKEN?.trim();
  if (!token) throw new Error('BOT_TOKEN qiymatini .env fayliga kiriting.');
  if (!/^\d+:[\w-]+$/.test(token)) throw new Error('BOT_TOKEN formati noto‘g‘ri.');

  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT 1 dan 65535 gacha butun son bo‘lishi kerak.');
  }

  const database = await openDatabase(process.env.DATABASE_PATH || './data/safety.sqlite3');
  const bot = createBot(token, database);
  const app = express();
  let stopping = false;
  let ready = false;
  let shutdownTimer;

  app.disable('x-powered-by');
  app.get('/health', (_request, response) => {
    response.status(ready ? 200 : 503).json({ status: ready ? 'ok' : 'starting' });
  });

  const server = app.listen(port);
  server.once('listening', () => console.log('Express porti: ' + port));
  server.on('error', (error) => {
    console.error('Express serveri ishga tushmadi. Kod: ' + (error.code || 'UNKNOWN'));
    process.exitCode = 1;
    stop('server error');
  });

  function stop(reason) {
    if (stopping) return;
    stopping = true;
    ready = false;
    server.close();
    shutdownTimer = setTimeout(() => process.exit(process.exitCode || 0), 10_000);
    shutdownTimer.unref();
    try {
      bot.stop(reason);
    } catch (error) {
      if (error.message !== 'Bot is not running!') throw error;
    }
  }

  process.once('SIGINT', () => stop('SIGINT'));
  process.once('SIGTERM', () => stop('SIGTERM'));

  // Telegram network errors can include the token in their messages.
  bot.catch((error, ctx) => {
    console.error('Telegram yangilanishi bajarilmadi. ID: ' + ctx.update.update_id +
      ', kod: ' + (error.response?.error_code || error.code || 'UNKNOWN'));
  });

  try {
    await bot.launch({ allowedUpdates: ['message', 'callback_query'] }, () => {
      if (!stopping) {
        ready = true;
        console.log('Telegram bot: @' + bot.botInfo.username);
      }
    });
  } catch (error) {
    console.error('Telegram bot ishida xato. Kod: ' + (error.response?.error_code || error.code || 'UNKNOWN'));
    process.exitCode = 1;
  } finally {
    stop('polling finished');
    await database.close();
    clearTimeout(shutdownTimer);
  }
}

main().catch((error) => {
  console.error('Ishga tushirish xatosi: ' + error.message);
  process.exitCode = 1;
});
