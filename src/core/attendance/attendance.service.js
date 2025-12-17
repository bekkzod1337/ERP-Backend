import { pool } from "../../common/database/database.service.js";

// Kurs bo‘yicha barcha qatnashuvlarni olish
export async function getAllAttendance(req, res, next) {
  try {
    const { courseId } = req.params;
    const result = await pool.query(
      `SELECT a.id, a.student_id, u.first_name, u.last_name, a.attended_at, a.status
       FROM attendance a
       JOIN users u ON a.student_id = u.id
       WHERE a.course_id = $1
       ORDER BY a.attended_at DESC`,
      [courseId]
    );
    res.status(200).json({ success: true, attendance: result.rows });
  } catch (err) {
    next(err);
  }
}
// Bitta qatnashuvni olish
export async function getAttendance(req, res, next) {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT a.id, a.student_id, a.course_id, u.first_name, u.last_name, 
              c.name AS course_name, a.attended_at, a.status
       FROM attendance a
       JOIN users u ON a.student_id = u.id
       JOIN courses c ON a.course_id = c.id
       WHERE a.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Qatnashuv topilmadi" });
    }

    res.status(200).json({ success: true, attendance: result.rows[0] });
  } catch (err) {
    next(err);
  }
}
// Yangi qatnashuv qo‘shish
export async function addAttendance(req, res, next) {
  try {
    const { course_id, student_id, status } = req.body;

    if (!course_id || !student_id || !status) {
      return res.status(400).json({ success: false, message: "Barcha maydonlar to‘ldirilishi kerak" });
    }

    const result = await pool.query(
      `INSERT INTO attendance (course_id, student_id, status)
       VALUES ($1, $2, $3) RETURNING *`,
      [course_id, student_id, status]
    );

    res.status(201).json({ success: true, attendance: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// Qatnashuv holatini yangilash
export async function updateAttendance(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const result = await pool.query(
      `UPDATE attendance SET status = $1, attended_at = CURRENT_TIMESTAMP
       WHERE id = $2 RETURNING *`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Qatnashuv topilmadi" });
    }

    res.status(200).json({ success: true, attendance: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// Qatnashuvni o‘chirish
export async function deleteAttendance(req, res, next) {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "DELETE FROM attendance WHERE id = $1 RETURNING id",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Qatnashuv topilmadi" });
    }

    res.status(200).json({ success: true, message: "Qatnashuv o‘chirildi" });
  } catch (err) {
    next(err);
  }
}
