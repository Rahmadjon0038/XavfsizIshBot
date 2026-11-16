# XavfsizIshBot

Ish joyidagi kirish yo‘riqnomasi uchun o‘zbek tilidagi Telegram bot. Bot Node.js, Express, Telegraf va SQLite3 asosida ishlaydi.

## VPS’da Docker bilan ishga tushirish

Repozitoriy papkasidagi `.env` fayliga bot tokeni va Telegram admin ID raqamingizni kiriting. Namuna `.env.example` faylida.

```sh
./deploy.sh
```

Skript Ubuntu va Debian serverlarida kerak bo‘lsa Docker va Compose plaginini o‘rnatadi. So‘ng bot obrazini yig‘adi, konteynerni fon rejimida ishga tushiradi va botning holatini tekshiradi. Paket o‘rnatish yoki Docker xizmatini boshqarish uchun root yoki sudo huquqi kerak.

SQLite bazasi Docker’ning `bot-data` jildida saqlanadi. Yangilashda repozitoriydagi yangi kodni olib, `./deploy.sh` ni yana bajaring. Bir token bilan botning egizak nusxalarini ishga tushirmang. Serverda holatni `docker compose ps`, loglarni `docker compose logs -f bot` orqali ko‘ring.

Videolarni VPS’dagi botning Telegram admin panelidan bo‘limlarga biriktiring.

## Ishga tushirish

Node.js 22 yoki yangiroq versiya kerak.

```sh
npm ci
cp -n .env.example .env
```

Telegramdagi [@BotFather](https://t.me/BotFather) orqali olingan tokenni `.env` faylidagi `BOT_TOKEN` qatoriga yozing. `.env` faylini ulashmang.

```sh
npm start
```

Telegramda botni ochib, `/start` yuboring. Botning maqsadi haqida qisqa tanishtiruv chiqadi. Darslar menyusini ochish uchun **Boshlash** tugmasini bosing. `/menu` menyuni to‘g‘ridan to‘g‘ri ochadi, `/emergency` esa O‘zbekistondagi shoshilinch raqamlarni chiqaradi.

Bot long polling orqali ishlaydi. Express holat manzili — `http://localhost:3000/health`. Portni `PORT` orqali sozlash mumkin.

Tugallanmagan bo‘limni qayta ochsangiz, bot oxirgi ochilgan sahifani ko‘rsatadi. Bo‘lim oxiridagi **O‘qib bo‘ldim** tugmasi tugallangan bo‘limni ✅ bilan belgilaydi. Bot bu ma’lumotlarni SQLite’da saqlaydi. Baza fayli ilk ishga tushirishda `data/safety.sqlite3` manzilida yaratiladi. Boshqa manzil uchun `DATABASE_PATH` qiymatini o‘zgartiring.

Har bir bo‘lim oxirida yoki asosiy menyudagi **Bilimni tekshirish** orqali testni ochish mumkin. Bot har bir javobni izohlaydi va test oxirida to‘g‘ri javoblar sonini ko‘rsatadi.

## Telegram orqali dars videosini joylash

1. Botning shaxsiy chatiga `/id` yuborib, Telegram ID raqamingizni oling.
2. VPS’dagi `.env` fayliga `ADMIN_TELEGRAM_IDS=123456789` yozing va botni qayta ishga tushiring. Bir nechta admin ID raqamini vergul bilan ajratib kiriting.
3. Telegramda `/admin` yuboring, bo‘limni tanlang va videoni galereyadan video sifatida jo‘nating. Videoni almashtirish uchun shu amallarni takrorlang.

Bot video identifikatorini (`file_id`) SQLite bazasiga saqlaydi. Foydalanuvchilar darsning oxirgi sahifasidagi tugma orqali videoni Telegram’dan oladi. VPS’da MP4 fayllari kerak bo‘lmaydi. VPS’ni almashtirsangiz, shu bot tokeni bilan birga `DATABASE_PATH` ko‘rsatgan baza faylini saqlang. Boshqa botga o‘tsangiz, videolarni o‘sha botga Telegram orqali qayta yuboring.

Admin orqali video joylanishidan avval yong‘in va elektr bo‘limlari uchun mavjud mahalliy MP4 fayllari ham ishlaydi. Yong‘in videosining mahalliy yo‘lini `FIRE_VIDEO_PATH` orqali o‘zgartirish mumkin.

## Testlar va xabar yuborish

`/admin` → **Test yaratish** orqali mavzu nomini kiriting. Har savolni olti qatorda yuboring. Birinchi qatorda savol matnini, undan keyin to‘rtta variantni, oxirgi qatorda to‘g‘ri variant harfini (A, B, C yoki D) yozing. Savollar tayyor bo‘lgach, **Testni e’lon qilish** tugmasini bosing.

O‘quvchi asosiy menyudan **Testlar** → mavzuni tanlaydi. Ism-familiyasi va guruhini yozadi, barcha savollarga javob beradi va **Testni topshirish** tugmasini bosadi. Natija o‘quvchiga ko‘rinadi. Admin **Natijalar** bo‘limida mavzuni tanlab, ism-familiya, guruh va ballar ro‘yxatini ochadi.

**Xabar yuborish** orqali matn yozing va yuborishdan oldin ko‘rib chiqing. **Hammaga yuborish** tugmasi xabarni yangilanishdan keyin bot bilan shaxsiy chatda ishlashni boshlagan foydalanuvchilarga yuboradi. Testlar, topshirilgan natijalar va foydalanuvchilar ro‘yxati SQLite’da saqlanadi.

## Yo‘riqnoma manbalari

- Favqulodda raqamlar va evakuatsiya. [FVV](https://gov.uz/oz/fvv-toshkentvil/news/view/217000), [Adliya vazirligi](https://advice.adliya.uz/oz/document/3256), [Tez tibbiy yordam](https://advice.adliya.uz/oz/document/1090)
- O‘t o‘chirgichni tanlash va ishlatish. [U.S. Fire Administration](https://www.usfa.fema.gov/prevention/home-fires/prepare-for-fire/fire-extinguishers/index.html), [Avon Fire and Rescue Service](https://www.avonfire.gov.uk/safety/businesses/fire-safety-guidance/fire-extinguishers/)
- Elektr xavfsizligi va tok urishida yordam. [CCOHS](https://www.ccohs.ca/oshanswers/safety_haz/electrical.html), [NHS inform](https://www.nhsinform.scot/tests-and-treatments/first-aid/electric-shock-first-aid/)
- Birinchi yordam va reanimatsiya. [American Red Cross](https://www.redcross.org/take-a-class/first-aid/performing-first-aid/first-aid-steps), [YOR](https://www.redcross.org/take-a-class/cpr/performing-cpr/cpr-steps), [Qon ketishi](https://www.redcross.org/take-a-class/resources/learn-first-aid/bleeding-life-threatening-external), [Kuyish](https://www.nhs.uk/conditions/Burns-and-scalds/), [Zaharlanish](https://www.nhs.uk/conditions/Poisoning/)
