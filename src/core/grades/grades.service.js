import { pool } from "../../common/database/database.service.js";

// Barcha baholarni olish (kurs bo‘yicha)
export async function getAllGrades(req, res, next) {
  try {
    const { courseId } = req.params;
    const result = await pool.query(
      `SELECT g.id, g.student_id, u.first_name, u.last_name, g.grade, g.graded_at
       FROM grades g
       JOIN users u ON g.student_id = u.id
       WHERE g.course_id = $1
       ORDER BY g.graded_at DESC`,
      [courseId]
    );
    res.status(200).json({ success: true, grades: result.rows });
  } catch (err) {
    next(err);
  }
}
// Bitta baho olish
export async function getGrade(req, res, next) {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT g.id, g.course_id, g.student_id, u.first_name, u.last_name, g.grade, g.graded_at
       FROM grades g
       JOIN users u ON g.student_id = u.id
       WHERE g.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Baho topilmadi" });
    }

    res.status(200).json({ success: true, grade: result.rows[0] });
  } catch (err) {
    next(err);
  }
}
// Yangi baho qo‘shish
export async function addGrade(req, res, next) {
  try {
    const { course_id, student_id, grade } = req.body;

    if (!course_id || !student_id || grade === undefined) {
      return res.status(400).json({ success: false, message: "Barcha maydonlar to‘ldirilishi kerak" });
    }

    const result = await pool.query(
      `INSERT INTO grades (course_id, student_id, grade) 
       VALUES ($1, $2, $3) RETURNING *`,
      [course_id, student_id, grade]
    );

    res.status(201).json({ success: true, grade: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// Baho yangilash
export async function updateGrade(req, res, next) {
  try {
    const { id } = req.params;
    const { grade } = req.body;

    const result = await pool.query(
      `UPDATE grades SET grade = $1, graded_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [grade, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Baho topilmadi" });
    }

    res.status(200).json({ success: true, grade: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// Baho o‘chirish
export async function deleteGrade(req, res, next) {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "DELETE FROM grades WHERE id = $1 RETURNING id",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Baho topilmadi" });
    }

    res.status(200).json({ success: true, message: "Baho o‘chirildi" });
  } catch (err) {
    next(err);
  }
}
