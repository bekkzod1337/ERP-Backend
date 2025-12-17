import { pool } from "../../common/database/database.service.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import getConfig from "../../common/config/config.service.js";
import e from "express";

// Barcha foydalanuvchilarni olish
export async function getAllUser(req, res, next) {
  try {
    const result = await pool.query("SELECT * FROM users ORDER BY id ASC");
    res.status(200).json({ success: true, users: result.rows });
  } catch (err) {
    next(err);
  }
}

// Bitta foydalanuvchini olish
export async function getUser(req, res, next) {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM users WHERE id = $1", [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Foydalanuvchi topilmadi" });
    }

    res.status(200).json({ success: true, user: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// Foydalanuvchi qo'shish
export async function addUser(req, res, next) {
  try {
    const {
      first_name,
      last_name,
      password,
      role,
      gender = "unknown",
      phone = null,
      photo_url = null,
      birth_date = null,
      is_active = true
    } = req.body;

    if (!first_name || !last_name || !password || !role) {
      return res
        .status(400)
        .json({ success: false, message: "Barcha required maydonlar to‘ldirilishi kerak" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users
      (first_name, last_name, password, role, gender, phone, photo_url, birth_date, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, first_name, last_name, role, gender, phone, photo_url, birth_date, is_active, created_at`,
      [first_name, last_name, hashedPassword, role, gender, phone, photo_url, birth_date, is_active]
    );

    res.status(201).json({
      success: true,
      message: "Foydalanuvchi qo‘shildi",
      user: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
}
// Foydalanuvchini yangilash (ixtiyoriy maydonlar)

export async function updateUser(req, res, next) {
  try {
    const { id } = req.params;
    const {
      first_name,
      last_name,
      password,
      role,
      gender,
      phone,
      photo_url,
      birth_date,
      is_active,
    } = req.body;

    const existing = await pool.query("SELECT * FROM users WHERE id=$1", [id]);

    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Foydalanuvchi topilmadi" });
    }

    const user = existing.rows[0];

    let hashedPassword = user.password;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // Update query barcha maydonlar bilan
    const updated = await pool.query(
      `
      UPDATE users
      SET first_name = $1,
          last_name = $2,
          password = $3,
          role = $4,
          gender = $5,
          phone = $6,
          photo_url = $7,
          birth_date = $8,
          is_active = $9
      WHERE id = $10
      RETURNING id, first_name, last_name, role, gender, phone, photo_url, birth_date, is_active, created_at
      `,
      [
        first_name || user.first_name,
        last_name || user.last_name,
        hashedPassword,
        role || user.role,
        gender || user.gender,
        phone || user.phone,
        photo_url || user.photo_url,
        birth_date || user.birth_date,
        typeof is_active === "boolean" ? is_active : user.is_active,
        id,
      ]
    );

    res.status(200).json({
      success: true,
      message: "Foydalanuvchi yangilandi",
      user: updated.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server xatoligi", error: err.message });
  }
}


// Foydalanuvchini o'chirish
export async function deleteUser(req, res, next) {
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM users WHERE id = $1 RETURNING id", [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Foydalanuvchi topilmadi" });
    }

    res.status(200).json({ success: true, message: "Foydalanuvchi o‘chirildi" });
  } catch (err) {
    next(err);
  }
}

// Role bo‘yicha foydalanuvchilarni olish
export async function getUsersByRole(req, res, next) {
  try {
    // Route param orqali olamiz (query emas!)
    const role = req.params.role; // /:role dan keladi
    console.log("Requested role:", role);
    
    if (!role) {
      return res.status(400).json({ success: false, message: "Role not specified" });
    }
    
    // SQL injection oldini olish uchun parameterized query
    const result = await pool.query(
      "SELECT * FROM users WHERE role = $1 ORDER BY id ASC",
      [role]
    );
    
    res.status(200).json({ success: true, users: result.rows });
  } catch (err) {
    next(err);
  }
}



// Qidiruv orqali foydalanuvchi olish
export async function getSearch(req, res, next) {
  try {
    const { query } = req.params;
    const result = await pool.query(
      "SELECT * FROM users WHERE first_name ILIKE $1 OR last_name ILIKE $1",
      [`%${query}%`]
    );
    res.status(200).json({ success: true, users: result.rows });
  } catch (err) {
    next(err);
  }
}

// Token yaratish
function generateAccessToken(data) {
  return jwt.sign(data, getConfig("JWT_ACCESS_SECRET"), { expiresIn: "1500m" });
}

function generateRefreshToken(data) {
  return jwt.sign(data, getConfig("JWT_REFRESH_SECRET"), { expiresIn: "8h" });
}

// Login tekshirish
export async function login(req, res, next) {
  try {
    const { id, password } = req.body;

    if (!id || !password) {
      return res.status(400).json({ success: false, message: "ID va parol kerak" });
    }

    const result = await pool.query("SELECT * FROM users WHERE id = $1", [id]);

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: "Foydalanuvchi topilmadi" });
    }

    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: "Parol noto‘g‘ri" });
    }

    const accessToken = generateAccessToken({ id: user.id, role: user.role });
    const refreshToken = generateRefreshToken({ id: user.id, role: user.role });

    res.status(200).json({
      success: true,
      user: { id: user.id, role: user.role, first_name: user.first_name, last_name: user.last_name },
      accessToken,
      refreshToken
    });
  } catch (err) {
    next(err);
  }
}
// Ro‘yxatdan o‘tish
export async function register(req, res, next) {
  try {
    const {
      first_name,
      last_name,
      password,
      role,
      gender,
      phone,
      photo_url,
      birth_date
    } = req.body;

    if (!first_name || !last_name || !password || !role) {
      return res.status(400).json({
        success: false,
        message: "Barcha majburiy maydonlar to‘ldirilishi kerak (first_name, last_name, password, role)"
      });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `
      INSERT INTO users
        (first_name, last_name, password, role, gender, phone, photo_url, birth_date)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING
        id, first_name, last_name, role, gender, phone, photo_url, birth_date, is_active, created_at
      `,
      [
        first_name,
        last_name,
        hashedPassword,
        role,
        gender ?? "unknown",
        phone ?? null,
        photo_url ?? null,
        birth_date ?? null
      ]
    );

    const newUser = result.rows[0];

    // 3️⃣ Tokenlar yaratish
    const accessToken = generateAccessToken({ id: newUser.id, role: newUser.role });
    const refreshToken = generateRefreshToken({ id: newUser.id, role: newUser.role });

    res.status(201).json({
      success: true,
      message: "Ro‘yxatdan o‘tildi",
      user: newUser,
      accessToken,
      refreshToken
    });

  } catch (err) {
    if (err.code === "23505" && err.detail.includes("phone")) {
      return res.status(400).json({
        success: false,
        message: "Bu telefon raqam allaqachon ishlatilgan"
      });
    }

    next(err);
  }
}

// Refresh token orqali yangi access token olish
export async function refreshToken(req, res, next) {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(401).json({ success: false, message: "Token talab qilinadi" });
    }

    jwt.verify(token, getConfig("JWT_REFRESH_SECRET"), (err, userData) => {
      if (err) {
        return res.status(403).json({ success: false, message: "Refresh token noto‘g‘ri" });
      }

      const accessToken = generateAccessToken({
        id: userData.id,
        role: userData.role
      });

      res.status(200).json({
        success: true,
        accessToken
      });
    });
  } catch (err) {
    next(err);
  }
}




export async function adminLogin(req, res, next) {
  try {
    const { id, password } = req.body;
    if (!id || !password) {
      return res.status(400).json({ success: false, message: "ID va parol kerak" });
    }

    const result = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: "Foydalanuvchi topilmadi" });
    }

    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: "Parol noto‘g‘ri" });
    }

    // Role tekshiruvi
    if (user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Foydalanuvchi admin emas" });
    }

    const accessToken = generateAccessToken({ id: user.id, role: user.role });
    const refreshToken = generateRefreshToken({ id: user.id, role: user.role });

    return res.status(200).json({
      success: true,
      user: { id: user.id, first_name: user.first_name, last_name: user.last_name, role: user.role },
      accessToken,
      refreshToken
    });

  } catch (err) {
    next(err);
  }
}


// tokenni olish
export async function getToken(req, res, next) {
  try {
    const { id, password } = req.body;

    if (!id || !password) {
      return res.status(400).json({ success: false, message: "ID va password kerak" });
    }

    const accessToken = generateAccessToken({ id, password });
    const refreshToken = generateRefreshToken({ id, password });

    res.status(200).json({
      success: true,
      accessToken,
      refreshToken
    });
  } catch (err) {
    next(err);
  }
}


