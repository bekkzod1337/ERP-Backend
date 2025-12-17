import { pool } from "../../common/database/database.service.js";

// Barcha statistikani olish
export async function getAllStatistics(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT s.id, s.student_id, u.first_name, u.last_name,
              s.total_rank, s.group_rank, s.silver_earned, s.xp_earned
       FROM statistics s
       JOIN users u ON s.student_id = u.id
       ORDER BY s.id ASC`
    );
    res.status(200).json({ success: true, statistics: result.rows });
  } catch (err) {
    next(err);
  }
}

// O‘quvchi statistikasi
export async function getStudentStatistics(req, res, next) {
  try {
    const { studentId } = req.params;
    const result = await pool.query(
      `SELECT * FROM statistics WHERE student_id = $1`,
      [studentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Statistika topilmadi" });
    }

    res.status(200).json({ success: true, statistics: result.rows[0] });
  } catch (err) {
    next(err);
  }
}
// Bitta statistika olish (ID bo'yicha)
export async function getStatistic(req, res, next) {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT s.id, s.student_id, u.first_name, u.last_name,
              s.total_rank, s.group_rank, s.silver_earned, s.xp_earned
       FROM statistics s
       JOIN users u ON s.student_id = u.id
       WHERE s.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Statistika topilmadi" });
    }

    res.status(200).json({ success: true, statistics: result.rows[0] });
  } catch (err) {
    next(err);
  }
}
// Yangi statistika qo‘shish
export async function addStatistics(req, res, next) {
  try {
    const { student_id, total_rank = 0, group_rank = 0, silver_earned = 0, xp_earned = 0 } = req.body;

    if (!student_id) {
      return res.status(400).json({ success: false, message: "Student ID kerak" });
    }

    const result = await pool.query(
      `INSERT INTO statistics (student_id, total_rank, group_rank, silver_earned, xp_earned)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [student_id, total_rank, group_rank, silver_earned, xp_earned]
    );

    res.status(201).json({ success: true, statistics: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// Statistkani yangilash
export async function updateStatistics(req, res, next) {
  try {
    const { id } = req.params;
    const { total_rank, group_rank, silver_earned, xp_earned } = req.body;

    const result = await pool.query(
      `UPDATE statistics 
       SET total_rank = $1, group_rank = $2, silver_earned = $3, xp_earned = $4
       WHERE id = $5 RETURNING *`,
      [total_rank, group_rank, silver_earned, xp_earned, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Statistika topilmadi" });
    }

    res.status(200).json({ success: true, statistics: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// Statistkani o‘chirish
export async function deleteStatistics(req, res, next) {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `DELETE FROM statistics WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Statistika topilmadi" });
    }

    res.status(200).json({ success: true, message: "Statistika o‘chirildi" });
  } catch (err) {
    next(err);
  }
}
