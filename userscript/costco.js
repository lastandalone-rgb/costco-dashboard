(function() {
    'use strict';
    
    console.log("🛒 Costco Dashboard 腳本已成功載入！(開發模式)");

    // 初始化自動滾動懸浮面板
    function initAutoScrollPanel() {
        if (document.getElementById('costco-scroller-panel')) return;
        
        const panel = document.createElement('div');
        panel.id = 'costco-scroller-panel';
        panel.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 999999;
            background: rgba(15, 23, 42, 0.85);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 12px;
            padding: 12px;
            color: white;
            font-family: system-ui, -apple-system, sans-serif;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(8px);
            width: 220px;
            font-size: 13px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        `;
        
        panel.innerHTML = `
            <div id="costco-scroller-header" style="font-weight: bold; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; user-select: none;">
                <span style="display: flex; align-items: center; gap: 4px;">🛒 <span id="costco-scroller-title">Costco 滾動器</span></span>
                <div style="display: flex; align-items: center; gap: 6px;">
                    <span id="scroller-status-indicator" style="width: 8px; height: 8px; background: #ef4444; border-radius: 50%; box-shadow: 0 0 8px #ef4444; display: inline-block;"></span>
                    <span id="scroller-toggle-minimize" style="font-size: 14px; font-weight: bold; color: rgba(255,255,255,0.6); padding: 0 4px; cursor: pointer;">−</span>
                </div>
            </div>
            <div id="costco-scroller-body" style="transition: max-height 0.3s ease; overflow: hidden; max-height: 200px;">
                <div style="margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between;">
                    <label for="scroll-interval-input" style="color: rgba(255,255,255,0.8);">滾動間隔 (秒):</label>
                    <input id="scroll-interval-input" type="number" min="1" max="60" value="5" style="width: 55px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.25); border-radius: 6px; color: white; padding: 3px 6px; text-align: center; font-size: 12px; outline: none;">
                </div>
                <button id="toggle-scroll-btn" style="width: 100%; padding: 8px; background: #3b82f6; border: none; border-radius: 8px; color: white; font-weight: bold; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3); font-size: 12px; outline: none;">開始自動滾動</button>
            </div>
        `;
        
        document.body.appendChild(panel);
        
        let isScrolling = false;
        let scrollIntervalId = null;
        let isMinimized = false;
        
        const statusIndicator = document.getElementById('scroller-status-indicator');
        const toggleBtn = document.getElementById('toggle-scroll-btn');
        const intervalInput = document.getElementById('scroll-interval-input');
        const minimizeBtn = document.getElementById('scroller-toggle-minimize');
        const scrollerBody = document.getElementById('costco-scroller-body');
        const scrollerHeader = document.getElementById('costco-scroller-header');
        const titleSpan = document.getElementById('costco-scroller-title');
        
        const toggleMinimize = () => {
            isMinimized = !isMinimized;
            if (isMinimized) {
                scrollerBody.style.maxHeight = '0px';
                panel.style.width = '110px';
                panel.style.padding = '8px';
                titleSpan.textContent = '滾動器';
                minimizeBtn.textContent = '+';
            } else {
                scrollerBody.style.maxHeight = '200px';
                panel.style.width = '220px';
                panel.style.padding = '12px';
                titleSpan.textContent = 'Costco 滾動器';
                minimizeBtn.textContent = '−';
            }
        };
        
        minimizeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleMinimize();
        });
        
        scrollerHeader.addEventListener('click', toggleMinimize);
        
        const performScroll = () => {
            window.scrollBy({
                top: window.innerHeight * 0.8,
                behavior: 'smooth'
            });
        };
        
        const startScrolling = () => {
            const interval = parseInt(intervalInput.value) || 5;
            isScrolling = true;
            statusIndicator.style.background = '#10b981';
            statusIndicator.style.boxShadow = '0 0 8px #10b981';
            toggleBtn.textContent = '停止自動滾動';
            toggleBtn.style.background = '#ef4444';
            toggleBtn.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.3)';
            
            scrollIntervalId = setInterval(performScroll, interval * 1000);
        };
        
        const stopScrolling = () => {
            isScrolling = false;
            statusIndicator.style.background = '#ef4444';
            statusIndicator.style.boxShadow = '0 0 8px #ef4444';
            toggleBtn.textContent = '開始自動滾動';
            toggleBtn.style.background = '#3b82f6';
            toggleBtn.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
            
            if (scrollIntervalId) {
                clearInterval(scrollIntervalId);
                scrollIntervalId = null;
            }
        };
        
        toggleBtn.addEventListener('click', () => {
            if (isScrolling) {
                stopScrolling();
            } else {
                startScrolling();
            }
        });
        
        intervalInput.addEventListener('change', () => {
            let val = parseInt(intervalInput.value) || 5;
            if (val < 1) intervalInput.value = '1';
            if (val > 60) intervalInput.value = '60';
            
            if (isScrolling) {
                stopScrolling();
                startScrolling();
            }
        });

        // 監聽傳輸錯誤自動停止事件
        window.addEventListener('costco-scroller-stop', (e) => {
            if (isScrolling) {
                stopScrolling();
            }
            statusIndicator.style.background = '#eab308';
            statusIndicator.style.boxShadow = '0 0 8px #eab308';
            titleSpan.textContent = '⚠️ API 錯誤!';
            titleSpan.style.color = '#ef4444';
            setTimeout(() => {
                titleSpan.textContent = isMinimized ? '滾動器' : 'Costco 滾動器';
                titleSpan.style.color = 'white';
            }, 3000);
        });
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        initAutoScrollPanel();
    } else {
        window.addEventListener('DOMContentLoaded', initAutoScrollPanel);
    }
    
    // 統一處理 Facebook GraphQL 回應的解析函式
    function processGraphQLPayload(responseText, sourceName) {
        // 遞迴尋找大頭貼 URL 輔助函式
        const findAvatarUrl = (o) => {
            if (!o || typeof o !== 'object') return null;
            for (const key of Object.keys(o)) {
                if (key.includes('profile_picture') && o[key]?.uri) {
                    return o[key].uri;
                }
            }
            for (const val of Object.values(o)) {
                try {
                    const found = findAvatarUrl(val);
                    if (found) return found;
                } catch (e) {}
            }
            return null;
        };

        try {
            const cleanText = responseText.replace(/^for\s*\(\s*;\s*;\s*\)\s*;\s*/, '');
            console.log(`🛒 [Costco Dashboard] 📦 ${sourceName} 封包大小: ${cleanText.length} 字元`);
            
            const lines = cleanText.split('\n');
            const posts = [];

            lines.forEach((line, index) => {
                if (!line.trim()) return;
                try {
                    const data = JSON.parse(line);
                    let foundTextInLine = false;

                    const traceData = (obj, path = "") => {
                        if (!obj || typeof obj !== 'object') return;
                        if (typeof obj.text === 'string' && obj.text.length > 10 && !obj.text.includes("http")) {
                            console.log(`🛒 [Costco Dashboard] 🔍 探勘到潛在內文 (第${index}行) -> 路徑: [${path}.text] 內容: ${obj.text.substring(0, 30)}...`);
                            foundTextInLine = true;
                        }
                        Object.keys(obj).forEach(k => { traceData(obj[k], path ? `${path}.${k}` : k); });
                    };
                    traceData(data);

                    const findPosts = (obj) => {
                        if (!obj || typeof obj !== 'object') return;
                        
                        // 判斷是否為「貼文節點」
                        if (obj.comet_sections) {
                            try {
                                // 1. 遞迴找尋作者 (通常在 actors 陣列中)
                                let author = '未知使用者';
                                let authorAvatar = '';
                                const findAuthor = (o) => {
                                    if (!o || typeof o !== 'object') return;
                                    if (Array.isArray(o.actors) && o.actors[0]?.name) { 
                                        author = o.actors[0].name; 
                                        authorAvatar = findAvatarUrl(o.actors[0]) || '';
                                    }
                                    if (author === '未知使用者') {
                                        Object.values(o).forEach(findAuthor);
                                    }
                                };
                                findAuthor(obj.comet_sections);

                                // 2. 遞迴找尋內文 (優先找 message.text，次要找 savable_title)
                                // 使用 Set 進行重複內文去重
                                let content = '';
                                const addedTexts = new Set();
                                const findContent = (o) => {
                                    if (!o || typeof o !== 'object') return;
                                    
                                    let found = false;
                                    if (o.message?.text && typeof o.message.text === 'string' && o.message.text.length > 5) {
                                        const txt = o.message.text.trim();
                                        if (!addedTexts.has(txt)) {
                                            addedTexts.add(txt);
                                            content += o.message.text + '\n';
                                        }
                                        found = true;
                                    } else if (o.savable_title?.text && typeof o.savable_title.text === 'string') {
                                        const txt = o.savable_title.text.trim();
                                        if (!addedTexts.has(txt)) {
                                            addedTexts.add(txt);
                                            content += o.savable_title.text + '\n';
                                        }
                                        found = true;
                                    }
                                    
                                    if (!found) {
                                        Object.values(o).forEach(findContent);
                                    }
                                };
                                findContent(obj.comet_sections);

                                // 3. 遞迴找尋圖片 (檢查 uri 且排除非貼文圖檔，例如頭像)
                                const images = [];
                                const findImages = (o, parentKey = '') => {
                                    if (!o || typeof o !== 'object') return;
                                    
                                    if (typeof o.uri === 'string' && o.uri.startsWith('http') && 
                                        (o.uri.includes('fbcdn.net') || o.uri.includes('scontent'))) {
                                        
                                        const parentLower = parentKey.toLowerCase();
                                        const isProfile = parentLower.includes('profile') || 
                                                          parentLower.includes('actor') || 
                                                          parentLower.includes('author') || 
                                                          parentLower.includes('avatar') || 
                                                          parentLower.includes('sender');
                                        
                                        if (!isProfile) {
                                            if (!images.includes(o.uri)) {
                                                images.push(o.uri);
                                            }
                                        }
                                    }
                                    
                                    Object.keys(o).forEach(k => {
                                        findImages(o[k], k);
                                    });
                                };
                                findImages(obj.comet_sections);

                                // 4. 遞迴找尋留言
                                const comments = [];
                                const findComments = (o) => {
                                    if (!o || typeof o !== 'object') return;
                                    if (o.comment && o.comment.body?.text) {
                                        const commentTime = o.comment.created_time ? (o.comment.created_time * 1000) : Date.now();
                                        const commentAvatar = findAvatarUrl(o.comment.author) || findAvatarUrl(o.comment.user) || '';
                                        comments.push({
                                            id: o.comment.id || ('comment_' + Date.now() + Math.random()),
                                            author_name: o.comment.author?.name || '匿名留言',
                                            author_avatar: commentAvatar,
                                            content: o.comment.body.text,
                                            created_at: new Date(commentTime).toISOString()
                                        });
                                    }
                                    Object.values(o).forEach(findComments);
                                };
                                if (obj.comet_sections.feedback) {
                                    findComments(obj.comet_sections.feedback);
                                }

                                // 5. 遞迴找尋按讚數與總留言數及分享數
                                let likesCount = 0;
                                let commentsCount = 0;
                                let sharesCount = 0;
                                const findMetrics = (o) => {
                                    if (!o || typeof o !== 'object') return;
                                    
                                    if (o.reaction_count?.count !== undefined) {
                                        likesCount = Math.max(likesCount, parseInt(o.reaction_count.count) || 0);
                                    }
                                    if (o.i18n_reaction_count !== undefined && o.i18n_reaction_count !== null) {
                                        const countVal = parseInt(o.i18n_reaction_count.toString().replace(/[^0-9]/g, ''));
                                        if (!isNaN(countVal)) {
                                            likesCount = Math.max(likesCount, countVal);
                                        }
                                    }
                                    if (o.reactions?.count !== undefined) {
                                        likesCount = Math.max(likesCount, parseInt(o.reactions.count) || 0);
                                    }
                                    if (o.reactors?.count !== undefined) {
                                        likesCount = Math.max(likesCount, parseInt(o.reactors.count) || 0);
                                    }
                                    if (o.top_reactions?.count !== undefined) {
                                        likesCount = Math.max(likesCount, parseInt(o.top_reactions.count) || 0);
                                    }
                                    
                                    if (o.comment_count?.total_count !== undefined) {
                                        commentsCount = Math.max(commentsCount, parseInt(o.comment_count.total_count) || 0);
                                    }
                                    if (o.total_comment_count !== undefined && o.total_comment_count !== null) {
                                        commentsCount = Math.max(commentsCount, parseInt(o.total_comment_count) || 0);
                                    }
                                    if (o.comments?.total_count !== undefined) {
                                        commentsCount = Math.max(commentsCount, parseInt(o.comments.total_count) || 0);
                                    }
                                    if (o.total_comments !== undefined && o.total_comments !== null) {
                                        commentsCount = Math.max(commentsCount, parseInt(o.total_comments) || 0);
                                    }

                                    if (o.share_count?.count !== undefined) {
                                        sharesCount = Math.max(sharesCount, parseInt(o.share_count.count) || 0);
                                    }
                                    if (o.share_count?.total_count !== undefined) {
                                        sharesCount = Math.max(sharesCount, parseInt(o.share_count.total_count) || 0);
                                    }
                                    if (o.shares?.count !== undefined) {
                                        sharesCount = Math.max(sharesCount, parseInt(o.shares.count) || 0);
                                    }
                                    if (o.shares?.total_count !== undefined) {
                                        sharesCount = Math.max(sharesCount, parseInt(o.shares.total_count) || 0);
                                    }
                                    if (o.i18n_share_count !== undefined && o.i18n_share_count !== null) {
                                        const countVal = parseInt(o.i18n_share_count.toString().replace(/[^0-9]/g, ''));
                                        if (!isNaN(countVal)) {
                                            sharesCount = Math.max(sharesCount, countVal);
                                        }
                                    }
                                    
                                    if (Array.isArray(o)) {
                                        o.forEach(findMetrics);
                                    } else {
                                        Object.keys(o).forEach(k => {
                                            try {
                                                findMetrics(o[k]);
                                            } catch (e) {}
                                        });
                                    }
                                };
                                findMetrics(obj);

                                // 6. 遞迴找尋發文時間
                                let creationTime = null;
                                const findCreationTime = (o) => {
                                    if (!o || typeof o !== 'object') return;
                                    if (o.creation_time !== undefined && o.creation_time !== null) {
                                        creationTime = parseInt(o.creation_time) || null;
                                        return;
                                    }
                                    if (o.publish_time !== undefined && o.publish_time !== null) {
                                        creationTime = parseInt(o.publish_time) || null;
                                        return;
                                    }
                                    for (const val of Object.values(o)) {
                                        if (creationTime !== null) return;
                                        findCreationTime(val);
                                    }
                                };
                                findCreationTime(obj);

                                const postId = obj.post_id || obj.id || ('tmp_' + sourceName.toLowerCase() + '_' + Date.now());
                                const timestamp = creationTime ? (creationTime * 1000) : Date.now();
                                
                                // 只要有內容或圖片，就視為有效貼文
                                if (content.trim() || images.length > 0) {
                                    posts.push({
                                        id: postId.toString(),
                                        author_name: author,
                                        author_avatar: authorAvatar,
                                        content: content.trim() || '（無內文）',
                                        images: images,
                                        comments: comments,
                                        likes_count: likesCount,
                                        comments_count: Math.max(commentsCount, comments.length),
                                        shares_count: sharesCount,
                                        created_at: new Date(timestamp).toISOString(),
                                        raw_data: obj
                                    });
                                }
                            } catch (e) {
                                console.error(`🛒 [Costco Dashboard] 解析貼文節點時出錯`, e);
                            }
                        } else if (obj.node) {
                            findPosts(obj.node);
                        } else {
                            if (Array.isArray(obj)) {
                                obj.forEach(findPosts);
                            } else {
                                Object.values(obj).forEach(findPosts);
                            }
                        }
                    };
                    findPosts(data);

                    if (foundTextInLine && posts.length === 0) {
                        console.log(`🛒 [Costco Dashboard] ⚠️ 第${index}行有內文，但我們的結構比對 (comet_sections...) 失敗了！`);
                    }
                } catch (err) {
                    console.error(`🛒 [Costco Dashboard] 第${index}行 JSON 解析失敗:`, err.message);
                }
            });

            if (posts.length > 0) {
                console.log(`🛒 [Costco Dashboard] ✅ ${sourceName} 解析到真實貼文！共 ${posts.length} 筆`, posts);
                if (typeof GM_xmlhttpRequest !== 'undefined') {
                    posts.forEach(post => {
                        GM_xmlhttpRequest({
                            method: 'POST',
                            url: 'http://localhost:8081/api/posts',
                            headers: { 'Content-Type': 'application/json' },
                            data: JSON.stringify(post),
                            onload: function(response) {
                                if (response.status >= 400) {
                                    console.error(`🛒 [Costco Dashboard] API 回傳錯誤狀態碼: ${response.status}`);
                                    window.dispatchEvent(new CustomEvent('costco-scroller-stop', { detail: { reason: `API error ${response.status}` } }));
                                }
                            },
                            onerror: function(err) {
                                console.error(`🛒 [Costco Dashboard] 發送 API 時發生連線錯誤`, err);
                                window.dispatchEvent(new CustomEvent('costco-scroller-stop', { detail: { reason: 'Connection error' } }));
                            },
                            ontimeout: function() {
                                console.error(`🛒 [Costco Dashboard] 發送 API 逾時`);
                                window.dispatchEvent(new CustomEvent('costco-scroller-stop', { detail: { reason: 'Timeout error' } }));
                            }
                        });
                    });
                }
            } else {
                console.log(`🛒 [Costco Dashboard] ❌ ${sourceName} 請求未包含任何我們認得的貼文節點。`);
            }
        } catch (e) {
            console.error(`🛒 [Costco Dashboard] 處理 ${sourceName} Payload 發生錯誤:`, e);
        }
    }

    // 實作 fetch 攔截器
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
        const response = await originalFetch.apply(this, args);
        try {
            const url = args[0] instanceof Request ? args[0].url : args[0];
            if (typeof url === 'string' && url.includes('/api/graphql/')) {
                console.log("🛒 [Costco Dashboard] 👉 攔截到 Fetch GraphQL 請求: ", url);
                const clonedResponse = response.clone();
                clonedResponse.text().then(text => {
                    processGraphQLPayload(text, 'Fetch');
                }).catch(err => {
                    console.error("🛒 [Costco Dashboard] ❌ Fetch Text 處理發生錯誤", err);
                });
            }
        } catch (e) {
            console.error("攔截發生錯誤:", e);
        }
        return response;
    };

    // 實作 XHR 攔截器 (Facebook 有時候會用 XMLHttpRequest)
    const originalXHRSend = XMLHttpRequest.prototype.send;
    const originalXHROpen = XMLHttpRequest.prototype.open;

    XMLHttpRequest.prototype.open = function(method, url) {
        this._url = url;
        return originalXHROpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function() {
        this.addEventListener('load', function() {
            try {
                if (typeof this._url === 'string' && this._url.includes('/api/graphql/')) {
                    console.log("🛒 [Costco Dashboard] 👉 攔截到 XHR GraphQL 請求: ", this._url);
                    processGraphQLPayload(this.responseText, 'XHR');
                }
            } catch (e) {}
        });
        return originalXHRSend.apply(this, arguments);
    };
})();
