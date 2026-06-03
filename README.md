# 🛒 Costco Dashboard

**Costco 好市多社團貼文即時監控 Dashboard**

> 自動爬取 Facebook 好市多相關社團的貼文，即時推送並在美觀的 Dashboard 上集中展示，支援關鍵字搜尋、時間篩選、分店排序與熱門商品排行榜。

---

## 📸 功能概覽

| 功能 | 說明 |
|------|------|
| 🤖 **自動爬蟲** | Tampermonkey 腳本在 Facebook 社團頁面自動滾動、擷取貼文資料並上傳 |
| 📡 **即時推送** | 後端 WebSocket 廣播，新貼文秒速出現在 Dashboard |
| 🔍 **關鍵字搜尋** | 即時過濾貼文內容、作者名稱 |
| 🕐 **時間篩選** | 今天／昨天／最近 3 天／7 天／30 天 快速切換 |
| 🏬 **分店篩選** | 依據貼文內容自動偵測分店賣場 |
| 🏆 **十大排行榜** | 按讚、留言、分享三合一排行，前三名特製徽章 |
| 🖼️ **圖片牆** | IntersectionObserver 懶加載，效能優化 |
| 🗃️ **多種排序** | 按讚數、留言數、分享數、發文時間、入庫時間 |
| 💬 **貼文詳情** | 點擊卡片展開留言列表彈出視窗 |

---

## 🏗️ 系統架構

```
┌─────────────────────────────────────────────────────────┐
│                    Facebook 社團頁面                      │
│        Tampermonkey Userscript (costco.js)               │
│   自動滾動 → 擷取 GraphQL → POST /api/posts             │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTP POST
                           ▼
┌─────────────────────────────────────────────────────────┐
│              Node.js Backend (Express + TypeScript)      │
│  POST /api/posts  → Upsert → PostgreSQL                 │
│  GET  /api/posts  → 查詢 → 回傳 JSON                    │
│  WebSocket /ws    → 廣播新貼文給所有前端客戶端            │
└──────────┬──────────────────────────────────────────────┘
           │                        │
    PostgreSQL                 WebSocket
           │                        │
           └──────────┬─────────────┘
                      ▼
┌─────────────────────────────────────────────────────────┐
│           Next.js Frontend Dashboard                     │
│   即時顯示 / 搜尋 / 篩選 / 排行榜 / 圖片牆               │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 快速啟動（Docker Compose）

### 前置需求

- [Docker](https://www.docker.com/) + Docker Compose
- [Tampermonkey](https://www.tampermonkey.net/) 瀏覽器擴充套件

### 一鍵啟動

```bash
git clone https://github.com/lastandalone-rgb/costco-dashboard.git
cd costco-dashboard
docker compose up -d
```

啟動後各服務端口：

| 服務 | URL |
|------|-----|
| 🖥️ 前端 Dashboard | http://localhost:8080 |
| 🔧 後端 API | http://localhost:8081/api/posts |
| 🗄️ PostgreSQL | localhost:5432 |

---

## 📂 專案結構

```
costco-dashboard/
├── docker-compose.yml          # 一鍵啟動所有服務
├── frontend/                   # Next.js Dashboard
│   ├── src/app/page.tsx        # 主頁面（所有功能元件）
│   ├── Dockerfile
│   └── package.json
├── backend/                    # Express + TypeScript API
│   ├── src/
│   │   ├── index.ts            # API 路由 + WebSocket 廣播
│   │   └── db.ts               # PostgreSQL 連線與 initDB
│   ├── Dockerfile
│   └── package.json
├── userscript/
│   └── costco.js               # Tampermonkey 爬蟲腳本
└── nginx/                      # Nginx 反向代理設定
```

---

## 🤖 Tampermonkey 腳本安裝

1. 安裝 [Tampermonkey](https://www.tampermonkey.net/) 瀏覽器擴充套件
2. 建立新腳本，貼上 `userscript/costco.js` 的內容
3. 修改腳本頂部的 API 端點：
   ```js
   const API_BASE = 'http://localhost:8081'; // 或你的伺服器 IP
   ```
4. 前往 Facebook 好市多相關社團頁面，腳本會自動顯示懸浮控制面板
5. 點選「開始自動滾動」即可開始擷取貼文

### 控制面板功能
- ▶️ **開始 / 暫停** 自動滾動
- ⚙️ 調整**滾動間隔**（秒數）
- 📊 即時顯示**已擷取貼文數**

---

## 🔌 後端 API

| 方法 | 路徑 | 說明 |
|------|------|------|
| `GET` | `/api/posts` | 取得所有貼文，支援 `?sortBy=likes` 等參數 |
| `POST` | `/api/posts` | 新增或更新貼文（Upsert by ID） |
| `WebSocket` | `ws://host:8081/ws` | 即時推送新貼文 |

### GET `/api/posts` 查詢參數

| 參數 | 可選值 | 說明 |
|------|--------|------|
| `sortBy` | `likes` / `comments` / `shares` / `time` / `inserted_at` | 排序方式 |
| `order` | `asc` / `desc` | 排序方向 |
| `limit` | 數字 | 回傳筆數上限（預設 500） |

---

## 🗄️ 資料庫結構

```sql
CREATE TABLE posts (
  id            TEXT PRIMARY KEY,          -- Facebook 貼文 ID
  content       TEXT,                      -- 貼文內文
  author        TEXT,                      -- 作者名稱
  avatar_url    TEXT,                      -- 大頭貼 URL
  post_url      TEXT,                      -- 貼文連結
  images        JSONB,                     -- 圖片 URL 陣列
  likes         INT DEFAULT 0,
  comments      INT DEFAULT 0,
  shares        INT DEFAULT 0,
  comments_data JSONB,                     -- 留言列表
  price         NUMERIC,                   -- 自動萃取的價格
  store_location TEXT,                     -- 自動偵測的分店
  post_time     TIMESTAMPTZ,               -- 原始發文時間
  inserted_at   TIMESTAMPTZ DEFAULT NOW(), -- 首次入庫時間
  created_at    TIMESTAMPTZ DEFAULT NOW()  -- 記錄建立時間
);
```

---

## ⚙️ 環境變數

### Backend

| 變數 | 預設值 | 說明 |
|------|--------|------|
| `PORT` | `3001` | 後端監聽端口 |
| `DATABASE_URL` | `postgres://...` | PostgreSQL 連線字串 |

### Frontend

| 變數 | 預設值 | 說明 |
|------|--------|------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8081/api` | 後端 API 端點 |
| `NEXT_PUBLIC_WS_URL` | `ws://localhost:8081/ws` | WebSocket 端點 |

---

## 🛠️ 本地開發

```bash
# 後端
cd backend
npm install
npm run dev   # 啟動於 localhost:3001

# 前端
cd frontend
npm install
npm run dev   # 啟動於 localhost:3000
```

---

## 📌 注意事項

- 本工具僅供**個人學習研究**使用，請遵守 Facebook 服務條款
- 自動滾動腳本需在**瀏覽器視窗保持前景**才會持續運作
- 所有資料儲存於本地 PostgreSQL，不會上傳至任何第三方服務

---

## 📄 License

MIT License © 2024
