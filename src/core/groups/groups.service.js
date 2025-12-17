import { pool } from "../../common/database/database.service.js";

// Barcha guruhlarni olish
export async function getAllGroups(req, res, next) {
  try {
    const result = await pool.query(`
      SELECT 
        g.id,
        g.name,
        g.course_id,
        c.name AS course_name,
        g.teacher_id,
        u.first_name AS teacher_first_name,
        u.last_name AS teacher_last_name,
        g.start_time,
        g.end_time,
        g.price,
        g.start_date,
        g.room_id,
        r.name AS room_name
      FROM groups g
      JOIN courses c ON g.course_id = c.id
      LEFT JOIN users u ON g.teacher_id = u.id
      LEFT JOIN rooms r ON g.room_id = r.id
      ORDER BY g.id ASC
    `);

    res.status(200).json({ success: true, groups: result.rows });
  } catch (err) {
    next(err);
  }
}


// bitta kursga tegishli guruhlarni olish
export async function getOneGroup(req, res, next) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT 
        g.id,
        g.name,
        g.course_id,
        c.name AS course_name,
        g.teacher_id,
        u.first_name AS teacher_first_name,
        u.last_name AS teacher_last_name,
        g.start_date,
        g.start_time,
        g.end_time,
        g.price,
        g.room_id,
        r.name AS room_name
      FROM groups g
      JOIN courses c ON g.course_id = c.id
      LEFT JOIN users u ON g.teacher_id = u.id
      LEFT JOIN rooms r ON g.room_id = r.id
      WHERE g.id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Guruh topilmadi" });
    }

    const row = result.rows[0];

    const group = { 
      id: row.id,
      name: row.name,
      teacher_id: row.teacher_id,
      teacher_first_name: row.teacher_first_name || "",
      teacher_last_name: row.teacher_last_name || "",
      course_id: row.course_id,
      course_name: row.course_name,
      start_time: row.start_time,
      end_time: row.end_time,
      start_date: row.start_date || null,
      price: row.price,
      room_id: row.room_id,
      room_name: row.room_name || "",
    };

    res.status(200).json({ success: true, group });
  } catch (err) {
    next(err);
  }
}


// Kursga tegishli guruhlarni olish
export async function getCourseGroups(req, res, next) {
  try {
    const { courseId } = req.params;
    const result = await pool.query(
      `SELECT g.id, g.name AS group_name, g.course_id, c.name AS course_name
       FROM groups g
       JOIN courses c ON g.course_id = c.id
       WHERE g.course_id = $1
       ORDER BY g.name ASC`,
      [courseId]
    );
    res.status(200).json({ success: true, groups: result.rows });
  } catch (err) {
    next(err);
  }
}

// Yangi guruh qo‘shish
export async function addGroup(req, res, next) {
  try {
    const { course_id, name, teacher_id, room_id, start_time, end_time, price } = req.body;

    if (!course_id || !name) {
      return res.status(400).json({ success: false, message: "Course ID va guruh nomi kerak" });
    }

    const result = await pool.query(
      `INSERT INTO groups 
       (course_id, name, teacher_id, room_id, start_time, end_time, price) 
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [course_id, name, teacher_id || null, room_id || null, start_time || null, end_time || null, price || null]
    );

    res.status(201).json({ success: true, group: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// Guruhni yangilash
export async function updateGroup(req, res, next) {
  try {
    const { id } = req.params;
    const { name, course_id, teacher_id, room_id, start_time, end_time, price } = req.body;

    const result = await pool.query(
      `UPDATE groups SET 
         name = COALESCE($1, name),
         course_id = COALESCE($2, course_id),
         teacher_id = COALESCE($3, teacher_id),
         room_id = COALESCE($4, room_id),
         start_time = COALESCE($5, start_time),
         end_time = COALESCE($6, end_time),
         price = COALESCE($7, price)
       WHERE id = $8
       RETURNING *`,
      [name, course_id, teacher_id, room_id, start_time, end_time, price, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Guruh topilmadi" });
    }

    res.status(200).json({ success: true, group: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// Guruhni o‘chirish
export async function deleteGroup(req, res, next) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM groups WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Guruh topilmadi" });
    }

    res.status(200).json({ success: true, message: "Guruh o‘chirildi" });
  } catch (err) {
    next(err);
  }
}

// Teacherga tegishli guruhlarni olish
export async function getTeacherGroups(req, res, next) {
  try {
    const teacherId = req.user.id; // token orqali olinadi

    const result = await pool.query(
      `
      SELECT 
        g.id,
        g.name,
        g.course_id,
        c.name AS course_name,
        g.start_time,
        g.end_time,
        g.start_date,
        g.price,
        g.room_id,
        r.name AS room_name,
        u.first_name AS teacher_first_name,
        u.last_name AS teacher_last_name
      FROM groups g
      JOIN courses c ON g.course_id = c.id
      LEFT JOIN rooms r ON g.room_id = r.id
      LEFT JOIN users u ON g.teacher_id = u.id
      WHERE g.teacher_id = $1
      ORDER BY g.id DESC
      `,
      [teacherId]
    );

    // Frontend Group tipiga moslab obyekt yaratish
    const groups = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      teacher_id: teacherId,
      teacher_first_name: row.teacher_first_name || "",
      teacher_last_name: row.teacher_last_name || "",
      course_id: row.course_id,
      course_name: row.course_name,
      start_time: row.start_time,
      end_time: row.end_time,
      start_date: row.start_date,
      price: row.price,
      room_id: row.room_id,
      room_name: row.room_name || "",
    }));

    res.status(200).json({ success: true, groups });
  } catch (err) {
    next(err);
  }
}


