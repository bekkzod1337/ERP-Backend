export const regions = ["Samarqand", "Andijon", "Namangan", "Farg'ona", "Qashqadaryo", "Surxondaryo", "Xorazm", "Jizzax"];
export const tokenRegions = [...regions, "rsa"];

export function normalizeRegion(value) {
  if (value === "Fargona" || value === "Farg‘ona" || value === "Фергана") return "Farg'ona";
  return value;
}

export const asDate = input => input ? new Date(input) : new Date();

export function localToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tashkent" }).format(new Date());
}

export function currentMonthRange() {
  const today = localToday();
  return [`${today.slice(0, 8)}01`, today];
}

export function dateRange(req) {
  const [monthStart, today] = currentMonthRange();
  return [req.query.start || monthStart, req.query.end || today];
}

export function validIcc(value) {
  return typeof value === "string" && /^\d{18}$/.test(value);
}

export function iccRange(body) {
  const start = String(body.iccStart ?? body.start ?? "").trim();
  const end = String(body.iccEnd ?? body.end ?? "").trim();
  if (!validIcc(start) || !validIcc(end) || BigInt(start) > BigInt(end)) return null;
  return { start, end, count: BigInt(end) - BigInt(start) + 1n };
}
