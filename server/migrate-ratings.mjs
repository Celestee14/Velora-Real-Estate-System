import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import db from "./db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ratingsFile = path.join(__dirname, "data", "ratings.json");

const toMysqlDateTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid createdAt date: ${value}`);
  }
  // Store the original ISO instant as a UTC DATETIME value.
  return date.toISOString().slice(0, 19).replace("T", " ");
};

const validateRating = (item, index) => {
  const targetType = item?.targetType;
  const rating = Number(item?.rating);
  const appointmentId = Number(item?.appointmentId);
  const clientId = Number(item?.clientId);
  const targetId = Number(item?.targetId);
  const comment = String(item?.comment ?? "");

  if (
    !item?.id ||
    !Number.isInteger(appointmentId) || appointmentId < 1 ||
    !Number.isInteger(clientId) || clientId < 1 ||
    !["property", "agent"].includes(targetType) ||
    !Number.isInteger(targetId) || targetId < 1 ||
    !Number.isInteger(rating) || rating < 1 || rating > 5 ||
    !String(item?.clientName ?? "").trim() ||
    !String(item?.targetName ?? "").trim() ||
    comment.length > 1000 ||
    !item?.createdAt
  ) {
    throw new Error(`Invalid rating record at JSON index ${index}.`);
  }

  return {
    id: String(item.id),
    appointmentId,
    clientId,
    clientName: String(item.clientName).trim().slice(0, 120),
    targetType,
    targetId,
    targetName: String(item.targetName).trim().slice(0, 150),
    rating,
    comment,
    createdAt: toMysqlDateTime(item.createdAt),
  };
};

const main = async () => {
  let connection;
  try {
    const raw = await fs.readFile(ratingsFile, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error("ratings.json must contain a JSON array.");
    }

    const records = parsed.map(validateRating);
    connection = await db.getConnection();
    await connection.beginTransaction();

    let inserted = 0;
    let skipped = 0;

    for (const item of records) {
      // Skip an exact ID already migrated, or an existing review for the same
      // appointment/client/target type. This makes rerunning the script safe.
      const [existing] = await connection.execute(
        `SELECT id FROM ratings
         WHERE id = ?
            OR (appointment_id = ? AND client_id = ? AND target_type = ?)
         LIMIT 1`,
        [item.id, item.appointmentId, item.clientId, item.targetType]
      );

      if (existing.length) {
        skipped += 1;
        continue;
      }

      await connection.execute(
        `INSERT INTO ratings
          (id, appointment_id, client_id, client_name, target_type,
           target_id, target_name, rating, comment, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.id,
          item.appointmentId,
          item.clientId,
          item.clientName,
          item.targetType,
          item.targetId,
          item.targetName,
          item.rating,
          item.comment,
          item.createdAt,
        ]
      );
      inserted += 1;
    }

    await connection.commit();
    console.log(`Ratings migration completed. Inserted: ${inserted}; skipped: ${skipped}.`);
    console.log("Verify the records in phpMyAdmin: velora_db > ratings > Browse.");
  } catch (error) {
    if (connection) {
      try { await connection.rollback(); } catch {}
    }
    console.error("Ratings migration failed:", error.message);
    process.exitCode = 1;
  } finally {
    if (connection) connection.release();
    try { await db.end(); } catch {}
  }
};

main();
