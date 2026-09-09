import express from "express";
import cors from "cors";
import multer from "multer";
import cron from "node-cron";
import { pool, migrate } from "./db.js";
import { config } from "./config.js";
import { EventEmitter } from "node:events";
import { getReportImage, sendHourlyReport, sendReport, startTelegramBot } from "./telegram.js";
import { createHealthRouter } from "./routes/health.js";
import { createTelegramRouter } from "./routes/telegram.js";
import { createSimcardsRouter } from "./routes/simcards.js";
import { createAnalyticsAdminRouter } from "./routes/analytics-admin.js";
import { asDate, currentMonthRange, dateRange, iccRange, localToday, normalizeRegion, regions, tokenRegions, validIcc } from "./utils/http.js";
import { audit } from "./utils/audit.js";
import { eachDay, isXlsxBuffer, msmsResponseError, saveWorkbook } from "./services/import.js";

const app = express();
const updates = new EventEmitter();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
app.use(cors({ origin: config.frontendUrl }));
app.use(express.json());

app.use(createHealthRouter({ pool }));
app.use(createTelegramRouter({ config, getReportImage, sendReport }));
app.use(createSimcardsRouter({ pool, upload, audit, iccRange, validIcc }));
app.use(createAnalyticsAdminRouter({ pool, audit, asDate, dateRange, normalizeRegion, regions, tokenRegions }));

app.get("/api/events", (req, res) => {
  res.set({ "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
  res.flushHeaders();
  res.write(`event: ready\ndata: ${JSON.stringify({ connectedAt: new Date().toISOString() })}\n\n`);
  const sendUpdate = payload => res.write(`event: sales-updated\ndata: ${JSON.stringify(payload)}\n\n`);
  const heartbeat = setInterval(() => res.write(": heartbeat\n\n"), 25000);
  updates.on("sales-updated", sendUpdate);
  req.on("close", () => { clearInterval(heartbeat); updates.off("sales-updated", sendUpdate); });
});

app.post("/api/import", upload.array("files", 20), async (req, res, next) => {
  const client = await pool.connect();
  try {
    if (!req.files?.length) return res.status(400).json({ error: "Kamida bitta Excel fayl yuboring" });
    await client.query("BEGIN");
    const results = [];
    for (const file of req.files) results.push(await saveWorkbook(client, file.buffer, file.originalname));
    await client.query("COMMIT");
    res.status(201).json({ imported: results });
  } catch (error) { await client.query("ROLLBACK"); next(error); } finally { client.release(); }
});

app.post("/api/simcards/import", upload.single("file"), async (req, res, next) => {
  if (!req.file) return res.status(400).json({ error: "Excel fayl yuboring" });
  const client = await pool.connect();
  try {
    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const sheet = workbook.worksheets[0];
    if (!sheet) return res.status(400).json({ error: "Excel varaq topilmadi" });
    const header = sheet.getRow(1).values.map(value => String(value || "").toLowerCase().trim());
    const iccIndex = Math.max(1, header.findIndex(value => value === "icc" || value.includes("icc")) + 1);
    const regionIndex = header.findIndex(value => value.includes("viloyat") || value === "region") + 1;
    const statusIndex = header.findIndex(value => value.includes("status")) + 1;
    await client.query("BEGIN");
    let total = 0;
    let inserted = 0;
    for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
      const row = sheet.getRow(rowNumber);
      const icc = String(row.getCell(iccIndex).value ?? "").replace(/\.0$/, "").trim();
      if (!icc) continue;
      total += 1;
      if (!validIcc(icc)) continue;
      const result = await client.query("INSERT INTO simcards(icc,region,status,operator_name) VALUES($1,$2,CASE WHEN $3 IN ('sold','sotilgan') THEN 'sold' WHEN $3 IN ('dealer','dilerda') THEN 'dealer' ELSE 'franchise' END,$4) ON CONFLICT(icc) DO NOTHING", [icc, regionIndex ? row.getCell(regionIndex).text : req.body.region || null, statusIndex ? row.getCell(statusIndex).text.toLowerCase() : "", req.body.operatorName || req.body.operator]);
      inserted += result.rowCount;
    }
    await audit(client, "sim_import", "simcard", null, req, { total, inserted, duplicates: total - inserted });
    await client.query("COMMIT");
    res.status(201).json({ total, inserted, duplicates: total - inserted });
  } catch (error) { await client.query("ROLLBACK"); next(error); } finally { client.release(); }
});

async function syncRegionDay(region, token, day) {
  const url = new URL(config.msmsBaseUrl);
  url.search = new URLSearchParams({ DateStart: day, DateEnd: day, FilterText: "", OrderTypeAlias: "ServiceOrder.OrderType.AddMobileService", OrderOwnerFilter: region === "Samarqand" ? "User.Permissions.salesPoint" : "User.Permissions.dealer", CheckIdentityMethodId: "" }).toString();
  const rawToken = token.trim().replace(/^["']|["']$/g, "").replace(/^Bearer\s+/i, "");
  const headers = { Accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel", [config.msmsTokenHeader]: token.startsWith("Bearer ") ? token : `Bearer ${token}` };
  let response = await fetch(url, { headers: { ...headers, Authorization: `Bearer ${rawToken}`, "X-Access-Token": rawToken } });
  if (response.status === 401 || response.status === 403) response = await fetch(url, { headers: { ...headers, Authorization: rawToken, "X-Access-Token": rawToken, [config.msmsTokenHeader]: rawToken } });
  if (!response.ok) {
    const details = (await response.text()).replace(/\s+/g, " ").slice(0, 300);
    throw new Error(`${region}: MSMS ${response.status} ${response.statusText}${details ? ` — ${details}` : ""}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!isXlsxBuffer(buffer)) throw msmsResponseError(response, buffer);
  const client = await pool.connect();
  try { await client.query("BEGIN"); const result = await saveWorkbook(client, buffer, `msms-${region}-${day}.xlsx`, "msms-api", region); await client.query("COMMIT"); return result; } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}

async function syncRegion(region, token, start, end) {
  const results = [];
  for (const day of eachDay(start, end)) results.push(await syncRegionDay(region, token, day));
  const summary = results.reduce((total, result) => ({ file: `${region}-${end}`, rows: total.rows + result.rows }), { file: `${region}-${end}`, rows: 0 });
  updates.emit("sales-updated", { region, end, rows: summary.rows, at: new Date().toISOString() });
  return summary;
}

let syncInProgress = false;
app.post("/api/sync", async (req, res, next) => {
  try {
    if (syncInProgress) return res.status(409).json({ error: "Boshqa sync jarayoni davom etmoqda, biroz kuting." });
    syncInProgress = true;
    const [monthStart, today] = currentMonthRange();
    const end = req.body.end || today;
    const start = req.body.start || monthStart;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || start > end) return res.status(400).json({ error: "Hisobot sanasi noto'g'ri" });
    const values = [];
    let query = "SELECT region, token FROM api_tokens WHERE expires_at IS NULL OR expires_at > NOW()";
    if (req.body.region) { values.push(req.body.region); query += " AND region = $1"; }
    const { rows } = await pool.query(query, values);
    const results = [];
    for (const row of rows) results.push(await syncRegion(row.region, row.token, start, end));
    res.json({ synced: results, count: results.length });
  } catch (error) { next(error); } finally { syncInProgress = false; }
});

app.get("/api/export", async (req, res, next) => { try { const [start, end] = dateRange(req); const { rows } = await pool.query("SELECT region,dealer_name,login,phone,tariff_name,connected_at,COUNT(*)::int fact FROM sales WHERE sale_date BETWEEN $1 AND $2 GROUP BY region,dealer_name,login,phone,tariff_name,connected_at ORDER BY region,dealer_name", [start,end]); const ExcelJS = (await import("exceljs")).default; const workbook = new ExcelJS.Workbook(); const sheet = workbook.addWorksheet("Hisobot"); sheet.addRow(["Viloyat","Diler","Login","Ulangan raqam","Tarif","Ulangan sana","Fakt"]); rows.forEach(row => sheet.addRow(Object.values(row))); res.setHeader("Content-Type","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"); res.setHeader("Content-Disposition", `attachment; filename=hisobot-${end}.xlsx`); await workbook.xlsx.write(res); res.end(); } catch (error) { next(error); } });
app.use((error, _req, res, _next) => { console.error(error); res.status(error.status || 500).json({ error: error.message || "Server xatosi" }); });

async function refreshFromMsms() {
  if (syncInProgress) { console.warn("Soatlik sync hali tugamagan, yangi sync o'tkazib yuborildi."); return; }
  syncInProgress = true;
  const [monthStart, today] = currentMonthRange();
  try {
    const { rows } = await pool.query("SELECT region, token FROM api_tokens WHERE expires_at IS NULL OR expires_at > NOW()");
    for (const row of rows) { try { await syncRegion(row.region, row.token, monthStart, today); } catch (error) { console.error(`MSMS ${row.region} yangilanmadi:`, error.message); } }
  } finally { syncInProgress = false; }
}

cron.schedule("0 * * * *", async () => {
  try { await refreshFromMsms(); await sendHourlyReport(); } catch (error) { console.error("Soatlik sync yoki Telegram hisobot xatosi:", error.message); }
}, { timezone: "Asia/Tashkent" });

migrate().then(() => { startTelegramBot(); app.listen(config.port, () => console.log(`Telecom backend ${config.port}-portda ishladi`)); }).catch(error => { console.error("Backend ishga tushmadi", error); process.exitCode = 1; });
