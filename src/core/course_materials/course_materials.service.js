import { pool } from "../../common/database/database.service.js";

// Barcha kurs materiallarini olish (kurs bo‘yicha)
export async function getAllMaterials(req, res, next) {
  try {
    const { courseId } = req.params;
    const result = await pool.query(
      "SELECT * FROM course_materials WHERE course_id = $1 ORDER BY uploaded_at DESC",
      [courseId]
    );
    res.status(200).json({ success: true, materials: result.rows });
  } catch (err) {
    next(err);
  }
}
// Bitta materialni olish
export async function getMaterial(req, res, next) {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "SELECT * FROM course_materials WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Material topilmadi" });
    }

    res.status(200).json({ success: true, material: result.rows[0] });
  } catch (err) {
    next(err);
  }
}
// Yangi material qo‘shish
export async function addMaterial(req, res, next) {
  try {
    const { course_id, title, description, file_url } = req.body;

    if (!course_id || !title) {
      return res.status(400).json({ success: false, message: "Kurs va sarlavha kerak" });
    }

    const result = await pool.query(
      `INSERT INTO course_materials 
       (course_id, title, description, file_url) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [course_id, title, description || null, file_url || null]
    );

    res.status(201).json({ success: true, material: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// Materialni o‘chirish
export async function deleteMaterial(req, res, next) {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "DELETE FROM course_materials WHERE id = $1 RETURNING id",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Material topilmadi" });
    }

    res.status(200).json({ success: true, message: "Material o‘chirildi" });
  } catch (err) {
    next(err);
  }
}

// Materialni yangilash
export async function updateMaterial(req, res, next) {
  try {
    const { id } = req.params;
    const { title, description, file_url } = req.body;

    const result = await pool.query(
      `UPDATE course_materials 
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           file_url = COALESCE($3, file_url)
       WHERE id = $4 RETURNING *`,
      [title, description, file_url, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Material topilmadi" });
    }

    res.status(200).json({ success: true, material: result.rows[0] });
  } catch (err) {
    next(err);
  }
}
