"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDB = exports.pool = void 0;
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://costco_user:costco_password@localhost:5432/costco_db',
});
const initDB = async () => {
    const client = await exports.pool.connect();
    try {
        await client.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id VARCHAR(255) PRIMARY KEY,
        author_name VARCHAR(255),
        content TEXT,
        created_at TIMESTAMP,
        price NUMERIC,
        store_location VARCHAR(255),
        images JSONB,
        raw_data JSONB,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS comments (
        id VARCHAR(255) PRIMARY KEY,
        post_id VARCHAR(255) REFERENCES posts(id) ON DELETE CASCADE,
        author_name VARCHAR(255),
        content TEXT,
        created_at TIMESTAMP,
        raw_data JSONB
      );

      CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at);
      CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);

      ALTER TABLE posts ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;
      ALTER TABLE posts ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0;
      ALTER TABLE posts ADD COLUMN IF NOT EXISTS shares_count INTEGER DEFAULT 0;
      ALTER TABLE posts ADD COLUMN IF NOT EXISTS author_avatar TEXT;
      ALTER TABLE comments ADD COLUMN IF NOT EXISTS author_avatar TEXT;
      ALTER TABLE posts ADD COLUMN IF NOT EXISTS inserted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
      UPDATE posts SET inserted_at = COALESCE(last_updated, created_at, CURRENT_TIMESTAMP) WHERE inserted_at IS NULL;
    `);
        console.log('✅ Database initialized successfully');
    }
    catch (error) {
        console.error('❌ Error initializing database:', error);
    }
    finally {
        client.release();
    }
};
exports.initDB = initDB;
