// 云函数：drawCritBuff/index.js
// 暴击倍率抽取与每日6次限制校验
const cloud = require('wx-server-sdk');

cloud.init({
    env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

const DAILY_MAX_CRIT_AD = 6;
const BUFF_DURATION_MS = 60 * 60 * 1000; // 1小时

exports.main = async (event, context) => {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;
    const now = Date.now();
    const todayStr = new Date().toISOString().split('T')[0];

    if (!openid) {
        return { success: false, message: 'Unauthorized' };
    }

    try {
        // 1. 查询今日已看暴击广告次数
        const logRes = await db.collection('daily_ad_logs').where({
            openid: openid,
            date: todayStr,
            adType: 'CRIT_BUFF'
        }).get();

        const currentCount = logRes.data.length;
        if (currentCount >= DAILY_MAX_CRIT_AD) {
            return {
                success: false,
                message: `今日暴击广告已达上限（${DAILY_MAX_CRIT_AD}次），明日再来吧！`
            };
        }

        // 2. 随机生成 1~5 倍率 (1, 2, 3, 4, 5)
        const drawnRate = Math.floor(Math.random() * 5) + 1;
        const newEndTime = now + BUFF_DURATION_MS;

        // 3. 记录广告消费日志
        await db.collection('daily_ad_logs').add({
            data: {
                openid: openid,
                date: todayStr,
                adType: 'CRIT_BUFF',
                resultRate: drawnRate,
                createdAt: db.serverDate()
            }
        });

        // 4. 更新用户文档（新 buff 直接覆盖旧 buff，重置为新的 1 小时）
        const userRes = await db.collection('users').where({ openid }).get();
        if (userRes.data.length > 0) {
            await db.collection('users').doc(userRes.data[0]._id).update({
                data: {
                    buffRate: drawnRate,
                    buffEndTime: newEndTime,
                    updatedAt: db.serverDate()
                }
            });
        } else {
            await db.collection('users').add({
                data: {
                    openid: openid,
                    totalHit: 0,
                    buffRate: drawnRate,
                    buffEndTime: newEndTime,
                    province: '',
                    nickname: '静心客',
                    avatarUrl: '',
                    createdAt: db.serverDate(),
                    updatedAt: db.serverDate()
                }
            });
        }

        return {
            success: true,
            buffRate: drawnRate,
            buffEndTime: newEndTime,
            remainingAdCount: Math.max(0, DAILY_MAX_CRIT_AD - currentCount - 1)
        };

    } catch (err) {
        console.error('[drawCritBuff] Error:', err);
        return { success: false, message: err.message };
    }
};
