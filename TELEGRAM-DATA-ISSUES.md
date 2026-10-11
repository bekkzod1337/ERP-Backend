# Telegram orqali yuboriladigan ma'lumotlar muammolari

Ushbu hujjat Telegram bot orqali yuboriladigan kunlik hisobot rasmi va SIM-karta tasdiqlash xabarlariga tegishli muammolarni qayd etadi.

## Ma'lumot qanday yuboriladi

1. `buildReport()` Tashkent vaqti bo'yicha joriy sanani oladi.
2. PostgreSQL bazasidan har bir hudud uchun kunlik `plan` va `fact` qiymatlari olinadi.
3. Joriy yoki berilgan soat asosida `hourPlan`, `hourDiff` va `hourPercent` hisoblanadi.
4. Hisobot SVG ko'rinishida yaratiladi va `sharp` orqali PNG ga aylantiriladi.
5. `sendReport()` PNG faylni Telegram chatiga yuboradi.
6. `/api/telegram/preview` shu PNG faylni ko'rish uchun qaytaradi.
7. Telegram qabul qiluvchilari `telegram_recipients` jadvalida saqlanadi. Admin panel orqali yangi ID qo'shish, mavjud ID ni tahrirlash yoki o'chirish mumkin.

Asosiy kod: [`src/telegram.js`](./src/telegram.js) va [`src/routes/telegram.js`](./src/routes/telegram.js).

## Aniqlangan muammolar

### 1. Vaqt zonasi sabab sana noto'g'ri chiqishi

- **Belgi:** Telegram rasmining sanasi yoki Excel importidagi sana UTC bo'yicha bir kun oldin/keyin ko'rinishi mumkin edi.
- **Sabab:** `Date.toISOString().slice(0, 10)` UTC sanasini qaytaradi. Bu Toshkent vaqti bilan bir xil bo'lmasligi mumkin.
- **Joriy holat:** Hisobot sanasi `Asia/Tashkent` vaqt zonasi orqali olinadi. Excel importida ham Tashkent vaqt zonasi hisobga olingan.
- **Nazorat:** Hisobot va import uchun barcha sana hisoblari bitta vaqt zonasi siyosatidan foydalanishi kerak.

### 2. Rasm matnlarining chayqalib yoki xira ko'rinishi

- **Belgi:** Sarlavha yoki raqamlar ustma-ust tushib, ayrim yozuvlar chayqalib ko'ringan.
- **Sabab:** SVG ichida header yozuvlari ikki marta chizilgan. Bir xil matnlar turli koordinatalarda qayta qo'shilgan.
- **Joriy holat:** Takroriy header blok olib tashlangan; har bir sarlavha bir marta chiziladi.
- **Qo'shimcha qoida:** SVG o'lchami (`width`, `height`), ustun koordinatalari va matn markazlari bir xil gridga mos bo'lishi kerak.

### 3. Backend ishga tushmasligiga olib kelgan takroriy e'lonlar

- **Belgi:** Backend yuklanishidan oldin `SyntaxError: Identifier ... has already been declared` xatosi chiqadi.
- **Sabab:** Hisobot rasmi bilan bog'liq o'zgarishlarda `width`, `height`, `hour`, `buildReport`, `sendReport` yoki `sendHourlyReport` bir necha marta e'lon qilingan.
- **Joriy holat:** Dublikat e'lonlar olib tashlangan.
- **Oldini olish:** `node --check src/telegram.js` va `node --check src/server.js` tekshiruvlarini ishga tushirish.

### 4. Telegram hisoboti uchun soat qiymati

- **Belgi:** Rasmda `до HH` sarlavhasi hisobot yuborilgan vaqtga mos kelmasligi mumkin.
- **Sabab:** Avtomatik hisobot avval keyingi soat (`nextHour`) bilan yuborilgan. Natijada rasm sarlavhasidagi vaqt real yuborilgan vaqtdan bir soat oldinda ko'ringan.
- **Joriy holat:** Qo'lda va avtomatik yuborishda yagona `Asia/Tashkent` soati ishlatiladi. Avtomatik hisobot ham real joriy soatni ko'rsatadi.
- **Validatsiya:** `reportHour` endi `00`-`23` oralig'idagi butun son bo'lishi shart. Noto'g'ri qiymat yuborilsa, `RangeError` chiqariladi va noto'g'ri hisobot yuborilmaydi.

### 5. Rasm va ma'lumotni tekshirish imkoniyati

- **Preview:** `GET /api/telegram/preview` — Telegramga yuboriladigan PNG ni oldindan ko'rish.
- **Yuborish:** `POST /api/telegram/report` — sozlangan Telegram chatiga hisobot yuborish.
- **Muhim:** Preview muvaffaqiyatli chiqishi Telegramga yuborish ham doim muvaffaqiyatli bo'ladi degani emas. Bot tokeni, chat ID va Telegram tarmoq ulanishi alohida tekshiriladi.

## Hisobot ma'lumotlari bo'yicha tekshiruv ro'yxati

- Sana `Asia/Tashkent` bo'yicha to'g'ri ekanini tekshirish.
- Rasm sarlavhalari va qiymatlar ustma-ust tushmaganini tekshirish.
- `plan`, `fact`, `hourPlan` va `hourDiff` qiymatlarini bazadagi ma'lumot bilan solishtirish.
- Hudud nomi ro'yxatdagi nom bilan bir xil ekanini tekshirish.
- `hourPercent` uchun `hourPlan = 0` holatida nolga bo'lish sodir bo'lmasligini tekshirish.
- Preview endpointidan olingan PNG ni Telegramga yuboriladigan rasm bilan solishtirish.
- Telegram bot tokeni va chat ID mavjudligini tekshirish.
- Backend logida `Telegram hisobot xatosi` yoki `Telegram bot ishga tushmadi` xabarlari bor-yo'qligini tekshirish.

## Tavsiya etiladigan keyingi yaxshilanishlar

1. Hisobotga caption qo'shib, sana va hisobot soatini matn ko'rinishida ham yuborish.
2. `reportHour` uchun qat'iy validatsiya qo'shish.
3. Hisobot yuborilganda ishlatilgan sana, soat, hududlar soni va asosiy jami qiymatlarni logga yozish.
4. SVG generatsiyasi uchun kamida bitta avtomatik preview/snapshot testi qo'shish.
5. Telegramga yuborish xatosini bot konfiguratsiyasi, tarmoq xatosi va rasm generatsiyasi xatosi bo'yicha alohida ko'rsatish.

## Telegram qabul qiluvchilarini boshqarish

- `GET /api/telegram/recipients` — saqlangan ID lar ro'yxati.
- `POST /api/telegram/recipients` — yangi ID saqlash (`{ "chatId": "..." }`).
- `PATCH /api/telegram/recipients/:id` — ID ni tahrirlash.
- `DELETE /api/telegram/recipients/:id` — ID ni o'chirish.
- `POST /api/telegram/report` — ID ko'rsatilmasa, bazada saqlangan barcha qabul qiluvchilarga yuboradi.

`TELEGRAM_CHAT_ID` `.env` dagi avvalgi ID lar migration vaqtida bazaga bir marta import qilinadi.
