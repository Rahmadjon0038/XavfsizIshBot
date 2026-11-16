const { stat } = require('node:fs/promises');
const { resolve } = require('node:path');
const { Telegraf, Markup, Input } = require('telegraf');
const { sections, emergencyText } = require('./lessons');
const { quizzes } = require('./quizzes');
const { registerAssessment } = require('./assessment');

const letters = ['A', 'B', 'C'];

function createBot(token, database) {
  const bot = new Telegraf(token);
  const button = Markup.button.callback;
  const menuButton = () => button('🏠 Asosiy menyu', 'menu');
  const goTo = (section, page = 0) => 'page:' + section.id + ':' + page;
  const quizButton = (section, label = '📝 Testni boshlash') => button(label, 'quiz:' + section.id + ':0:0');
  const videoUploads = new Map();
  const adminIds = new Set((process.env.ADMIN_TELEGRAM_IDS || '').split(',').map((id) => id.trim()));
  const adminSelections = new Map();
  const isAdmin = (ctx) => adminIds.has(String(ctx.from.id));
  const sectionVideoKey = (ctx, sectionId) => JSON.stringify([ctx.botInfo.id, 'section', sectionId]);

  bot.use(async (ctx, next) => {
    if (ctx.chat?.type !== 'private' || !ctx.from) return;
    await database.registerBotUser(ctx.botInfo.id, ctx.from.id);
    return next();
  });
  const clearAssessment = registerAssessment(bot, database, isAdmin, (id) => adminSelections.delete(id));

  async function menu(ctx, update = false) {
    const [completed, pages] = await Promise.all([
      database.completedSections(ctx.from.id),
      database.lessonPages(ctx.from.id),
    ]);
    const completedCount = sections.filter((section) => completed.has(section.id)).length;
    const rows = sections.map((section, index) => {
      const done = completed.has(section.id);
      const savedPage = pages.get(section.id);
      const page = !done && section.pages[savedPage] ? savedPage : 0;
      const status = done ? ' ✅' : page > 0 ? ' · ' + (page + 1) + '-sahifa' : '';
      return [button((index + 1) + '. ' + section.title + status, goTo(section, page))];
    });
    rows.push([button('📝 Testlar', 'tests:0')]);
    rows.push([button('📚 Mashq testlari', 'quizzes')]);
    rows.push([button('🚨 Favqulodda raqamlar', 'emergency')]);
    const text = [
      'Ish joyida xavfsizlik',
      'Bo‘limni tanlang. Oxirgi sahifada «O‘qib bo‘ldim» tugmasini bosing.',
      `${sections.length} ta bo‘limdan ${completedCount} tasini tugatdingiz.`,
    ].join('\n\n');
    const keyboard = Markup.inlineKeyboard(rows);
    return update ? edit(ctx, text, keyboard) : ctx.reply(text, keyboard);
  }

  async function edit(ctx, text, keyboard) {
    try {
      return await ctx.editMessageText(text, keyboard);
    } catch (error) {
      if (error.response?.error_code !== 400 ||
          !error.response.description?.includes('message is not modified')) {
        throw error;
      }
    }
  }

  bot.start((ctx) => {
    const welcome = [
      '👋 Xush kelibsiz!',
      'Bu bot ish joyida xavfsiz ishlash va favqulodda vaziyatda qanday harakat qilishni o‘rganishga yordam beradi.',
      'Bu yerda yong‘in va elektr xavfsizligi qoidalarini o‘rganasiz, birinchi yordam asoslari bilan tanishasiz va bilimingizni qisqa testlarda tekshirasiz.',
    ].join('\n\n');
    return ctx.reply(welcome, Markup.inlineKeyboard([[button('📘 Boshlash', 'menu')]]));
  });
  bot.command('menu', (ctx) => menu(ctx));
  bot.command('emergency', (ctx) => ctx.reply(emergencyText, Markup.inlineKeyboard([[menuButton()]])));
  bot.command('id', (ctx) => ctx.reply('Telegram ID raqamingiz — ' + ctx.from.id));
  bot.command('admin', async (ctx) => {
    if (!isAdmin(ctx)) return ctx.reply('Admin paneliga kirish huquqingiz yo‘q.');
    adminSelections.delete(ctx.from.id);
    clearAssessment(ctx.from.id);
    const rows = await Promise.all(sections.map(async (section) => {
      const video = await database.telegramVideo(sectionVideoKey(ctx, section.id));
      const status = video ? ' ✅' : '';
      return [button(section.title + status, 'admin-video:' + section.id)];
    }));
    rows.push([button('📝 Test yaratish', 'admin:create-test'), button('📋 Natijalar', 'admin:results:0')]);
    rows.push([button('📨 Xabar yuborish', 'admin:broadcast')]);
    return ctx.reply('Admin paneli\n\nVideo joylash uchun bo‘limni tanlang. ✅ — video Telegram’da saqlangan.', Markup.inlineKeyboard(rows));
  });

  bot.action(/^admin-video:([a-z-]+)$/, async (ctx) => {
    if (!isAdmin(ctx)) return ctx.answerCbQuery('Admin paneliga kirish huquqingiz yo‘q.');
    const section = sections.find(({ id }) => id === ctx.match[1]);
    if (!section) return ctx.answerCbQuery('Bo‘lim topilmadi.');
    clearAssessment(ctx.from.id);
    adminSelections.set(ctx.from.id, section);
    await ctx.answerCbQuery();
    return ctx.reply(section.title + '\n\nVideoni galereyadan yoki MP4 fayl sifatida yuboring. Bekor qilish uchun /cancel ni bosing.');
  });

  bot.command('cancel', (ctx) => {
    clearAssessment(ctx.from.id);
    if (isAdmin(ctx)) adminSelections.delete(ctx.from.id);
    return menu(ctx);
  });

  async function saveSectionVideo(ctx, fileId, type) {
    if (!isAdmin(ctx)) return;
    const section = adminSelections.get(ctx.from.id);
    if (!section) return ctx.reply('Avval /admin orqali bo‘limni tanlang.');
    adminSelections.delete(ctx.from.id);
    try {
      await database.saveTelegramVideo(sectionVideoKey(ctx, section.id), type, fileId);
    } catch (error) {
      if (!adminSelections.has(ctx.from.id)) adminSelections.set(ctx.from.id, section);
      throw error;
    }
    return ctx.reply(section.title + '\n\n✅ Video saqlandi. Uni bo‘limning istalgan sahifasidan ochish mumkin.',
      Markup.inlineKeyboard([[button('🎬 Videoni ko‘rish', section.id + '-video')]]));
  }

  bot.on('video', (ctx) => saveSectionVideo(ctx, ctx.message.video.file_id, 'admin'));
  bot.on('document', (ctx) => {
    if (!isAdmin(ctx) || !adminSelections.has(ctx.from.id)) return;
    const { file_id, mime_type, file_name } = ctx.message.document;
    if (mime_type !== 'video/mp4' && !/\.mp4$/i.test(file_name || '')) {
      return ctx.reply('Videoni galereyadan yoki MP4 fayl sifatida yuboring.');
    }
    return saveSectionVideo(ctx, file_id, 'admin-document');
  });

  bot.action('menu', async (ctx) => {
    await ctx.answerCbQuery();
    await menu(ctx, true);
  });

  bot.action('emergency', async (ctx) => {
    await ctx.answerCbQuery();
    await edit(ctx, emergencyText, Markup.inlineKeyboard([[menuButton()]]));
  });

  function isInvalidVideoId(error) {
    return error.response?.error_code === 400 &&
      /wrong (?:remote )?file identifier|invalid file[_ ]id|file reference expired/i.test(error.response.description || '');
  }

  async function sendLessonVideo(ctx, sectionId, path, caption) {
    const assigned = await database.telegramVideo(sectionVideoKey(ctx, sectionId));
    if (assigned) {
      await ctx.answerCbQuery();
      try {
        const caption = sections.find(({ id }) => id === sectionId).title;
        if (assigned.file_version === 'admin-document') {
          return await ctx.replyWithDocument(assigned.file_id, { caption });
        }
        return await ctx.replyWithVideo(assigned.file_id, { caption, supports_streaming: true });
      } catch (error) {
        if (!isInvalidVideoId(error)) throw error;
        return ctx.reply('Video hozircha ochilmadi. Administratorga xabar bering.');
      }
    }
    if (!path) return ctx.answerCbQuery('Video hali joylanmagan.', { show_alert: true });

    const videoPath = resolve(path);
    const key = JSON.stringify([ctx.botInfo.id, videoPath]);
    const options = {
      caption,
      supports_streaming: true,
    };
    const video = await stat(videoPath).catch((error) => {
      if (error.code === 'ENOENT') return null;
      throw error;
    });
    const version = video?.isFile() && video.size > 0 ? `${video.size}:${video.mtimeMs}:${video.ctimeMs}` : null;
    const cached = await database.telegramVideo(key);
    if (!version && !cached) {
      return ctx.answerCbQuery('Video hali joylanmagan.', { show_alert: true });
    }

    await ctx.answerCbQuery();
    let invalidId;
    if (cached && (!version || cached.file_version === version)) {
      try {
        return await ctx.replyWithVideo(cached.file_id, options);
      } catch (error) {
        if (!isInvalidVideoId(error)) throw error;
        invalidId = cached.file_id;
      }
    }

    if (!version) return ctx.reply('Video hozircha mavjud emas.');

    const uploadKey = JSON.stringify([key, version]);
    const pending = videoUploads.get(uploadKey);
    if (pending) return ctx.replyWithVideo(await pending, options);

    // Recheck SQLite in case another request finished uploading after our first read.
    let uploadedHere = false;
    const upload = database.telegramVideo(key).then(async (current) => {
      if (current?.file_version === version && current.file_id !== invalidId) return current.file_id;

      const message = await ctx.replyWithVideo(Input.fromLocalFile(videoPath), options);
      uploadedHere = true;
      const fileId = message.video.file_id;
      await database.saveTelegramVideo(key, version, fileId);
      return fileId;
    });
    videoUploads.set(uploadKey, upload);
    try {
      const fileId = await upload;
      if (!uploadedHere) return await ctx.replyWithVideo(fileId, options);
    } finally {
      videoUploads.delete(uploadKey);
    }
  }

  bot.action('fire-video', (ctx) => sendLessonVideo(
    ctx,
    'fire',
    process.env.FIRE_VIDEO_PATH || './media/fire-extinguisher.mp4',
    '🧯 Kukunli o‘t o‘chirgichdan foydalanish',
  ));
  bot.action('electrical-video', (ctx) => sendLessonVideo(
    ctx,
    'electrical',
    './media/electric-shock-first-aid.mp4',
    '⚡ Tok urgan odamga yordam berish',
  ));
  bot.action('first-aid-video', (ctx) => sendLessonVideo(ctx, 'first-aid'));

  bot.action(/^page:([a-z-]+):(\d+)$/, async (ctx) => {
    const section = sections.find(({ id }) => id === ctx.match[1]);
    const index = Number(ctx.match[2]);
    const page = section?.pages[index];
    if (!page) return ctx.answerCbQuery('Sahifa topilmadi.');

    await database.saveLessonPage(ctx.from.id, section.id, index);
    await ctx.answerCbQuery();
    const lastPage = index === section.pages.length - 1;
    const navigation = [];
    if (index > 0) navigation.push(button('⬅️ Oldingi', goTo(section, index - 1)));
    if (!lastPage) navigation.push(button('Keyingi ➡️', goTo(section, index + 1)));

    const rows = [];
    const assigned = await database.telegramVideo(sectionVideoKey(ctx, section.id));
    if (assigned) {
      rows.push([button('🎬 Bo‘lim videosi', section.id + '-video')]);
    } else if (lastPage && section.id === 'fire') {
      rows.push([button('🎬 Qisqa video', 'fire-video')]);
    } else if (lastPage && section.id === 'electrical') {
      rows.push([button('🎬 Tok urgan odamga yordam', 'electrical-video')]);
    }
    if (section.id === 'fire') rows.push([button('🚨 Yong‘in raqamlari · 101 / 112', 'emergency')]);
    if (navigation.length) rows.push(navigation);
    if (lastPage) {
      rows.push([button('✅ O‘qib bo‘ldim', 'complete:' + section.id)]);
      rows.push([quizButton(section)]);
    }
    rows.push([menuButton()]);

    const heading = section.title + ' · ' + (index + 1) + '/' + section.pages.length;
    const text = [heading, page.title, ...page.body].join('\n\n');
    await edit(ctx, text, Markup.inlineKeyboard(rows));
  });

  bot.action(/^complete:([a-z-]+)$/, async (ctx) => {
    const section = sections.find(({ id }) => id === ctx.match[1]);
    if (!section) return ctx.answerCbQuery('Bo‘lim topilmadi.');

    await database.completeSection(ctx.from.id, section.id);
    await ctx.answerCbQuery('O‘qilgan bo‘lim saqlandi.');
    await menu(ctx, true);
  });

  bot.action('quizzes', async (ctx) => {
    await ctx.answerCbQuery();
    const rows = sections.map((section) => [quizButton(section, section.title)]);
    rows.push([menuButton()]);
    await edit(ctx, '📝 Bilimni tekshirish\n\nQaysi bo‘lim bo‘yicha test ishlaysiz?', Markup.inlineKeyboard(rows));
  });

  bot.action(/^quiz:([a-z-]+):(\d+):(\d+)$/, async (ctx) => {
    const [, sectionId, step, correctCount] = ctx.match;
    const section = sections.find(({ id }) => id === sectionId);
    const questions = quizzes[sectionId];
    const index = Number(step);
    const score = Number(correctCount);
    if (!section || !questions || index > questions.length || score > index) {
      return ctx.answerCbQuery('Test topilmadi.');
    }

    await ctx.answerCbQuery();
    const question = questions[index];
    if (!question) {
      const text = `${section.title}\n\nTest tugadi. ${questions.length} ta savoldan ${score} tasiga to‘g‘ri javob berdingiz.`;
      const rows = [
        [quizButton(section, '🔁 Testni qayta ishlash')],
        [button('📖 Darsni qayta o‘qish', goTo(section))],
        [menuButton()],
      ];
      return edit(ctx, text, Markup.inlineKeyboard(rows));
    }

    const heading = section.title + '\nSavol ' + (index + 1) + '/' + questions.length;
    const options = question.options.map((option, choice) => letters[choice] + '. ' + option).join('\n');
    const choices = question.options.map((_, choice) =>
      button(letters[choice], ['answer', sectionId, index, score, choice].join(':')),
    );
    await edit(ctx, [heading, question.prompt, options].join('\n\n'), Markup.inlineKeyboard([choices, [menuButton()]]));
  });

  bot.action(/^answer:([a-z-]+):(\d+):(\d+):(\d+)$/, async (ctx) => {
    const [, sectionId, step, correctCount, selected] = ctx.match;
    const index = Number(step);
    const score = Number(correctCount);
    const choice = Number(selected);
    const questions = quizzes[sectionId];
    const question = questions?.[index];
    if (!question || score > index || choice >= question.options.length) {
      return ctx.answerCbQuery('Javob topilmadi.');
    }

    await ctx.answerCbQuery();
    const correct = choice === question.correct;
    const nextScore = correct ? score + 1 : score;
    const label = index + 1 === questions.length ? '📊 Natijani ko‘rish' : 'Keyingi savol ➡️';
    const result = correct ? '✅ To‘g‘ri!' : '❌ To‘g‘ri javob ' + letters[question.correct] + '.';
    const next = button(label, ['quiz', sectionId, index + 1, nextScore].join(':'));
    await edit(ctx, [question.prompt, result, question.explanation].join('\n\n'), Markup.inlineKeyboard([[next], [menuButton()]]));
  });

  bot.on('text', (ctx) => menu(ctx));
  return bot;
}

module.exports = { createBot };
