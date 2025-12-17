import pkg from "pg";
import getConfig from "../config/config.service.js";
const { Pool } = pkg;

// .env dan bazaga ma'lumotlarni olish
export const pool = new Pool({
  database: getConfig("DATABASE_NAME"),
  user: getConfig("DATABASE_USER"),
  password: getConfig("DATABASE_PASSWORD"),
  host: getConfig("DATABASE_HOST"),
  port: parseInt(getConfig("DATABASE_PORT")),
});

export async function initDatabase() {
  await connectToDb();
  await setupModels();
}

// Bazaga ulanish
async function connectToDb() {
  try {
    await pool.connect();
    console.log("Bazaga ulandi");
  } catch (err) {
    console.log("Bazaga ulanishda hatolik:", err.message);
  }
}

// Jadvallarni yaratish
async function setupModels() {
  try {
    // Users jadvali
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        gender VARCHAR(10) DEFAULT 'unknown',
        phone VARCHAR(20) UNIQUE DEFAULT NULL,
        photo_url TEXT DEFAULT NULL,
        birth_date DATE DEFAULT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Roles jadvali
    await pool.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL
      )
    `);

    // Rooms jadvali
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL
      )
    `);

    // Courses jadvali
    await pool.query(`
      CREATE TABLE IF NOT EXISTS courses (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE
      )
    `);

    // Groups jadvali
    await pool.query(`
      CREATE TABLE IF NOT EXISTS groups (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      course_id INT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      teacher_id INT REFERENCES users(id) ON DELETE SET NULL,
      room_id INT REFERENCES rooms(id) ON DELETE SET NULL,
      start_time TIME,
      end_time TIME,
      start_date DATE DEFAULT CURRENT_DATE,
      price DECIMAL(10,2),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `); 

    // students_groups jadvali (ko'prik jadval)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS group_students (
    id SERIAL PRIMARY KEY,
    group_id INT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    student_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (group_id, student_id) -- bir o‘quvchi bir guruhga faqat bir marta qo‘shilsin
      )
    `); 

    // Topics jadvali (mavzu)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS topics (
        id SERIAL PRIMARY KEY,
        course_id INT REFERENCES courses(id) ON DELETE CASCADE,
        name VARCHAR(150) NOT NULL,
        video_url TEXT DEFAULT NULL,
        homework_status VARCHAR(50) DEFAULT 'berilmagan',
        homework_due TIMESTAMP DEFAULT NULL,
        lesson_date DATE DEFAULT CURRENT_DATE
      )
    `);

    // Homework jadvali
    await pool.query(`
      CREATE TABLE IF NOT EXISTS homework (
        id SERIAL PRIMARY KEY,
        topic_id INT REFERENCES topics(id) ON DELETE CASCADE,
        teacher_comment TEXT DEFAULT NULL,
        teacher_file_url TEXT DEFAULT NULL,
        teacher_uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        student_comment TEXT DEFAULT NULL,
        student_file_url TEXT DEFAULT NULL,
        student_submitted_at TIMESTAMP DEFAULT NULL
      )
    `);

    // Students jadvali
    await pool.query(`
      CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        photo_url TEXT DEFAULT NULL,
        phone VARCHAR(20) DEFAULT NULL,
        gender VARCHAR(10) DEFAULT 'unknown',
        birth_date DATE DEFAULT NULL
      )
    `);

    // Statistics jadvali
    await pool.query(`
      CREATE TABLE IF NOT EXISTS statistics (
        id SERIAL PRIMARY KEY,
        student_id INT REFERENCES users(id) ON DELETE CASCADE,
        total_rank INT DEFAULT 0,
        group_rank INT DEFAULT 0,
        silver_earned INT DEFAULT 0,
        xp_earned INT DEFAULT 0
      )
    `);

    // Payments jadvali
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        student_id INT REFERENCES users(id) ON DELETE CASCADE,
        course_id INT REFERENCES courses(id) ON DELETE CASCADE,
        amount DECIMAL(10,2) NOT NULL,
        status VARCHAR(20) DEFAULT 'paid',
        payment_type VARCHAR(20) DEFAULT 'naqd',
        paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Attendance jadvali
    await pool.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        student_id INT REFERENCES users(id) ON DELETE CASCADE,
        course_id INT REFERENCES courses(id) ON DELETE CASCADE,
        attended_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(20) DEFAULT 'present'
      )
    `);

    // Grades jadvali
    await pool.query(`
      CREATE TABLE IF NOT EXISTS grades (
        id SERIAL PRIMARY KEY,
        student_id INT REFERENCES users(id) ON DELETE CASCADE,
        course_id INT REFERENCES courses(id) ON DELETE CASCADE,
        grade DECIMAL(5,2),
        graded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Course materials jadvali
    await pool.query(`
      CREATE TABLE IF NOT EXISTS course_materials (
        id SERIAL PRIMARY KEY,
        course_id INT REFERENCES courses(id) ON DELETE CASCADE,
        title VARCHAR(150),
        description TEXT,
        file_url TEXT,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Notifications jadvali
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log("Barcha jadvallar muvaffaqiyatli yaratildi!");
  } catch (err) {
    console.log("Jadvallarni yaratishda xatolik:", err.message);
  }
}
