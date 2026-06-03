"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_1 = __importDefault(require("http"));
const ws_1 = require("ws");
const db_1 = require("./db");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '10mb' })); // Facebook GraphQL 回應可能很大
// 建立 HTTP 伺服器並整合 Express
const server = http_1.default.createServer(app);
// 建立 WebSocket 伺服器
const wss = new ws_1.WebSocketServer({ server });
const wsClients = new Set();
wss.on('connection', (ws) => {
    wsClients.add(ws);
    console.log(`🔌 [WS] 客戶端已連線。目前線上人數: ${wsClients.size}`);
    ws.on('close', () => {
        wsClients.delete(ws);
        console.log(`🔌 [WS] 客戶端中斷連線。目前線上人數: ${wsClients.size}`);
    });
    ws.on('error', (err) => {
        console.error('🔌 [WS] 客戶端錯誤:', err);
        wsClients.delete(ws);
    });
});
// 廣播函式
const broadcastNewPost = (postData) => {
    console.log(`📢 [WS] 正在廣播貼文 ${postData.id} 給 ${wsClients.size} 個客戶端`);
    const payload = JSON.stringify(postData);
    for (const client of wsClients) {
        if (client.readyState === ws_1.WebSocket.OPEN) {
            client.send(payload);
        }
    }
};
// 萃取價格與分店的簡易邏輯 (後續可使用 NLP 優化)
const extractInfo = (content) => {
    let price = null;
    let store_location = null;
    if (!content)
        return { price, store_location };
    // 匹配 $123 或 123元
    const priceMatch = content.match(/[$]\s*(\d+(?:,\d+)?(?:\.\d+)?)|(\d+(?:,\d+)?(?:\.\d+)?)\s*(?:元|塊)/);
    if (priceMatch) {
        const rawPrice = priceMatch[1] || priceMatch[2];
        if (rawPrice) {
            price = parseFloat(rawPrice.replace(/,/g, ''));
        }
    }
    // 匹配台灣 Costco 分店關鍵字
    const stores = ['內湖', '汐止', '北投', '中和', '新莊', '桃園', '中壢', '新竹', '台中', '北台中', '嘉義', '台南', '高雄', '大順'];
    for (const store of stores) {
        if (content.includes(store)) {
            store_location = store + '店';
            break;
        }
    }
    return { price, store_location };
};
// 接收來自腳本的資料
app.post('/api/posts', async (req, res) => {
    try {
        const { id, author_name, author_avatar, content, images, created_at, raw_data, comments, likes_count, comments_count, shares_count } = req.body;
        if (!id) {
            return res.status(400).json({ error: 'Missing post ID' });
        }
        const { price, store_location } = extractInfo(content);
        // Upsert Post (新增或更新)
        await db_1.pool.query(`INSERT INTO posts (id, author_name, author_avatar, content, created_at, price, store_location, images, raw_data, likes_count, comments_count, shares_count, last_updated)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO UPDATE SET 
         author_name = EXCLUDED.author_name,
         author_avatar = EXCLUDED.author_avatar,
         content = EXCLUDED.content,
         price = EXCLUDED.price,
         store_location = EXCLUDED.store_location,
         images = EXCLUDED.images,
         raw_data = EXCLUDED.raw_data,
         likes_count = EXCLUDED.likes_count,
         comments_count = EXCLUDED.comments_count,
         shares_count = EXCLUDED.shares_count,
         last_updated = CURRENT_TIMESTAMP`, [
            id,
            author_name,
            author_avatar || '',
            content,
            created_at ? new Date(created_at) : new Date(),
            price,
            store_location,
            JSON.stringify(images || []),
            raw_data,
            parseInt(likes_count) || 0,
            parseInt(comments_count) || 0,
            parseInt(shares_count) || 0
        ]);
        // Insert Comments
        if (Array.isArray(comments) && comments.length > 0) {
            for (const comment of comments) {
                await db_1.pool.query(`INSERT INTO comments (id, post_id, author_name, author_avatar, content, created_at, raw_data)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO UPDATE SET 
             author_name = EXCLUDED.author_name,
             author_avatar = EXCLUDED.author_avatar,
             content = EXCLUDED.content,
             created_at = EXCLUDED.created_at,
             raw_data = EXCLUDED.raw_data`, [comment.id, id, comment.author_name, comment.author_avatar || '', comment.content, comment.created_at ? new Date(comment.created_at) : new Date(), comment.raw_data]);
            }
        }
        // 從資料庫中查出該筆完整貼文 (包含留言) 以進行 WS 即時廣播
        const broadcastQuery = `
      SELECT p.*,
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', c.id,
                   'author_name', c.author_name,
                   'author_avatar', c.author_avatar,
                   'content', c.content,
                   'created_at', c.created_at
                 )
               ) FILTER (WHERE c.id IS NOT NULL), '[]'
             ) as comments
      FROM posts p
      LEFT JOIN comments c ON p.id = c.post_id
      WHERE p.id = $1
      GROUP BY p.id
    `;
        const dbResult = await db_1.pool.query(broadcastQuery, [id]);
        if (dbResult.rows.length > 0) {
            broadcastNewPost(dbResult.rows[0]);
        }
        res.json({ success: true, message: 'Data saved successfully', extracted: { price, store_location } });
    }
    catch (error) {
        console.error('Error saving data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// 取得 Dashboard 所需的貼文列表
app.get('/api/posts', async (req, res) => {
    try {
        const { store, maxPrice, minPrice, limit = 500, sortBy } = req.query;
        let whereClauses = [];
        const values = [];
        if (store) {
            values.push(store);
            whereClauses.push(`p.store_location = $${values.length}`);
        }
        if (minPrice) {
            values.push(minPrice);
            whereClauses.push(`p.price >= $${values.length}`);
        }
        if (maxPrice) {
            values.push(maxPrice);
            whereClauses.push(`p.price <= $${values.length}`);
        }
        let whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';
        let orderBySql = 'p.created_at DESC';
        if (sortBy === 'inserted') {
            orderBySql = 'p.inserted_at DESC, p.created_at DESC';
        }
        else if (sortBy === 'likes') {
            orderBySql = 'p.likes_count DESC, p.created_at DESC';
        }
        else if (sortBy === 'comments') {
            orderBySql = 'p.comments_count DESC, p.created_at DESC';
        }
        else if (sortBy === 'shares') {
            orderBySql = 'p.shares_count DESC, p.created_at DESC';
        }
        else if (sortBy === 'price_asc') {
            orderBySql = 'p.price ASC NULLS LAST, p.created_at DESC';
        }
        else if (sortBy === 'price_desc') {
            orderBySql = 'p.price DESC NULLS LAST, p.created_at DESC';
        }
        const query = `
      SELECT p.*,
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', c.id,
                   'author_name', c.author_name,
                   'author_avatar', c.author_avatar,
                   'content', c.content,
                   'created_at', c.created_at
                 )
               ) FILTER (WHERE c.id IS NOT NULL), '[]'
             ) as comments
      FROM posts p
      LEFT JOIN comments c ON p.id = c.post_id
      ${whereSql}
      GROUP BY p.id
      ORDER BY ${orderBySql}
      LIMIT $${values.length + 1}
    `;
        values.push(limit);
        const result = await db_1.pool.query(query, values);
        res.json({ success: true, data: result.rows });
    }
    catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
const PORT = process.env.PORT || 3001;
server.listen(PORT, async () => {
    console.log(`🚀 Backend server (HTTP + WS) is running on port ${PORT}`);
    await (0, db_1.initDB)();
});
