import { pool } from "../../common/database/database.service.js";

// Barcha to‘lovlarni olish
export async function getAllPayments(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT p.id, p.student_id, u.first_name, u.last_name, p.amount, p.status, p.payment_type, p.paid_at
       FROM payments p
       JOIN users u ON p.student_id = u.id
       ORDER BY p.id ASC`
    );
    res.status(200).json({ success: true, payments: result.rows });
  } catch (err) {
    next(err);
  }
}

// Bitta to‘lovni olish
export async function getPayment(req, res, next) {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT p.id, p.student_id, u.first_name, u.last_name, p.amount, p.status, p.payment_type, p.paid_at
       FROM payments p
       JOIN users u ON p.student_id = u.id
       WHERE p.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "To‘lov topilmadi" });
    }

    res.status(200).json({ success: true, payment: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// To‘lov qo‘shish
export async function addPayment(req, res, next) {
  try {
    const { student_id, amount, status, payment_type, paid_at } = req.body;

    if (!student_id || !amount) {
      return res.status(400).json({ success: false, message: "Student ID va miqdor kerak" });
    }

    const result = await pool.query(
      `INSERT INTO payments (student_id, amount, status, payment_type, paid_at)
       VALUES ($1, $2, COALESCE($3, 'paid'), COALESCE($4, 'naqd'), COALESCE($5, NOW()))
       RETURNING *`,
      [student_id, amount, status, payment_type, paid_at]
    );

    res.status(201).json({ success: true, message: "To‘lov qo‘shildi", payment: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// tolovni yangilash
export async function updatePayment(req, res, next) {
  try {
    const { id } = req.params;

    let { amount, status, payment_type, paid_at } = req.body;

    // undefined → null (COALESCE ishlashi uchun)
    amount = amount ?? null;
    status = status ?? null;
    payment_type = payment_type ?? null;
    paid_at = paid_at ?? null;

    const result = await pool.query(
      `
      UPDATE payments
      SET amount = COALESCE($1, amount),
          status = COALESCE($2, status),
          payment_type = COALESCE($3, payment_type),
          paid_at = COALESCE($4, paid_at)
      WHERE id = $5
      RETURNING *
      `,
      [amount, status, payment_type, paid_at, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "To‘lov topilmadi",
      });
    }

    res.status(200).json({
      success: true,
      message: "To‘lov yangilandi",
      payment: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
}



// To‘lovni o‘chirish
export async function deletePayment(req, res, next) {
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM payments WHERE id = $1 RETURNING id", [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "To‘lov topilmadi" });
    }

    res.status(200).json({ success: true, message: "To‘lov o‘chirildi" });
  } catch (err) {
    next(err);
  }
}

// Student bo‘yicha to‘lovlarni olish
export async function getPaymentsByStudent(req, res, next) {
  try {
    const { student_id } = req.params;
    const result = await pool.query(
      `SELECT p.id, p.student_id, u.first_name, u.last_name, p.amount, p.status, p.payment_type, p.paid_at
       FROM payments p
       JOIN users u ON p.student_id = u.id
       WHERE p.student_id = $1
       ORDER BY p.paid_at DESC`,
      [student_id]
    );

    res.status(200).json({ success: true, payments: result.rows });
  } catch (err) {
    next(err);
  }
}
