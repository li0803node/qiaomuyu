# 《静心敲木鱼》微信小游戏 (Cocos Creator + 微信云开发)

本项目为微信小游戏个人主体纯广告变现解压休闲小游戏《静心敲木鱼》全套源码与实施交付工程。

---

## 🎯 核心规范与特性

1. **规避玄学与合规运营**：
   - 彻底剔除佛像、经文、福报、消灾等玄学宗教词汇，全部采用「敲击值」与「静心」定位。
   - 14 档静心称号（初闻叩响 → 浅叩静心 → ... → 尘梦尽宁）。
2. **暴击倍率增益系统 (广告解锁)**：
   - 观看激励视频随机获得 ×1~×5 敲击倍率，固定持续 60 分钟（1 小时）。
   - 切后台/关闭小游戏倒计时正常流逝；新 buff 获得时直接覆盖旧 buff，不叠加时间。
   - 每日限观 6 次暴击广告，木鱼周身具备 **淡金渐变微光光晕 (1~5 级不同强度)** 与高保真多阶共鸣音效。
3. **10 分钟自动敲击挂机 (广告解锁)**：
   - 观看激励视频获得 10 分钟挂机敲击，每日限 5 次。
   - 挂机享受当前暴击倍率加成（如 ×5 暴击 + 挂机 = 每次敲击直接 +5）。
   - **切后台/退出游戏立刻停止挂机，不再产出敲击值**。
4. **全端防刷与云开发架构**：
   - 客户端心跳批量同步 (`syncHit`)，服务端时间戳权威校验倍率有效性，丢弃高频连点器异常增量。
   - 全国 TOP100 排行榜 + 开放数据域好友排行榜 + 非强制授权省份区域榜。
   - 排行榜返回主界面触发微信流量主插屏广告。
5. **极简包体**：
   - 采用纯算法物理声学合成木鱼敲击音效与轻量国风矢量资源，主包体积远低于 4MB 上限。

---

## 📁 目录结构

```text
qiaomuyu/
├── assets/
│   └── scripts/
│       ├── framework/
│       │   ├── Constants.ts       # 全局配置、14档称号定义、存储Key与广告位ID
│       │   ├── AudioManager.ts    # WebAudio高保真物理木鱼声学合成器与音效管理
│       │   ├── AdManager.ts       # 微信流量主激励视频/插屏广告生命周期与限额
│       │   └── CloudManager.ts    # 微信云开发客户端API封装、防刷批量心跳
│       ├── logic/
│       │   ├── GameManager.ts     # 核心游戏状态机、敲击/暴击/挂机与生命周期
│       │   ├── TitleManager.ts    # 14档静心称号判定与进度计算
│       │   └── RankManager.ts     # 好友/全国/省份排行榜及非强制位置授权
│       └── ui/
│           ├── WoodFishComponent.ts # 木鱼受击形变、飘字动效、1~5级淡金微光光晕
│           ├── UIManager.ts       # 顶部数据栏、暴击倒计时心跳、主按钮路由
│           ├── RankModalUI.ts     # 排行榜弹窗、Tab切换、退出触发插屏广告
│           ├── TitleModalUI.ts    # 14档称号列表、高亮与置灰进度渲染
│           └── SettingsModalUI.ts # 音效/BGM开关与隐私政策弹窗
├── cloudfunctions/
│   ├── syncHit/                   # 防作弊批量心跳结算云函数
│   ├── drawCritBuff/              # 暴击倍率抽取与每日6次限制云函数
│   ├── getRankings/               # 全国 TOP100 与省份榜单聚合查询云函数
│   ├── updateUserProfile/         # 用户基础资料与地理位置更新云函数
│   └── database_schema.json       # 云数据库集合、索引与权限配置
├── openDataContext/
│   └── index.js                   # 微信开放数据域好友排行榜绘制
├── index.html                     # 全功能 Web 即刻体验版（双击即可在浏览器运行体验）
├── style.css                      # 现代国风质感禅意样式与微光粒子动效
├── app.js                         # Web 原型交互逻辑驱动
├── project.json                   # Cocos Creator 工程配置
└── tsconfig.json                  # TypeScript 配置
```

---

## 🚀 部署与使用指南

### 1. 本地免安装即刻体验
直接在浏览器中打开根目录下的 `index.html`，即可体验完整的敲击、1~5倍暴击增益抽取、10分钟自动挂机、14档称号解锁、排行榜切换与广告模拟。

### 2. 微信云开发环境部署
1. 在微信开发者工具中打开项目，开通并进入**云开发控制台**。
2. 创建以下数据库集合并添加索引（参考 `cloudfunctions/database_schema.json`）：
   - `users`（唯一索引：`openid`，降序索引：`totalHit`）
   - `daily_ad_logs`（组合索引：`openid`, `date`, `adType`）
3. 在 `cloudfunctions` 目录下右键各个云函数（`syncHit`、`drawCritBuff`、`getRankings`、`updateUserProfile`），选择 **“上传并部署：云端安装依赖”**。
4. 将 `assets/scripts/framework/CloudManager.ts` 中的 `env: 'qiaomuyu-prod'` 替换为您自己的微信云开发环境 ID。

### 3. 微信流量主广告位接入
在微信公众平台流量主后台申请广告位后，将 `assets/scripts/framework/Constants.ts` 中的 `AD_UNIT_IDS` 替换为您真实的广告位 ID：
```typescript
export const GAME_CONFIG = {
    AD_UNIT_IDS: {
        REWARD_CRIT: 'adunit-xxxxxx',   // 暴击增益激励视频
        REWARD_AUTO: 'adunit-yyyyyy',   // 自动敲击激励视频
        INTERSTITIAL: 'adunit-zzzzzz',  // 排行榜返回插屏广告
    }
};
```
