// 云函数：updateUserProfile/index.js
// 更新用户资料与省份地理位置信息
const cloud = require('wx-server-sdk');

cloud.init({
    env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;
    const { province, nickname, avatarUrl } = event;

    if (!openid) {
        return { success: false, message: 'Unauthorized' };
    }

    try {
        const updateData = {
            updatedAt: db.serverDate()
        };
        if (province) updateData.province = province;
        if (nickname) updateData.nickname = nickname;
        if (avatarUrl) updateData.avatarUrl = avatarUrl;

        const userRes = await db.collection('users').where({ openid }).get();
        if (userRes.data.length > 0) {
            await db.collection('users').doc(userRes.data[0]._id).update({
                data: updateData
            });
        } else {
            await db.collection('users').add({
                data: {
                    openid: openid,
                    totalHit: 0,
                    buffRate: 1,
                    buffEndTime: 0,
                    province: province || '',
                    nickname: nickname || '静心客',
                    avatarUrl: avatarUrl || '',
                    createdAt: db.serverDate(),
                    updatedAt: db.serverDate()
                }
            });
        }

        return { success: true };
    } catch (err) {
        console.error('[updateUserProfile] Error:', err);
        return { success: false, message: err.message };
    }
};
