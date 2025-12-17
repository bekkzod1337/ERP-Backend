import { pool } from "../../common/database/database.service.js";


//barcha foydalanuvchining xabarlarini olish
export async function getNotifications(req, res, next) {
  try {
    const result = await pool.query(
      "SELECT * FROM notifications ORDER BY created_at DESC"
    );
    res.status(200).json({ success: true, notifications: result.rows });
  } catch (err) {
    next(err);
  }
}
// Barcha xabarlarni olish (foydalanuvchi bo‘yicha)
export async function getAllNotifications(req, res, next) {
  try {
    const { userId } = req.params;
    const result = await pool.query(
      "SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC",
      [userId]
    );
    res.status(200).json({ success: true, notifications: result.rows });
  } catch (err) {
    next(err);
  }
}
// Bitta xabarni olish
export async function getNotification(req, res, next) {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "SELECT * FROM notifications WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Xabar topilmadi" });
    }

    res.status(200).json({ success: true, notification: result.rows[0] });
  } catch (err) {
    next(err);
  }
}
// Yangi xabar qo‘shish
export async function addNotification(req, res, next) {
  try {
    const { user_id, message } = req.body;

    if (!user_id || !message) {
      return res.status(400).json({ success: false, message: "Foydalanuvchi va xabar kerak" });
    }

    const result = await pool.query(
      "INSERT INTO notifications (user_id, message) VALUES ($1, $2) RETURNING *",
      [user_id, message]
    );

    res.status(201).json({ success: true, notification: result.rows[0] });
  } catch (err) {
    next(err);
  }
}
// Xabar holatini yangilash (is_read)
export async function updateNotification(req, res, next) {
  try {
    const { id } = req.params;
    const { is_read } = req.body;

    const result = await pool.query(
      "UPDATE notifications SET is_read = $1 WHERE id = $2 RETURNING *",
      [is_read !== undefined ? is_read : true, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Xabar topilmadi" });
    }

    res.status(200).json({ success: true, notification: result.rows[0] });
  } catch (err) {
    next(err);
  }
}
// Xabarni o‘chirish
export async function deleteNotification(req, res, next) {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "DELETE FROM notifications WHERE id = $1 RETURNING id",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Xabar topilmadi" });
    }

    res.status(200).json({ success: true, message: "Xabar o‘chirildi" });
  } catch (err) {
    next(err);
  }
}

// Xabarni o‘qilgan deb belgilash
export async function markAsRead(req, res, next) {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "UPDATE notifications SET is_read = true WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Xabar topilmadi" });
    }

    res.status(200).json({ success: true, notification: result.rows[0] });
  } catch (err) {
    next(err);
  }
}
