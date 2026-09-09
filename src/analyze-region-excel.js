import "dotenv/config";
import fs from "node:fs/promises";
import ExcelJS from "exceljs";
import { parseWorkbook } from "./excel.js";
import { config } from "./config.js";
import path from "node:path";
import { pool } from "./db.js";

const ignoredStatuses = new Set(["ошибка обработки", "черновик", "расформировано", "обрабатывается"]);
const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const [key, value] = process.argv[index].split("=", 2);
  if (key.startsWith("--")) args.set(key.slice(2), value || process.argv[index + 1] || "");
}

const region = args.get("region") || "Samarqand";
const date = args.get("date") || new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tashkent" }).format(new Date());
const output = args.get("output") || `analysis-${region.toLowerCase().replace(/[^a-z0-9]+/gi, "-")}-${date}.xlsx`;

function cell(row, index) {
  return row.getCell(index + 1).value?.text ?? row.getCell(index + 1).value ?? "";
}

function normalizeStatus(value) {
  return String(value ?? "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
}

function dateText(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === "number" && Number.isFinite(value)) {
    const excelDate = new Date(Date.UTC(1899, 11, 30));
    excelDate.setUTCDate(excelDate.getUTCDate() + value);
    return excelDate.toISOString().slice(0, 10);
  }
  const match = String(value ?? "").trim().match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  return match ? `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}` : String(value ?? "").trim();
}

async function downloadWorkbook() {
  const tokenResult = await pool.query(
    "SELECT token FROM api_tokens WHERE region=$1 AND (expires_at IS NULL OR expires_at > NOW())",
    [region],
  );
  const token = process.env.MSMS_TOKEN || args.get("token") || tokenResult.rows[0]?.token;
  if (!token) throw new Error(`${region} uchun faol token topilmadi. Avval tokenni dasturdagi Tokenlar bo'limidan saqlang.`);
  const baseUrl = process.env.MSMS_BASE_URL || config.msmsBaseUrl;
  const url = new URL(baseUrl);
  url.search = new URLSearchParams({
    DateStart: date,
    DateEnd: date,
    FilterText: "",
    OrderTypeAlias: "ServiceOrder.OrderType.AddMobileService",
    OrderOwnerFilter: region === "Samarqand" ? "User.Permissions.salesPoint" : "User.Permissions.dealer",
    PageSize: "1000",
  });
  const rawToken = token.trim().replace(/^["']|["']$/g, "").replace(/^Bearer\s+/i, "");
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel",
      Authorization: `Bearer ${rawToken}`,
      "X-Access-Token": rawToken,
      [config.msmsTokenHeader]: rawToken,
    },
  });
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!response.ok) throw new Error(`MSMS ${response.status}: ${buffer.toString("utf8", 0, 300)}`);
  await fs.writeFile(output, buffer);
  return { buffer, source: output };
}

async function analyze(buffer, source) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const report = {
    source,
    requestedRegion: region,
    requestedDate: date,
    worksheets: workbook.worksheets.map(sheet => sheet.name),
    totalRows: 0,
    headerRows: 0,
    ignoredRows: 0,
    emptyRows: 0,
    acceptedRows: 0,
    targetDateRows: 0,
    paginationWarning: false,
    dateCounts: {},
    statusCounts: {},
    duplicateKeys: 0,
    columns: [],
  };
  const keys = new Set();
  for (const sheet of workbook.worksheets) {
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber < 3) return;
      report.totalRows += 1;
      if (rowNumber === 3 && report.columns.length === 0) report.columns = Array.from({ length: 19 }, (_, index) => String(cell(row, index)).trim());
      const login = String(cell(row, 15)).trim();
      const icc = String(cell(row, 11)).trim();
      if (!login && !icc) {
        report.emptyRows += 1;
        return;
      }
      const status = normalizeStatus(cell(row, 17)) || "(bo'sh)";
      report.statusCounts[status] = (report.statusCounts[status] || 0) + 1;
      if (ignoredStatuses.has(status)) {
        report.ignoredRows += 1;
        return;
      }
      const saleDate = dateText(cell(row, 13)) || "(sana yo'q)";
      report.dateCounts[saleDate] = (report.dateCounts[saleDate] || 0) + 1;
      const key = `${icc}|${login}|${String(cell(row, 12)).trim()}|${String(cell(row, 10)).trim()}`.toLowerCase();
      if (keys.has(key)) report.duplicateKeys += 1;
      keys.add(key);
      report.acceptedRows += 1;
      if (saleDate === date) report.targetDateRows += 1;
    });
  }
  report.paginationWarning = report.totalRows >= 100;
  return report;
}

let downloaded;
if (args.has("file")) {
  const filePath = path.resolve(args.get("file"));
  try {
    downloaded = { buffer: await fs.readFile(filePath), source: filePath };
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error(`Excel fayl topilmadi: ${filePath}. --file ga mavjud .xlsx faylning to'liq yo'lini bering.`);
    }
    throw error;
  }
} else {
  downloaded = await downloadWorkbook();
}
const report = await analyze(downloaded.buffer, downloaded.source);
console.log(JSON.stringify(report, null, 2));
console.log(`\nExcel saqlandi/tekshirildi: ${downloaded.source}`);
console.log(`Bugungi sana (${date}) qatorlari: ${report.targetDateRows}`);
if (report.paginationWarning) console.log("DIQQAT: 100 yoki undan ko'p qator qaytdi. MSMS PageSize=100 bo'lsa, pagination sababli qolgan savdolar kelmagan bo'lishi mumkin.");
