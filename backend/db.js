import 'dotenv/config';
import mysql from 'mysql2/promise';
export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  timezone: 'Z',
  dateStrings: ['DATE'],   // DATE columns (drive dates) stay 'YYYY-MM-DD' strings, never shifted by a timezone
});
