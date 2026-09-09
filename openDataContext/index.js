/**
 * 微信开放数据域 (openDataContext/index.js)
 * 功能：读取好友真实头像 & 昵称 & 法号，渲染金银铜冠禅意黑金排行榜
 */

const sharedCanvas = wx.getSharedCanvas();
const ctx = sharedCanvas.getContext('2d');

let CW = sharedCanvas.width || 600;
let CH = sharedCanvas.height || 600;

let mySelfInfo = { nickname: '我', score: 0, dharmaName: '初结善缘' };

// ----------------------------------------------------------------
// 消息监听入口
// ----------------------------------------------------------------
wx.onMessage((data) => {
    if (!data) return;
    switch (data.type) {
        case 'UPDATE_SCORE':
            mySelfInfo.score = typeof data.score === 'number' ? data.score : mySelfInfo.score;
            mySelfInfo.dharmaName = data.dharmaName || mySelfInfo.dharmaName;
            updateUserScore(data.score, data.dharmaName);
            break;
        case 'RENDER_FRIEND_RANK':
        case 'RENDER_GROUP_RANK':
            if (typeof data.myScore === 'number') mySelfInfo.score = data.myScore;
            if (data.dharmaName) mySelfInfo.dharmaName = data.dharmaName;
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
            if (data.type === 'RENDER_GROUP_RANK' && data.shareTicket) {
                renderGroupRankList(data.shareTicket, data.dpr || 2);
            } else {
                renderFriendRankList(data.dpr || 2);
            }
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
        success: () => {},
        fail: () => {}
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
            }).filter(item => typeof item.score === 'number' && item.score >= 0).sort((a, b) => b.score - a.score);

            if (dataList && dataList.length > 0) {
                drawRankCanvas(dataList, scale);
            } else {
                drawEmptyState(scale, mySelfInfo);
            }
        },
        fail: () => {
            drawEmptyState(scale, mySelfInfo);
        }
    });
}

// ----------------------------------------------------------------
// 拉取群排行数据并渲染
// ----------------------------------------------------------------
function renderGroupRankList(shareTicket, dpr) {
    const scale = dpr || 2;
    if (!wx.getGroupCloudStorage || !shareTicket) {
        renderFriendRankList(dpr);
        return;
    }
    wx.getGroupCloudStorage({
        shareTicket: shareTicket,
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
            }).filter(item => typeof item.score === 'number' && item.score >= 0).sort((a, b) => b.score - a.score);

            if (dataList && dataList.length > 0) {
                drawRankCanvas(dataList, scale);
            } else {
                drawEmptyState(scale, mySelfInfo);
            }
        },
        fail: () => {
            drawEmptyState(scale, mySelfInfo);
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

    // 排名专属高质感勋章
    const badgeX = 24 * s;
    const badgeY = y + itemH / 2;
    drawRankMedal(ctx, badgeX, badgeY, idx, s);

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
// 绘制高阶排名徽章勋章 (冠/亚/季军金银铜宝印 + 序号圆牌)
// ----------------------------------------------------------------
function drawRankMedal(ctx, cx, cy, idx, s) {
    ctx.save();
    if (idx === 0) {
        // 1. 冠军：鎏金宝印 + 纯金王冠
        const r = 12 * s;
        const grad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
        grad.addColorStop(0, '#FFF566');
        grad.addColorStop(0.3, '#FFD700');
        grad.addColorStop(0.7, '#D48806');
        grad.addColorStop(1, '#8C5618');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#FFE072';
        ctx.lineWidth = 1.5 * s;
        ctx.stroke();

        // 内部金冠造型
        const cw = 7 * s;
        const ch = 5 * s;
        ctx.fillStyle = '#42240C';
        ctx.beginPath();
        ctx.moveTo(cx - cw, cy + ch * 0.7);
        ctx.lineTo(cx - cw * 0.9, cy - ch * 0.3);
        ctx.lineTo(cx - cw * 0.35, cy + ch * 0.2);
        ctx.lineTo(cx, cy - ch);
        ctx.lineTo(cx + cw * 0.35, cy + ch * 0.2);
        ctx.lineTo(cx + cw * 0.9, cy - ch * 0.3);
        ctx.lineTo(cx + cw, cy + ch * 0.7);
        ctx.closePath();
        ctx.fill();

        // 冠顶白玉明珠
        ctx.fillStyle = '#FFFDF0';
        ctx.beginPath();
        ctx.arc(cx, cy - ch - 0.5 * s, 1.2 * s, 0, Math.PI * 2);
        ctx.arc(cx - cw * 0.9, cy - ch * 0.3 - 0.5 * s, 0.9 * s, 0, Math.PI * 2);
        ctx.arc(cx + cw * 0.9, cy - ch * 0.3 - 0.5 * s, 0.9 * s, 0, Math.PI * 2);
        ctx.fill();

    } else if (idx === 1) {
        // 2. 亚军：皓银宝印 + 银杯造型
        const r = 11.5 * s;
        const grad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
        grad.addColorStop(0, '#FFFFFF');
        grad.addColorStop(0.4, '#E6F7FF');
        grad.addColorStop(0.8, '#ADC6E5');
        grad.addColorStop(1, '#788CA6');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#E6F7FF';
        ctx.lineWidth = 1.4 * s;
        ctx.stroke();

        // 内部银杯造型
        const tw = 6 * s;
        const th = 5 * s;
        ctx.fillStyle = '#1D2A3A';
        ctx.beginPath();
        ctx.moveTo(cx - tw, cy - th * 0.8);
        ctx.lineTo(cx + tw, cy - th * 0.8);
        ctx.lineTo(cx + tw * 0.6, cy + th * 0.1);
        ctx.lineTo(cx - tw * 0.6, cy + th * 0.1);
        ctx.closePath();
        ctx.fill();
        ctx.fillRect(cx - tw * 0.2, cy + th * 0.1, tw * 0.4, th * 0.4);
        ctx.fillRect(cx - tw * 0.6, cy + th * 0.5, tw * 1.2, th * 0.25);

    } else if (idx === 2) {
        // 3. 季军：赤铜宝印 + 铜杯造型
        const r = 11.5 * s;
        const grad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
        grad.addColorStop(0, '#FFD591');
        grad.addColorStop(0.4, '#FA8C16');
        grad.addColorStop(0.8, '#D46B08');
        grad.addColorStop(1, '#873800');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#FFA39E';
        ctx.lineWidth = 1.4 * s;
        ctx.stroke();

        // 内部铜杯造型
        const tw = 6 * s;
        const th = 5 * s;
        ctx.fillStyle = '#3E1805';
        ctx.beginPath();
        ctx.moveTo(cx - tw, cy - th * 0.8);
        ctx.lineTo(cx + tw, cy - th * 0.8);
        ctx.lineTo(cx + tw * 0.6, cy + th * 0.1);
        ctx.lineTo(cx - tw * 0.6, cy + th * 0.1);
        ctx.closePath();
        ctx.fill();
        ctx.fillRect(cx - tw * 0.2, cy + th * 0.1, tw * 0.4, th * 0.4);
        ctx.fillRect(cx - tw * 0.6, cy + th * 0.5, tw * 1.2, th * 0.25);

    } else {
        // 4 ~ N 名：典雅禅金圆章
        const r = 10 * s;
        ctx.fillStyle = 'rgba(42, 30, 20, 0.92)';
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = idx < 10 ? 'rgba(245, 196, 75, 0.45)' : 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1 * s;
        ctx.stroke();

        ctx.font = `bold ${Math.round((idx < 9 ? 11 : 9.5) * s)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = idx < 10 ? '#FFE072' : '#8C7B6E';
        ctx.fillText(String(idx + 1), cx, cy + 3.8 * s);
    }
    ctx.restore();
}

// ----------------------------------------------------------------
// 空状态提示 (展示自己的排名卡片 + 好友邀请引导)
// ----------------------------------------------------------------
function drawEmptyState(scale, selfInfo) {
    const s = scale || 2;
    ctx.clearRect(0, 0, CW, CH);
    ctx.fillStyle = 'rgba(26, 18, 10, 0.98)';
    ctx.fillRect(0, 0, CW, CH);

    const info = selfInfo || mySelfInfo || { score: 0, dharmaName: '初结善缘', nickname: '我' };
    const myItem = {
        nickname: info.dharmaName || info.nickname || '我',
        score: info.score || 0,
        avatarUrl: ''
    };

    // 绘制自己的第 1 名卡片
    const ITEM_H = Math.round(48 * s);
    const AVATAR_R = Math.round(16 * s);
    const START_Y = Math.round(10 * s);
    drawRankItem(ctx, myItem, 0, START_Y, ITEM_H, AVATAR_R, null, s);

    // 下方绘制邀请好友引导区
    const midX = CW / 2;
    const midY = START_Y + ITEM_H + Math.round(92 * s);

    // 装饰星芒
    ctx.save();
    ctx.font = `bold ${Math.round(20 * s)}px sans-serif`;
    ctx.fillStyle = '#FFE072';
    ctx.textAlign = 'center';
    ctx.fillText('✦', midX, midY - 24 * s);

    // 主提示语
    ctx.fillStyle = '#FFE072';
    ctx.font = `bold ${Math.round(13 * s)}px sans-serif`;
    ctx.fillText('暂无其他好友同修记录', midX, midY + 4 * s);

    // 副提示语 (舒适行距，彻底杜绝重叠)
    ctx.fillStyle = '#A8988B';
    ctx.font = `${Math.round(10 * s)}px sans-serif`;
    ctx.fillText('点击下方按钮分享到微信群或好友', midX, midY + 28 * s);
    ctx.fillText('一同静心持咒 · 共登功德圣榜', midX, midY + 46 * s);
    ctx.restore();
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
