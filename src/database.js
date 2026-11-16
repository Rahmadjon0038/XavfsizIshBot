const { mkdirSync } = require('node:fs');
const { dirname } = require('node:path');
const sqlite3 = require('sqlite3');

async function openDatabase(path) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });

  const db = await new Promise((resolve, reject) => {
    const connection = new sqlite3.Database(path, (error) => {
      if (error) reject(error);
      else resolve(connection);
    });
  });

  function run(sql, parameters = []) {
    return new Promise((resolve, reject) => {
      db.run(sql, parameters, function (error) {
        if (error) reject(error);
        else resolve(this);
      });
    });
  }

  function all(sql, parameters = []) {
    return new Promise((resolve, reject) => {
      db.all(sql, parameters, (error, rows) => {
        if (error) reject(error);
        else resolve(rows);
      });
    });
  }

  function close() {
    return new Promise((resolve, reject) => {
      db.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }

  try {
    await run('CREATE TABLE IF NOT EXISTS completed_sections (' +
      'telegram_user_id INTEGER NOT NULL, section_id TEXT NOT NULL, ' +
      'PRIMARY KEY (telegram_user_id, section_id))');
    await run('CREATE TABLE IF NOT EXISTS lesson_progress (' +
      'telegram_user_id INTEGER NOT NULL, section_id TEXT NOT NULL, page_index INTEGER NOT NULL, ' +
      'PRIMARY KEY (telegram_user_id, section_id))');
    await run('CREATE TABLE IF NOT EXISTS telegram_videos (' +
      'video_key TEXT PRIMARY KEY NOT NULL, file_version TEXT NOT NULL, file_id TEXT NOT NULL)');
    await run(`CREATE TABLE IF NOT EXISTS bot_users (
      bot_id INTEGER NOT NULL, user_id INTEGER NOT NULL, PRIMARY KEY (bot_id, user_id)
    )`);
    await run(`CREATE TABLE IF NOT EXISTS published_tests (
      id INTEGER PRIMARY KEY, bot_id INTEGER NOT NULL, title TEXT NOT NULL, questions TEXT NOT NULL
    )`);
    await run(`CREATE TABLE IF NOT EXISTS test_attempts (
      id INTEGER PRIMARY KEY, test_id INTEGER NOT NULL, user_id INTEGER NOT NULL,
      full_name TEXT NOT NULL, group_name TEXT NOT NULL, answered INTEGER NOT NULL DEFAULT 0,
      score INTEGER NOT NULL DEFAULT 0, submitted_at TEXT
    )`);
  } catch (error) {
    await close();
    throw error;
  }

  return {
    registerBotUser(botId, userId) {
      return run('INSERT OR IGNORE INTO bot_users VALUES (?, ?)', [botId, userId]);
    },
    broadcastUsers(botId) {
      return all('SELECT user_id FROM bot_users WHERE bot_id = ?', [botId]);
    },
    publishTest(botId, title, questions) {
      return run('INSERT INTO published_tests (bot_id, title, questions) VALUES (?, ?, ?)', [botId, title, JSON.stringify(questions)]);
    },
    publishedTests(botId, limit, offset) {
      return all('SELECT id, title FROM published_tests WHERE bot_id = ? ORDER BY id DESC LIMIT ? OFFSET ?', [botId, limit, offset]);
    },
    async publishedTest(botId, testId) {
      const [test] = await all('SELECT id, title, questions FROM published_tests WHERE bot_id = ? AND id = ?', [botId, testId]);
      return test && { ...test, questions: JSON.parse(test.questions) };
    },
    async startAttempt(testId, userId, name, group) {
      const result = await run('INSERT INTO test_attempts (test_id, user_id, full_name, group_name) VALUES (?, ?, ?, ?)', [testId, userId, name, group]);
      return result.lastID;
    },
    async testAttempt(botId, userId, attemptId) {
      const [attempt] = await all(`SELECT a.*, t.title, t.questions
        FROM test_attempts a JOIN published_tests t ON t.id = a.test_id
        WHERE t.bot_id = ? AND a.user_id = ? AND a.id = ?`, [botId, userId, attemptId]);
      return attempt && { ...attempt, questions: JSON.parse(attempt.questions) };
    },
    answerAttempt(attemptId, userId, position, correct) {
      return run(`UPDATE test_attempts SET answered = answered + 1, score = score + ?
        WHERE id = ? AND user_id = ? AND answered = ? AND submitted_at IS NULL`, [Number(correct), attemptId, userId, position]);
    },
    submitAttempt(attemptId, userId, total) {
      return run(`UPDATE test_attempts SET submitted_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ? AND answered = ? AND submitted_at IS NULL`, [attemptId, userId, total]);
    },
    testResults(testId, limit, offset) {
      return all(`SELECT full_name, group_name, answered, score FROM test_attempts
        WHERE test_id = ? AND submitted_at IS NOT NULL ORDER BY id DESC LIMIT ? OFFSET ?`, [testId, limit, offset]);
    },
    completeSection(userId, sectionId) {
      return run('INSERT INTO completed_sections VALUES (?, ?) ON CONFLICT DO NOTHING', [userId, sectionId]);
    },
    async completedSections(userId) {
      const rows = await all('SELECT section_id FROM completed_sections WHERE telegram_user_id = ?', [userId]);
      return new Set(rows.map((row) => row.section_id));
    },
    saveLessonPage(userId, sectionId, pageIndex) {
      return run(
        'INSERT INTO lesson_progress (telegram_user_id, section_id, page_index) VALUES (?, ?, ?) ' +
        'ON CONFLICT (telegram_user_id, section_id) DO UPDATE SET page_index = excluded.page_index',
        [userId, sectionId, pageIndex],
      );
    },
    async lessonPages(userId) {
      const rows = await all('SELECT section_id, page_index FROM lesson_progress WHERE telegram_user_id = ?', [userId]);
      return new Map(rows.map((row) => [row.section_id, row.page_index]));
    },
    async telegramVideo(key) {
      const [video] = await all('SELECT file_version, file_id FROM telegram_videos WHERE video_key = ?', [key]);
      return video;
    },
    saveTelegramVideo(key, version, fileId) {
      return run(
        'INSERT INTO telegram_videos (video_key, file_version, file_id) VALUES (?, ?, ?) ' +
        'ON CONFLICT (video_key) DO UPDATE SET file_version = excluded.file_version, file_id = excluded.file_id',
        [key, version, fileId],
      );
    },
    close,
  };
}

module.exports = { openDatabase };
