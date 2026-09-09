import ExcelJS from "exceljs";
const ignoredStatuses = new Set(["ошибка обработки", "черновик", "расформировано", "обрабатывается"]);
const rsaFargonaLogins = new Set(["Ajobirbek", "BarnoNA_7", "Fsapayeva", "SamandarRU_6", "SardorbekXA_4", "AdxambekSX_14", "DilaromSA_13", "XalilbekovAA_5", "UUPotmaxon", "AlimardonXA_26", "SayidjonSA_27", "MaxmudovAA_28", "UmurzakovSA_29", "JamshidВD_110", "ObidovAO_22", "MaxmudovaDD_33", "AxmadjonovMA_30", "MaxmudovZA", "SARaxmatjon", "OlimjonZO_31", "RahmatullayevMA_32"].map(login => login.toLowerCase()));
const value = (row, index) => row.getCell(index + 1).value?.text ?? row.getCell(index + 1).value ?? "";
const regionNames = new Map([
  ["самаркандская обл.", "Samarqand"],
  ["самаркандская область", "Samarqand"],
  ["андижанская обл.", "Andijon"],
  ["наманганская обл.", "Namangan"],
  ["ферганская обл.", "Farg'ona"],
  ["кашкадарьинская обл.", "Qashqadaryo"],
  ["сурхандарьинская обл.", "Surxondaryo"],
  ["хорезмская обл.", "Xorazm"],
  ["джизакская обл.", "Jizzax"],
]);

function dateValue(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    excelEpoch.setUTCDate(excelEpoch.getUTCDate() + value);
    return excelEpoch.toISOString().slice(0, 10);
  }
  const text = String(value ?? "").trim();
  const match = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (match) return `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
  return text || null;
}

export async function parseWorkbook(buffer, fileName, importFileId, sourceRegion) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const rows = [];
  for (const worksheet of workbook.worksheets) {
    worksheet.eachRow((row, number) => {
      if (number < 3) return;
      const connectedAt = value(row, 13);
      const loginValue = value(row, 15);
      if (String(connectedAt).trim() === "Дата подключения" || String(loginValue).trim() === "Логин") return;
      const status = String(value(row, 17)).replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
      const login = String(loginValue).trim();
      const icc = String(value(row, 11)).trim();
      const rawRegion = String(value(row, 2)).trim();
      const region = sourceRegion === "rsa"
        ? (rsaFargonaLogins.has(login.toLowerCase()) ? "Farg'ona" : "Samarqand")
        : (regionNames.get(rawRegion.toLowerCase()) || rawRegion || "Samarqand");
      if ((!login && !icc) || ignoredStatuses.has(status.toLowerCase())) return;
      const phone = String(value(row, 10)).trim();
      const contractNumber = String(value(row, 12)).trim();
      const saleKey = `${icc}|${login}|${contractNumber}|${phone}`.toLowerCase();
      const connectedDate = dateValue(connectedAt);
      rows.push({ importFileId, orderNo: String(value(row, 0)), standard: String(value(row, 1)), region, dealerName: String(value(row, 3)), salesPoint: String(value(row, 4)), clientName: String(value(row, 5)), documentType: String(value(row, 6)), documentNumber: String(value(row, 7)), birthDate: String(value(row, 8)), tariffName: String(value(row, 9)), phone, icc, contractNumber, connectedAt: connectedDate, operatorName: String(value(row, 14)), login, payment: Number(value(row, 16)) || 0, status, identificationMethod: String(value(row, 18)), saleDate: connectedDate || new Date().toISOString().slice(0, 10), saleKey });
    });
  }
  return { fileName, rows };
}
