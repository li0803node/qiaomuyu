/**
 * 微信开放数据域 (openDataContext/index.js)
 * 功能：读取好友真实头像 & 昵称 & 法号，渲染金银铜冠禅意黑金排行榜
 */

const sharedCanvas = wx.getSharedCanvas();
const ctx = sharedCanvas.getContext('2d');

let CW = sharedCanvas.width || 600;
let CH = sharedCanvas.height || 600;

// ----------------------------------------------------------------
// 消息监听入口
// ----------------------------------------------------------------
wx.onMessage((data) => {
    switch (data.type) {
        case 'UPDATE_SCORE':
            updateUserScore(data.score, data.dharmaName);
            break;
        case 'RENDER_FRIEND_RANK':
            if (data.width && data.height) {
                if (sharedCanvas.width !== data.width || sharedCanvas.height !== data.height) {
                    sharedCanvas.width = data.width;
                    sharedCanvas.height = data.height;
                }
                CW = data.width;
                CH = data.height;
            } else {
                CW = sharedCanvas.width;
                CH = sharedCanvas.height;
            }
            renderFriendRankList(data.dpr || 2);
            break;
        default:
            break;
    }
});

// ----------------------------------------------------------------
// 上报分数 & 法号到微信好友云存储
// ----------------------------------------------------------------
function updateUserScore(score, dharmaName) {
    const kvList = [
        { key: 'qmy_total_hit',    value: String(score || 0) },
        { key: 'qmy_dharma_name',  value: dharmaName || '初结善缘' },
    ];
    wx.setUserCloudStorage({
        KVDataList: kvList,
        success: () => {
            console.log('[OpenData] Score & dharmaName reported:', score, dharmaName);
        },
        fail: (err) => {
            console.warn('[OpenData] setUserCloudStorage failed:', err);
        }
    });
}

// ----------------------------------------------------------------
// 拉取好友数据并渲染排行榜
// ----------------------------------------------------------------
function renderFriendRankList(dpr) {
    const scale = dpr || 2;
    wx.getFriendCloudStorage({
        keyList: ['qmy_total_hit', 'qmy_dharma_name'],
        success: (res) => {
            const dataList = (res.data || []).map(item => {
                const hitKV    = (item.KVDataList || []).find(k => k.key === 'qmy_total_hit');
                const nameKV   = (item.KVDataList || []).find(k => k.key === 'qmy_dharma_name');
                return {
                    nickname:  item.nickname || (nameKV ? nameKV.value : '虔诚居士'),
                    avatarUrl: item.avatarUrl || '',
                    score:     hitKV ? parseInt(hitKV.value, 10) : 0,
                };
            }).filter(item => item.score > 0).sort((a, b) => b.score - a.score);

            drawRankCanvas(dataList, scale);
        },
        fail: (err) => {
            console.warn('[OpenData] getFriendCloudStorage error:', err);
            drawEmptyState(scale);
        }
    });
}

// ----------------------------------------------------------------
// 核心绘制：禅意黑金排行榜
// ----------------------------------------------------------------
function drawRankCanvas(list, scale) {
    const s = scale || 2;
    ctx.clearRect(0, 0, CW, CH);

    // 渐变背景
    const bg = ctx.createLinearGradient(0, 0, 0, CH);
    bg.addColorStop(0, '#1A100A');
    bg.addColorStop(1, '#0D0804');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, CW, CH);

    if (!list || list.length === 0) {
        drawEmptyState(s);
        return;
    }

    const ITEM_H = Math.round(48 * s);
    const AVATAR_R = Math.round(16 * s);
    const START_Y = Math.round(8 * s);
    const LOAD_COUNT = Math.min(list.length, 20);

    let loadedCount = 0;

    // 先绘制无头像版骨架
    list.slice(0, LOAD_COUNT).forEach((item, idx) => {
        drawRankItem(ctx, item, idx, START_Y, ITEM_H, AVATAR_R, null, s);
    });

    // 异步加载真实头像
    list.slice(0, LOAD_COUNT).forEach((item, idx) => {
        if (!item.avatarUrl) {
            loadedCount++;
            return;
        }
        const img = wx.createImage();
        img.onload = () => {
            drawRankItem(ctx, item, idx, START_Y, ITEM_H, AVATAR_R, img, s);
            loadedCount++;
        };
        img.onerror = () => {
            loadedCount++;
        };
        img.src = item.avatarUrl;
    });
}

// ----------------------------------------------------------------
// 绘制单条排行榜条目
// ----------------------------------------------------------------
function drawRankItem(ctx, item, idx, startY, itemH, avatarR, avatarImg, s) {
    const y = startY + idx * (itemH + Math.round(6 * s));
    if (y + itemH > CH) return;

    // 条目底色
    ctx.fillStyle = idx % 2 === 0
        ? 'rgba(255,255,255,0.04)'
        : 'rgba(255,255,255,0.07)';
    roundRect(ctx, 8 * s, y, CW - 16 * s, itemH, 8 * s);
    ctx.fill();

    // 前三名特殊底色描边
    if (idx < 3) {
        const borderColors = ['rgba(255,215,0,0.55)', 'rgba(192,192,192,0.45)', 'rgba(205,127,50,0.45)'];
        ctx.strokeStyle = borderColors[idx];
        ctx.lineWidth = 1.5 * s;
        roundRect(ctx, 8 * s, y, CW - 16 * s, itemH, 8 * s);
        ctx.stroke();
    }

    // 排名徽章
    const badgeX = 24 * s;
    const badgeY = y + itemH / 2;
    if (idx === 0) {
        ctx.font = `bold ${Math.round(18 * s)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FFD700';
        ctx.fillText('👑', badgeX, badgeY + 6 * s);
    } else if (idx === 1) {
        ctx.font = `bold ${Math.round(16 * s)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#C0C0C0';
        ctx.fillText('🥈', badgeX, badgeY + 5 * s);
    } else if (idx === 2) {
        ctx.font = `bold ${Math.round(16 * s)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#CD7F32';
        ctx.fillText('🥉', badgeX, badgeY + 5 * s);
    } else {
        ctx.fillStyle = idx < 10 ? '#FFE072' : '#8C7B6E';
        ctx.font = `bold ${Math.round(13 * s)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(String(idx + 1), badgeX, badgeY + 4.5 * s);
    }

    // 圆形头像
    const avX = 52 * s;
    const avY = y + itemH / 2;
    ctx.save();
    ctx.beginPath();
    ctx.arc(avX, avY, avatarR, 0, Math.PI * 2);
    ctx.clip();
    if (avatarImg) {
        ctx.drawImage(avatarImg, avX - avatarR, avY - avatarR, avatarR * 2, avatarR * 2);
    } else {
        const phGrad = ctx.createRadialGradient(avX, avY - 4 * s, 2 * s, avX, avY, avatarR);
        phGrad.addColorStop(0, '#5B4028');
        phGrad.addColorStop(1, '#2D1A0E');
        ctx.fillStyle = phGrad;
        ctx.fillRect(avX - avatarR, avY - avatarR, avatarR * 2, avatarR * 2);
    }
    ctx.restore();

    // 头像金色圆边
    ctx.beginPath();
    ctx.arc(avX, avY, avatarR, 0, Math.PI * 2);
    ctx.strokeStyle = idx < 3 ? ['#FFD700','#C0C0C0','#CD7F32'][idx] : 'rgba(245,196,75,0.4)';
    ctx.lineWidth = idx < 3 ? 2 * s : 1 * s;
    ctx.stroke();

    // 昵称（法号）
    const textX = avX + avatarR + 10 * s;
    ctx.fillStyle = idx < 3 ? '#FFF566' : '#EDE7DF';
    ctx.font = `bold ${Math.round(12.5 * s)}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(truncate(item.nickname, 6), textX, y + itemH / 2 - 2 * s);

    // 功德标签
    ctx.fillStyle = 'rgba(245,196,75,0.6)';
    ctx.font = `${Math.round(9.5 * s)}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText('功德值', textX, y + itemH / 2 + 11 * s);

    // 敲击值
    ctx.fillStyle = idx < 3 ? '#FFD700' : '#FFE072';
    ctx.font = `bold ${Math.round(13 * s)}px sans-serif`;
    ctx.textAlign = 'right';
    ctx.fillText(formatNum(item.score), CW - 16 * s, y + itemH / 2 + 5 * s);
}

// ----------------------------------------------------------------
// 空状态提示 (完美比例自适应，绝不拉伸挤压)
// ----------------------------------------------------------------
function drawEmptyState(scale) {
    const s = scale || 2;
    ctx.clearRect(0, 0, CW, CH);
    ctx.fillStyle = 'rgba(26, 18, 10, 0.98)';
    ctx.fillRect(0, 0, CW, CH);

    const midX = CW / 2;
    const midY = CH / 2;

    // 🏮 灯笼
    ctx.font = `${Math.round(32 * s)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('🏮', midX, midY - 26 * s);

    // 主提示语
    ctx.fillStyle = '#FFE072';
    ctx.font = `bold ${Math.round(13.5 * s)}px sans-serif`;
    ctx.fillText('暂无好友同玩记录', midX, midY + 12 * s);

    // 副提示语
    ctx.fillStyle = '#A8988B';
    ctx.font = `${Math.round(10.5 * s)}px sans-serif`;
    ctx.fillText('快邀请好友一同静心敲击木鱼', midX, midY + 32 * s);
    ctx.fillText('共登功德圣榜 · 增添无量福慧', midX, midY + 48 * s);
}

// ----------------------------------------------------------------
// 工具函数
// ----------------------------------------------------------------
function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

function truncate(text, maxLen) {
    if (!text) return '虔诚居士';
    return text.length > maxLen ? text.substring(0, maxLen) : text;
}

function formatNum(n) {
    if (!n) return '0';
    if (n >= 1e8) return (n / 1e8).toFixed(1) + '亿';
    if (n >= 1e4) return (n / 1e4).toFixed(1) + '万';
    return Number(n).toLocaleString();
}
