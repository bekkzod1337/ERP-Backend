import { pool } from "../../common/database/database.service.js";

// Hona qo'shish
export async function addRoom(req, res, next) {
  try {
    const { name } = req.body;

    if (!name) {
      return res
        .status(400)
        .json({ success: false, message: "Xona nomi majburiy" });
    }

    const result = await pool.query(
      `INSERT INTO rooms (name) VALUES ($1) RETURNING *`,
      [name]
    );

    res.status(201).json({
      success: true,
      message: "Xona muvaffaqiyatli yaratildi",
      room: result.rows[0],
    });
  } catch (error) {
    console.error("Xona yaratishda xato:", error.message);
    next(error);
  }
}

/* =========================
   READ — barcha xonalar
========================= */
export async function getAllRooms(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT * FROM rooms ORDER BY id ASC`
    );

    res.status(200).json({
      success: true,
      rooms: result.rows,
    });
  } catch (error) {
    console.error("Xonalarni olishda xato:", error.message);
    next(error);
  }
}

/* =========================
   READ — bitta xona
========================= */
export async function getRoomById(req, res, next) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT * FROM rooms WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Xona topilmadi",
      });
    }

    res.status(200).json({
      success: true,
      room: result.rows[0],
    });
  } catch (error) {
    console.error("Xonani olishda xato:", error.message);
    next(error);
  }
}

/* =========================
   UPDATE — xonani yangilash
========================= */
export async function updateRoom(req, res, next) {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const result = await pool.query(
      `UPDATE rooms
       SET name = COALESCE($1, name)
       WHERE id = $2
       RETURNING *`,
      [name, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Xona topilmadi",
      });
    }

    res.status(200).json({
      success: true,
      message: "Xona yangilandi",
      room: result.rows[0],
    });
  } catch (error) {
    console.error("Xonani yangilashda xato:", error.message);
    next(error);
  }
}

/* =========================
   DELETE — xonani o‘chirish
========================= */
export async function deleteRoom(req, res, next) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM rooms WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Xona topilmadi",
      });
    }

    res.status(200).json({
      success: true,
      message: "Xona o‘chirildi",
    });
  } catch (error) {
    console.error("Xonani o‘chirishda xato:", error.message);
    next(error);
  }
}