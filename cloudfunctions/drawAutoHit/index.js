// 云函数：drawAutoHit/index.js
// 自动敲击激励视频每日次数限制
const cloud = require('wx-server-sdk');

cloud.init({
    env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

const DAILY_MAX_AUTO_AD = 5;
const AUTO_DURATION_SEC = 10 * 60;

exports.main = async (event, context) => {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;
    const todayStr = new Date().toISOString().split('T')[0];

    if (!openid) {
        return { success: false, message: 'Unauthorized' };
    }

    try {
        const logRes = await db.collection('daily_ad_logs').where({
            openid,
            date: todayStr,
            adType: 'AUTO_HIT'
        }).get();

        const currentCount = logRes.data.length;
        if (currentCount >= DAILY_MAX_AUTO_AD) {
            return {
                success: false,
                message: `今日自动敲击广告已达上限（${DAILY_MAX_AUTO_AD}次），明日再来吧！`
            };
        }

        await db.collection('daily_ad_logs').add({
            data: {
                openid,
                date: todayStr,
                adType: 'AUTO_HIT',
                durationSec: AUTO_DURATION_SEC,
                createdAt: db.serverDate()
            }
        });

        return {
            success: true,
            durationSec: AUTO_DURATION_SEC,
            remainingAdCount: Math.max(0, DAILY_MAX_AUTO_AD - currentCount - 1)
        };
    } catch (err) {
        console.error('[drawAutoHit] Error:', err);
        return { success: false, message: err.message };
    }
};
