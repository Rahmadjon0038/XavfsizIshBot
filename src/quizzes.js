const quizzes = {
  fire: [
    {
      prompt: 'Yong‘in signalini eshitsangiz, qayerdan chiqasiz?',
      options: ['Lift orqali', 'Eng yaqin xavfsiz chiqish yo‘lidan', 'Faqat asosiy kirish eshigidan'],
      correct: 1,
      explanation: 'Eng yaqin xavfsiz chiqish yo‘lidan foydalaning va yig‘ilish joyiga boring. Liftga kirmang.',
    },
    {
      prompt: 'Suvli o‘t o‘chirgich qaysi holatga mos?',
      options: ['Tok ostidagi jihoz yonayotganda', 'Oshxona yog‘i yonayotganda', 'Qog‘oz yoki yog‘och yonayotganda'],
      correct: 2,
      explanation: 'Suvli o‘t o‘chirgich qog‘oz va yog‘och kabi qattiq materiallarga mos. Tok ostidagi jihozga va yonayotgan yog‘ga suv ishlatmang.',
    },
    {
      prompt: 'Yong‘in kichik, lekin xavfsiz chiqish yo‘lingiz yopilib qolishi mumkin. Nima qilasiz?',
      options: ['Darhol xavfsiz joyga chiqaman', 'O‘t o‘chirgich bilan qolaman', 'Tutun ko‘payguncha kutaman'],
      correct: 0,
      explanation: 'Chiqish yo‘li ochiq va xavfsiz bo‘lishi kerak. Xavfsiz chiqish yo‘li xavf ostida bo‘lsa, darhol evakuatsiya qiling.',
    },
    {
      prompt: 'Xavfsiz joyga chiqqach, yong‘in haqida qaysi raqamlardan biriga xabar berasiz?',
      options: ['Faqat 103', '101 yoki 112', 'Faqat 102'],
      correct: 1,
      explanation: '101 — yong‘in-qutqaruv xizmati. 112 — yagona shoshilinch xizmat. Dispetcherga aniq manzil va nima bo‘lganini ayting.',
    },
  ],
  electrical: [
    {
      prompt: 'Jihoz kabelida ochiq simni ko‘rsangiz, nima qilasiz?',
      options: ['Jihozni ishlatmayman va mas’ul xodimga aytaman', 'Jihozni qisqa muddatga yoqaman', 'Simni o‘zim ta’mirlayman'],
      correct: 0,
      explanation: 'Shikastlangan jihozni ishlatmang. Elektr ta’mirini vakolatli, malakali xodim bajaradi.',
    },
    {
      prompt: 'Vilkani rozetkadan qanday chiqarasiz?',
      options: ['Kabeldan tortib', 'Quruq qo‘l bilan vilkaning o‘zidan ushlab', 'Nam qo‘l bilan vilkaning o‘zidan ushlab'],
      correct: 1,
      explanation: 'Vilkani quruq qo‘l bilan o‘zidan ushlab chiqaring. Kabeldan tortish uni shikastlashi mumkin.',
    },
    {
      prompt: 'Tok urgan odamga qachon tegish mumkin?',
      options: ['Yordam so‘ragan zahoti', 'Qo‘lqop kiygan zahoti', 'Elektr manbai xavfsiz uzilgandan keyin'],
      correct: 2,
      explanation: 'Elektr manbai xavfsiz uzilmaguncha jabrlanuvchiga tegmang. Tokni xavfsiz uzib bo‘lmasa, uzoqlashing va 112 ga qo‘ng‘iroq qiling.',
    },
  ],
  'first-aid': [
    {
      prompt: 'Joy xavfsiz, katta yoshli odam hushsiz va normal nafas olmayapti. Yordam chaqirildi. Keyingi qadam nima?',
      options: ['Suv ichirish', 'Tez yordam kelguncha kutish', 'Yurak-o‘pka reanimatsiyasini darhol boshlash'],
      correct: 2,
      explanation: 'Darhol yurak-o‘pka reanimatsiyasini boshlang. AED mavjud bo‘lsa, uni olib kelishni so‘rang va qurilma ko‘rsatmalariga amal qiling.',
    },
    {
      prompt: 'Yaraga buyum sanchilmagan. Kuchli qon ketayotganda qon ketishini qanday kamaytirasiz?',
      options: ['Yaraga toza doka yoki mato bilan bevosita bosim beraman', 'Yarani suv bilan yuvaman', 'Faqat ustini yengil yopaman'],
      correct: 0,
      explanation: 'Yara ustiga toza doka yoki mato bilan uzluksiz bosim bering va shoshilinch yordam chaqiring.',
    },
    {
      prompt: 'Termik kuygan joyni qanday sovitasiz?',
      options: ['Muz qo‘yib', 'Salqin oqar suvda taxminan 20 daqiqa sovitib', 'Yog‘ surtib'],
      correct: 1,
      explanation: 'Kuygan joyni salqin oqar suvda taxminan 20 daqiqa soviting. Muz, yog‘ yoki krem surtmang.',
    },
  ],
};

module.exports = { quizzes };
