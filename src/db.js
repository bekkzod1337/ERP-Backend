import pg from "pg";
import { config } from "./config.js";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const { Pool } = pg;
export const pool = new Pool(config.database);

const dataDirectory = path.dirname(fileURLToPath(import.meta.url));

async function seedLoginsAndDealers() {
  const filePath = path.join(dataDirectory, "..", "login_va_dilerlar.txt");
  let contents;
  try {
    contents = await fs.readFile(filePath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }

  const region = process.env.DEALER_REGION || "Farg'ona";
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const line of contents.split(/\r?\n/)) {
      if (!line.trim()) continue;
      const [loginValue, dealerValue] = line.split("\t");
      const login = loginValue.trim();
      const dealer = dealerValue?.trim();
      if (!login || !dealer) continue;

      const loginResult = await client.query(
        "INSERT INTO logins(login) VALUES($1) ON CONFLICT(login) DO UPDATE SET login=EXCLUDED.login RETURNING id",
        [login],
      );
      const dealerResult = await client.query(
        `INSERT INTO dealers(name, login_id, region)
         SELECT $1, $2, $3
         WHERE NOT EXISTS (SELECT 1 FROM dealers WHERE LOWER(name) = LOWER($1))
         RETURNING id`,
        [dealer, loginResult.rows[0].id, region],
      );
      const dealerId = dealerResult.rows[0]?.id
        || (await client.query("SELECT id FROM dealers WHERE LOWER(name) = LOWER($1) ORDER BY id LIMIT 1", [dealer])).rows[0].id;
      await client.query(
        "INSERT INTO dealer_logins(dealer_id, login_id) VALUES($1, $2) ON CONFLICT DO NOTHING",
        [dealerId, loginResult.rows[0].id],
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS logins (id SERIAL PRIMARY KEY, login TEXT UNIQUE NOT NULL);
    CREATE TABLE IF NOT EXISTS dealers (
      id SERIAL PRIMARY KEY, name TEXT NOT NULL, login_id INT REFERENCES logins(id) ON DELETE SET NULL,
      region TEXT NOT NULL, district TEXT, category TEXT NOT NULL DEFAULT '2-DARAJA'
        CHECK (category IN ('TOP','1-DARAJA','2-DARAJA')), percentage NUMERIC(5,2) NOT NULL DEFAULT 3
    );
    CREATE TABLE IF NOT EXISTS dealer_logins (
      dealer_id INT NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,
      login_id INT NOT NULL REFERENCES logins(id) ON DELETE CASCADE,
      PRIMARY KEY (dealer_id, login_id)
    );
    CREATE TABLE IF NOT EXISTS tariffs (id SERIAL PRIMARY KEY, name TEXT UNIQUE NOT NULL, price NUMERIC(12,2) NOT NULL);
    CREATE TABLE IF NOT EXISTS calculation_periods (id SERIAL PRIMARY KEY, year INT NOT NULL, month INT NOT NULL, UNIQUE(year, month));
    CREATE TABLE IF NOT EXISTS import_files (
      id SERIAL PRIMARY KEY, file_name TEXT NOT NULL, imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      row_count INT NOT NULL DEFAULT 0, source TEXT NOT NULL DEFAULT 'upload'
    );
    CREATE TABLE IF NOT EXISTS sales (
      id BIGSERIAL PRIMARY KEY, import_file_id INT REFERENCES import_files(id) ON DELETE SET NULL,
      order_no TEXT, standard TEXT, region TEXT NOT NULL, dealer_name TEXT, sales_point TEXT,
      client_name TEXT, document_type TEXT, document_number TEXT, birth_date TEXT, tariff_name TEXT,
      phone TEXT, icc TEXT, contract_number TEXT, connected_at DATE, operator_name TEXT,
      login TEXT, payment NUMERIC(12,2) NOT NULL DEFAULT 0, status TEXT, identification_method TEXT,
      sale_date DATE NOT NULL, sale_key TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS dealer_calculations (
      id SERIAL PRIMARY KEY, dealer_id INT NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,
      period_id INT NOT NULL REFERENCES calculation_periods(id) ON DELETE CASCADE,
      plan INT NOT NULL DEFAULT 0, fact INT NOT NULL DEFAULT 0, percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
      amount NUMERIC(14,2) NOT NULL DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(dealer_id, period_id)
    );
    CREATE TABLE IF NOT EXISTS sales_plans (
      id SERIAL PRIMARY KEY,
      scope_type TEXT NOT NULL CHECK (scope_type IN ('region','district','dealer')),
      scope_key TEXT NOT NULL,
      period_start DATE NOT NULL,
      plan INT NOT NULL DEFAULT 0 CHECK (plan >= 0),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(scope_type, scope_key, period_start)
    );
    CREATE TABLE IF NOT EXISTS api_tokens (
      id SERIAL PRIMARY KEY, region TEXT UNIQUE NOT NULL, token TEXT NOT NULL,
      expires_at TIMESTAMPTZ, updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE dealers ADD COLUMN IF NOT EXISTS phone TEXT;
    ALTER TABLE dealers ADD COLUMN IF NOT EXISTS full_name TEXT;
    ALTER TABLE dealers ADD COLUMN IF NOT EXISTS sim_logins TEXT;
    ALTER TABLE dealers ADD COLUMN IF NOT EXISTS sim_limit INT NOT NULL DEFAULT 0 CHECK (sim_limit >= 0);
    CREATE TABLE IF NOT EXISTS sim_receipts (
      id BIGSERIAL PRIMARY KEY, icc_start NUMERIC(18,0) NOT NULL, icc_end NUMERIC(18,0) NOT NULL,
      received_at DATE NOT NULL DEFAULT CURRENT_DATE, operator_name TEXT, note TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), CHECK (icc_start <= icc_end)
    );
    CREATE TABLE IF NOT EXISTS simcards (
      id BIGSERIAL PRIMARY KEY, icc CHAR(18) UNIQUE NOT NULL CHECK (icc ~ '^[0-9]{18}$'),
      region TEXT, status TEXT NOT NULL DEFAULT 'franchise' CHECK (status IN ('franchise','dealer','sold')),
      dealer_id INT REFERENCES dealers(id) ON DELETE SET NULL, received_at DATE NOT NULL DEFAULT CURRENT_DATE,
      issued_at DATE, sold_at DATE, operator_name TEXT, replacement BOOLEAN NOT NULL DEFAULT FALSE,
      note TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS simcards_status_idx ON simcards(status);
    CREATE INDEX IF NOT EXISTS simcards_dealer_idx ON simcards(dealer_id);
    CREATE TABLE IF NOT EXISTS telegram_verifications (
      id BIGSERIAL PRIMARY KEY, simcard_id BIGINT NOT NULL REFERENCES simcards(id) ON DELETE CASCADE,
      code TEXT NOT NULL, sent_to TEXT, verified BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), verified_at TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS telegram_verifications_sim_idx ON telegram_verifications(simcard_id);
    CREATE TABLE IF NOT EXISTS sim_issues (
      id BIGSERIAL PRIMARY KEY, dealer_id INT NOT NULL REFERENCES dealers(id), icc_start NUMERIC(18,0) NOT NULL,
      icc_end NUMERIC(18,0) NOT NULL, issued_at DATE NOT NULL DEFAULT CURRENT_DATE,
      operator_name TEXT, note TEXT, verification_id BIGINT REFERENCES telegram_verifications(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), CHECK (icc_start <= icc_end)
    );
    CREATE TABLE IF NOT EXISTS audit_logs (
      id BIGSERIAL PRIMARY KEY, action TEXT NOT NULL, entity_type TEXT, entity_id TEXT,
      actor TEXT, details JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON audit_logs(created_at DESC);
  `);
  await pool.query("ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_sale_key_key");
  await pool.query("DROP INDEX IF EXISTS sales_sale_key_unique");
  await pool.query(`
    DELETE FROM sales
    WHERE import_file_id IN (
      SELECT old.id
      FROM import_files old
      JOIN import_files latest
        ON latest.source = old.source
       AND latest.file_name = old.file_name
       AND latest.source = 'msms-api'
       AND latest.id > old.id
    )
  `);
  await pool.query(`
    DELETE FROM import_files old
    USING import_files latest
    WHERE old.source = 'msms-api'
      AND latest.source = old.source
      AND latest.file_name = old.file_name
      AND latest.id > old.id
  `);
  const tariffs = [["super lux",70000],["bonus super lux",70000],["super salom",70000],["bonus super salom",70000],["mobile lux",101000],["mobile elite",150000],["ideal plus",85000],["bonus ideal plus",85000],["mini voice",45000],["bayrammona 35",70000],["mobile sport",70000],["balance",65000],["optimal",55000],["Farzand",55000],["Mobile mini m",45000],["uzmobile m2m yil",100000],["data 300gb",500000],["data 600gb",900000],["data 1tb",1300000],["ideal yil",770000],["super bonus",70000]];
  for (const [name, price] of tariffs) await pool.query("INSERT INTO tariffs(name, price) VALUES($1,$2) ON CONFLICT(name) DO NOTHING", [name, price]);
  await seedLoginsAndDealers();
}
