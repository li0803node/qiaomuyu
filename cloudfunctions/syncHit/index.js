// 云函数：syncHit/index.js
// 敲击值防刷校验与批量心跳结算
const cloud = require('wx-server-sdk');

cloud.init({
    env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

const MAX_RATE_PER_SEC = 25; // 单秒最大允许敲击次数防刷阈值

exports.main = async (event, context) => {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;
    const now = Date.now();

    const { hitDelta, durationSec } = event;

    // 基础输入合法性检查
    if (!openid || typeof hitDelta !== 'number' || hitDelta <= 0) {
        return { success: false, message: 'Invalid payload' };
    }

    // 1. 防刷检查：判断单位时间敲击频次
    const effectiveDuration = Math.max(0.5, durationSec || 1.0);
    const speed = hitDelta / effectiveDuration;
    if (speed > MAX_RATE_PER_SEC) {
        console.warn(`[AntiCheat] Abnormal hit speed detected: ${speed} hits/sec for ${openid}`);
        return { success: false, message: 'Abnormal frequency detected' };
    }

    try {
        // 2. 查询用户当前数据库记录
        const userRes = await db.collection('users').where({ openid }).get();
        let userDoc = userRes.data[0];

        if (!userDoc) {
            // 初始化新用户
            const newUser = {
                openid,
                totalHit: 0,
                buffRate: 1,
                buffEndTime: 0,
                province: '',
                nickname: '静心客',
                avatarUrl: '',
                createdAt: db.serverDate(),
                updatedAt: db.serverDate()
            };
            const addRes = await db.collection('users').add({ data: newUser });
            userDoc = { ...newUser, _id: addRes._id };
        }

        // 3. 服务端时间校验暴击倍率
        let activeBuffRate = 1;
        let activeBuffEndTime = userDoc.buffEndTime || 0;

        if (userDoc.buffEndTime && userDoc.buffEndTime > now && userDoc.buffRate > 1) {
            activeBuffRate = Math.min(5, Math.max(1, userDoc.buffRate));
        } else {
            activeBuffRate = 1;
            activeBuffEndTime = 0;
        }

        // 4. 计算结算后的真实敲击增量
        const realAddScore = Math.floor(hitDelta * activeBuffRate);

        // 5. 原子自增更新数据库
        await db.collection('users').doc(userDoc._id).update({
            data: {
                totalHit: _.inc(realAddScore),
                buffRate: activeBuffRate,
                buffEndTime: activeBuffEndTime,
                updatedAt: db.serverDate()
            }
        });

        const latestTotal = (userDoc.totalHit || 0) + realAddScore;

        return {
            success: true,
            totalHit: latestTotal,
            buffRate: activeBuffRate,
            buffEndTime: activeBuffEndTime,
            serverTime: now
        };

    } catch (err) {
        console.error('[syncHit] Error:', err);
        return { success: false, message: err.message };
    }
};
