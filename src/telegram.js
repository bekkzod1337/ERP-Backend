import { Markup, Telegraf } from "telegraf";
import sharp from "sharp";
import { pool } from "./db.js";
import { config } from "./config.js";

const escapeXml = value => String(value).replace(/[<>&'"]/g, character => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", "\"": "&quot;" }[character]));
const regions = ["Samarqand", "Andijon", "Namangan", "Farg'ona", "Qashqadaryo", "Surxondaryo", "Xorazm", "Jizzax"];
const russianRegions = { Samarqand: "Самаркандская обл.", Andijon: "Андижанская обл.", Namangan: "Наманганская обл.", "Farg'ona": "Ферганская обл.", Qashqadaryo: "Кашкадарьинская обл.", Surxondaryo: "Сурхандарьинская обл.", Xorazm: "Хорезмская обл.", Jizzax: "Джизакская обл." };

function reportSvg(rows, date, hour) {
  const width = 1500;
  const rowHeight = 52;
  const headerHeight = 165;
  const height = headerHeight + (rows.length + 1) * rowHeight + 12;
  const columns = [0, 420, 570, 720, 870, 1020, 1170, 1320, 1500];
  const headerLines = [
    `<text x="${width / 2}" y="32" class="date">${escapeXml(date)}</text>`,
    `<text x="495" y="78" class="group">дневной план</text><text x="1200" y="78" class="group">до ${escapeXml(hour + 1)}</text>`,
    `<text x="210" y="126" class="head">Регион</text><text x="495" y="126" class="head">ПЛАН</text><text x="645" y="126" class="head">ФАКТ</text><text x="795" y="105" class="head">Разница</text><text x="795" y="123" class="small-head">факта от плана</text><text x="795" y="140" class="small-head">кол-ва</text><text x="945" y="126" class="head">ПЛАН</text><text x="1095" y="126" class="head">ФАКТ</text><text x="1245" y="105" class="head">Разница</text><text x="1245" y="123" class="small-head">факта от плана</text><text x="1245" y="140" class="small-head">кол-ва</text><text x="1410" y="105" class="head">Разница</text><text x="1410" y="123" class="small-head">факта от плана %</text>`,
  ].join("");
  const lines = [40, 84, headerHeight, ...Array.from({ length: rows.length + 2 }, (_, index) => headerHeight + index * rowHeight)].map(y => `<line x1="0" y1="${y}" x2="${width}" y2="${y}" class="line"/>`).join("");
  const verticals = columns.map(x => `<line x1="${x}" y1="${x === 0 || x === width ? 0 : 84}" x2="${x}" y2="${height}" class="line"/>`).join("");
  const body = rows.map((row, index) => {
    const y = headerHeight + index * rowHeight + 29;
    const belowHour = Number(row.fact) < Number(row.hourPlan);
    const values = [russianRegions[row.region] || row.region, row.plan, row.fact, row.dayDiff, row.hourPlan, row.fact, row.hourDiff, `${row.hourPercent}%`];
    return values.map((value, valueIndex) => `<text x="${columns[valueIndex] + (valueIndex === 0 ? 210 : 75)}" y="${y}" class="${valueIndex === 0 ? "region" : `number ${valueIndex > 4 && belowHour ? "bad" : ""}`}">${escapeXml(Number.isFinite(Number(value)) ? Number(value).toLocaleString("uz-UZ") : value)}</text>`).join("");
  }).join("");
  const total = rows.reduce((sum, row) => ({ plan: sum.plan + Number(row.plan), fact: sum.fact + Number(row.fact), dayDiff: sum.dayDiff + Number(row.dayDiff), hourPlan: sum.hourPlan + Number(row.hourPlan), hourDiff: sum.hourDiff + Number(row.hourDiff) }), { plan: 0, fact: 0, dayDiff: 0, hourPlan: 0, hourDiff: 0 });
  const totalY = headerHeight + rows.length * rowHeight + 29;
  const totalPercent = total.hourPlan ? (total.fact * 100 / total.hourPlan - 100).toFixed(2) : "0.00";
  const totalCells = ["итог", total.plan, total.fact, total.dayDiff, total.hourPlan, total.fact, total.hourDiff, `${totalPercent}%`].map((value, index) => `<text x="${columns[index] + (index === 0 ? 210 : 75)}" y="${totalY}" class="${index === 0 ? "total region" : `total number ${index >= 5 && total.hourDiff < 0 ? "bad" : ""}`}">${escapeXml(Number.isFinite(Number(value)) ? Number(value).toLocaleString("uz-UZ") : value)}</text>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#fff"/><rect x="0" y="84" width="${width}" height="${headerHeight - 84}" fill="#f1f5f9"/><style>.date{font:700 28px Arial;text-anchor:middle;fill:#0f172a}.group,.head{font:700 18px Arial;text-anchor:middle;fill:#0f172a}.small-head{font:700 15px Arial;text-anchor:middle;fill:#334155}.region,.number{font:600 18px Arial;text-anchor:middle;fill:#111827}.total{font-weight:700}.bad{fill:#dc2626}.line{stroke:#475569;stroke-width:1.5}</style>${headerLines}${lines}${verticals}${body}${totalCells}</svg>`;
}

const localDate = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tashkent" }).format(new Date());
const tashkentHour = () => Number(new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Tashkent",
  hour: "2-digit",
  hourCycle: "h23",
  hour12: false,
}).formatToParts(new Date()).find(part => part.type === "hour")?.value || 0);
const normalizeReportHour = reportHour => {
  const hour = reportHour === undefined || reportHour === null || reportHour === "" ? tashkentHour() : Number(reportHour);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    throw new RangeError(`Hisobot soati 00-23 oralig'ida bo'lishi kerak: ${reportHour}`);
  }
  return hour;
};
const reportDate = date => {
  const [year, month, day] = date.split("-");
  return `${Number(month)}/${Number(day)}/${year}`;
};
function completedPlanShare(hour) {
  const hourlyShares = { 9: 0.10, 10: 0.10, 11: 0.05, 12: 0.1167, 13: 0.1167, 14: 0.1167, 15: 0.1167, 16: 0.1167, 17: 0.05, 18: 0.0333, 19: 0.0333, 20: 0.0332 };
  if (hour < 9) return 0;
  if (hour >= 20) return 1;
  return Object.entries(hourlyShares).reduce((total, [shareHour, share]) => Number(shareHour) <= hour ? total + share : total, 0);
}

async function buildReport(reportHour) {
  const date = localDate();
  const { rows } = await pool.query(`SELECT r.region,
    COALESCE(dp.plan, ROUND(COALESCE(p.plan,0)::numeric / EXTRACT(DAY FROM (date_trunc('month',$2::date) + interval '1 month - 1 day')))::int)::int plan,
    COUNT(s.id)::int fact
    FROM unnest($1::text[]) r(region)
    LEFT JOIN sales s ON s.region=r.region AND s.sale_date=$2::date
    LEFT JOIN sales_plans p ON p.scope_type='region' AND p.scope_key=r.region AND p.period_start=date_trunc('month',$2::date)::date
    LEFT JOIN telegram_daily_plans dp ON dp.region=r.region AND dp.plan_date=$2::date
    GROUP BY r.region,dp.plan,p.plan ORDER BY r.region`, [regions, date]);
  const hour = normalizeReportHour(reportHour);
  const planShare = completedPlanShare(Number(hour) + 1);
  const enriched = rows.map(row => {
    const hourPlan = Math.round(Number(row.plan) * planShare);
    return { ...row, dayDiff: Number(row.fact) - Number(row.plan), hourPlan, hourDiff: Number(row.fact) - hourPlan, hourPercent: hourPlan ? (Number(row.fact) * 100 / hourPlan - 100).toFixed(2) : "0.00" };
  });
  return { image: await sharp(Buffer.from(reportSvg(enriched, reportDate(date), hour))).png().toBuffer(), date };
}

export async function sendReport(chatIds = config.telegramChatIds, reportHour) {
  const recipients = Array.isArray(chatIds) ? chatIds : String(chatIds || "").split(/[,\s]+/);
  const uniqueRecipients = [...new Set(recipients.map(value => String(value).trim()).filter(Boolean))];
  if (!config.telegramBotId || !uniqueRecipients.length) return false;
  const { image, date } = await buildReport(reportHour);
  const bot = new Telegraf(config.telegramBotId);
  for (const chatId of uniqueRecipients) await bot.telegram.sendPhoto(chatId, { source: image });
  return true;
}

export async function sendSimVerificationCode(chatId, code, dealerName, count) {
  if (!config.telegramBotId || !chatId) return false;
  const bot = new Telegraf(config.telegramBotId);
  await bot.telegram.sendMessage(chatId, `SIM-karta tasdiqlash kodi: ${code}\nDiler: ${dealerName}\nMiqdor: ${count} ta\nKod 5 daqiqa amal qiladi.`);
  return true;
}

export async function getReportImage() {
  return (await buildReport()).image;
}

export const sendHourlyReport = async () => {
  const { rows } = await pool.query("SELECT chat_id FROM telegram_recipients ORDER BY id");
  return sendReport(rows.map(row => row.chat_id), tashkentHour());
};

export function startTelegramBot() {
  if (!config.telegramBotId) return null;
  const bot = new Telegraf(config.telegramBotId);
  const sendManualReport = async context => {
    try {
      const sent = await sendReport(context.chat.id);
      if (sent) await context.reply("Hisobot yuborildi.");
      else await context.reply("Telegram sozlamalari to'liq emas.");
    } catch (error) {
      console.error("Telegram hisobot xatosi:", error);
      await context.reply("Hisobot yuborilmadi.");
    }
  };
  bot.start(context => context.reply("Hisobotni istalgan vaqtda yuborish uchun tugmani bosing.", Markup.keyboard([["Hisobot yuborish"]]).resize()));
  bot.command("report", async context => {
    await sendManualReport(context);
  });
  bot.hears("Hisobot yuborish", sendManualReport);
  bot.telegram.setMyCommands([{ command: "report", description: "Hisobotni hozir yuborish" }]).catch(error => console.error("Telegram menyusi sozlanmadi:", error));
  bot.launch({ dropPendingUpdates: true }).catch(error => console.error("Telegram bot ishga tushmadi:", error));
  return bot;
}
