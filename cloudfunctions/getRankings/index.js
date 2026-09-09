// 云函数：getRankings/index.js
// 全国 TOP100 与省份区域排行榜聚合查询
const cloud = require('wx-server-sdk');

cloud.init({
    env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;
    const { type, province } = event; // type: 'national' | 'province'

    try {
        let query = db.collection('users');

        if (type === 'province' && province) {
            query = query.where({ province: province });
        }

        // 查询前 100 名
        const rankRes = await query
            .orderBy('totalHit', 'desc')
            .limit(100)
            .field({
                nickname: true,
                avatarUrl: true,
                totalHit: true,
                province: true,
                openid: true
            })
            .get();

        const list = rankRes.data.map((item, index) => ({
            rank: index + 1,
            nickname: item.nickname || `静心客_${item.openid.substring(0, 4)}`,
            avatarUrl: item.avatarUrl || '',
            totalHit: item.totalHit || 0,
            province: item.province || '未知'
        }));

        // 计算自身排名
        let myRank = 0;
        const myDocRes = await db.collection('users').where({ openid }).get();
        if (myDocRes.data.length > 0) {
            const myScore = myDocRes.data[0].totalHit || 0;
            let countQuery = db.collection('users').where({
                totalHit: _.gt(myScore)
            });
            if (type === 'province' && province) {
                countQuery = db.collection('users').where({
                    province: province,
                    totalHit: _.gt(myScore)
                });
            }
            const countRes = await countQuery.count();
            myRank = countRes.total + 1;
        }

        return {
            success: true,
            type: type,
            province: province || '',
            list: list,
            myRank: myRank
        };

    } catch (err) {
        console.error('[getRankings] Error:', err);
        return { success: false, message: err.message, list: [], myRank: 0 };
    }
};
