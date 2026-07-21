import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '..', '..', '.env') });

if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) throw new Error('DATABASE_URL is required in production');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : undefined });

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

export default pool;
