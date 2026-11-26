
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

// Identify the exact database module being loaded.
console.log("========== VELORA DB DIAGNOSTIC START ==========");
console.log("DB FILE:", fileURLToPath(import.meta.url));

// Load environment variables from this server folder.
dotenv.config({
  path: fileURLToPath(new URL("./.env", import.meta.url)),
});

const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "velora_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

try {
  const connection = await db.getConnection();

  try {
    console.log("Velora MySQL database connected successfully!");

    const [rows] = await connection.execute(`
      SELECT
        DATABASE() AS database_name,
        @@hostname AS mysql_host,
        @@port AS mysql_port,
        (SELECT COUNT(*) FROM ratings) AS total_ratings
    `);

    console.log("[Velora DB] Active database check:", rows[0]);
  } finally {
    connection.release();
  }
} catch (error) {
  console.error("========== VELORA MYSQL ERROR ==========");
  console.error("Full error:", error);
  console.error("Error code:", error.code);
  console.error("Error number:", error.errno);
  console.error("SQL message:", error.sqlMessage);
  console.error("Error stack:", error.stack);
}

export default db;
