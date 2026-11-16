const { setTimeout: delay } = require('node:timers/promises');
const { Markup } = require('telegraf');

const listSize = 8;
const letters = ['A', 'B', 'C', 'D'];
const questionFormat = [
  'Savolni bitta xabarda 6 qatorda yuboring.',
  '1-qator — savol matni',
  '2–5-qatorlar — A, B, C va D variantlari',
  '6-qator — to‘g‘ri variant harfi (masalan, B)',
].join('\n');

function registerAssessment(bot, database, isAdmin, clearVideoSelection) {
  const input = new Map();
  const button = Markup.button.callback;
  const keyboard = Markup.inlineKeyboard;
  let broadcasting = false;
  const botId = (ctx) => ctx.botInfo.id;
  const userId = (ctx) => ctx.from.id;

  function adminAction(pattern, handler) {
    bot.action(pattern, async (ctx) => {
      if (!isAdmin(ctx)) return ctx.answerCbQuery('Admin paneliga kirish huquqingiz yo‘q.');
      await ctx.answerCbQuery();
      return handler(ctx);
    });
  }

  async function listTests(ctx, offset, forAdmin) {
    const tests = await database.publishedTests(botId(ctx), listSize + 1, offset);
    const route = forAdmin ? 'admin:results' : 'tests';
    const rows = tests.slice(0, listSize).map(({ id, title }) => [
      button(title, forAdmin ? 'admin:result:' + id + ':0' : 'test:pick:' + id),
    ]);
    if (offset > 0) rows.push([button('⬅️ Oldingi', route + ':' + (offset - listSize))]);
    if (tests.length > listSize) rows.push([button('Keyingi ➡️', route + ':' + (offset + listSize))]);
    rows.push([button('🏠 Asosiy menyu', 'menu')]);
    const title = forAdmin ? '📋 Natijalar uchun test mavzusini tanlang.' : '📝 Test mavzusini tanlang.';
    return ctx.editMessageText(tests.length ? title : 'Hozircha testlar mavjud emas.', keyboard(rows)).catch(ignoreUnchanged);
  }

  function ignoreUnchanged(error) {
    if (!error.response?.description?.includes('message is not modified')) throw error;
  }

  function promptQuestion(ctx, draft) {
    const rows = draft.questions.length
      ? [[button('✅ Testni e’lon qilish', 'admin:publish:' + draft.id)]]
      : [];
    const heading = 'Kiritilgan savollar — ' + draft.questions.length;
    return ctx.reply([heading, questionFormat, '/cancel — bekor qilish'].join('\n\n'), keyboard(rows));
  }

  async function showAttempt(ctx, attempt) {
    const total = attempt.questions.length;
    if (attempt.submitted_at) {
      return ctx.reply('✅ Test topshirildi.\n\nTo‘g‘ri javoblar — ' + attempt.score + '/' + total +
        '\nNoto‘g‘ri javoblar — ' + (total - attempt.score));
    }
    const question = attempt.questions[attempt.answered];
    if (!question) {
      return ctx.reply(total + ' ta savolga javob berdingiz. Natijani saqlash uchun testni topshiring.',
        keyboard([[button('✅ Testni topshirish', 'test:submit:' + attempt.id)]]));
    }
    const heading = attempt.title + '\nSavol ' + (attempt.answered + 1) + '/' + total;
    const options = question.options.map((option, i) => letters[i] + '. ' + option);
    const choices = question.options.map((_, i) =>
      button(letters[i], ['test', 'answer', attempt.id, attempt.answered, i].join(':')));
    return ctx.reply([heading, question.prompt, options.join('\n')].join('\n\n'), keyboard([choices]));
  }

  adminAction('admin:create-test', (ctx) => {
    clearVideoSelection(userId(ctx));
    input.set(userId(ctx), { stage: 'title', id: ctx.update.update_id, questions: [] });
    return ctx.reply('Yangi test mavzusini yozing. Masalan, «Elektr xavfsizligi».\n\n/cancel — bekor qilish');
  });

  adminAction(/^admin:publish:(\d+)$/, async (ctx) => {
    const draft = input.get(userId(ctx));
    if (draft?.stage !== 'question' || draft.id !== Number(ctx.match[1]) || !draft.questions.length) {
      return ctx.reply('E’lon qilish uchun faol test loyihasi mavjud emas.');
    }
    input.delete(userId(ctx));
    try {
      await database.publishTest(botId(ctx), draft.title, draft.questions);
    } catch (error) {
      if (!input.has(userId(ctx))) input.set(userId(ctx), draft);
      throw error;
    }
    return ctx.reply('✅ «' + draft.title + '» testi e’lon qilindi. Savollar soni — ' + draft.questions.length + '.');
  });

  bot.action(/^tests:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    return listTests(ctx, Number(ctx.match[1]), false);
  });
  adminAction(/^admin:results:(\d+)$/, (ctx) => listTests(ctx, Number(ctx.match[1]), true));
  adminAction(/^admin:result:(\d+):(\d+)$/, async (ctx) => {
    const id = Number(ctx.match[1]);
    const offset = Number(ctx.match[2]);
    const test = await database.publishedTest(botId(ctx), id);
    if (!test) return ctx.reply('Test topilmadi.');
    const results = await database.testResults(id, listSize + 1, offset);
    const lines = results.slice(0, listSize).map((row, i) =>
      (offset + i + 1) + '. ' + row.full_name + ' · ' + row.group_name + ' · ' + row.score + '/' + row.answered);
    const rows = [];
    if (offset > 0) rows.push([button('⬅️ Oldingi', 'admin:result:' + id + ':' + (offset - listSize))]);
    if (results.length > listSize) rows.push([button('Keyingi ➡️', 'admin:result:' + id + ':' + (offset + listSize))]);
    rows.push([button('📋 Mavzular', 'admin:results:0')]);
    return ctx.editMessageText(test.title + '\n\n' + (lines.join('\n') || 'Hali hech kim testni topshirmagan.'), keyboard(rows)).catch(ignoreUnchanged);
  });

  bot.action(/^test:pick:(\d+)$/, async (ctx) => {
    const test = await database.publishedTest(botId(ctx), Number(ctx.match[1]));
    if (!test) return ctx.answerCbQuery('Test topilmadi.');
    clearVideoSelection(userId(ctx));
    input.set(userId(ctx), { stage: 'name', test });
    await ctx.answerCbQuery();
    return ctx.reply('«' + test.title + '»\n\nIsm va familiyangizni birga yozing. Ismingiz, guruhingiz va natijangiz adminga ko‘rinadi.\n\n/cancel — bekor qilish');
  });

  bot.action(/^test:answer:(\d+):(\d+):([0-3])$/, async (ctx) => {
    const [, id, position, choice] = ctx.match.map(Number);
    const attempt = await database.testAttempt(botId(ctx), userId(ctx), id);
    const question = attempt?.questions[position];
    if (!question || attempt.submitted_at || position > attempt.answered) {
      return ctx.answerCbQuery('Bu savol faol emas.');
    }
    const result = await database.answerAttempt(id, userId(ctx), position, choice === question.correct);
    await ctx.answerCbQuery(result.changes ? 'Javob saqlandi.' : 'Bu savolga javob berilgandi.');
    if (result.changes) {
      await ctx.editMessageReplyMarkup({ inline_keyboard: [] }).catch(ignoreUnchanged);
    }
    return showAttempt(ctx, await database.testAttempt(botId(ctx), userId(ctx), id));
  });

  bot.action(/^test:submit:(\d+)$/, async (ctx) => {
    const id = Number(ctx.match[1]);
    const attempt = await database.testAttempt(botId(ctx), userId(ctx), id);
    if (!attempt || attempt.answered !== attempt.questions.length) {
      return ctx.answerCbQuery('Avval barcha savollarga javob bering.');
    }
    await database.submitAttempt(id, userId(ctx), attempt.questions.length);
    await ctx.answerCbQuery();
    return showAttempt(ctx, await database.testAttempt(botId(ctx), userId(ctx), id));
  });

  adminAction('admin:broadcast', (ctx) => {
    clearVideoSelection(userId(ctx));
    input.set(userId(ctx), { stage: 'broadcast', id: ctx.update.update_id });
    return ctx.reply('Bot foydalanuvchilariga yuboriladigan matnni yozing.\n\n/cancel — bekor qilish');
  });

  async function sendBroadcast(ctx, text) {
    try {
      const users = await database.broadcastUsers(botId(ctx));
      let delivered = 0;
      for (const { user_id: recipient } of users) {
        try {
          await ctx.telegram.sendMessage(recipient, text);
          delivered++;
        } catch (error) {
          const retryAfter = error.response?.parameters?.retry_after;
          if (Number.isFinite(retryAfter) && retryAfter > 0) {
            await delay(retryAfter * 1000);
            try {
              await ctx.telegram.sendMessage(recipient, text);
              delivered++;
            } catch {
              // Continue with the next recipient.
            }
          }
        }
        await delay(50);
      }
      await ctx.reply('Xabar yuborildi — ' + delivered + '/' + users.length);
    } finally {
      broadcasting = false;
    }
  }

  adminAction(/^admin:broadcast-send:(\d+)$/, (ctx) => {
    const draft = input.get(userId(ctx));
    if (draft?.stage !== 'broadcast-preview' || draft.id !== Number(ctx.match[1])) {
      return ctx.reply('Yuborishga tayyor xabar yo‘q.');
    }
    if (broadcasting) return ctx.reply('Oldingi xabar yuborilyapti. Birozdan keyin qayta bosing.');
    input.delete(userId(ctx));
    broadcasting = true;
    void sendBroadcast(ctx, draft.text).catch(() => console.error('Ommaviy xabar jarayoni yakunlanmadi.'));
    return ctx.reply('Xabar yuborish boshlandi.');
  });

  bot.on('text', async (ctx, next) => {
    const id = userId(ctx);
    const draft = input.get(id);
    const text = ctx.message.text.trim();
    if (!draft || ctx.message.entities?.some(({ type, offset }) => type === 'bot_command' && offset === 0)) return next();

    if (draft.stage === 'name') {
      const parts = text.split(/\s+/);
      if (text.length > 100 || parts.length < 2) return ctx.reply('Ism va familiyangizni to‘liq yozing.');
      input.set(id, { ...draft, stage: 'group', name: parts.join(' ') });
      return ctx.reply('Guruhingizni yozing. Masalan, 101-A.');
    }
    if (draft.stage === 'group') {
      if (!text || text.length > 60 || text.includes('\n')) return ctx.reply('Guruh nomini bitta qatorda, 1–60 belgi bilan yozing.');
      input.delete(id);
      let attemptId;
      try {
        attemptId = await database.startAttempt(draft.test.id, id, draft.name, text);
      } catch (error) {
        if (!input.has(id)) input.set(id, draft);
        throw error;
      }
      return showAttempt(ctx, await database.testAttempt(botId(ctx), id, attemptId));
    }

    if (!isAdmin(ctx)) return next();
    if (draft.stage === 'title') {
      if (!text || text.length > 80 || text.includes('\n')) return ctx.reply('Mavzuni bitta qatorda, 1–80 belgi bilan yozing.');
      input.set(id, { ...draft, stage: 'question', title: text });
      return promptQuestion(ctx, draft);
    }
    if (draft.stage === 'question') {
      const lines = text.split(/\r?\n/).map((line) => line.trim());
      const [prompt, ...variants] = lines;
      const options = variants.slice(0, 4).map((line, i) =>
        line.replace(new RegExp('^' + letters[i] + '[).:]\\s*', 'i'), ''));
      const correct = letters.indexOf((lines[5] || '').toUpperCase());
      if (lines.length !== 6 || !prompt || prompt.length > 1000 || correct < 0 ||
          options.some((option) => !option || option.length > 250) || new Set(options).size !== 4) {
        return ctx.reply('Savol yoki variantlarni tekshiring.\n\n' + questionFormat);
      }
      if (draft.questions.length >= 100) return ctx.reply('100 ta savol kiritildi. «Testni e’lon qilish» tugmasini bosing.');
      draft.questions.push({ prompt, options, correct });
      return promptQuestion(ctx, draft);
    }
    if (!text || text.length > 3500) return ctx.reply('Xabar matni 1–3500 belgidan iborat bo‘lsin.');
    input.set(id, { ...draft, stage: 'broadcast-preview', id: ctx.update.update_id, text });
    return ctx.reply('Yuboriladigan xabar\n\n' + text, keyboard([
      [button('📨 Hammaga yuborish', 'admin:broadcast-send:' + ctx.update.update_id)],
      [button('❌ Bekor qilish', 'admin:broadcast-cancel')],
    ]));
  });

  adminAction('admin:broadcast-cancel', (ctx) => {
    const id = userId(ctx);
    if (input.get(id)?.stage === 'broadcast-preview') input.delete(id);
    return ctx.reply('Xabar yuborish bekor qilindi.');
  });

  return (id) => input.delete(id);
}

module.exports = { registerAssessment };
