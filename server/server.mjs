
import express from "express";
import multer from "multer";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "./db.js";

// Load environment variables from this server folder, not the project root.
dotenv.config({ path: fileURLToPath(new URL("./.env", import.meta.url)) });
console.log("JWT_SECRET loaded:", Boolean(process.env.JWT_SECRET));

const PORT = Number(process.env.SERVER_PORT || 3001);
const { GMAIL_USER, GMAIL_APP_PASSWORD } = process.env;

const transporter = GMAIL_USER && GMAIL_APP_PASSWORD
  ? nodemailer.createTransport({
      service: "gmail",
      auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
    })
  : null;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, "uploads");

// Store uploaded property images inside server/uploads.
await fs.mkdir(UPLOAD_DIR, { recursive: true });

const allowedImageTypes = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, UPLOAD_DIR),
  filename: (_req, file, callback) => {
    const extension = allowedImageTypes[file.mimetype];
    callback(null, `${crypto.randomUUID()}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 20 },
  fileFilter: (_req, file, callback) => {
    if (!allowedImageTypes[file.mimetype]) {
      return callback(new Error("Only JPG, PNG, WEBP, and GIF images are allowed."));
    }
    callback(null, true);
  },
});

const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;
const pending = new Map();
const APPT_COOLDOWN_MS = 5 * 1000;
const apptLastSent = new Map();

const sha256 = (value) =>
  crypto.createHash("sha256").update(value).digest();

const isValidEmail = (value) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const sendJson = (res, status, body) => {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
  });
  res.end(JSON.stringify(body));
};

const sendError = (res, status, message, errors = []) =>
  sendJson(res, status, {
    success: false,
    statusCode: status,
    message,
    errors,
    timestamp: new Date().toISOString(),
  });

const readJson = (req) =>
  new Promise((resolve, reject) => {
    let raw = "";

    req.on("data", (chunk) => {
      raw += chunk;

      if (raw.length > 100_000) {
        reject(new Error("too large"));
        req.destroy();
      }
    });

    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("bad json"));
      }
    });

    req.on("error", reject);
  });

const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);

const requireMailer = (res) => {
  if (transporter) return true;

  sendError(
    res,
    503,
    "Email is not configured. Add GMAIL_USER and GMAIL_APP_PASSWORD to server/.env."
  );

  return false;
};

// ─── Ratings persistence (MySQL) ─────────────────────────────────────────────

const handleGetRatings = async (_req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT
        id,
        appointment_id AS appointmentId,
        client_id AS clientId,
        client_name AS clientName,
        target_type AS targetType,
        target_id AS targetId,
        target_name AS targetName,
        rating,
        comment,
        created_at AS createdAt
      FROM ratings
      ORDER BY created_at DESC
    `);

    return sendJson(res, 200, {
      success: true,
      ratings: rows.map((row) => ({
        ...row,
        appointmentId: Number(row.appointmentId),
        clientId: Number(row.clientId),
        targetId: Number(row.targetId),
        rating: Number(row.rating),
        createdAt: row.createdAt
          ? new Date(row.createdAt).toISOString()
          : null,
      })),
    });
  } catch (error) {
    console.error("Could not load ratings:", error.message);
    return sendError(res, 500, "Could not load ratings.");
  }
};

const handleCreateRatings = async (req, res) => {
  console.log(`[RATINGS POST] Handler reached. PID=${process.pid}`);

  const user = await getAuthUser(req);
  if (!user) {
    console.warn("[RATINGS POST] Rejected: no authenticated user (401).");
    return sendError(res, 401, "Please sign in again.");
  }
  if (user.role !== "Client") {
    console.warn(`[RATINGS POST] Rejected: user ${user.id} has role ${user.role} (403).`);
    return sendError(res, 403, "Only clients can submit ratings.");
  }

  let body;
  try {
    body = await readJson(req);
  } catch {
    console.warn("[RATINGS POST] Rejected: request body is not valid JSON (400).");
    return sendError(res, 400, "Body must be valid JSON.");
  }

  const items = body?.ratings;
  if (!Array.isArray(items) || items.length < 1 || items.length > 2) {
    console.warn("[RATINGS POST] Rejected: expected one or two ratings.");
    return sendError(res, 400, "Submit one or two valid ratings.");
  }

  const seenTypes = new Set();
  for (const item of items) {
    const type = item?.targetType;
    const rating = Number(item?.rating);
    const comment = typeof item?.comment === "string" ? item.comment.trim() : "";
    if (
      !Number.isInteger(Number(item?.appointmentId)) || Number(item.appointmentId) < 1 ||
      !["property", "agent"].includes(type) || seenTypes.has(type) ||
      !Number.isInteger(rating) || rating < 1 || rating > 5 ||
      !comment || comment.length > 1000
    ) {
      console.warn("[RATINGS POST] Rejected: one or more rating fields failed validation.");
      return sendError(res, 400, "Each rating must include a valid appointment, target, 1–5 score, and comment (up to 1000 characters).");
    }
    seenTypes.add(type);
  }

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const saved = [];
    for (const item of items) {
      const appointmentId = Number(item.appointmentId);
      const [appointments] = await connection.execute(
        `SELECT id, client_id, client_name, property_id, property_name,
                assigned_agent_id, assigned_agent_name, status
         FROM appointments WHERE id = ? FOR UPDATE`,
        [appointmentId]
      );
      if (!appointments.length) {
        await connection.rollback();
        console.warn(`[RATINGS POST] Rejected: appointment ${appointmentId} was not found.`);
        return sendError(res, 404, "Appointment not found.");
      }

      const appointment = appointments[0];
      if (Number(appointment.client_id) !== Number(user.id)) {
        await connection.rollback();
        console.warn(`[RATINGS POST] Rejected: appointment ${appointmentId} does not belong to user ${user.id}.`);
        return sendError(res, 403, "You can only rate your own appointment.");
      }
      if (appointment.status !== "Completed") {
        await connection.rollback();
        console.warn(`[RATINGS POST] Rejected: appointment ${appointmentId} status is ${appointment.status}, not Completed.`);
        return sendError(res, 409, "Only completed appointments can be rated.");
      }

      const targetId = item.targetType === "property"
        ? Number(appointment.property_id)
        : Number(appointment.assigned_agent_id);
      const targetName = item.targetType === "property"
        ? appointment.property_name
        : appointment.assigned_agent_name;
      if (!targetId || !targetName || (item.targetId != null && Number(item.targetId) !== targetId)) {
        await connection.rollback();
        console.warn(`[RATINGS POST] Rejected: ${item.targetType} target does not match appointment ${appointmentId}.`);
        return sendError(res, 400, `The ${item.targetType} does not match this appointment.`);
      }

      const [existing] = await connection.execute(
        "SELECT id FROM ratings WHERE appointment_id = ? AND client_id = ? AND target_type = ? LIMIT 1",
        [appointmentId, user.id, item.targetType]
      );
      if (existing.length) {
        await connection.rollback();
        console.warn(`[RATINGS POST] Rejected: duplicate ${item.targetType} review for appointment ${appointmentId}.`);
        return sendError(res, 409, `You have already submitted a ${item.targetType} review for this appointment.`);
      }

      const id = crypto.randomUUID();
      await connection.execute(
        `INSERT INTO ratings
          (id, appointment_id, client_id, client_name, target_type, target_id, target_name, rating, comment, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [id, appointmentId, user.id, user.name, item.targetType, targetId, targetName, Number(item.rating), item.comment.trim()]
      );
      saved.push(id);
      console.log(`[RATINGS POST] Inserted ${item.targetType} review for appointment ${appointmentId}.`);
    }

    await connection.commit();
    console.log(`[RATINGS POST] Transaction committed. Saved ${saved.length} rating(s).`);

    const [rows] = await db.execute(`
      SELECT id, appointment_id AS appointmentId, client_id AS clientId,
             client_name AS clientName, target_type AS targetType,
             target_id AS targetId, target_name AS targetName, rating, comment,
             created_at AS createdAt
      FROM ratings WHERE id IN (${saved.map(() => "?").join(",")})
      ORDER BY created_at DESC
    `, saved);

    return sendJson(res, 201, { success: true, ratings: rows.map((row) => ({
      ...row, appointmentId: Number(row.appointmentId), clientId: Number(row.clientId),
      targetId: Number(row.targetId), rating: Number(row.rating),
      createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : null,
    })) });
  } catch (error) {
    if (connection) {
      try { await connection.rollback(); } catch {}
    }
    console.error("[RATINGS POST] Could not save ratings:", error.stack || error.message);
    return sendError(res, 500, "Could not save ratings.");
  } finally {
    if (connection) connection.release();
  }
};


// ─── Database authentication ───────────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET;

const publicUser = (row) => ({
  id: Number(row.id),
  name: row.name,
  email: row.email,
  role: row.role,
  status: row.status,
  contactNumber: row.contact_number ?? "",
});

const createAuthToken = (user) => jwt.sign(
  { id: Number(user.id), role: user.role },
  JWT_SECRET,
  { expiresIn: "7d" }
);

const getAuthUser = async (req) => {
  if (!JWT_SECRET) throw new Error("JWT_SECRET is not configured.");
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const [rows] = await db.execute(
      "SELECT id, name, email, role, status, contact_number FROM users WHERE id = ? LIMIT 1",
      [payload.id]
    );
    if (!rows.length || rows[0].status !== "Active") return null;
    return publicUser(rows[0]);
  } catch {
    return null;
  }
};

const requireAdmin = async (req, res) => {
  const user = await getAuthUser(req);
  if (!user) {
    sendError(res, 401, "Please sign in again.");
    return null;
  }
  if (user.role !== "Admin") {
    sendError(res, 403, "Administrator access is required.");
    return null;
  }
  return user;
};

const handleLogin = async (req, res) => {
  let body;

  try {
    body = await readJson(req);
  } catch {
    return sendError(res, 400, "Invalid login request.");
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!isValidEmail(email) || !password) {
    return sendError(res, 400, "Email and password are required.");
  }

  try {
    const [rows] = await db.execute(
      `SELECT id, name, email, password_hash, role, status, contact_number
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [email]
    );

    if (!rows.length) {
      return sendError(res, 401, "Incorrect email or password.");
    }

    const account = rows[0];

    if (account.status !== "Active") {
      return sendError(res, 403, "This account is inactive.");
    }

    const passwordMatches = await bcrypt.compare(
      password,
      account.password_hash
    );

    if (!passwordMatches) {
      return sendError(res, 401, "Incorrect email or password.");
    }

    const user = publicUser(account);
    const token = createAuthToken(user);

    console.log(`[AUTH LOGIN] Successful login: user ${user.id}`);

    return sendJson(res, 200, {
      success: true,
      message: "Login successful.",
      user,
      token,
    });
  } catch (error) {
    console.error("[AUTH LOGIN] Database or authentication error:", error);
    return sendError(res, 500, "Could not sign in.");
  }
};
const handleRegister = async (req, res) => {
  let body;

  try {
    body = await readJson(req);
  } catch (error) {
    return sendError(res, 400, "Invalid registration request.", [
      error.message === "too large"
        ? "Request body is too large."
        : "Body must be valid JSON.",
    ]);
  }

  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const contactNumber = String(body.contactNumber ?? "").trim();
  const password = String(body.password ?? "");

  // Validate registration information
  if (
    !name ||
    name.length > 120 ||
    !isValidEmail(email) ||
    email.length > 190 ||
    !/^[0-9+\-\s]{7,15}$/.test(contactNumber) ||
    password.length < 8 ||
    password.length > 128
  ) {
    return sendError(res, 400, "Invalid registration details.", [
      "Provide a valid name, email, contact number, and password between 8 and 128 characters.",
    ]);
  }

  try {
    // Check for existing email
    const [existing] = await db.execute(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [email]
    );

    if (existing.length > 0) {
      return sendError(
        res,
        409,
        "An account with this email already exists."
      );
    }

    // Hash password before saving
    const passwordHash = await bcrypt.hash(password, 12);

    // Public registration is restricted to Client accounts
    const [result] = await db.execute(
      `INSERT INTO users (
        name,
        email,
        password_hash,
        role,
        status,
        contact_number
      )
      VALUES (?, ?, ?, 'Client', 'Active', ?)`,
      [name, email, passwordHash, contactNumber]
    );

    return sendJson(res, 201, {
      success: true,
      message: "Account created successfully.",
      user: {
        id: Number(result.insertId),
        name,
        email,
        role: "Client",
        status: "Active",
        contactNumber,
      },
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return sendError(
        res,
        409,
        "An account with this email already exists."
      );
    }

    console.error("Registration failed:", error.message);
    return sendError(res, 500, "Could not create your account.");
  }
};

// ─── Password reset ───────────────────────────────────────────────────────────

const buildResetEmail = (code) => ({
  subject: "Your Velora password reset code",

  text: `Your Velora password reset code is ${code}.

It expires in 10 minutes. If you did not ask to reset your password, you can ignore this email.`,

  html: `<div style="font-family:Arial,sans-serif;max-width:420px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px"><h2 style="margin:0 0 8px;color:#1e3a5f">Velora</h2><p style="color:#374151;font-size:14px">Use this code to reset your password:</p><p style="font-size:32px;letter-spacing:8px;font-weight:bold;color:#1e3a5f;margin:16px 0">${code}</p><p style="color:#6b7280;font-size:12px">This code expires in 10 minutes. If you did not ask to reset your password, you can ignore this email.</p></div>`,
});


const handleForgotPassword = async (req, res) => {
  if (!requireMailer(res)) return;

  let body;

  try {
    body = await readJson(req);
  } catch (error) {
    return sendError(res, 400, "Invalid request body.", [
      error.message === "too large"
        ? "Request body is too large."
        : "Body must be valid JSON.",
    ]);
  }

  const email = String(body.email ?? "").trim().toLowerCase();

  if (!isValidEmail(email) || email.length > 190) {
    return sendError(res, 400, "A valid email is required.");
  }

  try {
    const [accounts] = await db.execute(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [email]
    );

    if (!accounts.length) {
      return sendJson(res, 200, {
        success: true,
        message: "If the account exists, a code has been sent.",
      });
    }

    const existing = pending.get(email);

    if (
      existing &&
      Date.now() - existing.sentAt < RESEND_COOLDOWN_MS
    ) {
      const wait = Math.ceil(
        (RESEND_COOLDOWN_MS - (Date.now() - existing.sentAt)) / 1000
      );

      return sendError(
        res,
        429,
        `Please wait ${wait} seconds before requesting another code.`
      );
    }

    const code = String(crypto.randomInt(100000, 1000000));

    await transporter.sendMail({
      from: `"Velora" <${GMAIL_USER}>`,
      to: email,
      ...buildResetEmail(code),
    });

    pending.set(email, {
      hash: sha256(code),
      expiresAt: Date.now() + CODE_TTL_MS,
      attempts: 0,
      sentAt: Date.now(),
    });

    return sendJson(res, 200, {
      success: true,
      message: "If the account exists, a code has been sent.",
    });
  } catch (error) {
    console.error("Forgot password failed:", error.message);

    return sendError(
      res,
      500,
      "We could not process your request. Please try again later."
    );
  }
};


const handleResetPassword = async (req, res) => {
  let body;

  try {
    body = await readJson(req);
  } catch (error) {
    return sendError(res, 400, "Invalid request body.", [
      error.message === "too large"
        ? "Request body is too large."
        : "Body must be valid JSON.",
    ]);
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const code = String(body.code ?? "").trim();
  const newPassword = String(body.newPassword ?? "");

  if (
    !isValidEmail(email) ||
    email.length > 190 ||
    !/^\d{6}$/.test(code)
  ) {
    return sendError(res, 400, "Invalid password reset request.", [
      "A valid email and 6-digit reset code are required.",
    ]);
  }

  if (newPassword.length < 8 || newPassword.length > 128) {
    return sendError(
      res,
      400,
      "New password must be between 8 and 128 characters."
    );
  }

  const record = pending.get(email);

  if (!record || Date.now() > record.expiresAt) {
    pending.delete(email);

    return sendError(
      res,
      400,
      "That code is not valid or has expired. Please request a new one."
    );
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    pending.delete(email);

    return sendError(
      res,
      429,
      "Too many wrong attempts. Please request a new code."
    );
  }

  const matches = crypto.timingSafeEqual(
    sha256(code),
    record.hash
  );

  if (!matches) {
    record.attempts += 1;

    if (record.attempts >= MAX_ATTEMPTS) {
      pending.delete(email);

      return sendError(
        res,
        429,
        "Too many wrong attempts. Please request a new code."
      );
    }

    return sendError(
      res,
      400,
      "That code is not valid or has expired. Please try again."
    );
  }

  try {
    const passwordHash = await bcrypt.hash(newPassword, 12);

    const [result] = await db.execute(
      "UPDATE users SET password_hash = ? WHERE email = ?",
      [passwordHash, email]
    );

    if (!result.affectedRows) {
      pending.delete(email);

      return sendError(
        res,
        400,
        "That code is not valid or has expired. Please request a new one."
      );
    }

    // Prevent reuse of the reset code
    pending.delete(email);

    return sendJson(res, 200, {
      success: true,
      message: "Password updated successfully.",
    });
  } catch (error) {
    console.error("Could not reset password:", error.message);

    return sendError(res, 500, "Could not update password.");
  }
};

// ─── Appointments persistence ──────────────────────────────────────────────────

const formatAppointment = (row) => ({
  id: Number(row.id),
  clientId: Number(row.client_id),
  clientName: row.client_name,
  contactNumber: row.contact_number,
  propertyId: Number(row.property_id),
  propertyName: row.property_name,
  date: row.appointment_date instanceof Date
    ? `${row.appointment_date.getFullYear()}-${String(
        row.appointment_date.getMonth() + 1
      ).padStart(2, "0")}-${String(
        row.appointment_date.getDate()
      ).padStart(2, "0")}`
    : String(row.appointment_date).slice(0, 10),
  time: row.appointment_time,
  status: row.status,
  message: row.message ?? "",
  assignedAgentId:
    row.assigned_agent_id == null
      ? undefined
      : Number(row.assigned_agent_id),
  assignedAgentName: row.assigned_agent_name ?? undefined,
});

const handleGetAppointments = async (req, res) => {
  const user = await getAuthUser(req);
  if (!user) return sendError(res, 401, "Please sign in again.");

  try {
    let rows;

    if (user.role === "Admin") {
      [rows] = await db.execute(
        "SELECT * FROM appointments ORDER BY appointment_date DESC, appointment_time DESC, id DESC"
      );
    } else if (user.role === "Agent") {
      [rows] = await db.execute(
        "SELECT * FROM appointments WHERE assigned_agent_id = ? ORDER BY appointment_date DESC, appointment_time DESC, id DESC",
        [user.id]
      );
    } else {
      [rows] = await db.execute(
        "SELECT * FROM appointments WHERE client_id = ? ORDER BY appointment_date DESC, appointment_time DESC, id DESC",
        [user.id]
      );
    }

    return sendJson(res, 200, {
      success: true,
      appointments: rows.map(formatAppointment),
    });
  } catch (error) {
    console.error("Could not load appointments:", error.message);
    return sendError(res, 500, "Could not load appointments.");
  }
};

const handleGetAppointment = async (req, res, appointmentId) => {
  const user = await getAuthUser(req);

  if (!user) {
    return sendError(res, 401, "Please sign in again.");
  }

  try {
    let query = "SELECT * FROM appointments WHERE id = ?";
    const params = [appointmentId];

    if (user.role === "Agent") {
      query += " AND assigned_agent_id = ?";
      params.push(user.id);
    } else if (user.role === "Client") {
      query += " AND client_id = ?";
      params.push(user.id);
    }

    const [rows] = await db.execute(query, params);

    if (rows.length === 0) {
      return sendError(res, 404, "Appointment not found.");
    }

    return sendJson(res, 200, {
      success: true,
      appointment: formatAppointment(rows[0]),
    });
  } catch (error) {
    console.error("Could not load appointment:", error.message);
    return sendError(res, 500, "Could not load appointment.");
  }
};



const handleCreateAppointment = async (req, res) => {
  const user = await getAuthUser(req);

  if (!user) {
    return sendError(res, 401, "Please sign in again.");
  }

  if (user.role !== "Client") {
    return sendError(res, 403, "Only clients can book a viewing.");
  }

  let body;

  try {
    body = await readJson(req);
  } catch {
    return sendError(res, 400, "Invalid request body.");
  }

  const propertyId = Number(body.propertyId);
  const contactNumber = String(user.contactNumber ?? "").trim();
  const date = String(body.date ?? "").trim();
  const time = String(body.time ?? "").trim();
  const message = String(body.message ?? "").trim();

  const allowedTimes = [
    "09:00 AM",
    "10:00 AM",
    "11:00 AM",
    "01:00 PM",
    "02:00 PM",
    "03:00 PM",
    "04:00 PM",
  ];

  // Validate date format and actual calendar date
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);

  if (!dateMatch) {
    return sendError(res, 400, "Invalid appointment date.");
  }

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);

  const parsedDate = new Date(Date.UTC(year, month - 1, day));

  if (
    parsedDate.getUTCFullYear() !== year ||
    parsedDate.getUTCMonth() !== month - 1 ||
    parsedDate.getUTCDate() !== day
  ) {
    return sendError(res, 400, "Invalid calendar date.");
  }

  // Prevent past appointment dates
  const now = new Date();

  const today =
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  if (date < today) {
    return sendError(res, 400, "Appointment date cannot be in the past.");
  }

  if (
    !Number.isInteger(propertyId) ||
    propertyId < 1 ||
    !/^[0-9+\-\s]{7,15}$/.test(contactNumber) ||
    !allowedTimes.includes(time) ||
    message.length > 2000
  ) {
    return sendError(res, 400, "Invalid appointment details.");
  }

  try {
    // Get property information from the database
    const [properties] = await db.execute(
      `SELECT id, name, status
       FROM properties
       WHERE id = ?
       LIMIT 1`,
      [propertyId]
    );

    if (!properties.length || properties[0].status !== "Available") {
      return sendError(res, 404, "This property is no longer available.");
    }

    const property = properties[0];

    // Check existing active bookings
    const [conflicts] = await db.execute(
      `SELECT id
       FROM appointments
       WHERE property_id = ?
         AND appointment_date = ?
         AND appointment_time = ?
         AND status IN ('Pending', 'Confirmed')
       LIMIT 1`,
      [propertyId, date, time]
    );

    if (conflicts.length) {
      return sendError(
        res,
        409,
        "That time slot is already booked. Please choose another."
      );
    }

    // Assign an active agent
    const [agents] = await db.execute(
      `SELECT id, name
       FROM users
       WHERE role = 'Agent'
         AND status = 'Active'
       ORDER BY id
       LIMIT 1`
    );

    const agent = agents[0];

    // Insert appointment
    const [result] = await db.execute(
      `INSERT INTO appointments (
        client_id,
        client_name,
        contact_number,
        property_id,
        property_name,
        appointment_date,
        appointment_time,
        status,
        message,
        assigned_agent_id,
        assigned_agent_name
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending', ?, ?, ?)`,
      [
        user.id,
        user.name,
        contactNumber,
        propertyId,
        property.name,
        date,
        time,
        message || null,
        agent?.id ?? null,
        agent?.name ?? null,
      ]
    );

    const [createdRows] = await db.execute(
      "SELECT * FROM appointments WHERE id = ? LIMIT 1",
      [result.insertId]
    );

    return sendJson(res, 201, {
      success: true,
      message: "Appointment submitted successfully.",
      appointment: formatAppointment(createdRows[0]),
    });

  } catch (error) {
    // Handle MySQL unique index duplicate booking error
    if (error.code === "ER_DUP_ENTRY") {
      return sendError(
        res,
        409,
        "That time slot is already booked. Please choose another."
      );
    }

    console.error("Could not create appointment:", error.message);
    return sendError(res, 500, "Could not create appointment.");
  }
};



const handleUpdateAppointment = async (req, res, appointmentId) => {
  const user = await getAuthUser(req);
  if (!user) return sendError(res, 401, "Please sign in again.");
  if (!["Admin", "Agent"].includes(user.role)) {
    return sendError(res, 403, "You are not allowed to update appointments.");
  }

  let body;
  try {
    body = await readJson(req);
  } catch {
    return sendError(res, 400, "Invalid appointment update request.");
  }

  const allowedStatuses = new Set(["Pending", "Confirmed", "Completed", "Cancelled"]);
  const status = String(body.status ?? "").trim();
  if (!allowedStatuses.has(status)) {
    return sendError(res, 400, "Invalid appointment status.");
  }

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [appointmentRows] = await connection.execute(
      `SELECT * FROM appointments WHERE id = ? FOR UPDATE`,
      [appointmentId]
    );

    if (!appointmentRows.length) {
      await connection.rollback();
      return sendError(res, 404, "Appointment not found.");
    }

    const current = appointmentRows[0];
    if (
      user.role === "Agent" &&
      Number(current.assigned_agent_id) !== Number(user.id)
    ) {
      await connection.rollback();
      return sendError(res, 403, "You can only update appointments assigned to you.");
    }

    let assignedAgentId = current.assigned_agent_id;
    let assignedAgentName = current.assigned_agent_name;

    if (user.role === "Admin" && Object.hasOwn(body, "assignedAgentId")) {
      if (body.assignedAgentId === null || body.assignedAgentId === "") {
        assignedAgentId = null;
        assignedAgentName = null;
      } else {
        const requestedAgentId = Number(body.assignedAgentId);
        if (!Number.isInteger(requestedAgentId) || requestedAgentId < 1) {
          await connection.rollback();
          return sendError(res, 400, "Invalid assigned agent.");
        }
        const [agentRows] = await connection.execute(
          `SELECT id, name FROM users WHERE id = ? AND role = 'Agent' AND status = 'Active' LIMIT 1`,
          [requestedAgentId]
        );
        if (!agentRows.length) {
          await connection.rollback();
          return sendError(res, 400, "The selected agent is not active or does not exist.");
        }
        assignedAgentId = agentRows[0].id;
        assignedAgentName = agentRows[0].name;
      }
    }

    await connection.execute(
      `UPDATE appointments
       SET status = ?, assigned_agent_id = ?, assigned_agent_name = ?
       WHERE id = ?`,
      [status, assignedAgentId, assignedAgentName, appointmentId]
    );

    const [updatedRows] = await connection.execute(
      `SELECT * FROM appointments WHERE id = ? LIMIT 1`,
      [appointmentId]
    );
    await connection.commit();

    console.log(`[APPOINTMENT UPDATE] User ${user.id} (${user.role}) updated appointment ${appointmentId} to ${status}.`);
    return sendJson(res, 200, {
      success: true,
      message: "Appointment updated successfully.",
      appointment: formatAppointment(updatedRows[0]),
    });
  } catch (error) {
    if (connection) {
      try { await connection.rollback(); } catch {}
    }
    console.error("[APPOINTMENT UPDATE] Could not update appointment:", error.stack || error.message);
    return sendError(res, 500, "Could not update appointment.");
  } finally {
    if (connection) connection.release();
  }
};

// ─── Appointment emails ────────────────────────────────────────────────────────

const APPT_TEMPLATES = {
  booked: {
    subject: "We received your Velora viewing request",
    intro: "Thank you! We received your viewing request. An agent will confirm it soon.",
  },
  confirmed: {
    subject: "Your Velora viewing is confirmed",
    intro: "Good news! Your property viewing has been confirmed. Please arrive on time.",
  },
  cancelled: {
    subject: "Your Velora viewing was cancelled",
    intro: "We're sorry, your property viewing has been cancelled. You can book another schedule anytime on Velora.",
  },
  completed: {
    subject: "Thank you for visiting with Velora",
    intro: "Thank you for attending your property viewing! We hope you liked the property. Contact us if you have any questions or want to book another viewing.",
  },
};

const buildAppointmentEmail = ({
  type,
  clientName,
  propertyTitle,
  date,
  time,
  agentName,
}) => {
  const { subject, intro } = APPT_TEMPLATES[type];
  const agentLine = agentName ? `\nAgent: ${agentName}` : "";

  return {
    subject,

    text: `Hi ${clientName},

${intro}

Property: ${propertyTitle}
Date: ${date}
Time: ${time}${agentLine}

- Velora`,

    html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px"><h2 style="margin:0 0 8px;color:#1e3a5f">Velora</h2><p style="color:#374151;font-size:14px">Hi ${escapeHtml(clientName)},</p><p style="color:#374151;font-size:14px">${intro}</p><table style="font-size:14px;color:#111827;margin:16px 0"><tr><td style="padding:4px 12px 4px 0;color:#6b7280">Property</td><td><b>${escapeHtml(propertyTitle)}</b></td></tr><tr><td style="padding:4px 12px 4px 0;color:#6b7280">Date</td><td><b>${escapeHtml(date)}</b></td></tr><tr><td style="padding:4px 12px 4px 0;color:#6b7280">Time</td><td><b>${escapeHtml(time)}</b></td></tr>${agentName ? `<tr><td style="padding:4px 12px 4px 0;color:#6b7280">Agent</td><td><b>${escapeHtml(agentName)}</b></td></tr>` : ""}</table><p style="color:#6b7280;font-size:12px">This is an automated message from Velora.</p></div>`,
  };
};


const handleAppointmentNotify = async (req, res) => {
  const user = await getAuthUser(req);

  if (!user) {
    return sendError(res, 401, "Please sign in again.");
  }

  if (!requireMailer(res)) return;

  let body;

  try {
    body = await readJson(req);
  } catch {
    return sendError(res, 400, "Invalid request body.");
  }

  const appointmentId = Number(body.appointmentId);
  const type = Object.hasOwn(APPT_TEMPLATES, body.type)
    ? body.type
    : null;

  if (!Number.isInteger(appointmentId) || appointmentId < 1 || !type) {
    return sendError(res, 400, "Invalid appointment notification request.");
  }

  try {
    const [rows] = await db.execute(
      `SELECT
        a.id,
        a.client_id,
        a.client_name,
        a.property_name,
        a.appointment_date,
        a.appointment_time,
        a.assigned_agent_id,
        a.assigned_agent_name,
        a.status,
        u.email AS client_email
      FROM appointments a
      INNER JOIN users u ON u.id = a.client_id
      WHERE a.id = ?
      LIMIT 1`,
      [appointmentId]
    );

    if (!rows.length) {
      return sendError(res, 404, "Appointment not found.");
    }

    const appointment = rows[0];

    // Clients may only send the booking confirmation for their own appointment.
    if (user.role === "Client") {
      if (
        Number(appointment.client_id) !== user.id ||
        type !== "booked" ||
        appointment.status !== "Pending"
      ) {
        return sendError(res, 403, "You cannot send this notification.");
      }
    } else if (user.role === "Agent") {
      if (
        Number(appointment.assigned_agent_id) !== user.id ||
        type === "booked"
      ) {
        return sendError(res, 403, "You cannot send this notification.");
      }
    } else if (user.role !== "Admin") {
      return sendError(res, 403, "Notification access is not allowed.");
    }

    const expectedStatus = {
      booked: "Pending",
      confirmed: "Confirmed",
      cancelled: "Cancelled",
      completed: "Completed",
    }[type];

    if (appointment.status !== expectedStatus) {
      return sendError(
        res,
        409,
        "The appointment status does not match this notification."
      );
    }

    const email = String(appointment.client_email ?? "")
      .trim()
      .toLowerCase();

    if (!isValidEmail(email)) {
      return sendError(res, 400, "The client's email address is invalid.");
    }

    const appointmentDate = appointment.appointment_date;
    const date = appointmentDate instanceof Date
      ? [
          appointmentDate.getFullYear(),
          String(appointmentDate.getMonth() + 1).padStart(2, "0"),
          String(appointmentDate.getDate()).padStart(2, "0"),
        ].join("-")
      : String(appointmentDate).slice(0, 10);

    const time = String(appointment.appointment_time ?? "");
    const clientName = String(appointment.client_name ?? "Client");
    const propertyTitle = String(appointment.property_name ?? "");
    const agentName = String(appointment.assigned_agent_name ?? "");

    if (!propertyTitle || !date || !time) {
      return sendError(res, 400, "Appointment details are incomplete.");
    }

    const key = `${appointment.id}:${type}`;

    if (
      Date.now() - (apptLastSent.get(key) ?? 0) <
      APPT_COOLDOWN_MS
    ) {
      return sendError(
        res,
        429,
        "Please wait a few seconds before sending again."
      );
    }

    await transporter.sendMail({
      from: `"Velora" <${GMAIL_USER}>`,
      to: email,
      ...buildAppointmentEmail({
        type,
        clientName,
        propertyTitle,
        date,
        time,
        agentName,
      }),
    });

    apptLastSent.set(key, Date.now());

    return sendJson(res, 200, {
      success: true,
      message: "Appointment email sent.",
    });
  } catch (error) {
    console.error("Could not send appointment email:", error.message);
    return sendError(res, 500, "We could not send the email.");
  }
};

// ─── Favorites API ────────────────────────────────────────────────────────────

const handleGetFavorites = async (req, res) => {
  const user = await getAuthUser(req);
  if (!user) return sendError(res, 401, "Please sign in again.");
  if (user.role !== "Client") {
    return sendError(res, 403, "Only clients can access favorites.");
  }

  try {
    const [favorites] = await db.execute(
      `SELECT
        f.id,
        f.client_id,
        f.property_id,
        f.date_saved,
        p.name AS property_name,
        p.type,
        p.location,
        p.price,
        p.image
      FROM favorites f
      INNER JOIN properties p ON p.id = f.property_id
      WHERE f.client_id = ?
      ORDER BY f.date_saved DESC`,
      [user.id]
    );

    return sendJson(res, 200, { success: true, favorites });
  } catch (error) {
    console.error("Could not load favorites:", error.message);
    return sendError(res, 500, "Could not load favorites.");
  }
};

const handleCreateFavorite = async (req, res) => {
  const user = await getAuthUser(req);
  if (!user) return sendError(res, 401, "Please sign in again.");
  if (user.role !== "Client") {
    return sendError(res, 403, "Only clients can save favorites.");
  }

  let body;
  try {
    body = await readJson(req);
  } catch {
    return sendError(res, 400, "Body must be valid JSON.");
  }

  const propertyId = Number(body.propertyId);
  if (!Number.isInteger(propertyId) || propertyId < 1) {
    return sendError(res, 400, "A valid propertyId is required.");
  }

  try {
    const [properties] = await db.execute(
      "SELECT id FROM properties WHERE id = ? LIMIT 1",
      [propertyId]
    );
    if (!properties.length) return sendError(res, 404, "Property not found.");

    await db.execute(
      "INSERT INTO favorites (client_id, property_id) VALUES (?, ?)",
      [user.id, propertyId]
    );

    return sendJson(res, 201, {
      success: true,
      message: "Property added to favorites.",
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return sendError(res, 409, "Property is already in favorites.");
    }
    console.error("Could not save favorite:", error.message);
    return sendError(res, 500, "Could not save favorite.");
  }
};

const handleDeleteFavorite = async (req, res, propertyId) => {
  const user = await getAuthUser(req);
  if (!user) return sendError(res, 401, "Please sign in again.");
  if (user.role !== "Client") {
    return sendError(res, 403, "Only clients can remove favorites.");
  }

  try {
    const [result] = await db.execute(
      "DELETE FROM favorites WHERE client_id = ? AND property_id = ?",
      [user.id, propertyId]
    );
    if (result.affectedRows === 0) {
      return sendError(res, 404, "Favorite not found.");
    }
    res.writeHead(204);
    return res.end();
  } catch (error) {
    console.error("Could not remove favorite:", error.message);
    return sendError(res, 500, "Could not remove favorite.");
  }
};

// ─── Properties API ────────────────────────────────────────────────────────────



const handleGetProperties = async (req, res) => {
  try {
    const {
      location,
      status,
      type,
      minPrice,
      maxPrice,
      bedrooms,
      page = "1",
      limit = "10",
    } = req.query;

    // Validate pagination
    const currentPage = Number(page);
    const pageSize = Number(limit);

    if (
      !Number.isInteger(currentPage) ||
      currentPage < 1 ||
      !Number.isInteger(pageSize) ||
      pageSize < 1 ||
      pageSize > 50
    ) {
      return sendError(res, 400, "Invalid pagination values.");
    }

    const offset = (currentPage - 1) * pageSize;

    const conditions = [];
    const params = [];

    if (location !== undefined && location !== "") {
      conditions.push("p.location LIKE ?");
      params.push(`%${String(location).trim()}%`);
    }

    if (status !== undefined && status !== "") {
      conditions.push("p.status = ?");
      params.push(String(status).trim());
    }

    if (type !== undefined && type !== "") {
      conditions.push("p.type = ?");
      params.push(String(type).trim());
    }

    let minimumPrice = null;
    let maximumPrice = null;

    if (minPrice !== undefined && minPrice !== "") {
      minimumPrice = Number(minPrice);

      if (!Number.isFinite(minimumPrice) || minimumPrice < 0) {
        return sendError(res, 400, "Invalid minimum price.");
      }

      conditions.push("p.price >= ?");
      params.push(minimumPrice);
    }

    if (maxPrice !== undefined && maxPrice !== "") {
      maximumPrice = Number(maxPrice);

      if (!Number.isFinite(maximumPrice) || maximumPrice < 0) {
        return sendError(res, 400, "Invalid maximum price.");
      }

      conditions.push("p.price <= ?");
      params.push(maximumPrice);
    }

    if (
      minimumPrice !== null &&
      maximumPrice !== null &&
      minimumPrice > maximumPrice
    ) {
      return sendError(
        res,
        400,
        "Minimum price cannot be greater than maximum price."
      );
    }

    if (bedrooms !== undefined && bedrooms !== "") {
      const count = Number(bedrooms);

      if (!Number.isInteger(count) || count < 0) {
        return sendError(res, 400, "Invalid bedroom count.");
      }

      conditions.push("p.bedrooms = ?");
      params.push(count);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const [countRows] = await db.execute(
      `SELECT COUNT(*) AS total
       FROM properties p
       ${whereClause}`,
      params
    );

    const total = Number(countRows[0].total);

    const [properties] = await db.execute(
      `SELECT
        p.*,
        COALESCE(
          JSON_ARRAYAGG(
            CASE
              WHEN pi.id IS NOT NULL THEN pi.image_url
              ELSE NULL
            END
          ),
          JSON_ARRAY()
        ) AS images
      FROM properties p
      LEFT JOIN property_images pi
        ON pi.property_id = p.id
      ${whereClause}
      GROUP BY p.id
      ORDER BY p.created_at DESC, p.id DESC
      LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    const formattedProperties = properties.map((property) => {
      let images = property.images;

      if (typeof images === "string") {
        try {
          images = JSON.parse(images);
        } catch {
          images = [];
        }
      }

      return {
        ...property,
        images: Array.isArray(images)
          ? images.filter(
              (image) => typeof image === "string" && image.trim()
            )
          : [],
      };
    });

    return sendJson(res, 200, {
      success: true,
      properties: formattedProperties,
      pagination: {
        currentPage,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("Could not load properties:", error.message);
    return sendError(res, 500, "Could not load properties.");
  }
};


const handleGetProperty = async (req, res, propertyId) => {
  try {
    const id = Number(propertyId);

    if (!Number.isInteger(id) || id < 1) {
      return sendError(res, 400, "Invalid property ID.");
    }

    const [rows] = await db.execute(
      `SELECT
        p.*,
        COALESCE(
          JSON_ARRAYAGG(
            CASE
              WHEN pi.id IS NOT NULL THEN pi.image_url
              ELSE NULL
            END
          ),
          JSON_ARRAY()
        ) AS images
      FROM properties p
      LEFT JOIN property_images pi
        ON pi.property_id = p.id
      WHERE p.id = ?
      GROUP BY p.id`,
      [id]
    );

    if (rows.length === 0) {
      return sendError(res, 404, "Property not found.");
    }

    const property = rows[0];

    let images = property.images;

    if (typeof images === "string") {
      try {
        images = JSON.parse(images);
      } catch {
        images = [];
      }
    }

    const formattedProperty = {
      ...property,
      images: Array.isArray(images)
        ? images.filter(
            (image) => typeof image === "string" && image.trim()
          )
        : [],
    };

    return sendJson(res, 200, {
      success: true,
      property: formattedProperty,
    });
  } catch (error) {
    console.error("Could not load property:", error.message);
    return sendError(res, 500, "Could not load property.");
  }
};


const handleGetPropertyImages = async (req, res, propertyId) => {
  try {
    const id = Number(propertyId);

    if (!Number.isInteger(id) || id < 1) {
      return sendError(res, 400, "Invalid property ID.");
    }

    const [rows] = await db.execute(
      `SELECT pi.image_url
       FROM property_images pi
       INNER JOIN properties p ON p.id = pi.property_id
       WHERE p.id = ?
       ORDER BY pi.id ASC`,
      [id]
    );

    return sendJson(res, 200, {
      success: true,
      images: rows
        .map((row) => row.image_url)
        .filter(
          (image) => typeof image === "string" && image.trim()
        ),
    });
  } catch (error) {
    console.error("Could not load property images:", error.message);
    return sendError(res, 500, "Could not load property images.");
  }
};


// Shared validation for creating and updating properties
const validatePropertyBody = (body) => {
  const name = String(body.name ?? "").trim();
  const type = String(body.type ?? "").trim();
  const location = String(body.location ?? "").trim();
  const description = String(body.description ?? "").trim();

  const price = Number(body.price);
  const bedrooms = Number(body.bedrooms ?? 0);
  const bathrooms = Number(body.bathrooms ?? 0);
  const size = Number(body.size);

  const status = body.status ?? "Available";
  const allowedStatuses = ["Available", "Sold", "Inactive"];

  const images = Array.isArray(body.images)
    ? body.images
    : body.image
      ? [body.image]
      : [];

  if (
    !name ||
    name.length > 180 ||
    !type ||
    type.length > 100 ||
    !location ||
    location.length > 255 ||
    !Number.isFinite(price) ||
    price <= 0 ||
    !Number.isInteger(bedrooms) ||
    bedrooms < 0 ||
    !Number.isInteger(bathrooms) ||
    bathrooms < 0 ||
    !Number.isFinite(size) ||
    size <= 0 ||
    !allowedStatuses.includes(status) ||
    images.length > 20 ||
    images.some(
      (image) =>
        typeof image !== "string" ||
        !image.trim() ||
        image.length > 100000
    )
  ) {
    return {
      error:
        "Provide valid property details and up to 20 valid image URLs. Price and size must be positive; bedroom and bathroom counts must be zero or greater.",
    };
  }

  return {
    value: {
      name,
      type,
      location,
      description,
      price,
      bedrooms,
      bathrooms,
      size,
      status,
      images: images.map((image) => image.trim()),
    },
  };
};


// ─── POST: Create Property ─────────────────────────────────────────────────────


const handleCreateProperty = async (req, res) => {
  const user = await getAuthUser(req);

  if (!user) {
    return sendError(res, 401, "Please sign in again.");
  }

  if (user.role !== "Admin") {
    return sendError(
      res,
      403,
      "Only administrators can create properties."
    );
  }

  let body;

  try {
    body = await readJson(req);
  } catch (error) {
    return sendError(res, 400, "Invalid request.", [
      error.message === "too large"
        ? "Request body is too large."
        : "Body must be valid JSON.",
    ]);
  }

  const validated = validatePropertyBody(body);

  if (validated.error) {
    return sendError(res, 400, "Invalid property data.", [
      validated.error,
    ]);
  }

  const {
    name,
    type,
    location,
    description,
    price,
    bedrooms,
    bathrooms,
    size,
    status,
    images,
  } = validated.value;

  let connection;
  let transactionStarted = false;

  try {
    connection = await db.getConnection();

    await connection.beginTransaction();
    transactionStarted = true;

    const [result] = await connection.execute(
      `INSERT INTO properties
        (name, type, location, price, bedrooms, bathrooms, size, description, image, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        type,
        location,
        price,
        bedrooms,
        bathrooms,
        size,
        description,
        images[0] ?? null,
        status,
      ]
    );

    const propertyId = result.insertId;

    for (const image of images) {
      await connection.execute(
        `INSERT INTO property_images (property_id, image_url)
         VALUES (?, ?)`,
        [propertyId, image]
      );
    }

    await connection.commit();
    transactionStarted = false;

    return sendJson(res, 201, {
      success: true,
      message: "Property created successfully.",
      property: {
        id: propertyId,
        name,
        type,
        location,
        price,
        bedrooms,
        bathrooms,
        size,
        description,
        image: images[0] ?? null,
        images,
        status,
      },
    });
  } catch (error) {
    if (connection && transactionStarted) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Rollback failed:", rollbackError.message);
      }
    }

    console.error("Could not create property:", error.message);
    return sendError(res, 500, "Could not create property.");
  } finally {
    if (connection) connection.release();
  }
};


// ─── PUT: Update Property ──────────────────────────────────────────────────────


const handleUpdateProperty = async (req, res, propertyId) => {
  const user = await getAuthUser(req);

  if (!user) {
    return sendError(res, 401, "Please sign in again.");
  }

  if (user.role !== "Admin") {
    return sendError(
      res,
      403,
      "Only administrators can update properties."
    );
  }

  let body;

  try {
    body = await readJson(req);
  } catch (error) {
    return sendError(res, 400, "Invalid request.", [
      error.message === "too large"
        ? "Request body is too large."
        : "Body must be valid JSON.",
    ]);
  }

  const validated = validatePropertyBody(body);

  if (validated.error) {
    return sendError(res, 400, "Invalid property data.", [
      validated.error,
    ]);
  }

  const {
    name,
    type,
    location,
    description,
    price,
    bedrooms,
    bathrooms,
    size,
    status,
    images,
  } = validated.value;

  let connection;
  let transactionStarted = false;

  try {
    connection = await db.getConnection();

    await connection.beginTransaction();
    transactionStarted = true;

    const [existing] = await connection.execute(
      "SELECT id FROM properties WHERE id = ? FOR UPDATE",
      [propertyId]
    );

    if (existing.length === 0) {
      await connection.rollback();
      transactionStarted = false;

      return sendError(res, 404, "Property not found.");
    }

    await connection.execute(
      `UPDATE properties
       SET name = ?, type = ?, location = ?, price = ?,
           bedrooms = ?, bathrooms = ?, size = ?,
           description = ?, image = ?, status = ?
       WHERE id = ?`,
      [
        name,
        type,
        location,
        price,
        bedrooms,
        bathrooms,
        size,
        description,
        images[0] ?? null,
        status,
        propertyId,
      ]
    );

    await connection.execute(
      "DELETE FROM property_images WHERE property_id = ?",
      [propertyId]
    );

    for (const image of images) {
      await connection.execute(
        `INSERT INTO property_images (property_id, image_url)
         VALUES (?, ?)`,
        [propertyId, image]
      );
    }

    await connection.commit();
    transactionStarted = false;

    return sendJson(res, 200, {
      success: true,
      message: "Property updated successfully.",
      property: {
        id: propertyId,
        name,
        type,
        location,
        price,
        bedrooms,
        bathrooms,
        size,
        description,
        image: images[0] ?? null,
        images,
        status,
      },
    });
  } catch (error) {
    if (connection && transactionStarted) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Rollback failed:", rollbackError.message);
      }
    }

    console.error("Could not update property:", error.message);
    return sendError(res, 500, "Could not update property.");
  } finally {
    if (connection) connection.release();
  }
};

// ─── DELETE: Archive Property (preserve appointments and history) ───────────────

const handleDeleteProperty = async (req, res, propertyId) => {
  const user = await getAuthUser(req);

  if (!user) {
    return sendError(res, 401, "Please sign in again.");
  }

  if (user.role !== "Admin") {
    return sendError(
      res,
      403,
      "Only administrators can archive properties."
    );
  }

  try {
    const [result] = await db.execute(
      "UPDATE properties SET status = 'Inactive' WHERE id = ?",
      [propertyId]
    );

    // MySQL may report zero changed rows when the property is already archived.
    if (result.affectedRows === 0) {
      const [existing] = await db.execute(
        "SELECT id FROM properties WHERE id = ? LIMIT 1",
        [propertyId]
      );
      if (existing.length === 0) {
        return sendError(res, 404, "Property not found.");
      }
    }

    return sendJson(res, 200, {
      success: true,
      message: "Property archived successfully. Appointment history has been preserved.",
      propertyId: Number(propertyId),
      status: "Inactive",
    });
  } catch (error) {
    console.error("Could not archive property:", {
      propertyId,
      code: error.code,
      message: error.message,
      sqlMessage: error.sqlMessage,
    });
    return sendError(res, 500, "Could not archive property.");
  }
};

// ─── HTTP server ───────────────────────────────────────────────────────────────

const app = express();

// Keep the existing local-development CORS policy.
app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (
    origin &&
    /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
  ) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    );
  }

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  next();
});

// Log every request so we can verify which server file receives it.
app.use((req, res, next) => {
  console.log(`[Velora request] PID=${process.pid} ${req.method} ${req.url}`);
  next();
});

// Make saved image files available to the frontend.
app.use("/uploads", express.static(UPLOAD_DIR));

// Handle property image uploads before the general API router.
// Only authenticated administrators may upload property images.
app.use(async (req, res, next) => {
  const route = (req.url ?? "").split("?")[0];
  console.log("[API ROUTER]", req.method, JSON.stringify(route));

  if (req.method !== "POST" || route !== "/api/v1/uploads") {
    return next();
  }

  let user;
  try {
    user = await getAuthUser(req);
  } catch (error) {
    console.error("[UPLOAD AUTH] Could not verify user:", error.message);
    return sendError(res, 500, "Could not verify upload permission.");
  }

  if (!user) {
    return sendError(res, 401, "Please sign in again.");
  }

  if (user.role !== "Admin") {
    return sendError(res, 403, "Only administrators can upload property images.");
  }

  console.log(`[Velora upload handler reached] PID=${process.pid} Admin=${user.id}`);

  upload.array("images", 20)(req, res, (error) => {
    if (error) {
      console.error("Image upload middleware error:", error.message);
      return sendError(res, 400, error.message || "Image upload failed.");
    }

    const files = req.files ?? [];

    if (files.length === 0) {
      return sendError(res, 400, "Please select at least one image.");
    }

    const images = files.map((file) => ({
      filename: file.filename,
      url: `/uploads/${file.filename}`,
    }));

    console.log(`[Velora upload success] ${files.length} image(s) saved to ${UPLOAD_DIR}`);

    return sendJson(res, 201, {
      success: true,
      message: "Images uploaded successfully.",
      images,
    });
  });
});


const handleUpdateMyProfile = async (req, res) => {
  const user = await getAuthUser(req);

  if (!user) {
    return sendError(res, 401, "Please sign in again.");
  }

  let body;

  try {
    body = await readJson(req);
  } catch (error) {
    return sendError(res, 400, "Invalid profile request.", [
      error.message === "too large"
        ? "Request body is too large."
        : "Body must be valid JSON.",
    ]);
  }

  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const contactNumber = String(body.contactNumber ?? "").trim();

  if (
    !name ||
    name.length > 120 ||
    !isValidEmail(email) ||
    email.length > 190 ||
    !/^[0-9+\-\s]{7,15}$/.test(contactNumber)
  ) {
    return sendError(
      res,
      400,
      "Provide a valid name, email, and contact number."
    );
  }

  try {
    const [existing] = await db.execute(
      `SELECT id FROM users
       WHERE email = ? AND id <> ?
       LIMIT 1`,
      [email, user.id]
    );

    if (existing.length > 0) {
      return sendError(res, 409, "That email is already in use.");
    }

    const [result] = await db.execute(
      `UPDATE users
       SET name = ?, email = ?, contact_number = ?
       WHERE id = ?`,
      [name, email, contactNumber, user.id]
    );

    if (!result.affectedRows) {
      return sendError(res, 404, "User account not found.");
    }

    const [rows] = await db.execute(
      `SELECT id, name, email, role, status, contact_number
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [user.id]
    );

    if (!rows.length) {
      return sendError(res, 404, "User account not found.");
    }

    return sendJson(res, 200, {
      success: true,
      message: "Profile updated successfully.",
      user: publicUser(rows[0]),
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return sendError(res, 409, "That email is already in use.");
    }

    console.error("Could not update profile:", error.message);
    return sendError(res, 500, "Could not update profile.");
  }
};

// ─── Authenticated user and admin user-list endpoints ────────────────────────
const handleMe = async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) return sendError(res, 401, "Please sign in again.");

    return sendJson(res, 200, {
      success: true,
      user,
    });
  } catch (error) {
    console.error("[AUTH ME] Could not load current user:", error);
    return sendError(res, 500, "Could not load your account.");
  }
};

const handleGetUsers = async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const [rows] = await db.execute(
      `SELECT id, name, email, role, status, contact_number
       FROM users
       ORDER BY id DESC`
    );

    return sendJson(res, 200, {
      success: true,
      users: rows.map(publicUser),
    });
  } catch (error) {
    console.error("[ADMIN USERS] Could not load users:", error);
    return sendError(res, 500, "Could not load user accounts.");
  }
};

const handleCreateAgent = async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const body = await readJson(req);

    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const contactNumber = String(body.contactNumber ?? "").trim();
    const password = String(body.password ?? "");

    if (
      !name ||
      name.length > 120 ||
      !isValidEmail(email) ||
      email.length > 190 ||
      !/^[0-9+\-\s]{7,15}$/.test(contactNumber) ||
      password.length < 8 ||
      password.length > 128
    ) {
      return sendError(res, 400, "Invalid agent details.", [
        "Provide a valid name, email, contact number, and password between 8 and 128 characters.",
      ]);
    }

    const [existing] = await db.execute(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [email]
    );

    if (existing.length > 0) {
      return sendError(
        res,
        409,
        "An account with this email already exists."
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const [result] = await db.execute(
      `INSERT INTO users (
        name,
        email,
        password_hash,
        role,
        status,
        contact_number
      )
      VALUES (?, ?, ?, 'Agent', 'Active', ?)`,
      [name, email, passwordHash, contactNumber]
    );

    const [rows] = await db.execute(
      `SELECT id, name, email, role, status, contact_number
       FROM users
       WHERE id = ?`,
      [result.insertId]
    );

    return sendJson(res, 201, {
      success: true,
      message: "Agent account created successfully.",
      user: publicUser(rows[0]),
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return sendError(
        res,
        409,
        "An account with this email already exists."
      );
    }

    console.error("[ADMIN USERS] Could not create agent:", error);
    return sendError(res, 500, "Could not create agent account.");
  }
};

// Existing API router. Keep the existing routes below.
app.use(async (req, res) => {
  const route = (req.url ?? "").split("?")[0];

 const propertyRouteMatch = route.match(
  /^\/api\/v1\/properties\/(\d+)(?:\/images)?$/
);
  const propertyId = propertyRouteMatch
  ? Number(propertyRouteMatch[1])
  : null;


  const appointmentRouteMatch = route.match(/^\/api\/v1\/appointments\/(\d+)$/);
  const appointmentId = appointmentRouteMatch ? Number(appointmentRouteMatch[1]) : null;
  const userRouteMatch = route.match(/^\/api\/v1\/users\/(\d+)\/toggle$/);
  const userId = userRouteMatch ? Number(userRouteMatch[1]) : null;
  const favoriteRouteMatch = route.match(/^\/api\/v1\/favorites\/(\d+)$/);
  const favoritePropertyId = favoriteRouteMatch
    ? Number(favoriteRouteMatch[1])
    : null;

  try {
    if (req.method === "GET" && route === "/api/v1/health") {
      return sendJson(res, 200, { success: true });
    }

    if (req.method === "POST" && route === "/api/v1/auth/register") {
      return await handleRegister(req, res);
    }

    if (req.method === "POST" && route === "/api/v1/auth/login") {
      return await handleLogin(req, res);
    }

    if (req.method === "GET" && route === "/api/v1/auth/me") {
      return await handleMe(req, res);
    }

    if (req.method === "PUT" && route === "/api/v1/auth/profile") {
      return await handleUpdateMyProfile(req, res);
    }

    if (req.method === "GET" && route === "/api/v1/users") {
      return await handleGetUsers(req, res);
    }

    if (req.method === "POST" && route === "/api/v1/users/agents") {
      return await handleCreateAgent(req, res);
    }

    if (req.method === "PATCH" && userId !== null) {
      return await handleToggleUser(req, res, userId);
    }

   if (req.method === "GET" && route === "/api/v1/appointments") {
  return await handleGetAppointments(req, res);
}

if (req.method === "GET" && appointmentId !== null) {
  return await handleGetAppointment(req, res, appointmentId);
}

if (req.method === "POST" && route === "/api/v1/appointments") {
  return await handleCreateAppointment(req, res);
}
    if (req.method === "PUT" && appointmentId !== null) {
      return await handleUpdateAppointment(req, res, appointmentId);
    }

    if (req.method === "GET" && route === "/api/v1/favorites") {
      return await handleGetFavorites(req, res);
    }

    if (req.method === "POST" && route === "/api/v1/favorites") {
      return await handleCreateFavorite(req, res);
    }

    if (req.method === "DELETE" && favoritePropertyId !== null) {
      return await handleDeleteFavorite(req, res, favoritePropertyId);
    }

    if (req.method === "GET" && route === "/api/v1/properties") {
      return await handleGetProperties(req, res);
    }
    if (
  req.method === "GET" &&
  propertyId !== null &&
  route === `/api/v1/properties/${propertyId}/images`
) {
  return await handleGetPropertyImages(req, res, propertyId);
}
if (req.method === "GET" && propertyId !== null) {
  return await handleGetProperty(req, res, propertyId);
}
    if (req.method === "POST" && route === "/api/v1/properties") {
      return await handleCreateProperty(req, res);
    }

    if (req.method === "PUT" && propertyId !== null) {
      return await handleUpdateProperty(req, res, propertyId);
    }

    if (req.method === "DELETE" && propertyId !== null) {
      return await handleDeleteProperty(req, res, propertyId);
    }

    if (req.method === "GET" && route === "/api/v1/ratings") {
      return await handleGetRatings(req, res);
    }

    if (req.method === "POST" && route === "/api/v1/ratings") {
      return await handleCreateRatings(req, res);
    }

    if (req.method === "POST" && route === "/api/v1/auth/forgot-password") {
      return await handleForgotPassword(req, res);
    }

    if (req.method === "POST" && route === "/api/v1/auth/reset-password") {
      return await handleResetPassword(req, res);
    }

    if (req.method === "POST" && route === "/api/v1/appointments/notify") {
      return await handleAppointmentNotify(req, res);
    }

    return sendError(
      res,
      404,
      "Not found.",
      [`No route for ${req.method} ${route}.`]
    );
  } catch (error) {
    if (error.message === "bad json" || error.message === "too large") {
      return sendError(res, 400, "Invalid request.", [
        "Body must be valid JSON.",
      ]);
    }

    console.error(error);
    return sendError(res, 500, "Something went wrong on the server.");
  }
});

app.listen(PORT, () => {
  console.log(`Velora API server running on http://localhost:${PORT}`);
  console.log(`Velora server file: ${fileURLToPath(import.meta.url)}`);
  console.log(`Velora server PID: ${process.pid}`);
  console.log("Velora image upload endpoint registered: POST /api/v1/uploads");

  if (!transporter) {
    console.log(
      "Email is disabled until GMAIL_USER and GMAIL_APP_PASSWORD are configured."
    );
  }
});
const handleToggleUser = async (req, res, userId) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const [result] = await db.execute(
      `UPDATE users
       SET status = CASE
         WHEN status = 'Active' THEN 'Inactive'
         ELSE 'Active'
       END
       WHERE id = ? AND role <> 'Admin'`,
      [userId]
    );

    if (result.affectedRows === 0) {
      return sendError(res, 404, "User not found or cannot be modified.");
    }

    const [rows] = await db.execute(
      `SELECT id, name, email, role, status, contact_number
       FROM users
       WHERE id = ?`,
      [userId]
    );

    return sendJson(res, 200, {
      success: true,
      message: "User status updated successfully.",
      user: publicUser(rows[0]),
    });
  } catch (error) {
    console.error("[ADMIN USERS] Could not update user:", error);
    return sendError(res, 500, "Could not update user status.");
  }
};
