import { pool } from "../../common/database/database.service.js";

// O‘quvchini guruhga qo‘shish
export async function addStudent(req, res, next) {
  try {
    const { group_id, student_id } = req.body;

    if (!group_id || !student_id) {
      return res.status(400).json({ success: false, message: "group_id va student_id kerak" });
    }

    const result = await pool.query(
      `INSERT INTO group_students (group_id, student_id)
       VALUES ($1, $2)
       ON CONFLICT (group_id, student_id) DO NOTHING
       RETURNING *`,
      [group_id, student_id]
    );

    if (!result.rows.length) {
      return res.status(400).json({ success: false, message: "O'quvchi allaqachon shu guruhga qo'shilgan" });
    }

    res.status(201).json({ success: true, student: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// Barcha o‘quvchilarni olish
// Barcha o‘quvchilarni olish (faqat teacherga tegishli guruhlar)
export async function getAllStudents(req, res, next) {
  try {
    const teacherId = req.user.id; // token orqali olinadi

    const result = await pool.query(`
      SELECT 
        gs.id, 
        gs.group_id, 
        gs.student_id, 
        gs.joined_at, 
        u.first_name, 
        u.last_name,
        g.name AS group_name
      FROM group_students gs
      JOIN users u ON gs.student_id = u.id
      JOIN groups g ON gs.group_id = g.id
      WHERE g.teacher_id = $1
      ORDER BY gs.id DESC
    `, [teacherId]);

    res.status(200).json({ success: true, students: result.rows });
  } catch (err) {
    next(err);
  }
}



// Bitta yozuvni olish
export async function getStudent(req, res, next) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT gs.id, gs.group_id, gs.student_id, gs.joined_at, u.first_name, u.last_name
       FROM group_students gs
       JOIN users u ON gs.student_id = u.id
       WHERE gs.id = $1`,
      [id]
    );

    if (!result.rows.length) return res.status(404).json({ success: false, message: "Topilmadi" });

    res.status(200).json({ success: true, student: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// O‘quvchi yozuvini update qilish
export async function updateStudent(req, res, next) {
  try {
    const { id } = req.params;
    const { group_id, student_id } = req.body;

    const result = await pool.query(
      `UPDATE group_students
       SET group_id = $1, student_id = $2
       WHERE id = $3
       RETURNING *`,
      [group_id, student_id, id]
    );

    if (!result.rows.length) return res.status(404).json({ success: false, message: "Topilmadi" });

    res.status(200).json({ success: true, student: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// O‘quvchini o‘chirish
export async function deleteStudent(req, res, next) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM group_students WHERE id = $1 RETURNING *`,
      [id]
    );

    if (!result.rows.length) return res.status(404).json({ success: false, message: "Topilmadi" });

    res.status(200).json({ success: true, message: "O‘chirilgan", student: result.rows[0] });
  } catch (err) {
    next(err);
  }
}


// admin uchun 1ta guruhga tegishli barcha o‘quvchilarni olish
export async function getAllStudentsAdmin(req, res, next) {
  try {
    const { id } = req.params;

    // Birinchi, guruh mavjudligini tekshir
    const groupCheck = await pool.query(
      `SELECT id FROM groups WHERE id = $1`,
      [id]
    );

    let result;

    if (groupCheck.rows.length) {
      // Guruh ID bo'lsa - shu guruhga tegishli barcha o'quvchilarni qaytarish
      result = await pool.query(`
        SELECT 
          gs.id,
          gs.group_id,
          gs.student_id,
          gs.joined_at,
          u.first_name,
          u.last_name,
          g.name AS group_name
        FROM group_students gs
        JOIN users u ON gs.student_id = u.id
        JOIN groups g ON gs.group_id = g.id
        WHERE gs.group_id = $1
        ORDER BY gs.id DESC
      `, [id]);
    } else {
      // Student ID bo'lsa - o'shbu o'quvchining barcha guruhlarini qaytarish
      result = await pool.query(`
        SELECT 
          gs.id,
          gs.group_id,
          gs.student_id,
          gs.joined_at,
          u.first_name,
          u.last_name,
          g.name AS group_name
        FROM group_students gs
        JOIN users u ON gs.student_id = u.id
        JOIN groups g ON gs.group_id = g.id
        WHERE gs.student_id = $1
        ORDER BY gs.id DESC
      `, [id]);
    }

    res.status(200).json({ success: true, students: result.rows });
  } catch (err) {
    next(err);
  }
}