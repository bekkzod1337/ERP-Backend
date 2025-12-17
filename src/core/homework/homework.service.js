import { pool } from "../../common/database/database.service.js";

// Barcha vazifalarni olish
export async function getAllHomework(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT h.*, t.name AS topic_name, t.course_id
       FROM homework h
       JOIN topics t ON h.topic_id = t.id
       ORDER BY h.id ASC`
    );
    res.status(200).json({ success: true, homework: result.rows });
  } catch (err) {
    next(err);
  }
}

// Ma’lum topic uchun vazifalarni olish
export async function getTopicHomework(req, res, next) {
  try {
    const { topicId } = req.params;
    const result = await pool.query(
      `SELECT * FROM homework WHERE topic_id = $1 ORDER BY id ASC`,
      [topicId]
    );
    res.status(200).json({ success: true, homework: result.rows });
  } catch (err) {
    next(err);
  }
}
// Bitta vazifani olish
export async function getHomework(req, res, next) {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT h.*, t.name AS topic_name, t.course_id
       FROM homework h
       JOIN topics t ON h.topic_id = t.id
       WHERE h.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Vazifa topilmadi" });
    }

    res.status(200).json({ success: true, homework: result.rows[0] });
  } catch (err) {
    next(err);
  }
}
// Yangi vazifa qo‘shish (o'qituvchi)
export async function addHomework(req, res, next) {
  try {
    const { topic_id, teacher_comment, teacher_file_url } = req.body;

    if (!topic_id) {
      return res.status(400).json({ success: false, message: "Topic ID kerak" });
    }

    const result = await pool.query(
      `INSERT INTO homework (topic_id, teacher_comment, teacher_file_url) VALUES ($1, $2, $3) RETURNING *`,
      [topic_id, teacher_comment || null, teacher_file_url || null]
    );

    res.status(201).json({ success: true, homework: result.rows[0] });
  } catch (err) {
    next(err);
  }
}
// O'qituvchi vazifasini yangilash (teacher comment va file)
export async function updateHomework(req, res, next) {
  try {
    const { id } = req.params;
    const { teacher_comment, teacher_file_url } = req.body;

    const result = await pool.query(
      `UPDATE homework
       SET teacher_comment = $1, teacher_file_url = $2
       WHERE id = $3
       RETURNING *`,
      [teacher_comment, teacher_file_url, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Vazifa topilmadi" });
    }

    res.status(200).json({ success: true, homework: result.rows[0] });
  } catch (err) {
    next(err);
  }
}
// O‘quvchi vazifasini yangilash (student_comment va student_file_url)
export async function submitHomework(req, res, next) {
  try {
    const { id } = req.params;
    const { student_comment, student_file_url } = req.body;

    const result = await pool.query(
      `UPDATE homework
       SET student_comment = $1, student_file_url = $2, student_submitted_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [student_comment || null, student_file_url || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Vazifa topilmadi" });
    }

    res.status(200).json({ success: true, homework: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// Vazifani o‘chirish
export async function deleteHomework(req, res, next) {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `DELETE FROM homework WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Vazifa topilmadi" });
    }

    res.status(200).json({ success: true, message: "Vazifa o‘chirildi" });
  } catch (err) {
    next(err);
  }
}
