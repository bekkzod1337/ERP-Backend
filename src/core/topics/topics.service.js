import { pool } from "../../common/database/database.service.js";

// Barcha mavzularni olish
export async function getAllTopics(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT t.id, t.course_id, c.name AS course_name, t.name AS topic_name, 
              t.video_url, t.homework_status, t.homework_due, t.lesson_date
       FROM topics t
       JOIN courses c ON t.course_id = c.id
       ORDER BY t.id ASC`
    );
    res.status(200).json({ success: true, topics: result.rows });
  } catch (err) {
    next(err);
  }
}

// Kursga tegishli mavzularni olish
export async function getCourseTopics(req, res, next) {
  try {
    const { courseId } = req.params;
    const result = await pool.query(
      `SELECT * FROM topics WHERE course_id = $1 ORDER BY lesson_date ASC`,
      [courseId]
    );
    res.status(200).json({ success: true, topics: result.rows });
  } catch (err) {
    next(err);
  }
}
// Bitta mavzuni olish
export async function getTopic(req, res, next) {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT t.id, t.course_id, c.name AS course_name, t.name AS topic_name, 
              t.video_url, t.homework_status, t.homework_due, t.lesson_date
       FROM topics t
       JOIN courses c ON t.course_id = c.id
       WHERE t.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Mavzu topilmadi" });
    }

    res.status(200).json({ success: true, topic: result.rows[0] });
  } catch (err) {
    next(err);
  }
}
// Yangi mavzu qo‘shish
export async function addTopic(req, res, next) {
  try {
    const { course_id, name, video_url, homework_status, homework_due, lesson_date } = req.body;

    if (!course_id || !name) {
      return res.status(400).json({ success: false, message: "Course ID va mavzu nomi kerak" });
    }

    const result = await pool.query(
      `INSERT INTO topics (course_id, name, video_url, homework_status, homework_due, lesson_date)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [course_id, name, video_url || null, homework_status || "berilmagan", homework_due || null, lesson_date || new Date()]
    );

    res.status(201).json({ success: true, topic: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// Mavzuni yangilash
export async function updateTopic(req, res, next) {
  try {
    const { id } = req.params;
    const { name, video_url, homework_status, homework_due, lesson_date } = req.body;

    const result = await pool.query(
      `UPDATE topics 
       SET name = $1, video_url = $2, homework_status = $3, homework_due = $4, lesson_date = $5
       WHERE id = $6 RETURNING *`,
      [name, video_url, homework_status, homework_due, lesson_date, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Mavzu topilmadi" });
    }

    res.status(200).json({ success: true, topic: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// Mavzuni o‘chirish
export async function deleteTopic(req, res, next) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM topics WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Mavzu topilmadi" });
    }

    res.status(200).json({ success: true, message: "Mavzu o‘chirildi" });
  } catch (err) {
    next(err);
  }
}
 