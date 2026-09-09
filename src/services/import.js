import { parseWorkbook } from "../excel.js";
import { asDate } from "../utils/http.js";

export async function saveWorkbook(client, buffer, fileName, source = "upload", sourceRegion) {
  if (source === "msms-api") {
    await client.query("DELETE FROM sales WHERE import_file_id IN (SELECT id FROM import_files WHERE source=$1 AND file_name=$2)", [source, fileName]);
    await client.query("DELETE FROM import_files WHERE source=$1 AND file_name=$2", [source, fileName]);
  }
  const imported = await client.query("INSERT INTO import_files(file_name, source) VALUES($1,$2) RETURNING id", [fileName, source]);
  const parsed = await parseWorkbook(buffer, fileName, imported.rows[0].id, sourceRegion);
  let insertedRows = 0;
  for (const row of parsed.rows) {
    const result = await client.query(`INSERT INTO sales(import_file_id,order_no,standard,region,dealer_name,sales_point,client_name,document_type,document_number,birth_date,tariff_name,phone,icc,contract_number,connected_at,operator_name,login,payment,status,identification_method,sale_date,sale_key)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)`,
      [imported.rows[0].id,row.orderNo,row.standard,row.region,row.dealerName,row.salesPoint,row.clientName,row.documentType,row.documentNumber,row.birthDate,row.tariffName,row.phone,row.icc,row.contractNumber,row.connectedAt,row.operatorName,row.login,row.payment,row.status,row.identificationMethod,asDate(row.saleDate),row.saleKey]);
    insertedRows += result.rowCount;
  }
  await client.query("UPDATE import_files SET row_count=$1 WHERE id=$2", [insertedRows, imported.rows[0].id]);
  return { file: fileName, rows: insertedRows };
}

export function isXlsxBuffer(buffer) {
  if (buffer.length < 22 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) return false;
  return buffer.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06])) >= 0;
}

export function msmsResponseError(response, buffer) {
  const contentType = response.headers.get("content-type") || "noma'lum format";
  const preview = buffer.toString("utf8", 0, 500).replace(/\s+/g, " ").trim();
  const suffix = preview ? ` Javob: ${preview}` : "";
  return new Error(`MSMS Excel fayl yubormadi (${contentType}). Token yoki sessiya noto'g'ri bo'lishi mumkin.${suffix}`);
}

export function eachDay(start, end) {
  const days = [];
  for (const cursor = new Date(`${start}T00:00:00Z`); cursor <= new Date(`${end}T00:00:00Z`); cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    days.push(cursor.toISOString().slice(0, 10));
  }
  return days;
}
