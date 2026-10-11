export async function audit(client, action, entityType, entityId, req, details = {}) {
  await client.query(
    "INSERT INTO audit_logs(action,entity_type,entity_id,actor,details) VALUES($1,$2,$3,$4,$5)",
    [
      action,
      entityType,
      entityId == null ? null : String(entityId),
      req?.simUser?.login || req?.user?.name || req?.body?.operatorName || req?.body?.operator || req?.ip || "system",
      details,
    ],
  );
}
