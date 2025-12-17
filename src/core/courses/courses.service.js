import { pool } from "../../common/database/database.service.js";

// Kurs qo'shish
export async function addCourse(req, res, next) {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Barcha maydonlar to‘ldirilishi kerak",
      });
    }

    const result = await pool.query(
      `INSERT INTO courses 
       (name)
       VALUES ($1)
       RETURNING *`,
      [name]
    );

    res.status(201).json({
      success: true,
      message: "Kurs muvaffaqiyatli qo'shildi!",
      course: result.rows[0],
    });
  } catch (error) {
    console.error("Kurs qo‘shishda xato:", error);
    next(error);
  }
}

// Barcha kurslarni olish
export async function getAllCourse(req, res, next) {
  try {
    const result = await pool.query(`
      SELECT * FROM courses
    `);

    res.status(200).json({ success: true, courses: result.rows });
  } catch (error) {
    console.error("Kurslarni olishda xato:", error.message);
    next(error);
  }
}

// Bitta kursni olish
export async function getCourse(req, res, next) {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT * FROM courses WHERE id=$1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Kurs topilmadi" });
    }

    res.status(200).json({ success: true, course: result.rows[0] });
  } catch (error) {
    console.error("Kursni olishda xato:", error.message);
    next(error);
  }
}

// Kursni yangilash
export async function updateCourse(req, res, next) {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const result = await pool.query(`
      UPDATE courses
      SET name=$1
      WHERE id=$2
      RETURNING *
    `, [name, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Kurs topilmadi" });
    }

    res.status(200).json({
      success: true,
      message: "Kurs muvaffaqiyatli yangilandi",
      course: result.rows[0],
    });
  } catch (error) {
    console.error("Kursni yangilashda xato:", error.message);
    next(error);
  }
}

// Kursni o'chirish
export async function deleteCourse(req, res, next) {
  try {
    const { id } = req.params;

    const result = await pool.query(`DELETE FROM courses WHERE id=$1 RETURNING *`, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Kurs topilmadi" });
    }

    res.status(200).json({ success: true, message: "Kurs muvaffaqiyatli o‘chirildi" });
  } catch (error) {
    console.error("Kursni o‘chirishda xato:", error.message);
    next(error);
  }
}
