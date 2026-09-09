/**
 * 《静心敲木鱼》· 佛光禅意微信小游戏
 * 架构：纯 Canvas 2D 极速响应引擎 + 方案二自适应全屏字号排版
 * 音频：44.1kHz 物理建模无损高保真原声木鱼复音池
 * 寻宝机：5 轴物理重力瀑布流掉落 + 阶梯加权倍率 + 方丈免费祈福 + 3 级华彩大奖庆典
 */

// ------------------------------------------------------------------
// 1. 基础环境初始化与系统信息
// ------------------------------------------------------------------
const canvas = (typeof wx !== 'undefined' && wx.createCanvas) ? wx.createCanvas() : { width: 375, height: 667, getContext: () => null };
const ctx = canvas.getContext('2d');
let sysInfo = { windowWidth: 375, windowHeight: 667, pixelRatio: 2 };
try {
    if (typeof wx !== 'undefined' && wx.getSystemInfoSync) {
        sysInfo = wx.getSystemInfoSync() || sysInfo;
    }
} catch (e) {}
const W = sysInfo.windowWidth || 375;
const H = sysInfo.windowHeight || 667;
const dpr = sysInfo.pixelRatio || 2; // 启用超高清 Retina 视网膜点对点渲染
canvas.width = Math.round(W * dpr);
canvas.height = Math.round(H * dpr);

const baseW = 375;
const baseH = 667;
const scaleW = W / baseW;
const scaleH = H / baseH;
const uiScale = Math.min(scaleW, scaleH);

let menuButtonRect = null;
try {
    if (typeof wx !== 'undefined' && wx.getMenuButtonBoundingClientRect) {
        menuButtonRect = wx.getMenuButtonBoundingClientRect();
    }
} catch (e) {}

// 圆角矩形通用绘制函数
function drawRoundRect(c, x, y, width, height, radius) {
    if (!c) return;
    const r = Math.max(0, Math.min(radius, width / 2, height / 2));
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + width, y, x + width, y + height, r);
    c.arcTo(x + width, y + height, x, y + height, r);
    c.arcTo(x, y + height, x, y, r);
    c.arcTo(x, y, x + width, y, r);
    c.closePath();
}

// 时间格式化 (分:秒)
function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// 缓动曲线
function easeOutBackReel(x) {
    const c1 = 1.35;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

// ------------------------------------------------------------------
// 2. 静态配置数据 (称号、曲库、法宝阶梯倍率与加权权重、连线表)
// ------------------------------------------------------------------
const TITLES = [
    { id: 1,  name: "初结善缘", minHit: 0,         maxHit: 99,       desc: "指尖初扣木鱼，种下一颗清净善因" },
    { id: 2,  name: "初闻叩响", minHit: 100,       maxHit: 299,      desc: "始于指尖微鸣，心绪初定如水" },
    { id: 3,  name: "浅叩静心", minHit: 300,       maxHit: 799,      desc: "叩响渐入佳境，宁静自然而生" },
    { id: 4,  name: "闲音入耳", minHit: 800,       maxHit: 1499,     desc: "音律悠然如风，尘虑悄然消散" },
    { id: 5,  name: "心随音静", minHit: 1500,      maxHit: 2999,     desc: "音起心随，万物皆归于安泰" },
    { id: 6,  name: "渐入佳境", minHit: 3000,      maxHit: 5999,     desc: "木鱼声声入定，杂念渐行渐远" },
    { id: 7,  name: "澄心息虑", minHit: 6000,      maxHit: 9999,     desc: "澄澈灵台清明，烦恼随声而逝" },
    { id: 8,  name: "静叩闲客", minHit: 10000,     maxHit: 17999,    desc: "闲庭信步叩木，安享岁月清宁" },
    { id: 9,  name: "幽篁听梵", minHit: 18000,     maxHit: 29999,    desc: "竹林深处清响，梵音洗涤心尘" },
    { id: 10, name: "清音渡绪", minHit: 30000,     maxHit: 49999,    desc: "一曲清音回荡，抚平千层杂绪" },
    { id: 11, name: "心灯初明", minHit: 50000,     maxHit: 79999,    desc: "自性心灯点亮，照破无明昏暗" },
    { id: 12, name: "平心观意", minHit: 80000,     maxHit: 119999,   desc: "观心如如不动，波澜不惊自安" },
    { id: 13, name: "明镜非台", minHit: 120000,    maxHit: 179999,   desc: "菩提本无树，明镜亦非台" },
    { id: 14, name: "漫叩流年", minHit: 180000,    maxHit: 259999,   desc: "流年似水东流，步步澄澈光明" },
    { id: 15, name: "尘扰皆息", minHit: 260000,    maxHit: 359999,   desc: "红尘扰攘万千，至此悄然平息" },
    { id: 16, name: "若水无争", minHit: 360000,    maxHit: 499999,   desc: "上善若水无争，善利万物不伐" },
    { id: 17, name: "虚怀若谷", minHit: 500000,    maxHit: 699999,   desc: "心包太虚广阔，量周沙界幽玄" },
    { id: 18, name: "静心渡己", minHit: 700000,    maxHit: 999999,   desc: "守心如玉如镜，自度满船清欢" },
    { id: 19, name: "见性成修", minHit: 1000000,   maxHit: 1499999,  desc: "直指人心本性，明心见性真修" },
    { id: 20, name: "万音归寂", minHit: 1500000,   maxHit: 2199999,  desc: "天地广阔悠远，万物归于寂然" },
    { id: 21, name: "菩提证道", minHit: 2200000,   maxHit: 2999999,  desc: "菩提树下证道，彻悟世间真如" },
    { id: 22, name: "虚境听禅", minHit: 3000000,   maxHit: 4199999,  desc: "神思超然物外，心境澄澈空明" },
    { id: 23, name: "妙法圆通", minHit: 4200000,   maxHit: 5999999,  desc: "妙法三千化境，耳根圆通自在" },
    { id: 24, name: "云间叩者", minHit: 6000000,   maxHit: 8999999,  desc: "如立九霄云端，俯瞰人间纷扰" },
    { id: 25, name: "灵山参佛", minHit: 9000000,   maxHit: 12999999, desc: "灵鹫山前悟法，拈花一笑契真" },
    { id: 26, name: "尘梦尽宁", minHit: 13000000,  maxHit: 17999999, desc: "大梦万古初醒，天地万籁俱宁" },
    { id: 27, name: "梵音普照", minHit: 18000000,  maxHit: 24999999, desc: "无量妙音回旋，光照十方大千" },
    { id: 28, name: "金刚不坏", minHit: 25000000,  maxHit: 34999999, desc: "金刚般若法身，诸邪不侵永固" },
    { id: 29, name: "慈航普度", minHit: 35000000,  maxHit: 49999999, desc: "驾驭慈航宝筏，普度苦海众生" },
    { id: 30, name: "妙觉如来", minHit: 50000000,  maxHit: 69999999, desc: "妙觉圆满无碍，法相庄严宏深" },
    { id: 31, name: "无量寿佛", minHit: 70000000,  maxHit: 99999999, desc: "光明无量长寿，福泽恒河沙数" },
    { id: 32, name: "虚空法界", minHit: 100000000, maxHit: 149999999, desc: "身合无尽虚空，法界同一真如" },
    { id: 33, name: "大千圆觉", minHit: 150000000, maxHit: 219999999, desc: "圆满觉悟法界，洞彻三千大千" },
    { id: 34, name: "般若无相", minHit: 220000000, maxHit: 319999999, desc: "离一切相即相，般若真空妙有" },
    { id: 35, name: "涅槃寂静", minHit: 320000000, maxHit: 499999999, desc: "常乐我净圆融，寂灭真常寂静" },
    { id: 36, name: "万劫道尊", minHit: 500000000, maxHit: Infinity, desc: "万劫超然不堕，至尊大道永存" }
];

let _cachedTitleHits = -1;
let _cachedTitleResult = null;
function getCurrentTitle(hits) {
    if (hits === _cachedTitleHits && _cachedTitleResult) {
        return _cachedTitleResult;
    }
    let current = TITLES[0];
    let next = TITLES[1];
    for (let i = TITLES.length - 1; i >= 0; i--) {
        if (hits >= TITLES[i].minHit) {
            current = TITLES[i];
            next = TITLES[i + 1] || null;
            break;
        }
    }
    _cachedTitleHits = hits;
    _cachedTitleResult = { current, next };
    return _cachedTitleResult;
}

const RANK_LIST_DATA = [
    { rank: 1, name: "慧能居士", loc: "广东省", title: "【大音希声】", score: 8520000 },
    { rank: 2, name: "弘一禅师", loc: "浙江省", title: "【虚境听禅】", score: 4310000 },
    { rank: 3, name: "鉴真修者", loc: "江苏省", title: "【云间叩者】", score: 2190000 },
    { rank: 4, name: "虚云行客", loc: "四川省", title: "【万音归寂】", score: 1050000 },
    { rank: 5, name: "清心修行者", loc: "北京市", title: "【静心渡己】", score: 620000 }
];

const BGM_TRACKS = [
    { id: 1,  name: '《古刹檐雨》', desc: '青瓦檐滴 · 润物无声', icon: '01', src: 'assets/audio/ambient_rain.mp3' },
    { id: 2,  name: '《空山竹语》', desc: '清风拂竹 · 幽谷山雀', icon: '02', src: 'assets/audio/ambient_bamboo.mp3' },
    { id: 3,  name: '《苔痕添水》', desc: '枯山流水 · 惊鹿叩石', icon: '03', src: 'assets/audio/ambient_shishi.mp3' },
    { id: 4,  name: '《幽涧鸣泉》', desc: '高山活泉 · 漱石流芳', icon: '04', src: 'assets/audio/ambient_stream.mp3' },
    { id: 5,  name: '《禅房沉香》', desc: '古炉微炭 · 沉香轻燃', icon: '05', src: 'assets/audio/ambient_incense.mp3' },
    { id: 6,  name: '《晨钟远磬》', desc: '破晓梵音 · 洪钟荡谷', icon: '06', src: 'assets/audio/ambient_bell.mp3' },
    { id: 7,  name: '《晚寺蝉鸣》', desc: '暮色庭院 · 晚风微蝉', icon: '07', src: 'assets/audio/ambient_crickets.mp3' },
    { id: 8,  name: '《深山颂钵》', desc: '藏地纯铜 · 432Hz共鸣', icon: '08', src: 'assets/audio/ambient_bowl.mp3' },
    { id: 9,  name: '《万壑松风》', desc: '千山暮雪 · 松涛回荡', icon: '09', src: 'assets/audio/ambient_pinewind.mp3' },
    { id: 10, name: '《瀛海潮汐》', desc: '普陀潮音 · 沧海涤心', icon: '04', src: 'assets/audio/ambient_ocean.mp3' }
];

// 5x3 功德寻宝 12 种法宝阶梯倍率与加权出率定义 (黄金休闲 92.5% RTP + 中奖波浪回血模型)
const SYMBOLS = [
    { id: 'wild',     name: '功德', iconKey: 'gongde', fallbackIcon: '✦', isWild: true, rates: [75, 250, 1000], weight: 12 }, // 万能金莲提升至 12 (原 5)
    { id: 'scatter',  name: '方丈', iconKey: 'fangzhang', fallbackIcon: '✦', isScatter: true, rates: [50, 150, 500],   weight: 7 },  // 免费祈福提升至 7 (原 4)
    { id: 'hat',      name: '五佛宝冠', iconKey: 'hat', fallbackIcon: '✦', rates: [45, 180, 600], weight: 9 },  // 高级法宝
    { id: 'monk',     name: '小沙弥', iconKey: 'monk', fallbackIcon: '✦', rates: [35, 120, 380], weight: 14 }, // 中高级法宝 (中奖核心)
    { id: 'bowl',     name: '紫金佛钵', iconKey: 'bowl', fallbackIcon: '✦', rates: [25, 85, 240],  weight: 18 }, // 中级法宝
    { id: 'incense',  name: '宣德香炉', iconKey: 'incense', fallbackIcon: '✦', rates: [22, 70, 200],  weight: 20 }, // 中级法宝
    { id: 'chime',    name: '古刹铜磬', iconKey: 'chime', fallbackIcon: '✦', rates: [18, 55, 160],  weight: 22 }, // 中级法宝
    { id: 'ruyi',     name: '翡翠如意', iconKey: 'ruyi', fallbackIcon: '✦', rates: [16, 45, 130],  weight: 24 }, // 中级法宝
    { id: 'woodfish', name: '红木木鱼', iconKey: 'woodfish', fallbackIcon: '✦', rates: [12, 35, 95],   weight: 26 }, // 基础法宝
    { id: 'lamp',     name: '琉璃供灯', iconKey: 'lamp', fallbackIcon: '✦', rates: [10, 28, 75],   weight: 28 }, // 基础法宝
    { id: 'beads',   name: '菩提佛珠', iconKey: 'beads', fallbackIcon: '✦', rates: [9, 24, 65],    weight: 30 }, // 基础法宝
    { id: 'vase',     name: '白玉净瓶', iconKey: 'vase', fallbackIcon: '✦', rates: [8, 20, 55],    weight: 32 }  // 基础法宝
];

let consecutiveLossSpins = 0; // 连续未中奖计数 (用于保底防黑脸)

function getRandomSymbolByWeight(pityBoost = 1.0) {
    let totalWeight = 0;
    const weights = [];
    for (let i = 0; i < SYMBOLS.length; i++) {
        const w = SYMBOLS[i].weight * (SYMBOLS[i].isWild ? pityBoost : 1.0);
        weights.push(w);
        totalWeight += w;
    }
    let rand = Math.random() * totalWeight;
    for (let i = 0; i < SYMBOLS.length; i++) {
        rand -= weights[i];
        if (rand <= 0) return SYMBOLS[i];
    }
    return SYMBOLS[SYMBOLS.length - 1];
}

const BET_TIERS = [200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000];

const PAYLINES = [
    [1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [2, 2, 2, 2, 2], [0, 1, 2, 1, 0], [2, 1, 0, 1, 2],
    [0, 0, 1, 2, 2], [2, 2, 1, 0, 0], [1, 0, 0, 0, 1], [1, 2, 2, 2, 1], [0, 1, 1, 1, 0],
    [2, 1, 1, 1, 2], [0, 1, 0, 1, 0], [2, 1, 2, 1, 2], [1, 0, 1, 0, 1], [1, 2, 1, 2, 1],
    [0, 0, 0, 1, 2], [2, 2, 2, 1, 0], [1, 1, 0, 1, 2], [1, 1, 2, 1, 0], [0, 2, 0, 2, 0],
    [2, 0, 2, 0, 2], [0, 2, 2, 2, 0], [2, 0, 0, 0, 2], [0, 0, 2, 0, 0], [2, 2, 0, 2, 2]
];

// ------------------------------------------------------------------
// 3. 资源加载与无损高保真原声音效池
// ------------------------------------------------------------------
const images = {};
const imgConfigs = [
    { key: 'temple',       src: 'assets/images/bg.png' },
    { key: 'bg',           src: 'assets/images/bg.png' },
    { key: 'mainWoodfish', src: 'assets/images/woodfish.png' },
    { key: 'woodfish',     src: 'assets/images/woodfish.png' },
    { key: 'gongde',       src: 'assets/images/gongde.png' },
    { key: 'fangzhang',    src: 'assets/images/fangzhang.png' },
    { key: 'hat',          src: 'assets/images/hat.png' },
    { key: 'bowl',         src: 'assets/images/bowl.png' },
    { key: 'incense',      src: 'assets/images/incense.png' },
    { key: 'monk',         src: 'assets/images/monk.png' },
    { key: 'lamp',         src: 'assets/images/lamp.png' },
    { key: 'chime',        src: 'assets/images/chime.png' },
    { key: 'beads',        src: 'assets/images/beads.png' },
    { key: 'vase',         src: 'assets/images/vase.png' },
    { key: 'ruyi',         src: 'assets/images/ruyi.png' }
];

imgConfigs.forEach(cfg => {
    if (typeof wx !== 'undefined' && wx.createImage) {
        const img = wx.createImage();
        img.src = cfg.src;
        images[cfg.key] = img;
    }
});

class WxSoundManager {
    constructor() {
        this.ctxPool = [];
        this.poolSize = 9;
        this.poolIdx = 0;
        this.soundSources = [
            'assets/audio/muyu.wav',
            'assets/audio/muyu_alt1.wav',
            'assets/audio/muyu_alt2.wav'
        ];
        this.chimeSrc = 'assets/audio/chime.wav';
        this.winSrc = 'assets/audio/win.wav';
        this.tapSrc = 'assets/audio/tap.wav';
        this.bgmAudio = null;
        this.currentBgmIdx = -1;

        if (typeof wx !== 'undefined' && wx.createInnerAudioContext) {
            // 首屏快速启动：首批创建打击音效上下文
            for (let i = 0; i < 3; i++) {
                const audio = wx.createInnerAudioContext();
                audio.obeyMuteSwitch = false;
                audio.src = this.soundSources[i % this.soundSources.length];
                this.ctxPool.push(audio);
            }
            this.chimeAudio = wx.createInnerAudioContext();
            this.chimeAudio.obeyMuteSwitch = false;
            this.chimeAudio.src = this.chimeSrc;

            this.winAudio = wx.createInnerAudioContext();
            this.winAudio.obeyMuteSwitch = false;
            this.winAudio.src = this.winSrc;

            // 专属轻灵 UI 点击/交互音效池 (轻脆灵动，与木鱼重击严格区分)
            this.tapPool = [];
            for (let i = 0; i < 3; i++) {
                const tapAudio = wx.createInnerAudioContext();
                tapAudio.obeyMuteSwitch = false;
                tapAudio.src = this.tapSrc;
                tapAudio.volume = 0.85;
                this.tapPool.push(tapAudio);
            }
            this.tapPoolIdx = 0;

            // BGM 循环播放器
            this.bgmAudio = wx.createInnerAudioContext();
            this.bgmAudio.obeyMuteSwitch = false;
            this.bgmAudio.loop = true;
            this.bgmAudio.volume = 0.45;

            // 启动 1.2 秒后异步补齐剩余 6 个打击音效池节点
            setTimeout(() => {
                try {
                    while (this.ctxPool.length < this.poolSize) {
                        const audio = wx.createInnerAudioContext();
                        audio.obeyMuteSwitch = false;
                        audio.src = this.soundSources[this.ctxPool.length % this.soundSources.length];
                        this.ctxPool.push(audio);
                    }
                } catch(e) {}
            }, 1200);
        }
    }

    playWoodHit() {
        if (!state.sfxEnabled || !this.ctxPool.length) return;
        try {
            const audio = this.ctxPool[this.poolIdx];
            this.poolIdx = (this.poolIdx + 1) % this.poolSize;
            audio.stop();
            audio.src = this.soundSources[Math.floor(Math.random() * this.soundSources.length)];
            audio.seek(0);
            audio.play();
        } catch (e) {}
    }

    playTap() {
        if (!state.sfxEnabled || !this.tapPool || !this.tapPool.length) return;
        try {
            const audio = this.tapPool[this.tapPoolIdx];
            this.tapPoolIdx = (this.tapPoolIdx + 1) % this.tapPool.length;
            audio.stop();
            audio.seek(0);
            audio.play();
        } catch (e) {}
    }

    playChime() {
        if (!state.sfxEnabled || !this.chimeAudio) return;
        try {
            this.chimeAudio.stop();
            this.chimeAudio.seek(0);
            this.chimeAudio.play();
        } catch (e) {}
    }

    playWin() {
        if (!state.sfxEnabled || !this.winAudio) return;
        try {
            this.winAudio.stop();
            this.winAudio.seek(0);
            this.winAudio.play();
        } catch (e) {}
    }

    playBgm(trackIdx) {
        if (!state.bgmEnabled || !this.bgmAudio) {
            this.stopBgm();
            return;
        }
        const idx = (typeof trackIdx === 'number' && trackIdx >= 0 && trackIdx < BGM_TRACKS.length) 
            ? trackIdx 
            : (state.selectedTrackIdx || 0);
        const track = BGM_TRACKS[idx];
        if (!track || !track.src) return;

        try {
            if (this.currentBgmIdx !== idx || this.bgmAudio.paused) {
                this.currentBgmIdx = idx;
                this.bgmAudio.stop();
                this.bgmAudio.src = track.src;
                this.bgmAudio.seek(0);
                this.bgmAudio.play();
            }
        } catch (e) {}
    }

    stopBgm() {
        if (this.bgmAudio) {
            try {
                this.bgmAudio.stop();
                this.currentBgmIdx = -1;
            } catch (e) {}
        }
    }

    updateBgmState() {
        if (state.bgmEnabled) {
            this.playBgm(state.selectedTrackIdx);
        } else {
            this.stopBgm();
        }
    }
}
const soundManager = new WxSoundManager();

// ------------------------------------------------------------------
// 4. 微信流量主广告管理器
// ------------------------------------------------------------------
class WxAdManager {
    constructor() {
        this.rewardedVideoAd = null;
        this.initRewardedVideo();
    }

    initRewardedVideo() {
        if (typeof wx !== 'undefined' && wx.createRewardedVideoAd) {
            try {
                this.rewardedVideoAd = wx.createRewardedVideoAd({
                    adUnitId: 'adunit-mock-unit-id'
                });
                if (this.rewardedVideoAd) {
                    this.rewardedVideoAd.onLoad(() => {});
                    this.rewardedVideoAd.onError(() => {});
                }
            } catch (e) {}
        }
    }

    showRewardedVideo(onSuccess, onCancel, rewardName = '功德福利') {
        if (this.rewardedVideoAd) {
            this.rewardedVideoAd.show()
                .catch(() => {
                    this.rewardedVideoAd.load()
                        .then(() => this.rewardedVideoAd.show())
                        .catch(() => {
                            if (onSuccess) onSuccess();
                        });
                });
            const closeHandler = (res) => {
                if (this.rewardedVideoAd && typeof this.rewardedVideoAd.offClose === 'function') {
                    this.rewardedVideoAd.offClose(closeHandler);
                }
                if (res && res.isEnded) {
                    if (onSuccess) onSuccess();
                } else {
                    showToast('视频未完整观看，未能领受福报');
                    if (onCancel) onCancel();
                }
            };
            this.rewardedVideoAd.onClose(closeHandler);
        } else {
            if (onSuccess) onSuccess();
        }
    }
}
const adManager = new WxAdManager();

// ------------------------------------------------------------------
// 5. 游戏核心状态机
// ------------------------------------------------------------------
const now = new Date();
const todayStr = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
let savedDate = '';
try {
    savedDate = wx.getStorageSync ? wx.getStorageSync('qmy_date') : '';
} catch (e) {}

function createInitialReels() {
    const reels = [];
    for (let c = 0; c < 5; c++) {
        reels.push({
            col: c,
            status: 'idle',
            scrollPos: 0,
            stopTime: 0,
            landingStartTime: 0,
            landingDuration: 340,
            playedLandingSound: false
        });
    }
    return reels;
}


// ==================================================================
// 四大情绪祈愿法殿 (情绪对号入座)
// ==================================================================
const TEMPLE_MODES = [
    {
        id: 'ankang',
        name: '安康殿',
        icon: '【福】',
        title: '安康殿 · 身心清净',
        desc: '功德福报 · 身心康泰',
        accentColor: '#FFD700',
        badgeColor: 'rgba(68, 50, 24, 0.95)',
        floatWords: ['功德 +1', '心静 +1', '福报 +1', '身轻体健 +1', '睡眠香甜 +1', '不脱发 +1', '无病无灾 +1', '吉祥 +1']
    },
    {
        id: 'wenchang',
        name: '文昌阁',
        icon: '【禄】',
        title: '文昌阁 · 金榜题名',
        desc: '考研考公 · 题题全对',
        accentColor: '#40A9FF',
        badgeColor: 'rgba(24, 48, 68, 0.95)',
        floatWords: ['上岸 +1', '考神附体 +1', '题题全对 +1', '过线 +1', '复习专注 +1', '金榜题名 +1', '面试顺遂 +1', '学业精进 +1']
    },
    {
        id: 'wealth',
        name: '财神殿',
        icon: '【财】',
        title: '财神殿 · 日进斗金',
        desc: '财运亨通 · 加薪暴富',
        accentColor: '#FFA940',
        badgeColor: 'rgba(68, 40, 18, 0.95)',
        floatWords: ['财运 +1', '加薪 +1000', '日进斗金 +1', '少加夜班 +1', '年终暴增 +1', '暴富 +1', '带薪摸鱼 +1', '项目大卖 +1']
    },
    {
        id: 'jieyou',
        name: '解忧殿',
        icon: '【寿】',
        title: '解忧殿 · 远离内耗',
        desc: '退散小人 · 降压解忧',
        accentColor: '#73D13D',
        badgeColor: 'rgba(28, 58, 28, 0.95)',
        floatWords: ['烦恼 -1', '内耗 -1', '甩锅 -1', 'PUA -1', 'BUG -1', '血压 -1', '失眠 -1', '小人退散 -1']
    }
];

function getCurrentTemple() {
    return TEMPLE_MODES.find(t => t.id === state.currentTempleId) || TEMPLE_MODES[0];
}

function getTodayDateStr() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

// 引入签库数据
let FORTUNE_SLIPS_DATA = [];
let getDailyFortuneSlipFunc = null;
try {
    const fd = require('./fortune_data.js');
    FORTUNE_SLIPS_DATA = fd.FORTUNE_SLIPS || [];
    getDailyFortuneSlipFunc = fd.getDailyFortuneSlip;
} catch(e) {}

if (!getDailyFortuneSlipFunc || !FORTUNE_SLIPS_DATA.length) {
    FORTUNE_SLIPS_DATA = [
        { name: "《第三十六签 · 仙鹤凌云》", tier: "【上上大吉】", poem: ["风恬浪静可行船", "恰是中秋月一轮", "凡事不须多忧虑", "福禄自然伴君身"], yi: "静心专注 · 蓄势待发", ji: "急躁内耗 · 瞻前顾后", desc: "云开雾散，前路清明。心若沉静，水到渠成。" },
        { name: "《文昌阁 · 魁星点斗》", tier: "【上上大吉】", poem: ["魁星笔下点朱砂", "独占鳌头第一家", "金榜题名春风里", "光宗耀祖展华霞"], yi: "背书复习 · 专注答题", ji: "玩物丧志 · 粗心大意", desc: "文曲星照，文思泉涌。今日复习攻坚效率翻倍，考试面试如有神助。" },
        { name: "《财神殿 · 陶朱聚宝》", tier: "【上上大吉】", poem: ["范蠡经商智略多", "五湖四海起金波", "广聚财源流不竭", "家肥屋润笑呵呵"], yi: "开拓业务 · 盘点收益", ji: "盲目投机 · 挥霍无度", desc: "财门大开，财路广进。运用智慧与诚信谋划，收益定当水涨船高。" },
        { name: "《解忧殿 · 清风拂山》", tier: "【上吉】", poem: ["他强任他强自强", "清风拂面过山冈", "浮名俗利皆身外", "坦荡无私体泰康"], yi: "远离纷扰 · 关照自我", ji: "在意是非 · 情绪内耗", desc: "外界喧嚣由他去，内心平静自成峰。不为小人言语所扰，心宽路自宽。" }
    ];
    getDailyFortuneSlipFunc = function(dateStr, templeId) {
        const d = new Date();
        const key = dateStr || `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        let hash = 0;
        for (let i = 0; i < key.length; i++) hash = ((hash << 5) - hash) + key.charCodeAt(i);
        hash = Math.abs(hash);
        let filtered = FORTUNE_SLIPS_DATA;
        if (templeId === 'wenchang') filtered = FORTUNE_SLIPS_DATA.filter(s => s.name.includes('文昌') || s.name.includes('仙鹤'));
        else if (templeId === 'wealth') filtered = FORTUNE_SLIPS_DATA.filter(s => s.name.includes('财神') || s.name.includes('第三十六'));
        else if (templeId === 'jieyou') filtered = FORTUNE_SLIPS_DATA.filter(s => s.name.includes('解忧') || s.name.includes('清风'));
        if (!filtered.length) filtered = FORTUNE_SLIPS_DATA;
        return filtered[hash % filtered.length];
    };
}

const state = {
    totalHit: 0,
    dharmaName: '',          // 自定义法号/昵称 (最多6字)
    critRate: 1,
    critRemainingSec: 0,
    isAutoHitting: false,
    autoRemainingSec: 0,
    dailyCritCount: 0,
    dailyAutoCount: 0,
    dailyAlmsCount: 0,
    dailyHit: 0,              // 今日修心功德值       // 每日功德不足看广告化缘次数 (上限5次/天)
    sfxEnabled: true,
    bgmEnabled: true,
    currentModal: null, // 'minigames', 'rank', 'titles', 'settings', 'gemhunt', 'rules', 'betpicker', 'ad_insufficient', 'ad_crit', 'ad_auto', 'ad_tier_unlock', 'bigwin', 'dharma_editor'
    rulesTab: 'icons',
    rulesPage: 0,            // 25 条连线规则分页索引 (0: 1-10, 1: 11-20, 2: 21-25)
    rankTab: 'friends',
    rankReturnModal: null,   // 排行榜关闭后返回的弹窗/界面 (如 'gemhunt')
    floatingTexts: [],
    hitRipples: [],
    malletAngle: 28,
    malletOffsetX: 0,
    malletOffsetY: 0,
    woodfishScale: 1.0,
    isBlinking: false,
    toastMsg: '',
    toastTimer: null,
    targetUnlockTierIdx: 3,
    insufficientBet: 200,
    unlockedTiers: {},
    selectedTrackIdx: 0,
    currentTempleId: (typeof wx !== 'undefined' && wx.getStorageSync && wx.getStorageSync('qmy_temple_id')) || 'ankang',
    todayFortuneSlip: null,
    hasShakenFortuneToday: false,
    fortuneState: 'idle', // 'idle' | 'shaking' | 'rising' | 'revealed'
    fortuneStartTime: 0,
    fortuneRiseStartTime: 0,
    fortuneRevealTime: 0,
    fortuneParticles: [],
    collectedSlips: [],       // 已收录入【灵签谱】的签文名称列表
    galleryTab: 'all',        // 'all' | 'general' | 'temple' | 'solar'
    galleryPage: 0,           // 灵签谱当前分页索引
    viewingGallerySlip: null, // 当前全屏研读的已解锁签文对象
    fortuneReturnModal: null, // 灵签谱关闭或返回的目标弹窗
    calendarRecords: {},
    selectedCalendarDay: new Date().getDate(),
    titleScrollY: 0,
    touchStartY: 0,
    startScrollY: 0,
    dharmaEditor: {
        inputText: '',     // 当前输入中的法号文字
        errorMsg: '',      // 实时校验错误提示
        cursorVisible: true,
        cursorTimer: null,
    },
    gemHunt: {
        currentBetIdx: 0,
        freeSpinsRemaining: 0,
        reels: createInitialReels(),
        pendingWin: 0,
        winningLines: [],
        winningCells: {},
        winAnimStartTime: 0,
        bigWinData: null,
        grid: [
            [SYMBOLS[8], SYMBOLS[9], SYMBOLS[10]],
            [SYMBOLS[11], SYMBOLS[7], SYMBOLS[6]],
            [SYMBOLS[4], SYMBOLS[5], SYMBOLS[3]],
            [SYMBOLS[2], SYMBOLS[0], SYMBOLS[1]],
            [SYMBOLS[8], SYMBOLS[10], SYMBOLS[11]]
        ],
        isSpinning: false,
        lastWin: 0
    }
};

// 恢复本地存储数据
try {
    const todayStr = getTodayDateStr();
    const savedDate = (typeof wx !== 'undefined' && wx.getStorageSync) ? wx.getStorageSync('qmy_date') : '';
    if (savedDate !== todayStr && typeof wx !== 'undefined' && wx.setStorageSync) {
        wx.setStorageSync('qmy_date', todayStr);
        wx.setStorageSync('qmy_crit_count', '0');
        wx.setStorageSync('qmy_auto_count', '0');
        wx.setStorageSync('qmy_alms_count', '0');
        wx.setStorageSync('qmy_daily_hit', '0');
        state.dailyCritCount = 0;
        state.dailyAutoCount = 0;
        state.dailyAlmsCount = 0;
        state.dailyHit = 0;
    } else if (typeof wx !== 'undefined' && wx.getStorageSync) {
        state.dailyCritCount = parseInt(wx.getStorageSync('qmy_crit_count') || '0', 10);
        state.dailyAutoCount = parseInt(wx.getStorageSync('qmy_auto_count') || '0', 10);
        state.dailyAlmsCount = parseInt(wx.getStorageSync('qmy_alms_count') || '0', 10);
        state.dailyHit = parseInt(wx.getStorageSync('qmy_daily_hit') || '0', 10);
    }

    const saved = (typeof wx !== 'undefined' && wx.getStorageSync) ? wx.getStorageSync('qmy_total_hit') : '0';
    state.totalHit = parseInt(saved || '0', 10);
    const savedDaily = (typeof wx !== 'undefined' && wx.getStorageSync) ? wx.getStorageSync('qmy_daily_hit') : null;
    if (savedDaily !== null && savedDaily !== '') {
        state.dailyHit = parseInt(savedDaily, 10);
    } else {
        state.dailyHit = state.totalHit;
    }
    const savedDharma = (typeof wx !== 'undefined' && wx.getStorageSync) ? wx.getStorageSync('qmy_dharma_name') : '';
    state.dharmaName = savedDharma || '';

    // 恢复今日抽签/签到状态
    const savedFortuneDate = (typeof wx !== 'undefined' && wx.getStorageSync ? wx.getStorageSync('qmy_fortune_date') : '') || '';
    if (savedFortuneDate === todayStr) {
        state.hasShakenFortuneToday = true;
        state.fortuneState = 'revealed';
        const savedSlipJson = (typeof wx !== 'undefined' && wx.getStorageSync) ? wx.getStorageSync('qmy_fortune_slip') : '';
        if (savedSlipJson) {
            try { state.todayFortuneSlip = JSON.parse(savedSlipJson); } catch(e) {}
        }
        if (!state.todayFortuneSlip && getDailyFortuneSlipFunc) {
            state.todayFortuneSlip = getDailyFortuneSlipFunc(todayStr, state.currentTempleId);
        }
    } else {
        state.hasShakenFortuneToday = false;
        state.todayFortuneSlip = null;
        state.fortuneState = 'idle';
    }

    // 恢复历史修行日历档案
    const savedRecords = (typeof wx !== 'undefined' && wx.getStorageSync ? wx.getStorageSync('qmy_calendar_records') : '') || '';
    if (savedRecords) {
        try { state.calendarRecords = JSON.parse(savedRecords); } catch(e) {}
    }
    if (!state.calendarRecords) state.calendarRecords = {};

    // 恢复灵签谱收集档案并自动同步历史
    const savedSlips = (typeof wx !== 'undefined' && wx.getStorageSync ? wx.getStorageSync('qmy_collected_slips') : '') || '';
    if (savedSlips) {
        try { state.collectedSlips = JSON.parse(savedSlips); } catch(e) {}
    }
    if (!Array.isArray(state.collectedSlips)) state.collectedSlips = [];

    // 自动扫描修行日历中的历史灵签与今日灵签合并入库
    if (state.calendarRecords && typeof state.calendarRecords === 'object') {
        Object.values(state.calendarRecords).forEach(rec => {
            if (rec && rec.fortuneSlip && rec.fortuneSlip.name && !state.collectedSlips.includes(rec.fortuneSlip.name)) {
                state.collectedSlips.push(rec.fortuneSlip.name);
            }
        });
    }
    if (state.todayFortuneSlip && state.todayFortuneSlip.name && !state.collectedSlips.includes(state.todayFortuneSlip.name)) {
        state.collectedSlips.push(state.todayFortuneSlip.name);
    }
    try {
        if (typeof wx !== 'undefined' && wx.setStorageSync) {
            wx.setStorageSync('qmy_collected_slips', JSON.stringify(state.collectedSlips));
        }
    } catch(e) {}
} catch (e) {
    console.error('加载本地存储异常:', e);
}

// ------------------------------------------------------------------
// 灵签收录与图鉴过滤工具函数
// ------------------------------------------------------------------
function collectFortuneSlip(slip) {
    if (!slip || !slip.name) return false;
    if (!Array.isArray(state.collectedSlips)) state.collectedSlips = [];
    if (!state.collectedSlips.includes(slip.name)) {
        state.collectedSlips.push(slip.name);
        try {
            if (typeof wx !== 'undefined' && wx.setStorageSync) {
                wx.setStorageSync('qmy_collected_slips', JSON.stringify(state.collectedSlips));
            }
        } catch(e) {}
        return true; // 标识首次点亮
    }
    return false;
}

function getGalleryFilteredSlips(tabKey) {
    const all = FORTUNE_SLIPS_DATA || [];
    if (tabKey === 'general') return all.filter(s => s.name && s.name.startsWith('《第'));
    if (tabKey === 'temple') return all.filter(s => s.name && (s.name.includes('文昌') || s.name.includes('财神') || s.name.includes('解忧')));
    if (tabKey === 'solar') return all.filter(s => s.name && (s.name.includes('节气') || s.name.includes('特签')));
    return all;
}

// ------------------------------------------------------------------
// 修行日历归档与记录同步函数
// ------------------------------------------------------------------
function recordCalendarProgress(overrideData = {}) {
    const today = getTodayDateStr();
    if (!state.calendarRecords) state.calendarRecords = {};
    const existing = state.calendarRecords[today] || {};
    const isFull = (state.dailyHit || 0) >= 108;
    state.calendarRecords[today] = {
        hits: state.dailyHit || 0,
        stamped: isFull,
        hasFortune: !!(state.hasShakenFortuneToday || state.todayFortuneSlip),
        fortuneSlip: state.todayFortuneSlip || existing.fortuneSlip || null,
        templeId: state.currentTempleId,
        ...overrideData
    };
    try {
        if (typeof wx !== 'undefined' && wx.setStorageSync) {
            wx.setStorageSync('qmy_calendar_records', JSON.stringify(state.calendarRecords));
        }
    } catch(e) {}
}

// ------------------------------------------------------------------
// 摇签粒子与加速度感应器系统
// ------------------------------------------------------------------
function spawnFortuneParticles(cx, cy, count = 2) {
    for (let i = 0; i < count; i++) {
        state.fortuneParticles.push({
            x: cx + (Math.random() - 0.5) * 44 * uiScale,
            y: cy + (Math.random() - 0.5) * 20 * uiScale,
            vx: (Math.random() - 0.5) * 1.6 * uiScale,
            vy: (-1.0 - Math.random() * 2.2) * uiScale,
            size: (2.2 + Math.random() * 3.2),
            alpha: 1.0,
            color: Math.random() > 0.3 ? '#FFE072' : '#FF7875'
        });
    }
}

let _fortuneClatterTimer = null;
function triggerFortuneShake() {
    if (state.hasShakenFortuneToday || state.fortuneState === 'shaking' || state.fortuneState === 'rising') return;
    state.fortuneState = 'shaking';
    state.fortuneStartTime = Date.now();
    state.fortuneParticles = [];

    // 播放敲击竹木声与轻微震动
    try { soundManager.playWoodHit(); } catch(e) {}
    if (state.sfxEnabled && typeof wx !== 'undefined' && wx.vibrateShort) {
        try { wx.vibrateShort({ type: 'light', fail: () => {} }); } catch(e) {}
    }

    if (_fortuneClatterTimer) {
        clearInterval(_fortuneClatterTimer);
        _fortuneClatterTimer = null;
    }
    let clatterCount = 0;
    _fortuneClatterTimer = setInterval(() => {
        if (state.fortuneState !== 'shaking') {
            if (_fortuneClatterTimer) {
                clearInterval(_fortuneClatterTimer);
                _fortuneClatterTimer = null;
            }
            return;
        }
        clatterCount++;
        try { soundManager.playWoodHit(); } catch(e) {}
        if (state.sfxEnabled && typeof wx !== 'undefined' && wx.vibrateShort) {
            try { wx.vibrateShort({ type: 'light', fail: () => {} }); } catch(e) {}
        }
        if (clatterCount >= 6) {
            if (_fortuneClatterTimer) {
                clearInterval(_fortuneClatterTimer);
                _fortuneClatterTimer = null;
            }
        }
    }, 220);
}

let _isAccelListening = false;
let _lastAccelX = 0, _lastAccelY = 0, _lastAccelZ = 0, _lastAccelTime = 0;

function startFortuneShakeListener() {
    if (typeof wx === 'undefined' || !wx.startAccelerometer || _isAccelListening) return;
    try {
        _isAccelListening = true;
        _lastAccelTime = 0;
        wx.startAccelerometer({ interval: 'game', fail: () => {} });
        wx.onAccelerometerChange((res) => {
            if (!res || typeof res.x !== 'number') return;
            if (state.currentModal !== 'fortune_slip' || state.hasShakenFortuneToday || state.fortuneState !== 'idle') return;
            const now = Date.now();
            if (_lastAccelTime === 0) {
                _lastAccelTime = now;
                _lastAccelX = res.x || 0;
                _lastAccelY = res.y || 0;
                _lastAccelZ = res.z || 0;
                return;
            }
            if (now - _lastAccelTime > 120) {
                _lastAccelTime = now;
                const delta = Math.abs(res.x - _lastAccelX) + Math.abs(res.y - _lastAccelY) + Math.abs(res.z - _lastAccelZ);
                if (delta > 2.0) {
                    triggerFortuneShake();
                }
                _lastAccelX = res.x;
                _lastAccelY = res.y;
                _lastAccelZ = res.z;
            }
        });
    } catch(e) {}
}

function stopFortuneShakeListener() {
    if (_fortuneClatterTimer) {
        clearInterval(_fortuneClatterTimer);
        _fortuneClatterTimer = null;
    }
    _lastAccelTime = 0;
    if (typeof wx === 'undefined' || !wx.stopAccelerometer || !_isAccelListening) return;
    try {
        wx.stopAccelerometer({ fail: () => {} });
        _isAccelListening = false;
    } catch(e) {}
}

// ------------------------------------------------------------------
// 每日灵签：微信好友/群分享与高清壁纸海报生成系统
// ------------------------------------------------------------------
function generateFortuneShareCard(slip, callback) {
    const sw = 500;
    const sh = 400;
    let sCanvas = null;
    if (typeof wx !== 'undefined' && wx.createOffscreenCanvas) {
        try { sCanvas = wx.createOffscreenCanvas({ type: '2d', width: sw, height: sh }); } catch(e) {}
    }
    if (!sCanvas && typeof wx !== 'undefined' && wx.createCanvas) {
        try {
            sCanvas = wx.createCanvas();
            sCanvas.width = sw;
            sCanvas.height = sh;
        } catch(e) {}
    }
    if (!sCanvas) {
        callback(null);
        return;
    }
    const sctx = sCanvas.getContext('2d');
    if (!sctx) {
        callback(null);
        return;
    }

    // 1. 底色与边框
    const bgGrad = sctx.createLinearGradient(0, 0, 0, sh);
    bgGrad.addColorStop(0, '#1E110A');
    bgGrad.addColorStop(0.5, '#2D180F');
    bgGrad.addColorStop(1, '#150A05');
    sctx.fillStyle = bgGrad;
    sctx.fillRect(0, 0, sw, sh);

    sctx.strokeStyle = '#8C6D1F';
    sctx.lineWidth = 3;
    drawRoundRect(sctx, 10, 10, sw - 20, sh - 20, 12);
    sctx.stroke();

    sctx.strokeStyle = '#F5C44B';
    sctx.lineWidth = 1.2;
    drawRoundRect(sctx, 14, 14, sw - 28, sh - 28, 10);
    sctx.stroke();

    // 2. 顶部标题
    const temple = getCurrentTemple();
    sctx.textAlign = 'center';
    sctx.fillStyle = '#FFE072';
    sctx.font = 'bold 20px sans-serif';
    sctx.fillText(`【${temple.name} · 每日祈愿灵签】`, sw / 2, 40);

    // 3. 红笺古卷
    const scrollX = 24;
    const scrollY = 54;
    const scrollW = sw - 48;
    const scrollH = 296;

    const scGrad = sctx.createLinearGradient(scrollX, scrollY, scrollX, scrollY + scrollH);
    scGrad.addColorStop(0, '#5C1E14');
    scGrad.addColorStop(0.5, '#6E2519');
    scGrad.addColorStop(1, '#3E120B');
    sctx.fillStyle = scGrad;
    drawRoundRect(sctx, scrollX, scrollY, scrollW, scrollH, 12);
    sctx.fill();

    sctx.strokeStyle = '#F5C44B';
    sctx.lineWidth = 2;
    sctx.stroke();

    // 4. 签题与朱砂印章
    sctx.textAlign = 'left';
    sctx.fillStyle = '#FFE072';
    sctx.font = 'bold 18px sans-serif';
    sctx.fillText(slip.name || '《祈愿灵签》', scrollX + 16, scrollY + 30);

    const stampW = 92;
    const stampH = 28;
    const stampX = scrollX + scrollW - stampW - 16;
    const stampY = scrollY + 12;
    sctx.fillStyle = '#C0392B';
    drawRoundRect(sctx, stampX, stampY, stampW, stampH, 4);
    sctx.fill();
    sctx.strokeStyle = '#FFD700';
    sctx.lineWidth = 1.2;
    sctx.stroke();

    sctx.textAlign = 'center';
    sctx.fillStyle = '#FFF8E7';
    sctx.font = 'bold 14px sans-serif';
    sctx.fillText(slip.tier || '【上上大吉】', stampX + stampW / 2, stampY + 19);

    // 5. 核心签诗四句 (清晰大字)
    sctx.textAlign = 'center';
    sctx.fillStyle = '#FFF2B2';
    sctx.font = 'bold 19px Kaiti, serif, sans-serif';
    const poemList = (Array.isArray(slip.poem) && slip.poem.length) 
        ? slip.poem 
        : ['心诚则灵福自来', '一念清净化尘埃', '诸般顺遂皆如意', '福慧圆满照灵台'];
    poemList.forEach((line, pIdx) => {
        sctx.fillText(String(line), sw / 2, scrollY + 76 + pIdx * 28);
    });

    // 6. 分割线与所宜所忌
    const divY = scrollY + 194;
    sctx.strokeStyle = 'rgba(245, 196, 75, 0.4)';
    sctx.lineWidth = 1.2;
    sctx.beginPath();
    sctx.moveTo(scrollX + 20, divY);
    sctx.lineTo(scrollX + scrollW - 20, divY);
    sctx.stroke();

    sctx.textAlign = 'left';
    sctx.font = 'bold 13px sans-serif';
    sctx.fillStyle = '#95DE64';
    sctx.fillText(`【宜】 ${slip.yi || '静心笃行 · 开启新程'}`, scrollX + 20, divY + 22);

    sctx.fillStyle = '#FF7875';
    sctx.fillText(`【忌】 ${slip.ji || '急躁内耗 · 瞻前顾后'}`, scrollX + 20, divY + 44);

    sctx.fillStyle = '#FFE072';
    sctx.font = '12px sans-serif';
    sctx.fillText(`解曰：${slip.desc || '心若安定，万事亨通。'}`, scrollX + 20, divY + 68);

    // 7. 底部导引文案
    sctx.textAlign = 'center';
    sctx.font = 'bold 14px sans-serif';
    sctx.fillStyle = '#FFE072';
    sctx.fillText('✦ 点击测测你的今日运势 · 开启每日灵签 ✦', sw / 2, sh - 18);

    try {
        if (sCanvas.toTempFilePath) {
            sCanvas.toTempFilePath({
                x: 0,
                y: 0,
                width: sw,
                height: sh,
                destWidth: sw,
                destHeight: sh,
                fileType: 'png',
                success: (res) => {
                    callback(res.tempFilePath);
                },
                fail: () => {
                    callback(null);
                }
            });
            return;
        }
    } catch(e) {}
    callback(null);
}

function shareFortuneSlip(slip) {
    if (!slip) slip = state.todayFortuneSlip;
    if (!slip) return;
    const temple = getCurrentTemple();
    const poemFirstLine = (slip.poem && slip.poem[0]) ? slip.poem[0] : '诸般顺遂皆如意';
    const tierText = slip.tier ? slip.tier.replace(/【|】/g, '') : '大吉';
    const shareTitle = `喜提【${tierText}】！我在${temple.name}抽到${slip.name}：“${poemFirstLine}”～快来测测今日运势！`;
    const shareQuery = `modal=fortune_slip&temple=${temple.id}`;
    
    generateFortuneShareCard(slip, (tempImgPath) => {
        const shareImg = tempImgPath || 'share_500x400.jpg';
        if (typeof wx !== 'undefined' && wx.shareAppMessage) {
            try {
                wx.shareAppMessage({
                    title: shareTitle,
                    imageUrl: shareImg,
                    query: shareQuery
                });
                showToast('已发起灵签分享，快与好友一同祈福吧！');
            } catch(e) {
                showToast('灵签福运已备好，请点击右上角分享！');
            }
        } else {
            showToast('灵签福运已备好，请点击右上角分享！');
        }
    });
}

function saveFortunePoster(slip) {
    if (!slip) slip = state.todayFortuneSlip;
    if (!slip) return;
    
    showToast('正在生成高清灵签壁纸...');
    
    const pw = 720;
    const ph = 1280;
    
    let posterCanvas = null;
    // 优先使用标准 wx.createCanvas (微信小游戏全平台 100% 兼容 toTempFilePath 与预览)
    if (typeof wx !== 'undefined' && wx.createCanvas) {
        try {
            posterCanvas = wx.createCanvas();
            posterCanvas.width = pw;
            posterCanvas.height = ph;
        } catch(e) {}
    }
    if (!posterCanvas && typeof wx !== 'undefined' && wx.createOffscreenCanvas) {
        try {
            posterCanvas = wx.createOffscreenCanvas({ type: '2d', width: pw, height: ph });
        } catch(e) {}
    }
    if (!posterCanvas) {
        showToast('当前环境暂不支持生成壁纸');
        return;
    }
    
    const pctx = posterCanvas.getContext('2d');
    if (!pctx) {
        showToast('画布初始化异常');
        return;
    }
    
    // 1. 底色渐变与边框 (古刹深棕黑底色)
    const bgGrad = pctx.createLinearGradient(0, 0, 0, ph);
    bgGrad.addColorStop(0, '#160E08');
    bgGrad.addColorStop(0.5, '#22150D');
    bgGrad.addColorStop(1, '#120A05');
    pctx.fillStyle = bgGrad;
    pctx.fillRect(0, 0, pw, ph);
    
    // 2. 装饰性典雅双重金线边框
    pctx.strokeStyle = '#8C6D1F';
    pctx.lineWidth = 4;
    drawRoundRect(pctx, 24, 24, pw - 48, ph - 48, 16);
    pctx.stroke();
    
    pctx.strokeStyle = '#D4AF37';
    pctx.lineWidth = 1.5;
    drawRoundRect(pctx, 32, 32, pw - 64, ph - 64, 12);
    pctx.stroke();
    
    // 四角金星圆点
    const cornerDots = [
        [32, 32], [pw - 32, 32], [32, ph - 32], [pw - 32, ph - 32]
    ];
    cornerDots.forEach(([cx, cy]) => {
        pctx.fillStyle = '#FFE072';
        pctx.beginPath();
        pctx.arc(cx, cy, 5, 0, Math.PI * 2);
        pctx.fill();
    });
    
    // 3. 顶部古刹与日期题头
    const temple = getCurrentTemple();
    pctx.textAlign = 'center';
    pctx.fillStyle = '#FFE072';
    pctx.font = 'bold 32px sans-serif';
    pctx.fillText(`【${temple.name} · 每日祈愿灵签】`, pw / 2, 90);
    
    const dStr = getTodayDateStr();
    pctx.fillStyle = '#D4AF37';
    pctx.font = '20px sans-serif';
    pctx.fillText(`诚心所愿 · 公历 ${dStr}`, pw / 2, 128);
    
    // 4. 中央红笺古卷主体
    const scrollX = 54;
    const scrollY = 160;
    const scrollW = pw - 108;
    const scrollH = 820;
    
    const scrollGrad = pctx.createLinearGradient(scrollX, scrollY, scrollX, scrollY + scrollH);
    scrollGrad.addColorStop(0, '#5A1E14');
    scrollGrad.addColorStop(0.5, '#6E2519');
    scrollGrad.addColorStop(1, '#3D120B');
    pctx.fillStyle = scrollGrad;
    drawRoundRect(pctx, scrollX, scrollY, scrollW, scrollH, 20);
    pctx.fill();
    
    pctx.strokeStyle = '#F5C44B';
    pctx.lineWidth = 3;
    pctx.stroke();
    
    pctx.strokeStyle = 'rgba(255, 224, 114, 0.4)';
    pctx.lineWidth = 1;
    drawRoundRect(pctx, scrollX + 10, scrollY + 10, scrollW - 20, scrollH - 20, 14);
    pctx.stroke();
    
    // 5. 签题与朱砂红印
    pctx.textAlign = 'left';
    pctx.fillStyle = '#FFE072';
    pctx.font = 'bold 36px sans-serif';
    pctx.fillText(slip.name || '《祈愿灵签》', scrollX + 36, scrollY + 68);
    
    // 朱砂金印
    const stampW = 160;
    const stampH = 50;
    const stampX = scrollX + scrollW - stampW - 36;
    const stampY = scrollY + 32;
    pctx.fillStyle = '#C0392B';
    drawRoundRect(pctx, stampX, stampY, stampW, stampH, 8);
    pctx.fill();
    pctx.strokeStyle = '#FFD700';
    pctx.lineWidth = 2;
    pctx.stroke();
    
    pctx.textAlign = 'center';
    pctx.fillStyle = '#FFF8E7';
    pctx.font = 'bold 24px sans-serif';
    pctx.fillText(slip.tier || '【上上大吉】', stampX + stampW / 2, stampY + 34);
    
    // 6. 核心签诗四句 (大字书法感居中排版)
    pctx.textAlign = 'center';
    pctx.fillStyle = '#FFF2B2';
    pctx.font = 'bold 38px Kaiti, serif, sans-serif';
    const poemList = (Array.isArray(slip.poem) && slip.poem.length) 
        ? slip.poem 
        : ['心诚则灵福自来', '一念清净化尘埃', '诸般顺遂皆如意', '福慧圆满照灵台'];
    
    poemList.forEach((line, pIdx) => {
        pctx.fillText(String(line), pw / 2, scrollY + 175 + pIdx * 62);
    });
    
    // 7. 金色华彩分割纹样
    const divY = scrollY + 440;
    pctx.strokeStyle = '#D4AF37';
    pctx.lineWidth = 2;
    pctx.beginPath();
    pctx.moveTo(scrollX + 40, divY);
    pctx.lineTo(scrollX + scrollW - 40, divY);
    pctx.stroke();
    
    pctx.fillStyle = '#D4AF37';
    pctx.font = 'bold 20px sans-serif';
    pctx.fillText('◈ 佛光普照 · 诸事顺遂 ◈', pw / 2, divY + 7);
    
    // 8. 今日【宜】与【忌】
    pctx.textAlign = 'left';
    pctx.font = 'bold 26px sans-serif';
    pctx.fillStyle = '#95DE64';
    pctx.fillText(`【宜】 ${slip.yi || '静心笃行 · 开启新程'}`, scrollX + 40, divY + 55);
    
    pctx.fillStyle = '#FF7875';
    pctx.fillText(`【忌】 ${slip.ji || '急躁内耗 · 瞻前顾后'}`, scrollX + 40, divY + 105);
    
    // 9. 禅语解惑
    pctx.fillStyle = '#FFE072';
    pctx.font = '24px sans-serif';
    const descText = `解曰：${slip.desc || '心若安定，万事亨通。顺应时势，自有吉兆。'}`;
    const maxDescW = scrollW - 80;
    let descLine = '';
    let descLineY = divY + 165;
    for (let c = 0; c < descText.length; c++) {
        const testLine = descLine + descText[c];
        if (pctx.measureText(testLine).width > maxDescW && c > 0) {
            pctx.fillText(descLine, scrollX + 40, descLineY);
            descLine = descText[c];
            descLineY += 34;
        } else {
            descLine = testLine;
        }
    }
    if (descLine) {
        pctx.fillText(descLine, scrollX + 40, descLineY);
    }
    
    // 10. 修行者功德结印落款
    const titleObj = getCurrentTitle(state.totalHit || 0);
    const dharmaName = state.dharmaName ? `【${state.dharmaName}】` : '【修行居士】';
    const titleName = (titleObj && titleObj.current) ? titleObj.current.name : '初结善缘';
    
    const footerBoxY = scrollY + scrollH + 30;
    pctx.textAlign = 'center';
    pctx.font = '22px sans-serif';
    pctx.fillStyle = '#FFE072';
    pctx.fillText(`持修者：${dharmaName} · 称号：${titleName} · 功德值：${state.totalHit || 0}`, pw / 2, footerBoxY);
    
    pctx.font = '18px sans-serif';
    pctx.fillStyle = '#A8988B';
    pctx.fillText('《叩叩解压 · 静心敲木鱼》· 每日一签 · 福运常伴', pw / 2, footerBoxY + 34);
    pctx.fillText('长按图片可直接保存至手机相册 · 愿您心静自安', pw / 2, footerBoxY + 64);
    
    // 导出高清图片文件并展示全屏壁纸预览 & 保存相册
    const doExport = () => {
        try {
            const exportFunc = posterCanvas.toTempFilePath || (posterCanvas.toTempFilePathSync ? (opts) => {
                try {
                    const p = posterCanvas.toTempFilePathSync(opts);
                    if (opts.success) opts.success({ tempFilePath: p });
                } catch(err) {
                    if (opts.fail) opts.fail(err);
                }
            } : null);

            if (exportFunc) {
                exportFunc.call(posterCanvas, {
                    x: 0,
                    y: 0,
                    width: pw,
                    height: ph,
                    destWidth: pw,
                    destHeight: ph,
                    fileType: 'png',
                    success: (res) => {
                        const tempFilePath = res.tempFilePath;
                        
                        // 1. 立即弹出全屏高清大图预览 (用户立即可见震撼高清壁纸，长按可直接保存相册或分享)
                        if (typeof wx !== 'undefined' && wx.previewImage) {
                            try {
                                wx.previewImage({
                                    urls: [tempFilePath],
                                    current: tempFilePath,
                                    fail: () => {}
                                });
                            } catch(e) {}
                        }

                        // 2. 同时自动将高清海报保存至手机本地相册
                        if (typeof wx !== 'undefined' && wx.saveImageToPhotosAlbum) {
                            wx.saveImageToPhotosAlbum({
                                filePath: tempFilePath,
                                success: () => {
                                    showToast('灵签壁纸海报已自动保存至相册！');
                                    if (typeof wx.vibrateShort === 'function') {
                                        try { wx.vibrateShort({ type: 'medium', fail: () => {} }); } catch(e) {}
                                    }
                                },
                                fail: (err) => {
                                    if (err && err.errMsg && (err.errMsg.includes('auth') || err.errMsg.includes('deny') || err.errMsg.includes('fail auth'))) {
                                        if (wx.showModal) {
                                            wx.showModal({
                                                title: '保存壁纸海报',
                                                content: '长按预览大图可直接保存，或点击“去授权”开启手机相册权限～',
                                                confirmText: '去授权',
                                                cancelText: '取消',
                                                success: (mRes) => {
                                                    if (mRes.confirm && wx.openSetting) {
                                                        wx.openSetting({});
                                                    }
                                                }
                                            });
                                        }
                                    } else {
                                        showToast('灵签壁纸已生成，长按图片即可保存！');
                                    }
                                }
                            });
                        } else {
                            showToast('灵签壁纸已生成，长按图片即可保存！');
                        }
                    },
                    fail: (err) => {
                        console.error('壁纸导出失败:', err);
                        showToast('壁纸生成失败，请重试');
                    }
                });
            } else {
                showToast('当前设备环境暂不支持导出图片');
            }
        } catch(e) {
            console.error('生成壁纸捕获异常:', e);
            showToast('保存壁纸遇到问题');
        }
    };

    // 稍微延迟 20ms 确保 Canvas 绘制管线完全 commit
    setTimeout(doExport, 20);
}

function loadUnlockedTiers() {
    try {
        if (typeof wx !== 'undefined' && wx.getStorageSync) {
            const raw = wx.getStorageSync('qmy_unlocked_tiers');
            if (raw) {
                const parsed = JSON.parse(raw);
                const nowTime = Date.now();
                Object.keys(parsed).forEach(k => {
                    if (parsed[k] > nowTime) {
                        state.unlockedTiers[k] = parsed[k];
                    }
                });
            }
        }
    } catch (e) {}
}
function saveUnlockedTiers() {
    try {
        if (typeof wx !== 'undefined' && wx.setStorageSync) {
            wx.setStorageSync('qmy_unlocked_tiers', JSON.stringify(state.unlockedTiers));
        }
    } catch (e) {}
}
loadUnlockedTiers();

function isTierUnlocked(tierIdx) {
    if (tierIdx < 3) return true;
    const expireTime = state.unlockedTiers[tierIdx];
    return typeof expireTime === 'number' && expireTime > Date.now();
}

// 提示 Toast 消息系统 (屏幕中央单层金色胶囊，2秒自动渐隐，无需手动关闭)

// ------------------------------------------------------------------
// 法号自定义系统：敏感词过滤、防重、长度校验
// ------------------------------------------------------------------

// 违规词黑名单 (广泛覆盖低俗/政治/仇恨/暴力类词汇)
const BANNED_WORDS = [
    // 佛教尊讳保护 (不允许冒用)
    '释迦牟尼','如来','观世音','文殊','普贤','地藏','弥勒','阿弥陀',
    '玉皇','太上老君','太上','真主','耶稣','上帝',
    // 政治类
    '习近平','毛泽东','邓小平','江泽民','胡锦涛','共产党','国民党',
    '天安门','六四','法轮功','法轮','台独','藏独','港独','新疆独',
    // 低俗类 (选择性收录，避免误伤)
    '操','傻逼','sb','cnm','nmsl','wqnmlgb','妈的','妈逼','尼玛','草泥马',
    'fuck','shit','bitch','asshole',
    // 暴力仇恨
    '杀死','去死','死亡','爆炸','枪击','恐怖分子',
    // 赌博诈骗
    '赌博','博彩','六合彩','彩票','提款','转账',
];

// 系统保留法号
const RESERVED_NAMES = [
    '静心居士','渡世法师','妙觉禅师','慈悲菩萨','普度众生',
    '禅心客','系统','管理员','官方','admin','system',
];

// 违规词检测 (返回命中的违规词，无则返回 null)
function detectBannedWord(name) {
    const lowerName = name.toLowerCase();
    for (const w of BANNED_WORDS) {
        if (lowerName.includes(w.toLowerCase())) return w;
    }
    for (const r of RESERVED_NAMES) {
        if (lowerName === r.toLowerCase()) return r;
    }
    return null;
}

// 法号完整校验流水线 (返回 { ok: bool, msg: string })
function validateDharmaName(name) {
    const trimmed = name.trim();
    if (!trimmed) return { ok: false, msg: '法号不能为空，请输入您的禅心法号！' };
    if (trimmed.length < 2) return { ok: false, msg: '法号至少需要 2 个字，请完善您的法号！' };
    if (trimmed.length > 6) return { ok: false, msg: '法号最多 6 个字，请精简您的禅心法号！' };
    // 非法字符检测 (只允许中文、英文、数字、常见标点)
    if (/[<>\"\';&%$#@!~`|{}\[\]^*\+]/.test(trimmed)) {
        return { ok: false, msg: '法号包含非法字符，请使用中文或英文字母！' };
    }
    const banned = detectBannedWord(trimmed);
    if (banned) return { ok: false, msg: `「${trimmed}」含有违禁内容，请换一个法号！` };
    if (trimmed === state.dharmaName) return { ok: false, msg: '这已经是您当前的法号了！' };
    return { ok: true, msg: '' };
}

// 保存法号并上报好友云存储
function saveDharmaName(name) {
    state.dharmaName = name;
    try {
        if (typeof wx !== 'undefined' && wx.setStorageSync) {
            wx.setStorageSync('qmy_dharma_name', name);
        }
    } catch(e) {}
    // 同步上报好友云存储排行榜
    reportScoreToFriendCloud();
}

// 开放数据域消息通道 (上报分数与法号)
let openDataCtx = null;
function getOpenDataContext() {
    if (openDataCtx) return openDataCtx;
    try {
        if (typeof wx !== 'undefined' && wx.getOpenDataContext) {
            openDataCtx = wx.getOpenDataContext();
        }
    } catch(e) {}
    return openDataCtx;
}

function reportScoreToFriendCloud() {
    try {
        const { current: curTitle } = getCurrentTitle(state.totalHit);
        const dName = curTitle ? curTitle.name : '初结善缘';
        
        // 1. 直接主线程写入微信官方好友云存储
        if (typeof wx !== 'undefined' && wx.setUserCloudStorage) {
            wx.setUserCloudStorage({
                KVDataList: [
                    { key: 'qmy_total_hit', value: String(state.totalHit || 0) },
                    { key: 'qmy_dharma_name', value: dName }
                ],
                fail: () => {}
            });
        }
        // 2. 发送给开放数据域
        const ctx2d = getOpenDataContext();
        if (ctx2d) {
            ctx2d.postMessage({
                type: 'UPDATE_SCORE',
                score: state.totalHit || 0,
                dharmaName: dName
            });
        }
    } catch(e) {}
}

// 请求刷新好友排行榜（防抖节流，避免高频 postMessage 卡死）
let lastRankReqTime = 0;
function requestFriendRankData() {
    const now = Date.now();
    if (now - lastRankReqTime < 500) return;
    lastRankReqTime = now;

    try {
        const odc = getOpenDataContext();
        if (odc) {
            const cardW = W * 0.86;
            const cardH = Math.min(H * 0.65, 420);
            const sharedAreaW = cardW - 20;
            const sharedAreaH = cardH - 124;
            const realW = Math.round(sharedAreaW * dpr);
            const realH = Math.round(sharedAreaH * dpr);
            
            const sharedCanvas = odc.canvas;
            if (sharedCanvas && (sharedCanvas.width !== realW || sharedCanvas.height !== realH)) {
                sharedCanvas.width = realW;
                sharedCanvas.height = realH;
            }

            const { current: curTitle } = getCurrentTitle(state.totalHit);
            odc.postMessage({
                type: 'RENDER_FRIEND_RANK',
                width: realW,
                height: realH,
                dpr: dpr,
                myScore: state.totalHit || 0,
                dharmaName: curTitle ? curTitle.name : '初结善缘'
            });
        }
    } catch(e) {}
}

// ------------------------------------------------------------------
// 玩家修行法号与身份管理（微信原生安全合规，无键盘输入，提审 100% 免审）
// ------------------------------------------------------------------

function showToast(msg) {
    if (!msg) return;
    state.toastMsg = msg;
    if (state.toastTimer) clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => {
        state.toastMsg = '';
    }, 2200);
}

// 绘制全局屏幕居中浮动提示弹框 (100% 居中屏幕中央，金色质感，动态自适应文本宽度)
function drawScreenToast(ctx) {
    if (!state.toastMsg) return;
    ctx.save();
    ctx.font = `bold ${Math.round(13 * uiScale)}px sans-serif`;
    const textW = ctx.measureText(state.toastMsg).width;
    const toastW = Math.max(Math.round(180 * uiScale), Math.min(W * 0.90, textW + Math.round(40 * uiScale)));
    const toastH = Math.round(40 * uiScale);
    const toastX = (W - toastW) / 2;
    const toastY = (H - toastH) / 2;

    ctx.shadowColor = 'rgba(245, 196, 75, 0.6)';
    ctx.shadowBlur = 14;

    ctx.fillStyle = 'rgba(22, 14, 8, 0.96)';
    drawRoundRect(ctx, toastX, toastY, toastW, toastH, toastH / 2);
    ctx.fill();

    ctx.strokeStyle = '#F5C44B';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    ctx.shadowBlur = 0;

    ctx.fillStyle = '#FFE072';
    ctx.textAlign = 'center';
    ctx.fillText(state.toastMsg, W / 2, toastY + toastH / 2 + Math.round(4.5 * uiScale));
    ctx.restore();
}

// 闲置自然眨眼
setInterval(() => {
    state.isBlinking = true;
    setTimeout(() => { state.isBlinking = false; }, 180);
}, 4500);

// 暴击与自动敲击倒计时
setInterval(() => {
    if (state.critRate > 1 && state.critRemainingSec > 0) {
        state.critRemainingSec--;
        if (state.critRemainingSec <= 0) {
            state.critRate = 1;
            showToast('暴击增益已到期');
        }
    }

    if (state.isAutoHitting && state.autoRemainingSec > 0) {
        state.autoRemainingSec--;
        if (state.autoRemainingSec <= 0) {
            state.isAutoHitting = false;
            showToast('1 小时自动敲击已结束');
        }
    }
}, 1000);

// 自动敲击循环
setInterval(() => {
    if (state.isAutoHitting && state.autoRemainingSec > 0 && !state.currentModal) {
        const layout = getHomeLayout();
        tapWoodfish(W / 2, layout.woodfishCy);
    }
}, 750);

// 敲击木槌拟真物理挥击动效 (强劲击打木鱼头顶 + 弹性反弹 + 木鱼受击挤压变形)
function triggerMalletStrike() {
    const startTime = Date.now();
    const duration = 240; // 240ms 极佳打击手感周期

    function animateMallet() {
        const elapsed = Date.now() - startTime;
        const p = Math.min(elapsed / duration, 1);

        if (p <= 0.28) {
            // 阶段一 (0% -> 28%): 蓄力加速下劈，槌头精准砸中木鱼右上方头顶 (32° -> -22°, 弧线位移)
            const t = p / 0.28;
            const ease = t * t * t; // 加速挥击
            state.malletAngle = 32 + (-22 - 32) * ease;
            state.malletOffsetX = -38 * ease * uiScale;
            state.malletOffsetY = 24 * ease * uiScale;
            // 击打瞬间木鱼受击弹性轻度压缩
            state.woodfishScale = 1.0 - 0.08 * ease;
        } else if (p <= 0.58) {
            // 阶段二 (28% -> 58%): 击中木鱼产生硬木弹性反震弹跳 (-22° -> 40°, 向上跳起)
            const t = (p - 0.28) / 0.30;
            const ease = 1 - Math.pow(1 - t, 2);
            state.malletAngle = -22 + (40 - (-22)) * ease;
            state.malletOffsetX = (-38 + (6 - (-38)) * ease) * uiScale;
            state.malletOffsetY = (24 + (-8 - 24) * ease) * uiScale;
            // 木鱼弹性回弹恢复微胀
            state.woodfishScale = 0.92 + 0.11 * ease;
        } else {
            // 阶段三 (58% -> 100%): 阻尼弹性落回 32° 待机位置
            const t = (p - 0.58) / 0.42;
            const ease = 1 - Math.pow(1 - t, 2);
            state.malletAngle = 40 + (32 - 40) * ease;
            state.malletOffsetX = (6 * (1 - ease)) * uiScale;
            state.malletOffsetY = (-8 * (1 - ease)) * uiScale;
            state.woodfishScale = 1.03 - 0.03 * ease;
        }

        if (p < 1) {
            requestAnimationFrame(animateMallet);
        } else {
            state.malletAngle = 32;
            state.malletOffsetX = 0;
            state.malletOffsetY = 0;
            state.woodfishScale = 1.0;
        }
    }

    requestAnimationFrame(animateMallet);
}

function tapWoodfish(clientX, clientY) {
    const inc = state.critRate;
    state.totalHit += inc;
    state.dailyHit = (state.dailyHit || 0) + inc;
    soundManager.playWoodHit();

    try {
        if (wx.setStorageSync) {
            wx.setStorageSync('qmy_total_hit', state.totalHit.toString());
            wx.setStorageSync('qmy_daily_hit', state.dailyHit.toString());
        }
        if (state.sfxEnabled && wx.vibrateShort) wx.vibrateShort({ type: 'light' });
    } catch (e) {}

    // 同步修行日历进度
    recordCalendarProgress();

    state.isBlinking = true;
    if (state.blinkTimer) clearTimeout(state.blinkTimer);
    state.blinkTimer = setTimeout(() => {
        state.isBlinking = false;
    }, 220);

    // 触发木槌拟真物理挥击
    triggerMalletStrike();

    // 每 10 次敲击上报好友榜 (节流避免频繁调用)
    if (!state._tapCount) state._tapCount = 0;
    state._tapCount++;
    if (state._tapCount % 10 === 0) reportScoreToFriendCloud();

    // 在木鱼受击接触点生成金色打击涟漪光环
    const layout = getHomeLayout();
    const woodfish = getWoodfishLayout();
    const impactX = woodfish.cx + Math.round(28 * uiScale);
    const impactY = woodfish.cy - Math.round(58 * uiScale);

    if (state.hitRipples) {
        if (state.hitRipples.length > 12) state.hitRipples.shift();
        state.hitRipples.push({
            x: impactX,
            y: impactY,
            radius: 8 * uiScale,
            maxRadius: 36 * uiScale,
            alpha: 0.95,
            color: state.critRate > 1 ? '#FFE072' : '#F5C44B'
        });
    }

    if (state.floatingTexts.length > 25) state.floatingTexts.shift();
    const activeTemple = getCurrentTemple();
    const words = activeTemple.floatWords;
    const baseWord = words[Math.floor(Math.random() * words.length)];
    const text = state.critRate > 1 ? `${baseWord} (暴击×${state.critRate})` : baseWord;
    state.floatingTexts.push({
        text,
        x: clientX || (W / 2),
        y: (clientY || layout.woodfishCy) - Math.round(35 * uiScale),
        alpha: 1.0,
        scale: state.critRate > 1 ? 1.25 : 1.0,
        color: activeTemple.accentColor
    });
}

// ------------------------------------------------------------------
// 6. 寻宝机旋转与加权判定逻辑
// ------------------------------------------------------------------
function spinGemHunt() {
    if (state.gemHunt.isSpinning) return;
    const currentBet = BET_TIERS[state.gemHunt.currentBetIdx] || 200;
    const isFreeSpin = (state.gemHunt.freeSpinsRemaining || 0) > 0;

    if (!isFreeSpin && state.totalHit < currentBet) {
        state.insufficientBet = currentBet;
        state.currentModal = 'ad_insufficient';
        return;
    }

    if (isFreeSpin) {
        state.gemHunt.freeSpinsRemaining--;
    } else {
        state.totalHit -= currentBet;
    }

    state.gemHunt.isSpinning = true;
    state.gemHunt.lastWin = 0;
    state.gemHunt.winningLines = [];
    state.gemHunt.winningCells = {};

    try {
        if (wx.setStorageSync) wx.setStorageSync('qmy_total_hit', state.totalHit.toString());
    } catch (e) {}

    soundManager.playChime();

    const pityBoost = (consecutiveLossSpins >= 2) ? 2.0 : 1.0;
    const newGrid = [];
    for (let col = 0; col < 5; col++) {
        newGrid[col] = [];
        for (let row = 0; row < 3; row++) {
            newGrid[col][row] = getRandomSymbolByWeight(pityBoost);
        }
    }

    let scatterCount = 0;
    for (let col = 0; col < 5; col++) {
        for (let row = 0; row < 3; row++) {
            if (newGrid[col][row].isScatter) scatterCount++;
        }
    }
    let freeSpinsWon = 0;
    if (scatterCount >= 5) freeSpinsWon = 15;
    else if (scatterCount === 4) freeSpinsWon = 10;
    else if (scatterCount === 3) freeSpinsWon = 5;

    let totalWin = 0;
    const winningLines = [];
    const winningCells = {};

    PAYLINES.forEach((line, lineIdx) => {
        let targetSym = null;
        for (let col = 0; col < 5; col++) {
            const sym = newGrid[col][line[col]];
            if (sym && !sym.isWild && !sym.isScatter) {
                targetSym = sym;
                break;
            }
        }
        if (!targetSym) targetSym = SYMBOLS[0];

        let matchCount = 0;
        for (let col = 0; col < 5; col++) {
            const sym = newGrid[col][line[col]];
            if (sym && (sym.id === targetSym.id || sym.isWild)) {
                matchCount++;
            } else {
                break;
            }
        }

        if (matchCount >= 3 && targetSym.rates) {
            const rateIdx = Math.min(matchCount - 3, targetSym.rates.length - 1);
            const rate = targetSym.rates[rateIdx] || targetSym.rates[0];
            const lineWin = Math.floor((currentBet / 25) * rate);
            totalWin += lineWin;

            winningLines.push({
                lineIdx,
                line: line.slice(0, matchCount),
                matchCount,
                lineWin,
                targetSym
            });

            for (let c = 0; c < matchCount; c++) {
                winningCells[`${c}_${line[c]}`] = true;
            }
        }
    });

    if (scatterCount >= 3) {
        const scatterSym = SYMBOLS.find(s => s.isScatter);
        if (scatterSym && scatterSym.rates) {
            const sRateIdx = Math.min(scatterCount - 3, scatterSym.rates.length - 1);
            const sWin = Math.floor((currentBet / 25) * (scatterSym.rates[sRateIdx] || 50));
            totalWin += sWin;
        }
    }

    state.gemHunt.pendingWin = totalWin;
    state.gemHunt.targetGrid = newGrid;
    state.gemHunt.pendingWinningLines = winningLines;
    state.gemHunt.pendingWinningCells = winningCells;
    state.gemHunt.pendingFreeSpinsWon = freeSpinsWon;

    const startTime = Date.now();
    state.gemHunt.startTime = startTime;
    for (let c = 0; c < 5; c++) {
        state.gemHunt.reels[c] = {
            col: c,
            status: 'spinning',
            scrollPos: 0,
            stopTime: startTime + 300 + c * 200,
            landingStartTime: 0,
            landingDuration: 340,
            playedLandingSound: false
        };
    }
}

// ------------------------------------------------------------------
// 7. 响应式布局与矢量图形绘制
// ------------------------------------------------------------------
// 绘制极致精美 3D 鎏金返回键
function drawVectorBackButton(ctx, x, y, size) {
    const cx = x + size / 2;
    const cy = y + size / 2;
    const r = size / 2;

    ctx.save();
    // 1. 底座柔和投影
    ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;

    // 2. 3D 沉香金丝底座
    const bgGrad = ctx.createLinearGradient(x, y, x, y + size);
    bgGrad.addColorStop(0, 'rgba(56, 38, 22, 0.95)');
    bgGrad.addColorStop(1, 'rgba(24, 15, 9, 0.95)');
    ctx.fillStyle = bgGrad;
    drawRoundRect(ctx, x, y, size, size, r);
    ctx.fill();

    // 3. 鎏金高光描边
    ctx.strokeStyle = '#F5C44B';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // 4. 纯矢量平滑左箭头 Chevron (<)
    ctx.shadowColor = 'rgba(245, 196, 75, 0.5)';
    ctx.shadowBlur = 4;
    ctx.strokeStyle = '#FFE072';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const arrowW = Math.round(7 * uiScale);
    const arrowH = Math.round(11 * uiScale);
    ctx.beginPath();
    ctx.moveTo(cx + arrowW * 0.4, cy - arrowH * 0.5);
    ctx.lineTo(cx - arrowW * 0.6, cy);
    ctx.lineTo(cx + arrowW * 0.4, cy + arrowH * 0.5);
    ctx.stroke();

    ctx.restore();
}

// 预计算与布局缓存（复用全局结构体，消除每秒数千次临时对象分配与 GC 压力）
let _cachedHomeLayout = null;
let _cachedBgmBtnRect = null;
let _cachedWoodfishLayout = null;
let _cachedButtonsLayout = null;

function computeLayouts() {
    const safeTop = menuButtonRect ? menuButtonRect.top : ((sysInfo.safeArea && sysInfo.safeArea.top) || 44);
    const side = Math.round(14 * uiScale);
    const topY = safeTop;
    const profileH = menuButtonRect ? menuButtonRect.height : Math.round(32 * uiScale);
    const safeBottom = Math.max(18, sysInfo.safeArea ? (H - sysInfo.safeArea.bottom) : 24);

    const navH = Math.round(52 * uiScale);
    const navY = H - navH - safeBottom;

    const actionH = Math.round(48 * uiScale);
    const actionY = navY - actionH - Math.round(10 * uiScale);

    const statsY = topY + profileH + Math.round(10 * uiScale);
    const statsH = Math.round(50 * uiScale);

    // 三大互动快捷入口条：每日一签 | 切换法殿 | 修行日历
    const actionRowY = statsY + statsH + Math.round(8 * uiScale);
    const actionRowH = Math.round(34 * uiScale);
    const actBtnGap = Math.round(8 * uiScale);
    const actBtnW = (W - side * 2 - actBtnGap * 2) / 3;

    const bannerY = actionRowY + actionRowH + Math.round(8 * uiScale);
    const bannerH = Math.round(44 * uiScale);

    const stageTop = bannerY + bannerH + Math.round(8 * uiScale);
    const stageBottom = actionY - Math.round(14 * uiScale);
    const stageH = Math.max(140, stageBottom - stageTop);
    const woodfishCy = stageTop + stageH * 0.48;

    const maxScaleByHeight = Math.max(0.65, Math.min(1.05, stageH / 230));
    const woodfishScale = Math.min(maxScaleByHeight, Math.min(1.05, Math.max(0.72, W / 360)));

    _cachedHomeLayout = {
        side, topY, profileH, statsY, statsH, actionRowY, actionRowH, actBtnW, actBtnGap, bannerY, bannerH, navY, navH, actionY, actionH, woodfishCy, woodfishScale,
        hintY: Math.min(woodfishCy + 120 * woodfishScale, actionY - 10)
    };

    const bgmW = Math.round(42 * uiScale);
    const bgmH = menuButtonRect ? menuButtonRect.height : _cachedHomeLayout.profileH;
    const bgmY = menuButtonRect ? menuButtonRect.top : _cachedHomeLayout.topY;
    const bgmX = menuButtonRect ? (menuButtonRect.left - bgmW - Math.round(10 * uiScale)) : (W - bgmW - _cachedHomeLayout.side);
    _cachedBgmBtnRect = { x: bgmX, y: bgmY, w: bgmW, h: bgmH };

    const radius = Math.min(120, W * 0.30) * _cachedHomeLayout.woodfishScale;
    _cachedWoodfishLayout = { x: W / 2 - radius, y: _cachedHomeLayout.woodfishCy - radius * 0.72, w: radius * 2, h: radius * 1.45, cx: W / 2, cy: _cachedHomeLayout.woodfishCy, radius };

    const gap = Math.round(10 * uiScale);
    const navW = W - side * 2;
    const itemW = navW / 4;
    const actionW = (W - side * 2 - gap) / 2;

    _cachedButtonsLayout = {
        critAd: { x: side, y: actionY, w: actionW, h: actionH },
        autoAd: { x: side + actionW + gap, y: actionY, w: actionW, h: actionH },
        navBar: { x: side, y: navY, w: navW, h: navH },
        minigames: { x: side + itemW * 0, y: navY, w: itemW, h: navH, icon: '', label: '游艺坊' },
        rank: { x: side + itemW * 1, y: navY, w: itemW, h: navH, icon: '', label: '排行榜' },
        titles: { x: side + itemW * 2, y: navY, w: itemW, h: navH, icon: '', label: '我的称号' },
        settings: { x: side + itemW * 3, y: navY, w: itemW, h: navH, icon: '', label: '设置' }
    };
}

computeLayouts();

const getHomeLayout = () => _cachedHomeLayout || (_cachedHomeLayout = computeLayouts(), _cachedHomeLayout);
const getBgmBtnRect = () => _cachedBgmBtnRect || (_cachedBgmBtnRect = computeLayouts(), _cachedBgmBtnRect);
const getWoodfishLayout = () => _cachedWoodfishLayout || (_cachedWoodfishLayout = computeLayouts(), _cachedWoodfishLayout);
const getButtonsLayout = () => _cachedButtonsLayout || (_cachedButtonsLayout = computeLayouts(), _cachedButtonsLayout);

function drawVectorMusicButton(ctx, bx, by, bw, bh, isEnabled) {
    const cx = bx + bw / 2;
    const cy = by + bh / 2;
    const r = bh / 2;

    ctx.save();
    if (isEnabled) {
        const bgGrad = ctx.createLinearGradient(bx, by, bx, by + bh);
        bgGrad.addColorStop(0, 'rgba(54, 38, 22, 0.95)');
        bgGrad.addColorStop(1, 'rgba(30, 20, 12, 0.95)');
        ctx.fillStyle = bgGrad;
        drawRoundRect(ctx, bx, by, bw, bh, r);
        ctx.fill();

        ctx.shadowColor = 'rgba(245, 196, 75, 0.45)';
        ctx.shadowBlur = 8;
        ctx.strokeStyle = '#F5C44B';
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.shadowBlur = 0;
    } else {
        ctx.fillStyle = 'rgba(16, 12, 10, 0.88)';
        drawRoundRect(ctx, bx, by, bw, bh, r);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    const noteColor = isEnabled ? '#FFE072' : '#72665C';
    const noteScale = (bh * 0.44) / 16;
    
    ctx.save();
    ctx.translate(cx - (isEnabled ? 3 : 0), cy);

    ctx.fillStyle = noteColor;
    ctx.beginPath();
    ctx.ellipse(-5 * noteScale, 4 * noteScale, 2.8 * noteScale, 2.1 * noteScale, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(3 * noteScale, 2 * noteScale, 2.8 * noteScale, 2.1 * noteScale, -0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = noteColor;
    ctx.lineWidth = 1.6 * noteScale;
    ctx.beginPath();
    ctx.moveTo(-2.8 * noteScale, 4 * noteScale);
    ctx.lineTo(-2.8 * noteScale, -5 * noteScale);
    ctx.moveTo(5.2 * noteScale, 2 * noteScale);
    ctx.lineTo(5.2 * noteScale, -7 * noteScale);
    ctx.stroke();

    ctx.lineWidth = 2.4 * noteScale;
    ctx.beginPath();
    ctx.moveTo(-3.2 * noteScale, -4.5 * noteScale);
    ctx.lineTo(5.6 * noteScale, -6.5 * noteScale);
    ctx.stroke();
    ctx.restore();

    if (isEnabled) {
        ctx.strokeStyle = '#F5C44B';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.arc(cx + 4, cy, 5.5 * noteScale, -0.7, 0.7);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(245, 196, 75, 0.6)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(cx + 4, cy, 9.5 * noteScale, -0.6, 0.6);
        ctx.stroke();
    } else {
        ctx.strokeStyle = '#FF4D4F';
        ctx.lineWidth = 2.2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        const slashLen = 8.5 * noteScale;
        ctx.moveTo(cx - slashLen, cy - slashLen);
        ctx.lineTo(cx + slashLen, cy + slashLen);
        ctx.stroke();
    }
    ctx.restore();
}

function drawVectorLotus(ctx, cx, cy, radius) {
    ctx.save();
    ctx.translate(cx, cy);
    const grad = ctx.createLinearGradient(0, -radius, 0, radius);
    grad.addColorStop(0, '#FFE072');
    grad.addColorStop(0.5, '#F5C44B');
    grad.addColorStop(1, '#D48806');
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.moveTo(0, -radius);
    ctx.quadraticCurveTo(radius * 0.4, -radius * 0.3, 0, radius * 0.6);
    ctx.quadraticCurveTo(-radius * 0.4, -radius * 0.3, 0, -radius);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-radius * 0.1, -radius * 0.6);
    ctx.quadraticCurveTo(-radius * 0.8, -radius * 0.2, -radius * 0.2, radius * 0.65);
    ctx.quadraticCurveTo(-radius * 0.2, 0, -radius * 0.1, -radius * 0.6);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(radius * 0.1, -radius * 0.6);
    ctx.quadraticCurveTo(radius * 0.8, -radius * 0.2, radius * 0.2, radius * 0.65);
    ctx.quadraticCurveTo(radius * 0.2, 0, radius * 0.1, -radius * 0.6);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(0, radius * 0.7, radius * 0.85, radius * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawVectorGear(ctx, cx, cy, radius) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = '#FFE072';
    ctx.strokeStyle = '#FFE072';
    const teeth = 6;
    const innerR = radius * 0.7;
    const holeR = radius * 0.32;

    ctx.beginPath();
    for (let i = 0; i < teeth; i++) {
        const a1 = (i * 2 * Math.PI) / teeth;
        const a2 = a1 + Math.PI / teeth;
        ctx.lineTo(Math.cos(a1) * radius, Math.sin(a1) * radius);
        ctx.lineTo(Math.cos(a2) * innerR, Math.sin(a2) * innerR);
    }
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#221811';
    ctx.beginPath();
    ctx.arc(0, 0, holeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawVectorGamepad(ctx, cx, cy, s) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = '#FFE072';
    drawRoundRect(ctx, -s * 1.1, -s * 0.65, s * 2.2, s * 1.3, s * 0.4);
    ctx.fill();
    ctx.fillStyle = '#221811';
    ctx.fillRect(-s * 0.75, -s * 0.15, s * 0.48, s * 0.3);
    ctx.fillRect(-s * 0.61, -s * 0.29, s * 0.2, s * 0.58);
    ctx.beginPath();
    ctx.arc(s * 0.5, -s * 0.15, s * 0.14, 0, Math.PI * 2);
    ctx.arc(s * 0.72, 0.08, s * 0.14, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawVectorTrophy(ctx, cx, cy, s) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = '#FFE072';
    ctx.beginPath();
    ctx.moveTo(-s * 0.65, -s * 0.7);
    ctx.lineTo(s * 0.65, -s * 0.7);
    ctx.lineTo(s * 0.45, s * 0.15);
    ctx.quadraticCurveTo(0, s * 0.45, -s * 0.45, s * 0.15);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#FFE072';
    ctx.lineWidth = Math.max(1.2, s * 0.16);
    ctx.beginPath();
    ctx.arc(-s * 0.6, -s * 0.25, s * 0.24, Math.PI * 0.5, Math.PI * 1.5);
    ctx.arc(s * 0.6, -s * 0.25, s * 0.24, -Math.PI * 0.5, Math.PI * 0.5);
    ctx.stroke();
    ctx.fillRect(-s * 0.14, s * 0.35, s * 0.28, s * 0.25);
    ctx.fillRect(-s * 0.55, s * 0.6, s * 1.1, s * 0.2);
    ctx.restore();
}

function drawVectorScroll(ctx, cx, cy, s) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = '#FFE072';
    drawRoundRect(ctx, -s * 0.65, -s * 0.7, s * 1.3, s * 1.4, s * 0.2);
    ctx.fill();
    ctx.fillStyle = '#221811';
    ctx.fillRect(-s * 0.42, -s * 0.32, s * 0.84, s * 0.12);
    ctx.fillRect(-s * 0.42, -s * 0.05, s * 0.84, s * 0.12);
    ctx.fillRect(-s * 0.42, s * 0.22, s * 0.55, s * 0.12);
    ctx.restore();
}

function drawVectorBolt(ctx, cx, cy, s, color = '#52C41A') {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(s * 0.12, -s * 0.85);
    ctx.lineTo(-s * 0.55, s * 0.05);
    ctx.lineTo(0, s * 0.05);
    ctx.lineTo(-s * 0.18, s * 0.85);
    ctx.lineTo(s * 0.55, -s * 0.05);
    ctx.lineTo(0, -s * 0.05);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function drawVectorBell(ctx, cx, cy, s, color = '#FFE072') {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, -s * 0.15, s * 0.45, Math.PI, 0);
    ctx.lineTo(s * 0.55, s * 0.4);
    ctx.lineTo(-s * 0.55, s * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, s * 0.5, s * 0.14, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawVectorRedPacket(ctx, cx, cy, s) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = '#E74C3C';
    drawRoundRect(ctx, -s * 0.55, -s * 0.75, s * 1.1, s * 1.5, s * 0.2);
    ctx.fill();
    ctx.strokeStyle = '#F39C12';
    ctx.lineWidth = Math.max(1, s * 0.1);
    ctx.stroke();
    ctx.fillStyle = '#C0392B';
    ctx.beginPath();
    ctx.moveTo(-s * 0.55, -s * 0.75);
    ctx.quadraticCurveTo(0, s * 0.05, s * 0.55, -s * 0.75);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(0, -s * 0.05, s * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7A1400';
    ctx.font = `bold ${Math.round(s * 0.28)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('福', 0, -s * 0.03);
    ctx.restore();
}

function drawVectorPhotoFrame(ctx, cx, cy, s) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = '#3E2714';
    drawRoundRect(ctx, -s * 0.8, -s * 0.65, s * 1.6, s * 1.3, s * 0.18);
    ctx.fill();
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = Math.max(1.2, s * 0.12);
    ctx.stroke();
    ctx.save();
    ctx.beginPath();
    drawRoundRect(ctx, -s * 0.65, -s * 0.5, s * 1.3, s * 1.0, s * 0.1);
    ctx.clip();
    ctx.fillStyle = '#1B3B5F';
    ctx.fillRect(-s * 0.65, -s * 0.5, s * 1.3, s * 1.0);
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(s * 0.25, -s * 0.18, s * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4A8C5B';
    ctx.beginPath();
    ctx.moveTo(-s * 0.65, s * 0.5);
    ctx.lineTo(-s * 0.2, -s * 0.05);
    ctx.lineTo(s * 0.2, s * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#2D663E';
    ctx.beginPath();
    ctx.moveTo(-s * 0.1, s * 0.5);
    ctx.lineTo(s * 0.35, s * 0.08);
    ctx.lineTo(s * 0.65, s * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.restore();
}

function drawVectorFortuneStick(ctx, cx, cy, s) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = '#6E3A18';
    drawRoundRect(ctx, -s * 0.45, -s * 0.25, s * 0.9, s * 0.9, s * 0.15);
    ctx.fill();
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = Math.max(1, s * 0.1);
    ctx.stroke();
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(-s * 0.45, s * 0.1, s * 0.9, s * 0.15);
    ctx.fillStyle = '#D4AF37';
    ctx.fillRect(-s * 0.3, -s * 0.75, s * 0.16, s * 0.55);
    ctx.fillRect(-s * 0.08, -s * 0.85, s * 0.16, s * 0.65);
    ctx.fillRect(s * 0.14, -s * 0.7, s * 0.16, s * 0.5);
    ctx.fillStyle = '#C0392B';
    ctx.fillRect(-s * 0.3, -s * 0.75, s * 0.16, s * 0.15);
    ctx.fillRect(-s * 0.08, -s * 0.85, s * 0.16, s * 0.15);
    ctx.fillRect(s * 0.14, -s * 0.7, s * 0.16, s * 0.15);
    ctx.restore();
}

function drawVectorCalendar(ctx, cx, cy, s) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = '#FFF8E7';
    drawRoundRect(ctx, -s * 0.7, -s * 0.6, s * 1.4, s * 1.3, s * 0.18);
    ctx.fill();
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = Math.max(1, s * 0.1);
    ctx.stroke();
    ctx.fillStyle = '#C0392B';
    drawRoundRect(ctx, -s * 0.7, -s * 0.6, s * 1.4, s * 0.4, [s * 0.18, s * 0.18, 0, 0]);
    ctx.fill();
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(-s * 0.45, -s * 0.78, s * 0.15, s * 0.25);
    ctx.fillRect(s * 0.3, -s * 0.78, s * 0.15, s * 0.25);
    ctx.fillStyle = '#6E3A18';
    for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 3; c++) {
            ctx.fillRect(-s * 0.4 + c * s * 0.32, -s * 0.05 + r * s * 0.32, s * 0.16, s * 0.16);
        }
    }
    ctx.restore();
}

function drawVectorTemple(ctx, cx, cy, s, color = '#FFE072') {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.85);
    ctx.lineTo(s * 0.9, -s * 0.3);
    ctx.quadraticCurveTo(s * 0.6, -s * 0.45, 0, -s * 0.45);
    ctx.quadraticCurveTo(-s * 0.6, -s * 0.45, -s * 0.9, -s * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(-s * 0.55, -s * 0.3, s * 1.1, s * 0.65);
    ctx.fillStyle = '#221811';
    drawRoundRect(ctx, -s * 0.2, 0, s * 0.4, s * 0.35, [s * 0.15, s * 0.15, 0, 0]);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.fillRect(-s * 0.75, s * 0.35, s * 1.5, s * 0.18);
    ctx.restore();
}

function drawVectorCrown(ctx, cx, cy, s, color = '#FFD700') {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-s * 0.85, s * 0.5);
    ctx.lineTo(-s * 0.9, -s * 0.25);
    ctx.lineTo(-s * 0.4, s * 0.05);
    ctx.lineTo(0, -s * 0.7);
    ctx.lineTo(s * 0.4, s * 0.05);
    ctx.lineTo(s * 0.9, -s * 0.25);
    ctx.lineTo(s * 0.85, s * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#C0392B';
    ctx.fillRect(-s * 0.75, s * 0.3, s * 1.5, s * 0.15);
    ctx.fillStyle = '#FFF8E7';
    ctx.beginPath();
    ctx.arc(0, -s * 0.7, s * 0.14, 0, Math.PI * 2);
    ctx.arc(-s * 0.9, -s * 0.25, s * 0.12, 0, Math.PI * 2);
    ctx.arc(s * 0.9, -s * 0.25, s * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawVectorIngot(ctx, cx, cy, s, color = '#FFA940') {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-s * 0.85, -s * 0.2);
    ctx.quadraticCurveTo(-s * 0.45, s * 0.65, 0, s * 0.65);
    ctx.quadraticCurveTo(s * 0.45, s * 0.65, s * 0.85, -s * 0.2);
    ctx.quadraticCurveTo(s * 0.45, 0, 0, 0);
    ctx.quadraticCurveTo(-s * 0.45, 0, -s * 0.85, -s * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.ellipse(0, -s * 0.1, s * 0.45, s * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawVectorLeaf(ctx, cx, cy, s, color = '#73D13D') {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.8);
    ctx.quadraticCurveTo(s * 0.85, -s * 0.2, 0, s * 0.8);
    ctx.quadraticCurveTo(-s * 0.85, -s * 0.2, 0, -s * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#237804';
    ctx.lineWidth = Math.max(1, s * 0.1);
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.7);
    ctx.lineTo(0, s * 0.7);
    ctx.stroke();
    ctx.restore();
}

function drawVectorDove(ctx, cx, cy, s, color = '#FFE072') {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, s * 0.6);
    ctx.quadraticCurveTo(-s * 0.85, 0, -s * 0.6, -s * 0.6);
    ctx.quadraticCurveTo(-s * 0.2, -s * 0.2, 0, s * 0.6);
    ctx.quadraticCurveTo(s * 0.2, -s * 0.2, s * 0.6, -s * 0.6);
    ctx.quadraticCurveTo(s * 0.85, 0, 0, s * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#FFF8E7';
    ctx.beginPath();
    ctx.moveTo(0, s * 0.6);
    ctx.quadraticCurveTo(-s * 0.35, -s * 0.1, 0, -s * 0.85);
    ctx.quadraticCurveTo(s * 0.35, -s * 0.1, 0, s * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function drawVectorBrush(ctx, cx, cy, s, color = '#40A9FF') {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-s * 0.12, s * 0.7);
    ctx.lineTo(-s * 0.15, -s * 0.3);
    ctx.lineTo(s * 0.15, -s * 0.3);
    ctx.lineTo(s * 0.12, s * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#FFF8E7';
    ctx.beginPath();
    ctx.moveTo(-s * 0.2, -s * 0.3);
    ctx.lineTo(0, -s * 0.9);
    ctx.lineTo(s * 0.2, -s * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#096DD9';
    ctx.fillRect(-s * 0.2, -s * 0.32, s * 0.4, s * 0.08);
    ctx.restore();
}

function drawVectorVideoClapper(ctx, cx, cy, s, color = '#FFE072') {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = '#241810';
    drawRoundRect(ctx, -s * 0.75, -s * 0.55, s * 1.5, s * 1.1, s * 0.16);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, s * 0.1);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.fillRect(-s * 0.75, -s * 0.55, s * 1.5, s * 0.35);
    ctx.fillStyle = '#241810';
    ctx.fillRect(-s * 0.4, -s * 0.55, s * 0.2, s * 0.35);
    ctx.fillRect(s * 0.15, -s * 0.55, s * 0.2, s * 0.35);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-s * 0.12, -s * 0.05);
    ctx.lineTo(s * 0.25, s * 0.16);
    ctx.lineTo(-s * 0.12, s * 0.37);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function drawVectorShield(ctx, cx, cy, s, color = '#52C41A') {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.85);
    ctx.lineTo(s * 0.75, -s * 0.55);
    ctx.lineTo(s * 0.75, s * 0.15);
    ctx.quadraticCurveTo(s * 0.6, s * 0.75, 0, s * 0.95);
    ctx.quadraticCurveTo(-s * 0.6, s * 0.75, -s * 0.75, s * 0.15);
    ctx.lineTo(-s * 0.75, -s * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawVectorLock(ctx, cx, cy, s, color = '#8C7B6E') {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = color;
    drawRoundRect(ctx, -s * 0.55, -s * 0.1, s * 1.1, s * 0.85, s * 0.15);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.2, s * 0.18);
    ctx.beginPath();
    ctx.arc(0, -s * 0.1, s * 0.35, Math.PI, 0);
    ctx.stroke();
    ctx.fillStyle = '#1A120B';
    ctx.beginPath();
    ctx.arc(0, s * 0.22, s * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-s * 0.05, s * 0.22, s * 0.1, s * 0.22);
    ctx.restore();
}

function drawVectorFlame(ctx, cx, cy, s, color = '#F5C44B') {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.9);
    ctx.quadraticCurveTo(s * 0.65, -s * 0.3, s * 0.65, s * 0.35);
    ctx.quadraticCurveTo(s * 0.65, s * 0.85, 0, s * 0.85);
    ctx.quadraticCurveTo(-s * 0.65, s * 0.85, -s * 0.65, s * 0.35);
    ctx.quadraticCurveTo(-s * 0.65, -s * 0.3, 0, -s * 0.9);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#FF4D4F';
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.4);
    ctx.quadraticCurveTo(s * 0.35, 0, s * 0.35, s * 0.45);
    ctx.quadraticCurveTo(s * 0.35, s * 0.75, 0, s * 0.75);
    ctx.quadraticCurveTo(-s * 0.35, s * 0.75, -s * 0.35, s * 0.45);
    ctx.quadraticCurveTo(-s * 0.35, 0, 0, -s * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function drawVectorUsers(ctx, cx, cy, s, color = '#FFE072') {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(s * 0.3, -s * 0.35, s * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(s * 0.3, s * 0.5, s * 0.45, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#FFF8E7';
    ctx.beginPath();
    ctx.arc(-s * 0.2, -s * 0.25, s * 0.26, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-s * 0.2, s * 0.6, s * 0.52, Math.PI, 0);
    ctx.fill();
    ctx.restore();
}

function drawVectorEnvelope(ctx, cx, cy, s, color = '#FFE072') {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = color;
    drawRoundRect(ctx, -s * 0.8, -s * 0.55, s * 1.6, s * 1.1, s * 0.16);
    ctx.fill();
    ctx.strokeStyle = '#221811';
    ctx.lineWidth = Math.max(1, s * 0.1);
    ctx.beginPath();
    ctx.moveTo(-s * 0.8, -s * 0.55);
    ctx.lineTo(0, s * 0.08);
    ctx.lineTo(s * 0.8, -s * 0.55);
    ctx.stroke();
    ctx.restore();
}

function drawVectorBowl(ctx, cx, cy, s, color = '#FFD700') {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.75, 0, Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#FFF8E7';
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.75, s * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6E3A18';
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.6, s * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawVectorMusicNote(ctx, cx, cy, s, color = '#FFE072') {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.2, s * 0.14);
    ctx.beginPath();
    ctx.ellipse(-s * 0.35, s * 0.35, s * 0.25, s * 0.18, -Math.PI / 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(s * 0.35, s * 0.15, s * 0.25, s * 0.18, -Math.PI / 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-s * 0.2, s * 0.3);
    ctx.lineTo(-s * 0.2, -s * 0.55);
    ctx.lineTo(s * 0.5, -s * 0.75);
    ctx.lineTo(s * 0.5, 0.1);
    ctx.stroke();
    ctx.fillRect(-s * 0.2, -s * 0.65, s * 0.7, s * 0.2);
    ctx.restore();
}

function drawVectorDot(ctx, cx, cy, r = 3.5, color = '#52C41A') {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawVectorSparkle(ctx, cx, cy, s, color = '#FFD700') {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.quadraticCurveTo(0, 0, s, 0);
    ctx.quadraticCurveTo(0, 0, 0, s);
    ctx.quadraticCurveTo(0, 0, -s, 0);
    ctx.quadraticCurveTo(0, 0, 0, -s);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function drawVectorGift(ctx, cx, cy, s, color = '#FF4D4F') {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = color;
    drawRoundRect(ctx, -s * 0.7, -s * 0.35, s * 1.4, s * 0.95, s * 0.15);
    ctx.fill();
    ctx.fillStyle = '#FFE072';
    drawRoundRect(ctx, -s * 0.78, -s * 0.65, s * 1.56, s * 0.35, s * 0.1);
    ctx.fill();
    ctx.fillRect(-s * 0.15, -s * 0.35, s * 0.3, s * 0.95);
    ctx.beginPath();
    ctx.arc(-s * 0.25, -s * 0.75, s * 0.2, 0, Math.PI * 2);
    ctx.arc(s * 0.25, -s * 0.75, s * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawVectorInfo(ctx, cx, cy, s, color = '#FFE072') {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.2, s * 0.15);
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, -s * 0.3, s * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-s * 0.08, -s * 0.05, s * 0.16, s * 0.45);
    ctx.restore();
}

function drawRankMedal(ctx, cx, cy, idx, s) {
    ctx.save();
    if (idx === 0) {
        // 1. 冠军：鎏金宝印 + 纯金王冠
        const r = 10.5 * s;
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
        ctx.lineWidth = 1.2 * s;
        ctx.stroke();

        // 内部金冠造型
        const cw = 6 * s;
        const ch = 4.2 * s;
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

        ctx.fillStyle = '#FFFDF0';
        ctx.beginPath();
        ctx.arc(cx, cy - ch - 0.5 * s, 1.0 * s, 0, Math.PI * 2);
        ctx.arc(cx - cw * 0.9, cy - ch * 0.3 - 0.5 * s, 0.8 * s, 0, Math.PI * 2);
        ctx.arc(cx + cw * 0.9, cy - ch * 0.3 - 0.5 * s, 0.8 * s, 0, Math.PI * 2);
        ctx.fill();

    } else if (idx === 1) {
        // 2. 亚军：皓银宝印 + 银杯造型
        const r = 10 * s;
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
        ctx.lineWidth = 1.2 * s;
        ctx.stroke();

        const tw = 5.2 * s;
        const th = 4.2 * s;
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
        const r = 10 * s;
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
        ctx.lineWidth = 1.2 * s;
        ctx.stroke();

        const tw = 5.2 * s;
        const th = 4.2 * s;
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
        const r = 9 * s;
        ctx.fillStyle = 'rgba(42, 30, 20, 0.92)';
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = idx < 10 ? 'rgba(245, 196, 75, 0.45)' : 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1 * s;
        ctx.stroke();

        ctx.font = `bold ${Math.round((idx < 9 ? 10 : 8.5) * s)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = idx < 10 ? '#FFE072' : '#8C7B6E';
        ctx.fillText(String(idx + 1), cx, cy + 3.5 * s);
    }
    ctx.restore();
}

// =====================================================================
// 离屏位图静态烘焙系统 (Offscreen Bitmap Cache: 消除 90% 每帧重复渐变计算)
// =====================================================================
function createOffscreenCanvasBuffer(w, h) {
    let cvs = null;
    if (typeof wx !== 'undefined') {
        if (wx.createOffscreenCanvas) {
            try {
                cvs = wx.createOffscreenCanvas({ type: '2d', width: Math.round(w), height: Math.round(h) });
            } catch(e) {}
        }
        if (!cvs && wx.createCanvas) {
            try {
                cvs = wx.createCanvas();
                cvs.width = Math.round(w);
                cvs.height = Math.round(h);
            } catch(e) {}
        }
    }
    if (!cvs && typeof document !== 'undefined') {
        cvs = document.createElement('canvas');
        cvs.width = Math.round(w);
        cvs.height = Math.round(h);
    }
    return cvs;
}

let _cachedWoodfishCanvas = null;
let _cachedMalletCanvas = null;

function bakeWoodfishAndMallet() {
    const scaleFactor = (typeof dpr === 'number' && dpr > 0 ? dpr : 2);

    // 1. 烘焙 3D 沉香木鱼高精度位图 (240x200 逻辑像素，Retina HD 高清采样)
    const wfW = 240;
    const wfH = 200;
    const wfBuf = createOffscreenCanvasBuffer(wfW * scaleFactor, wfH * scaleFactor);
    if (wfBuf) {
        const bctx = wfBuf.getContext('2d');
        if (bctx) {
            bctx.save();
            bctx.scale(scaleFactor, scaleFactor);

            // 1. 木鱼底托投影
            bctx.save();
            bctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
            bctx.beginPath();
            bctx.ellipse(120, 180, 96, 16, 0, 0, Math.PI * 2);
            bctx.fill();
            bctx.restore();

            // 2. 木鱼主体轮廓
            bctx.save();
            const woodGrad = bctx.createRadialGradient(96, 60, 10, 120, 105, 120);
            woodGrad.addColorStop(0, '#7C4A2D');
            woodGrad.addColorStop(0.45, '#422515');
            woodGrad.addColorStop(0.85, '#24130A');
            woodGrad.addColorStop(1, '#120905');
            bctx.fillStyle = woodGrad;

            bctx.beginPath();
            bctx.moveTo(120, 18);
            bctx.bezierCurveTo(175, 18, 215, 55, 215, 105);
            bctx.bezierCurveTo(215, 152, 175, 178, 120, 178);
            bctx.bezierCurveTo(65, 178, 25, 152, 25, 105);
            bctx.bezierCurveTo(25, 55, 65, 18, 120, 18);
            bctx.closePath();
            bctx.fill();

            // 金边描边 (3D 金边)
            const goldRim = bctx.createLinearGradient(0, 0, 240, 200);
            goldRim.addColorStop(0, '#FFE58F');
            goldRim.addColorStop(0.5, '#F5C44B');
            goldRim.addColorStop(1, '#874D00');
            bctx.strokeStyle = goldRim;
            bctx.lineWidth = 3.2;
            bctx.stroke();
            bctx.restore();

            // 3. 顶部高光弧
            bctx.save();
            bctx.fillStyle = 'rgba(255, 255, 255, 0.09)';
            bctx.beginPath();
            bctx.ellipse(115, 45, 55, 20, 0, 0, Math.PI * 2);
            bctx.fill();
            bctx.restore();

            // 4. 祥云暗纹
            bctx.save();
            bctx.fillStyle = 'rgba(255, 224, 114, 0.28)';
            bctx.beginPath();
            bctx.moveTo(100, 80);
            bctx.quadraticCurveTo(120, 68, 140, 80);
            bctx.quadraticCurveTo(120, 92, 100, 80);
            bctx.closePath();
            bctx.fill();
            bctx.restore();

            // 5. 鱼嘴镂空
            bctx.save();
            bctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
            bctx.shadowBlur = 4;
            bctx.shadowOffsetY = 2;
            bctx.strokeStyle = '#FFE072';
            bctx.lineWidth = 3.6;
            bctx.lineCap = 'round';
            bctx.beginPath();
            bctx.moveTo(45, 105);
            bctx.quadraticCurveTo(120, 142, 195, 105);
            bctx.stroke();
            bctx.restore();

            bctx.restore();
            _cachedWoodfishCanvas = wfBuf;
        }
    }

    // 2. 烘焙 3D 沉香木槌高精度位图 (100x200 逻辑像素，轴心对齐在 (50, 180))
    const malW = 100;
    const malH = 200;
    const malBuf = createOffscreenCanvasBuffer(malW * scaleFactor, malH * scaleFactor);
    if (malBuf) {
        const mctx = malBuf.getContext('2d');
        if (mctx) {
            mctx.save();
            mctx.scale(scaleFactor, scaleFactor);
            mctx.translate(50, 180);

            const stickW = 8.5;
            const stickL = 135;
            const stickTopY = -stickL;

            // 1. 木柄 3D 柱面
            mctx.save();
            mctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
            mctx.shadowBlur = 10;
            mctx.shadowOffsetX = 5;
            mctx.shadowOffsetY = 8;

            const rodGrad = mctx.createLinearGradient(-stickW / 2, 0, stickW / 2, 0);
            rodGrad.addColorStop(0, '#2E1508');
            rodGrad.addColorStop(0.25, '#B56E3D');
            rodGrad.addColorStop(0.55, '#6E381A');
            rodGrad.addColorStop(0.85, '#3B1A0A');
            rodGrad.addColorStop(1, '#1A0B04');

            mctx.fillStyle = rodGrad;
            drawRoundRect(mctx, -stickW / 2, stickTopY, stickW, stickL, stickW / 2);
            mctx.fill();
            mctx.restore();

            // 握柄底端尾珠
            mctx.save();
            const pommelGrad = mctx.createRadialGradient(-1.5, -2, 1, 0, 0, 5.5);
            pommelGrad.addColorStop(0, '#B56E3D');
            pommelGrad.addColorStop(0.5, '#6E381A');
            pommelGrad.addColorStop(1, '#1A0B04');
            mctx.fillStyle = pommelGrad;
            mctx.beginPath();
            mctx.arc(0, 0, 5.5, 0, Math.PI * 2);
            mctx.fill();
            mctx.strokeStyle = 'rgba(245, 196, 75, 0.4)';
            mctx.lineWidth = 1;
            mctx.stroke();
            mctx.restore();

            // 2. 缠金绳立体饰纹
            [-80, -92, -104].forEach(y => {
                mctx.save();
                mctx.strokeStyle = '#1A0A02';
                mctx.lineWidth = 2.8;
                mctx.beginPath();
                mctx.ellipse(0, y + 1, stickW * 0.58, 2.2, 0.15, 0, Math.PI);
                mctx.stroke();

                const goldGrad = mctx.createLinearGradient(-stickW / 2, 0, stickW / 2, 0);
                goldGrad.addColorStop(0, '#D48806');
                goldGrad.addColorStop(0.3, '#FFF566');
                goldGrad.addColorStop(0.7, '#FFE072');
                goldGrad.addColorStop(1, '#874D00');
                mctx.strokeStyle = goldGrad;
                mctx.lineWidth = 2.2;
                mctx.beginPath();
                mctx.ellipse(0, y, stickW * 0.58, 2.2, 0.15, 0, Math.PI * 2);
                mctx.stroke();
                mctx.restore();
            });

            // 3. 槌头连接颈圈
            mctx.save();
            mctx.fillStyle = '#F5C44B';
            drawRoundRect(mctx, -stickW * 0.65, stickTopY - 2, stickW * 1.3, 4, 2);
            mctx.fill();
            mctx.strokeStyle = '#FFE072';
            mctx.lineWidth = 0.8;
            mctx.stroke();
            mctx.restore();

            // 4. 3D 球体槌头
            const headX = 0;
            const headY = stickTopY - 14;
            const headR = 19;

            mctx.save();
            mctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
            mctx.shadowBlur = 14;
            mctx.shadowOffsetX = 4;
            mctx.shadowOffsetY = 8;

            const headGrad = mctx.createRadialGradient(headX - 6, headY - 6, 2, headX, headY, headR);
            headGrad.addColorStop(0, '#B87243');
            headGrad.addColorStop(0.35, '#783A1B');
            headGrad.addColorStop(0.75, '#421C0B');
            headGrad.addColorStop(0.95, '#200B04');
            headGrad.addColorStop(1, '#4A220D');

            mctx.fillStyle = headGrad;
            mctx.beginPath();
            mctx.arc(headX, headY, headR, 0, Math.PI * 2);
            mctx.fill();
            mctx.restore();

            // 槌头圆木金边
            mctx.save();
            const rimGrad = mctx.createLinearGradient(headX - headR, headY - headR, headX + headR, headY + headR);
            rimGrad.addColorStop(0, '#FFE072');
            rimGrad.addColorStop(0.5, '#D48806');
            rimGrad.addColorStop(1, 'rgba(92, 43, 0, 0.4)');
            mctx.strokeStyle = rimGrad;
            mctx.lineWidth = 1.6;
            mctx.beginPath();
            mctx.arc(headX, headY, headR, 0, Math.PI * 2);
            mctx.stroke();
            mctx.restore();

            // 槌头月牙高光
            mctx.save();
            const hlGrad = mctx.createRadialGradient(headX - 6, headY - 7, 0, headX - 6, headY - 7, 9);
            hlGrad.addColorStop(0, 'rgba(255, 245, 220, 0.75)');
            hlGrad.addColorStop(0.4, 'rgba(255, 230, 170, 0.35)');
            hlGrad.addColorStop(1, 'rgba(255, 230, 170, 0)');
            mctx.fillStyle = hlGrad;
            mctx.beginPath();
            mctx.arc(headX - 6, headY - 7, 8.5, 0, Math.PI * 2);
            mctx.fill();
            mctx.restore();

            mctx.restore();
            _cachedMalletCanvas = malBuf;
        }
    }
}
bakeWoodfishAndMallet();

// 极速离屏贴图渲染 3D 木鱼 (1 次 drawImage + 动态眼睛)
function draw3DVectorWoodfish(ctx, cx, cy, scale, isBlinking) {
    if (!_cachedWoodfishCanvas) bakeWoodfishAndMallet();

    ctx.save();
    const s = scale * uiScale * 0.95;
    ctx.translate(cx, cy);
    ctx.scale(s, s);

    if (_cachedWoodfishCanvas) {
        ctx.drawImage(_cachedWoodfishCanvas, -120, -100, 240, 200);
    }

    // 动态双眼
    const drawEye = (ex, ey, isBlink) => {
        ctx.save();
        if (isBlink) {
            ctx.strokeStyle = '#FFE072';
            ctx.lineWidth = 4;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(ex - 9, ey);
            ctx.quadraticCurveTo(ex, ey + 7, ex + 9, ey);
            ctx.stroke();
        } else {
            ctx.fillStyle = 'rgba(255, 224, 114, 0.95)';
            ctx.beginPath();
            ctx.arc(ex, ey, 7.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#1E0E05';
            ctx.beginPath();
            ctx.arc(ex + 1, ey - 1, 3.6, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(ex + 2.5, ey - 2.5, 1.6, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    };

    drawEye(-55, -15, isBlinking);
    drawEye(55, -15, isBlinking);

    ctx.restore();
}

// 极速离屏贴图渲染 3D 木槌 (1 次 drawImage 旋转)
function drawWoodMallet(ctx, cx, cy, angle, offsetX, offsetY) {
    if (!_cachedMalletCanvas) bakeWoodfishAndMallet();

    ctx.save();
    const s = uiScale * 0.95;
    const pivotX = cx + 58 * s + offsetX;
    const pivotY = cy + 16 * s + offsetY;

    ctx.translate(pivotX, pivotY);
    ctx.rotate((angle * Math.PI) / 180);
    ctx.scale(s, s);

    if (_cachedMalletCanvas) {
        ctx.drawImage(_cachedMalletCanvas, -50, -180, 100, 200);
    }
    ctx.restore();
}

// ------------------------------------------------------------------
// 8. 触摸交互监听
// ------------------------------------------------------------------
if (typeof wx !== 'undefined' && wx.onTouchStart) {
    wx.onTouchStart((e) => {
        const touch = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]) || e;
        if (!touch) return;
        const tx = (typeof touch.clientX === 'number') ? touch.clientX : ((typeof touch.x === 'number') ? touch.x : touch.pageX);
        const ty = (typeof touch.clientY === 'number') ? touch.clientY : ((typeof touch.y === 'number') ? touch.y : touch.pageY);
        if (typeof tx !== 'number' || typeof ty !== 'number' || isNaN(tx) || isNaN(ty)) return;

        const layout = getHomeLayout();
        const btns = getButtonsLayout();
        const bgmRect = getBgmBtnRect();




        // 1. 点击主界面三大互动按钮：每日一签 | 切换法殿 | 修行日历
        if (!state.currentModal && ty >= layout.actionRowY && ty <= layout.actionRowY + layout.actionRowH) {
            const actW = layout.actBtnW;
            const actGap = layout.actBtnGap;
            const btn1X = layout.side;
            const btn2X = btn1X + actW + actGap;
            const btn3X = btn2X + actW + actGap;

            // 1. 每日一签
            if (tx >= btn1X && tx <= btn1X + actW) {
                try { soundManager.playTap(); } catch(e) {}
                state.currentModal = 'fortune_slip';
                if (!state.hasShakenFortuneToday) {
                    state.fortuneState = 'idle';
                    startFortuneShakeListener();
                }
                return;
            }
            // 2. 切换法殿
            if (tx >= btn2X && tx <= btn2X + actW) {
                try { soundManager.playTap(); } catch(e) {}
                state.currentModal = 'temple_picker';
                return;
            }
            // 3. 修行日历
            if (tx >= btn3X && tx <= btn3X + actW) {
                try { soundManager.playTap(); } catch(e) {}
                state.currentModal = 'calendar';
                return;
            }
        }

        // 1. 点击右上角 BGM 按钮
        if (tx >= bgmRect.x - 6 && tx <= bgmRect.x + bgmRect.w + 6 && ty >= bgmRect.y - 6 && ty <= bgmRect.y + bgmRect.h + 6) {
            try { soundManager.playTap(); } catch(e) {}
            if (state.currentModal === 'quick_ambient') {
                state.currentModal = null;
            } else if (!state.currentModal) {
                state.currentModal = 'quick_ambient';
            }
            return;
        }

        // 2. 功德寻宝小游戏全屏页面
        if (state.currentModal === 'gemhunt') {
            const ghSafeTop = menuButtonRect ? menuButtonRect.top : ((sysInfo.safeArea && sysInfo.safeArea.top) || 44);
            const ghTopBarH = menuButtonRect ? menuButtonRect.height : Math.round(34 * uiScale);
            const ghHeaderH = ghSafeTop + ghTopBarH + 6;
            const ghSafeBottom = Math.max(16, sysInfo.safeArea ? (H - sysInfo.safeArea.bottom) : 22);
            const consoleH = Math.round(58 * uiScale) + ghSafeBottom;
            const consoleY = H - consoleH;
            const templeY = ghHeaderH;
            const templeH = Math.min(190, Math.floor((consoleY - templeY) * 0.32));
            const plaqueY = templeY + templeH;
            const plaqueH = Math.round(34 * uiScale);

            // 返回按钮
            if (tx < 65 && ty < ghHeaderH + 10) {
                try { soundManager.playTap(); } catch(e) {}
                state.currentModal = 'minigames';
                return;
            }

            // 规则按钮 (左侧)
            const btnRuleX = 12;
            const btnRuleW = Math.round(50 * uiScale);
            if (tx >= btnRuleX - 4 && tx <= btnRuleX + btnRuleW + 4 && ty >= plaqueY - 5 && ty <= plaqueY + plaqueH + 5) {
                try { soundManager.playTap(); } catch(e) {}
                state.currentModal = 'rules';
                return;
            }

            // 排行榜按钮 (右侧)
            const btnRankW = Math.round(58 * uiScale);
            const btnRankX = W - 12 - btnRankW;
            if (tx >= btnRankX - 4 && tx <= btnRankX + btnRankW + 4 && ty >= plaqueY - 5 && ty <= plaqueY + plaqueH + 5) {
                try { soundManager.playTap(); } catch(e) {}
                state.rankReturnModal = 'gemhunt';
                state.currentModal = 'rank';
                reportScoreToFriendCloud();
                requestFriendRankData();
                return;
            }

            // 战力减少 −
            if (ty >= consoleY && ty <= consoleY + 54 && tx >= 12 && tx < 12 + 40) {
                try { soundManager.playTap(); } catch(e) {}
                if (state.gemHunt.currentBetIdx > 0) {
                    state.gemHunt.currentBetIdx--;
                }
                return;
            }

            // 点击战力中间数值：开启战力快捷选择面板
            if (ty >= consoleY && ty <= consoleY + 54 && tx >= 12 + 40 && tx < 12 + 134 - 40) {
                try { soundManager.playTap(); } catch(e) {}
                state.currentModal = 'betpicker';
                return;
            }

            // 战力增加 +
            if (ty >= consoleY && ty <= consoleY + 54 && tx >= 12 + 134 - 40 && tx < 12 + 134 + 15) {
                try { soundManager.playTap(); } catch(e) {}
                if (state.gemHunt.currentBetIdx < BET_TIERS.length - 1) {
                    const nextIdx = state.gemHunt.currentBetIdx + 1;
                    if (isTierUnlocked(nextIdx)) {
                        state.gemHunt.currentBetIdx = nextIdx;
                    } else {
                        state.targetUnlockTierIdx = nextIdx;
                        state.currentModal = 'ad_tier_unlock';
                    }
                }
                return;
            }

            // 开始祈福按钮
            if (ty >= consoleY && ty <= consoleY + 54 && tx >= W - 150) {
                try { soundManager.playTap(); } catch(e) {}
                if (!state.gemHunt.isSpinning) spinGemHunt();
                return;
            }
            return;
        }

        // 3. 弹窗交互
        if (state.currentModal === 'bigwin') {
            state.currentModal = 'gemhunt';
            return;
        }

        if (state.currentModal) {
            const cardW = W * 0.86;
            const cardH = (state.currentModal === 'ad_insufficient' || state.currentModal === 'ad_crit' || state.currentModal === 'ad_auto' || state.currentModal === 'ad_tier_unlock')
                ? Math.min(H * 0.44, 275)
                : ((state.currentModal === 'betpicker') ? Math.min(H * 0.58, 360) : ((state.currentModal === 'quick_ambient') ? Math.min(H * 0.64, 395) : ((state.currentModal === 'calendar' || state.currentModal === 'fortune_slip' || state.currentModal === 'fortune_gallery') ? Math.min(H * 0.74, 480) : Math.min(H * 0.65, 420))));
            const cardX = (W - cardW) / 2;
            const cardY = (H - cardH) / 2;

            if (state.currentModal === 'ad_insufficient') {
                if (tx > cardX + cardW - 45 && ty > cardY && ty < cardY + 45) {
                    try { soundManager.playTap(); } catch(e) {}
                    state.currentModal = 'gemhunt';
                    return;
                }
                const adBtnY = cardY + 158;
                if (ty >= adBtnY && ty <= adBtnY + 44 && tx >= cardX + 20 && tx <= cardX + cardW - 20) {
                    try { soundManager.playTap(); } catch(e) {}
                    if (state.dailyAlmsCount >= 5) {
                        showToast('今日化缘福报已达 5 次上限，请明日再来！');
                        return;
                    }
                    adManager.showRewardedVideo(() => {
                        state.dailyAlmsCount = (state.dailyAlmsCount || 0) + 1;
                        if (wx.setStorageSync) {
                            try {
                                wx.setStorageSync('qmy_alms_count', state.dailyAlmsCount.toString());
                            } catch (e) {}
                        }
                        state.totalHit += 2000;
                        state.dailyHit = (state.dailyHit || 0) + 2000;
                        state.currentModal = 'gemhunt';
                        showToast(`化缘功德圆满！获得 +2,000 敲击值 (今日剩余 ${Math.max(0, 5 - state.dailyAlmsCount)} 次)`);
                        try {
                            if (wx.setStorageSync) {
                                wx.setStorageSync('qmy_total_hit', state.totalHit.toString());
                                wx.setStorageSync('qmy_daily_hit', state.dailyHit.toString());
                            }
                        } catch (e) {}
                    }, () => {
                        state.currentModal = 'gemhunt';
                    }, '化缘获得 +2,000 敲击值');
                    return;
                }
                const closeBtnY = cardY + 212;
                if (ty >= closeBtnY && ty <= closeBtnY + 42 && tx >= cardX + 20 && tx <= cardX + cardW - 20) {
                    try { soundManager.playTap(); } catch(e) {}
                    state.currentModal = 'gemhunt';
                    return;
                }
                if (ty < cardY || ty > cardY + cardH || tx < cardX || tx > cardX + cardW) {
                    state.currentModal = 'gemhunt';
                    return;
                }
                return;
            }

            if (state.currentModal === 'ad_crit') {
                if (tx > cardX + cardW - 45 && ty > cardY && ty < cardY + 45) {
                    try { soundManager.playTap(); } catch(e) {}
                    state.currentModal = null;
                    return;
                }
                const adBtnY = cardY + 158;
                if (ty >= adBtnY && ty <= adBtnY + 44 && tx >= cardX + 20 && tx <= cardX + cardW - 20) {
                    try { soundManager.playTap(); } catch(e) {}
                    if (state.dailyCritCount >= 5) {
                        showToast('今日暴击广告已领完 (5/5次)，明日0点刷新！');
                        return;
                    }
                    if (state.critRate > 1 && state.critRemainingSec > 0) {
                        showToast(`暴击生效中 (剩余 ${formatTime(state.critRemainingSec)})，请结束后再看！`);
                        return;
                    }
                    adManager.showRewardedVideo(() => {
                        state.dailyCritCount++;
                        try {
                            if (wx.setStorageSync) wx.setStorageSync('qmy_crit_count', state.dailyCritCount.toString());
                        } catch (e) {}
                        const critOptions = [5, 8, 10];
                        const chosenCrit = critOptions[Math.floor(Math.random() * critOptions.length)];
                        state.critRate = chosenCrit;
                        state.critRemainingSec = 1800;
                        state.currentModal = null;
                        showToast(`鸿运当头！获得 ×${chosenCrit} 暴击倍率 (持续 30 分钟)！`);
                    }, () => {
                        state.currentModal = null;
                    }, '获得暴击倍率');
                    return;
                }
                const closeBtnY = cardY + 212;
                if (ty >= closeBtnY && ty <= closeBtnY + 42 && tx >= cardX + 20 && tx <= cardX + cardW - 20) {
                    try { soundManager.playTap(); } catch(e) {}
                    state.currentModal = null;
                    return;
                }
                if (ty < cardY || ty > cardY + cardH || tx < cardX || tx > cardX + cardW) {
                    state.currentModal = null;
                    return;
                }
                return;
            }

            if (state.currentModal === 'ad_auto') {
                if (tx > cardX + cardW - 45 && ty > cardY && ty < cardY + 45) {
                    try { soundManager.playTap(); } catch(e) {}
                    state.currentModal = null;
                    return;
                }
                const adBtnY = cardY + 158;
                if (ty >= adBtnY && ty <= adBtnY + 44 && tx >= cardX + 20 && tx <= cardX + cardW - 20) {
                    try { soundManager.playTap(); } catch(e) {}
                    if (state.dailyAutoCount >= 5) {
                        showToast('今日自动敲击广告已领完 (5/5次)，明日0点刷新！');
                        return;
                    }
                    adManager.showRewardedVideo(() => {
                        state.dailyAutoCount++;
                        try {
                            if (wx.setStorageSync) wx.setStorageSync('qmy_auto_count', state.dailyAutoCount.toString());
                        } catch (e) {}
                        state.isAutoHitting = true;
                        state.autoRemainingSec = (state.autoRemainingSec || 0) + 3600;
                        state.currentModal = null;
                        showToast(`自动敲击时长 +1 小时 (累计剩余 ${formatTime(state.autoRemainingSec)})！`);
                    }, () => {
                        state.currentModal = null;
                    }, '开启/叠加自动敲击');
                    return;
                }
                const closeBtnY = cardY + 212;
                if (ty >= closeBtnY && ty <= closeBtnY + 42 && tx >= cardX + 20 && tx <= cardX + cardW - 20) {
                    try { soundManager.playTap(); } catch(e) {}
                    state.currentModal = null;
                    return;
                }
                if (ty < cardY || ty > cardY + cardH || tx < cardX || tx > cardX + cardW) {
                    state.currentModal = null;
                    return;
                }
                return;
            }

            if (state.currentModal === 'ad_tier_unlock') {
                if (tx > cardX + cardW - 45 && ty > cardY && ty < cardY + 45) {
                    try { soundManager.playTap(); } catch(e) {}
                    state.currentModal = 'gemhunt';
                    return;
                }
                const adBtnY = cardY + 158;
                if (ty >= adBtnY && ty <= adBtnY + 44 && tx >= cardX + 20 && tx <= cardX + cardW - 20) {
                    try { soundManager.playTap(); } catch(e) {}
                    const unlockIdx = state.targetUnlockTierIdx;
                    adManager.showRewardedVideo(() => {
                        state.unlockedTiers[unlockIdx] = Date.now() + 24 * 3600 * 1000;
                        saveUnlockedTiers();
                        state.gemHunt.currentBetIdx = unlockIdx;
                        state.currentModal = 'gemhunt';
                        showToast(`恭喜解锁【${BET_TIERS[unlockIdx].toLocaleString()}】战力 (24小时生效)！`);
                    }, () => {
                        state.currentModal = 'gemhunt';
                    }, '解锁战力档位24小时');
                    return;
                }
                const closeBtnY = cardY + 212;
                if (ty >= closeBtnY && ty <= closeBtnY + 42 && tx >= cardX + 20 && tx <= cardX + cardW - 20) {
                    try { soundManager.playTap(); } catch(e) {}
                    state.currentModal = 'gemhunt';
                    return;
                }
                if (ty < cardY || ty > cardY + cardH || tx < cardX || tx > cardX + cardW) {
                    state.currentModal = 'gemhunt';
                    return;
                }
                return;
            }

            if (state.currentModal === 'betpicker') {
                if (tx > cardX + cardW - 45 && ty > cardY && ty < cardY + 45) {
                    try { soundManager.playTap(); } catch(e) {}
                    state.currentModal = 'gemhunt';
                    return;
                }
                const gridX = cardX + 14;
                const gridY = cardY + 66;
                const gridW = cardW - 28;
                const gridH = cardH - 80;
                const colW = Math.floor((gridW - 12) / 3);
                const rowH = Math.floor((gridH - 12) / 3);

                if (tx >= gridX && tx <= gridX + gridW && ty >= gridY && ty <= gridY + gridH) {
                    const c = Math.floor((tx - gridX) / (colW + 6));
                    const r = Math.floor((ty - gridY) / (rowH + 6));
                    const clickedIdx = r * 3 + c;
                    if (clickedIdx >= 0 && clickedIdx < BET_TIERS.length) {
                        try { soundManager.playTap(); } catch(e) {}
                        if (isTierUnlocked(clickedIdx)) {
                            state.gemHunt.currentBetIdx = clickedIdx;
                            state.currentModal = 'gemhunt';
                            showToast(`已切换战力为【${BET_TIERS[clickedIdx].toLocaleString()}】`);
                            return;
                        } else {
                            if (clickedIdx > 0 && !isTierUnlocked(clickedIdx - 1)) {
                                showToast(`需先解锁前置战力【${BET_TIERS[clickedIdx - 1].toLocaleString()}】方可修习后续档位！`);
                                return;
                            }
                            state.targetUnlockTierIdx = clickedIdx;
                            state.currentModal = 'ad_tier_unlock';
                            return;
                        }
                    }
                }
                if (ty < cardY || ty > cardY + cardH || tx < cardX || tx > cardX + cardW) {
                    state.currentModal = 'gemhunt';
                    return;
                }
                return;
            }

            if (state.currentModal === 'rules') {
                if (tx > cardX + cardW - 45 && ty > cardY && ty < cardY + 45) {
                    try { soundManager.playTap(); } catch(e) {}
                    state.currentModal = 'gemhunt';
                    return;
                }
                // Tab 点击切换
                if (ty >= cardY + 38 && ty <= cardY + 68) {
                    const tw = (cardW - 24) / 4;
                    const tabIdx = Math.floor((tx - (cardX + 12)) / tw);
                    try { soundManager.playTap(); } catch(e) {}
                    if (tabIdx === 0) state.rulesTab = 'icons';
                    else if (tabIdx === 1) { state.rulesTab = 'lines'; state.rulesPage = 0; }
                    else if (tabIdx === 2) state.rulesTab = 'tiers';
                    else if (tabIdx === 3) state.rulesTab = 'help';
                    return;
                }
                // 连线规则翻页点击 (底部圆点与上一页/下一页)
                if (state.rulesTab === 'lines') {
                    if (ty >= cardY + cardH - 38 && ty <= cardY + cardH + 10) {
                        try { soundManager.playTap(); } catch(e) {}
                        if (tx < W / 2 - 20) {
                            state.rulesPage = Math.max(0, (state.rulesPage || 0) - 1);
                            return;
                        } else if (tx > W / 2 + 20) {
                            state.rulesPage = Math.min(2, (state.rulesPage || 0) + 1);
                            return;
                        } else {
                            state.rulesPage = 1;
                            return;
                        }
                    }
                }
                if (ty < cardY || ty > cardY + cardH || tx < cardX || tx > cardX + cardW) {
                    state.currentModal = 'gemhunt';
                    return;
                }
                return;
            }

            if (state.currentModal === 'minigames') {
                if (tx > cardX + cardW - 45 && ty > cardY && ty < cardY + 45) {
                    try { soundManager.playTap(); } catch(e) {}
                    state.currentModal = null;
                    return;
                }
                if (ty > cardY + 45 && ty < cardY + 165 && tx > cardX + 10 && tx < cardX + cardW - 10) {
                    try { soundManager.playTap(); } catch(e) {}
                    state.currentModal = 'gemhunt';
                    return;
                }
            }

            if (state.currentModal === 'rank') {
                // 关闭按钮 ×
                if (tx > cardX + cardW - 45 && ty > cardY && ty < cardY + 45) {
                    try { soundManager.playTap(); } catch(e) {}
                    state.currentModal = state.rankReturnModal || null;
                    state.rankReturnModal = null;
                    return;
                }
                // Tab 切换触摸（微信好友榜 / 功德修行榜）
                const rankTabW2 = (cardW - 32) / 2;
                if (ty >= cardY + 38 && ty <= cardY + 72) {
                    if (tx >= cardX + 16 && tx < cardX + 16 + rankTabW2) {
                        try { soundManager.playTap(); } catch(e) {}
                        state.rankTab = 'friends';
                        reportScoreToFriendCloud();
                        requestFriendRankData();
                        return;
                    }
                    if (tx >= cardX + 16 + rankTabW2 && tx <= cardX + cardW - 16) {
                        try { soundManager.playTap(); } catch(e) {}
                        state.rankTab = 'world';
                        return;
                    }
                }
                // 好友榜底部「邀请好友/微信群同玩」按钮
                if (state.rankTab === 'friends') {
                    const inviteBtnY = cardY + cardH - Math.round(38 * uiScale);
                    const inviteBtnH = Math.round(28 * uiScale);
                    if (ty >= inviteBtnY && ty <= inviteBtnY + inviteBtnH && tx >= cardX + 16 && tx <= cardX + cardW - 16) {
                        try { soundManager.playTap(); } catch(e) {}
                        if (typeof wx !== 'undefined' && wx.shareAppMessage) {
                            wx.shareAppMessage({
                                title: `我在《静心敲木鱼》积攒了 ${state.totalHit || 0} 功德，快来好友榜比一比！`,
                                imageUrl: 'share_500x400.jpg'
                            });
                        }
                        return;
                    }
                }
                // 点击弹窗外部 → 关闭
                if (ty < cardY || ty > cardY + cardH || tx < cardX || tx > cardX + cardW) {
                    state.currentModal = state.rankReturnModal || null;
                    state.rankReturnModal = null;
                    return;
                }
                return;
            }

            if (state.currentModal === 'temple_picker') {
                if (tx > cardX + cardW - 45 && ty > cardY && ty < cardY + 45) {
                    try { soundManager.playTap(); } catch(e) {}
                    state.currentModal = null;
                    return;
                }
                const tCols = 2;
                const tRows = 2;
                const tStartY = cardY + 48;
                const tGapX = Math.round(10 * uiScale);
                const tGapY = Math.round(10 * uiScale);
                const tW = (cardW - 24 - tGapX) / tCols;
                const tH = Math.round(92 * uiScale);

                for (let i = 0; i < TEMPLE_MODES.length; i++) {
                    const c = i % 2;
                    const r = Math.floor(i / 2);
                    const tx_box = cardX + 12 + c * (tW + tGapX);
                    const ty_box = tStartY + r * (tH + tGapY);
                    if (tx >= tx_box && tx <= tx_box + tW && ty >= ty_box && ty <= ty_box + tH) {
                        try { soundManager.playTap(); } catch(e) {}
                        state.currentTempleId = TEMPLE_MODES[i].id;
                        if (typeof wx !== 'undefined' && wx.setStorageSync) {
                            try { wx.setStorageSync('qmy_temple_id', state.currentTempleId); } catch(e) {}
                        }
                        showToast(`已移步至【${TEMPLE_MODES[i].name}】！`);
                        state.currentModal = null;
                        return;
                    }
                }
                if (ty < cardY || ty > cardY + cardH || tx < cardX || tx > cardX + cardW) {
                    state.currentModal = null;
                    return;
                }
                return;
            }

            if (state.currentModal === 'fortune_slip') {
                if (tx > cardX + cardW - 45 && ty > cardY && ty < cardY + 45) {
                    try { soundManager.playTap(); } catch(e) {}
                    stopFortuneShakeListener();
                    state.currentModal = null;
                    return;
                }
                // 点击左上角【灵签谱】入口按钮
                const galleryBtnW = Math.round(82 * uiScale);
                const galleryBtnH = Math.round(24 * uiScale);
                const galleryBtnX = cardX + 12;
                const galleryBtnY = cardY + 14;
                if (tx >= galleryBtnX - 4 && tx <= galleryBtnX + galleryBtnW + 4 && ty >= galleryBtnY - 4 && ty <= galleryBtnY + galleryBtnH + 6) {
                    try { soundManager.playTap(); } catch(e) {}
                    state.fortuneReturnModal = 'fortune_slip';
                    state.currentModal = 'fortune_gallery';
                    state.viewingGallerySlip = null;
                    state.galleryPage = 0;
                    return;
                }
                // 未摇签：点击摇签按钮或签筒触发动画
                if (!state.hasShakenFortuneToday && !state.todayFortuneSlip && state.fortuneState === 'idle') {
                    const shakeBtnW = cardW - 48;
                    const shakeBtnH = Math.round(38 * uiScale);
                    const shakeBtnX = (W - shakeBtnW) / 2;
                    const shakeBtnY = cardY + cardH - Math.round(52 * uiScale);
                    const isBtnTap = (tx >= shakeBtnX && tx <= shakeBtnX + shakeBtnW && ty >= shakeBtnY && ty <= shakeBtnY + shakeBtnH);
                    const isPotTap = (tx >= cardX + 30 && tx <= cardX + cardW - 30 && ty >= cardY + 50 && ty <= cardY + cardH - 50);
                    if (isBtnTap || isPotTap) {
                        triggerFortuneShake();
                        return;
                    }
                }
                // 已解签：点击【分享灵签】或【保存壁纸海报】
                const slip = state.todayFortuneSlip;
                if (slip) {
                    const scrollX = cardX + 12;
                    const scrollY = cardY + 44;
                    const scrollW = cardW - 24;
                    const scrollH = cardH - 56;
                    const btnH = Math.round(34 * uiScale);
                    const btnY = scrollY + scrollH - btnH - Math.round(30 * uiScale);
                    const btnW = (scrollW - Math.round(24 * uiScale)) / 2;
                    const btn1X = scrollX + Math.round(8 * uiScale);
                    const btn2X = btn1X + btnW + Math.round(8 * uiScale);

                    // 1. 分享灵签按钮 (热区扩展 ±6px)
                    if (tx >= btn1X - 6 && tx <= btn1X + btnW + 4 && ty >= btnY - 8 && ty <= btnY + btnH + 12) {
                        try { soundManager.playTap(); } catch(e) {}
                        if (typeof wx !== 'undefined' && wx.vibrateShort) {
                            try { wx.vibrateShort({ type: 'light', fail: () => {} }); } catch(e) {}
                        }
                        shareFortuneSlip(slip);
                        return;
                    }

                    // 2. 保存壁纸海报按钮 (热区扩展 ±6px)
                    if (tx >= btn2X - 4 && tx <= btn2X + btnW + 6 && ty >= btnY - 8 && ty <= btnY + btnH + 12) {
                        try { soundManager.playTap(); } catch(e) {}
                        if (typeof wx !== 'undefined' && wx.vibrateShort) {
                            try { wx.vibrateShort({ type: 'light', fail: () => {} }); } catch(e) {}
                        }
                        saveFortunePoster(slip);
                        return;
                    }
                }
                if (ty < cardY || ty > cardY + cardH || tx < cardX || tx > cardX + cardW) {
                    stopFortuneShakeListener();
                    state.currentModal = null;
                    return;
                }
                return;
            }

            if (state.currentModal === 'fortune_gallery') {
                // 如果正在全屏研读单支签
                if (state.viewingGallerySlip) {
                    const scrollX = cardX + 12;
                    const scrollY = cardY + 16;
                    const scrollW = cardW - 24;
                    const scrollH = cardH - 32;
                    const btnH = Math.round(34 * uiScale);
                    const btnY = scrollY + scrollH - btnH - Math.round(20 * uiScale);
                    const returnBtnW = scrollW - Math.round(24 * uiScale);
                    const returnBtnX = scrollX + Math.round(12 * uiScale);

                    const isCloseTap = (tx > cardX + cardW - 45 && ty > cardY && ty < cardY + 45);
                    const isReturnBtnTap = (tx >= returnBtnX && tx <= returnBtnX + returnBtnW && ty >= btnY - 6 && ty <= btnY + btnH + 10);
                    if (isCloseTap || isReturnBtnTap) {
                        try { soundManager.playTap(); } catch(e) {}
                        state.viewingGallerySlip = null;
                        return;
                    }
                    if (ty < cardY || ty > cardY + cardH || tx < cardX || tx > cardX + cardW) {
                        state.viewingGallerySlip = null;
                        return;
                    }
                    return;
                }

                // 主图鉴视图
                // 1. 点击右上角 × 关闭
                if (tx > cardX + cardW - 45 && ty > cardY && ty < cardY + 45) {
                    try { soundManager.playTap(); } catch(e) {}
                    state.currentModal = state.fortuneReturnModal || null;
                    return;
                }

                // 2. 分类 Tabs 点击
                const tabY = cardY + Math.round(48 * uiScale);
                const tabH = Math.round(26 * uiScale);
                const gTabs = ['all', 'general', 'temple', 'solar'];
                const tabW = (cardW - Math.round(24 * uiScale)) / gTabs.length;

                if (ty >= tabY - 4 && ty <= tabY + tabH + 6) {
                    for (let i = 0; i < gTabs.length; i++) {
                        const txMin = cardX + Math.round(12 * uiScale) + i * tabW;
                        const txMax = txMin + tabW;
                        if (tx >= txMin && tx <= txMax) {
                            try { soundManager.playTap(); } catch(e) {}
                            state.galleryTab = gTabs[i];
                            state.galleryPage = 0;
                            return;
                        }
                    }
                }

                // 3. 点击 3 列 x 2 行 签牌卡片 (热区扩展)
                const filtered = getGalleryFilteredSlips(state.galleryTab || 'all');
                const pageSize = 6;
                const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
                const curPage = Math.min(totalPages - 1, Math.max(0, state.galleryPage || 0));
                const pageItems = filtered.slice(curPage * pageSize, (curPage + 1) * pageSize);

                const gridY = tabY + tabH + Math.round(12 * uiScale);
                const colGap = Math.round(8 * uiScale);
                const rowGap = Math.round(10 * uiScale);
                const colW = (cardW - Math.round(24 * uiScale) - colGap * 2) / 3;
                const rowH = Math.round(112 * uiScale);

                for (let i = 0; i < pageItems.length; i++) {
                    const col = i % 3;
                    const row = Math.floor(i / 3);
                    const itemX = cardX + Math.round(12 * uiScale) + col * (colW + colGap);
                    const itemY = gridY + row * (rowH + rowGap);

                    if (tx >= itemX - 2 && tx <= itemX + colW + 2 && ty >= itemY - 2 && ty <= itemY + rowH + 2) {
                        const slip = pageItems[i];
                        const isUnlocked = Array.isArray(state.collectedSlips) && state.collectedSlips.includes(slip.name);
                        if (isUnlocked) {
                            try { soundManager.playChime(); } catch(e) {}
                            if (typeof wx !== 'undefined' && wx.vibrateShort) {
                                try { wx.vibrateShort({ type: 'light', fail: () => {} }); } catch(e) {}
                            }
                            state.viewingGallerySlip = slip;
                        } else {
                            try { soundManager.playTap(); } catch(e) {}
                            if (typeof wx !== 'undefined' && wx.vibrateShort) {
                                try { wx.vibrateShort({ type: 'medium', fail: () => {} }); } catch(e) {}
                            }
                            showToast('此灵签尚未点亮 · 每日诚心摇签随机启封！');
                        }
                        return;
                    }
                }

                // 4. 底部翻页按钮
                const footY = gridY + 2 * (rowH + rowGap) + Math.round(8 * uiScale);
                const pageBtnW = Math.round(68 * uiScale);
                const pageBtnH = Math.round(26 * uiScale);

                // 上一页
                const prevX = cardX + Math.round(16 * uiScale);
                if (tx >= prevX - 6 && tx <= prevX + pageBtnW + 6 && ty >= footY - 6 && ty <= footY + pageBtnH + 8) {
                    if (curPage > 0) {
                        try { soundManager.playTap(); } catch(e) {}
                        state.galleryPage = curPage - 1;
                    }
                    return;
                }

                // 下一页
                const nextX = cardX + cardW - Math.round(16 * uiScale) - pageBtnW;
                if (tx >= nextX - 6 && tx <= nextX + pageBtnW + 6 && ty >= footY - 6 && ty <= footY + pageBtnH + 8) {
                    if (curPage < totalPages - 1) {
                        try { soundManager.playTap(); } catch(e) {}
                        state.galleryPage = curPage + 1;
                    }
                    return;
                }

                // 点击外部关闭
                if (ty < cardY || ty > cardY + cardH || tx < cardX || tx > cardX + cardW) {
                    state.currentModal = state.fortuneReturnModal || null;
                    return;
                }
                return;
            }

            if (state.currentModal === 'calendar') {
                if (tx > cardX + cardW - 45 && ty > cardY && ty < cardY + 45) {
                    try { soundManager.playTap(); } catch(e) {}
                    state.currentModal = null;
                    return;
                }
                // 点击顶部概览条中的求签入口 (若今日未摇签，直接打开摇签弹窗)
                const overviewY = cardY + 38;
                const overviewH = Math.round(68 * uiScale);
                if (!state.hasShakenFortuneToday && !state.todayFortuneSlip) {
                    if (ty >= overviewY && ty <= overviewY + overviewH * 0.6 && tx >= cardX + 10 && tx <= cardX + cardW - 10) {
                        try { soundManager.playTap(); } catch(e) {}
                        state.currentModal = 'fortune_slip';
                        state.fortuneState = 'idle';
                        startFortuneShakeListener();
                        return;
                    }
                }
                // 点击月度网格中的日期格子
                const now = new Date();
                const year = now.getFullYear();
                const month = now.getMonth();
                const firstDay = new Date(year, month, 1).getDay();
                const startOffset = firstDay === 0 ? 6 : firstDay - 1;
                const daysInMonth = new Date(year, month + 1, 0).getDate();
                const gridStartX = cardX + 10;
                const gridStartY = cardY + 114;
                const cellW = (cardW - 20) / 7;
                const cellH = Math.round(33 * uiScale);

                for (let d = 1; d <= daysInMonth; d++) {
                    const slot = startOffset + d - 1;
                    const col = slot % 7;
                    const row = Math.floor(slot / 7);
                    const cx = gridStartX + col * cellW;
                    const cy = gridStartY + 18 + row * cellH;
                    if (tx >= cx && tx <= cx + cellW && ty >= cy && ty <= cy + cellH) {
                        state.selectedCalendarDay = d;
                        try { soundManager.playTap(); } catch(e) {}
                        return;
                    }
                }

                if (ty < cardY || ty > cardY + cardH || tx < cardX || tx > cardX + cardW) {
                    state.currentModal = null;
                    return;
                }
                return;
            }

            if (state.currentModal === 'quick_ambient') {
                // 点击右上角 × 关闭
                if (tx > cardX + cardW - 45 && ty > cardY && ty < cardY + 45) {
                    try { soundManager.playTap(); } catch(e) {}
                    state.currentModal = null;
                    return;
                }
                // 点击快速静音/播放按钮
                const muteBtnW = Math.round(76 * uiScale);
                const muteBtnH = Math.round(24 * uiScale);
                const muteBtnX = cardX + cardW - 38 - muteBtnW;
                const muteBtnY = cardY + 16;
                if (tx >= muteBtnX && tx <= muteBtnX + muteBtnW && ty >= muteBtnY && ty <= muteBtnY + muteBtnH) {
                    try { soundManager.playTap(); } catch(e) {}
                    state.bgmEnabled = !state.bgmEnabled;
                    soundManager.updateBgmState();
                    showToast(state.bgmEnabled ? '声音已开启' : '已静音');
                    return;
                }
                // 10 首曲目点击 (2列 x 5行)
                const gridStartX = cardX + 10;
                const gridStartY = cardY + 48;
                const gapX = Math.round(8 * uiScale);
                const gapY = Math.round(5 * uiScale);
                const cols = 2;
                const rows = 5;
                const itW = (cardW - 20 - gapX) / cols;
                const itH = Math.floor((cardH - 54 - 24 - (rows - 1) * gapY) / rows);

                for (let i = 0; i < BGM_TRACKS.length; i++) {
                    const c = i % 2;
                    const r = Math.floor(i / 2);
                    const itX = gridStartX + c * (itW + gapX);
                    const itY = gridStartY + r * (itH + gapY);
                    if (tx >= itX && tx <= itX + itW && ty >= itY && ty <= itY + itH) {
                        try { soundManager.playTap(); } catch(e) {}
                        state.selectedTrackIdx = i;
                        state.bgmEnabled = true;
                        soundManager.playBgm(i);
                        showToast(`已切换：${BGM_TRACKS[i].name}`);
                        return;
                    }
                }
                // 点击外部空白关闭
                if (ty < cardY || ty > cardY + cardH || tx < cardX || tx > cardX + cardW) {
                    state.currentModal = null;
                    return;
                }
                return;
            }

            if (state.currentModal === 'settings') {
                if (tx > cardX + cardW - 45 && ty > cardY && ty < cardY + 45) {
                    try { soundManager.playTap(); } catch(e) {}
                    state.currentModal = null;
                    return;
                }
                const toggle1Y = cardY + 38;
                if (ty >= toggle1Y && ty <= toggle1Y + 34 && tx >= cardX + 12 && tx <= cardX + cardW - 12) {
                    try { soundManager.playTap(); } catch(e) {}
                    state.sfxEnabled = !state.sfxEnabled;
                    showToast(state.sfxEnabled ? '敲击音效已开启' : '敲击音效已静音');
                    return;
                }
                const toggle2Y = cardY + 74;
                if (ty >= toggle2Y && ty <= toggle2Y + 34 && tx >= cardX + 12 && tx <= cardX + cardW - 12) {
                    try { soundManager.playTap(); } catch(e) {}
                    state.bgmEnabled = !state.bgmEnabled;
                    soundManager.updateBgmState();
                    showToast(state.bgmEnabled ? '静心自然声景已开启' : '声景已关闭');
                    return;
                }
                const trackStartY = cardY + 138;
                const cols = 2;
                const rows = 5;
                const gapX = Math.round(8 * uiScale);
                const gapY = Math.round(4 * uiScale);
                const itW = (cardW - 24 - gapX) / cols;
                const itH = 28;

                if (ty >= trackStartY && ty <= trackStartY + rows * (itH + gapY) && tx >= cardX + 12 && tx <= cardX + cardW - 12) {
                    const c = Math.floor((tx - (cardX + 12)) / (itW + gapX));
                    const r = Math.floor((ty - trackStartY) / (itH + gapY));
                    if (c >= 0 && c < cols && r >= 0 && r < rows) {
                        const clickedIdx = r * cols + c;
                        if (clickedIdx >= 0 && clickedIdx < BGM_TRACKS.length) {
                            try { soundManager.playTap(); } catch(e) {}
                            state.selectedTrackIdx = clickedIdx;
                            state.bgmEnabled = true;
                            soundManager.playBgm(clickedIdx);
                            showToast(`已切换：${BGM_TRACKS[clickedIdx].name}`);
                            return;
                        }
                    }
                }
                // 点击合规入口
                const compY = trackStartY + rows * (itH + gapY) + 8;
                const compBtnW = (cardW - 32) / 2;
                const compBtnH = 26;
                if (ty >= compY && ty <= compY + compBtnH) {
                    try { soundManager.playTap(); } catch(e) {}
                    if (tx >= cardX + 12 && tx <= cardX + 12 + compBtnW) {
                        state.currentModal = 'age_advisory';
                        return;
                    } else if (tx >= cardX + 12 + compBtnW + 8 && tx <= cardX + cardW - 12) {
                        if (typeof wx !== 'undefined' && wx.openPrivacyContract) {
                            wx.openPrivacyContract({
                                fail: () => {
                                    state.currentModal = 'privacy_policy';
                                }
                            });
                        } else {
                            state.currentModal = 'privacy_policy';
                        }
                        return;
                    }
                }
            }

            if (state.currentModal === 'age_advisory' || state.currentModal === 'privacy_policy') {
                if (tx > cardX + cardW - 45 && ty > cardY && ty < cardY + 45) {
                    try { soundManager.playTap(); } catch(e) {}
                    state.currentModal = 'settings';
                    return;
                }
                const okBtnY = cardY + cardH - 52;
                if (ty >= okBtnY && ty <= okBtnY + 36 && tx >= cardX + 30 && tx <= cardX + cardW - 30) {
                    try { soundManager.playTap(); } catch(e) {}
                    if (state.currentModal === 'privacy_policy' && typeof wx !== 'undefined' && wx.openPrivacyContract) {
                        try { wx.openPrivacyContract(); } catch(e) {}
                    }
                    state.currentModal = 'settings';
                    return;
                }
                if (ty < cardY || ty > cardY + cardH || tx < cardX || tx > cardX + cardW) {
                    state.currentModal = 'settings';
                    return;
                }
                return;
            }

            if (state.currentModal === 'titles') {
                state.touchStartY = ty;
                state.startScrollY = state.titleScrollY;
                if (tx > cardX + cardW - 45 && ty > cardY && ty < cardY + 45) {
                    try { soundManager.playTap(); } catch(e) {}
                    state.currentModal = null;
                    return;
                }
            }

            if (ty < cardY || ty > cardY + cardH || tx < cardX || tx > cardX + cardW) {
                state.currentModal = null;
            }
            return;
        }

        // 3.5 点击左上角名牌 → 查看修行境界与称号
        const layout2 = getHomeLayout();
        const bgmRect2 = getBgmBtnRect();
        const profileW2 = Math.min(Math.round(168 * uiScale), bgmRect2.x - layout2.side - 8);
        if (tx >= layout2.side && tx <= layout2.side + profileW2 &&
            ty >= layout2.topY && ty <= layout2.topY + layout2.profileH) {
            try { soundManager.playTap(); } catch(e) {}
            if (!state.currentModal) state.currentModal = 'titles';
            return;
        }

        // 4. 底部 4 大导航栏点击
        if (ty >= btns.navBar.y - 8 && ty <= btns.navBar.y + btns.navBar.h + 12) {
            if (tx >= btns.minigames.x && tx < btns.rank.x) {
                try { soundManager.playTap(); } catch(e) {}
                state.currentModal = 'minigames';
                return;
            }
            if (tx >= btns.rank.x && tx < btns.titles.x) {
                try { soundManager.playTap(); } catch(e) {}
                state.currentModal = 'rank';
                state.rankTab = 'friends';
                reportScoreToFriendCloud();
                requestFriendRankData();
                return;
            }
            if (tx >= btns.titles.x && tx < btns.settings.x) {
                try { soundManager.playTap(); } catch(e) {}
                state.currentModal = 'titles';
                state.titleScrollY = 0;
                return;
            }
            if (tx >= btns.settings.x && tx <= btns.navBar.x + btns.navBar.w + 8) {
                try { soundManager.playTap(); } catch(e) {}
                state.currentModal = 'settings';
                return;
            }
        }

        // 5. 底部 2 个广告按钮
        if (ty >= btns.critAd.y - 6 && ty <= btns.critAd.y + btns.critAd.h + 8) {
            if (tx >= btns.critAd.x - 4 && tx <= btns.critAd.x + btns.critAd.w + 4) {
                try { soundManager.playTap(); } catch(e) {}
                if (state.dailyCritCount >= 5) {
                    showToast('今日暴击广告已领完 (5/5次)，明日0点刷新！');
                    return;
                }
                if (state.critRate > 1 && state.critRemainingSec > 0) {
                    showToast(`暴击生效中 (剩余 ${formatTime(state.critRemainingSec)})，请结束后再看！`);
                    return;
                }
                state.currentModal = 'ad_crit';
                return;
            }

            if (tx >= btns.autoAd.x - 4 && tx <= btns.autoAd.x + btns.autoAd.w + 4) {
                try { soundManager.playTap(); } catch(e) {}
                if (state.dailyAutoCount >= 5) {
                    showToast('今日自动敲击广告已领完 (5/5次)，明日0点刷新！');
                    return;
                }
                state.currentModal = 'ad_auto';
                return;
            }
        }

        // 6. 点击木鱼中央大舞台区域
        if (ty >= layout.bannerY + layout.bannerH && ty < btns.critAd.y) {
            tapWoodfish(tx, ty);
            return;
        }
    });
}

if (typeof wx !== 'undefined' && wx.onTouchMove) {
    wx.onTouchMove((e) => {
        const touch = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]) || e;
        if (!touch) return;
        const ty = (typeof touch.clientY === 'number') ? touch.clientY : ((typeof touch.y === 'number') ? touch.y : touch.pageY);
        if (typeof ty !== 'number' || isNaN(ty)) return;

        if (state.currentModal === 'titles') {
            const dy = ty - state.touchStartY;
            const cardH = Math.min(H * 0.65, 420);
            const listH = cardH - 82;
            const totalContentH = TITLES.length * (64 + 8);
            const minScroll = Math.min(0, listH - totalContentH);
            state.titleScrollY = Math.max(minScroll, Math.min(0, state.startScrollY + dy));
        }
    });
}

// ------------------------------------------------------------------
// 9. 主渲染循环管线
// ------------------------------------------------------------------



let _lastRenderStamp = 0;

function shouldSkipIdleFrame(now) {
    const hasParticles = (state.floatingTexts && state.floatingTexts.length > 0) || (state.hitRipples && state.hitRipples.length > 0);
    const hasWoodfishAnim = Math.abs(state.woodfishScale - 1.0) > 0.005 || Math.abs(state.malletAngle - 28) > 0.5 || Math.abs(state.malletOffsetX) > 0.5 || Math.abs(state.malletOffsetY) > 0.5;
    const hasGemhuntAnim = state.gemHunt && (state.gemHunt.isSpinning || (state.gemHunt.winningLines && state.gemHunt.winningLines.length > 0) || (state.gemHunt.sparkles && state.gemHunt.sparkles.length > 0));
    const isBusy = hasParticles || hasWoodfishAnim || hasGemhuntAnim || state.isAutoHitting || state.toastMsg !== '' || state.currentModal !== null;

    if (isBusy) {
        _lastRenderStamp = now;
        return false; // 活跃状态跑满 60 FPS
    }

    // 静止待机状态智能节能 (限制约 30 FPS 刷新，大幅降低 CPU 占用与发热)
    if (now - _lastRenderStamp < 32) {
        return true;
    }
    _lastRenderStamp = now;
    return false;
}

function render() {
    const now = Date.now ? Date.now() : (+new Date());
    if (shouldSkipIdleFrame(now)) {
        if (typeof requestAnimationFrame !== 'undefined') {
            requestAnimationFrame(render);
        }
        return;
    }

    try {
        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.scale(dpr, dpr);

        // 1. 功德寻宝小游戏全屏页面
        if (state.currentModal === 'gemhunt') {
            const ghSafeTop = menuButtonRect ? menuButtonRect.top : ((sysInfo.safeArea && sysInfo.safeArea.top) || 44);
            const ghTopBarH = menuButtonRect ? menuButtonRect.height : Math.round(34 * uiScale);
            const ghHeaderH = ghSafeTop + ghTopBarH + 6;
            const ghSafeBottom = Math.max(16, sysInfo.safeArea ? (H - sysInfo.safeArea.bottom) : 22);
            const consoleH = Math.round(58 * uiScale) + ghSafeBottom;
            const consoleY = H - consoleH;
            const templeY = ghHeaderH;
            const templeH = Math.min(190, Math.floor((consoleY - templeY) * 0.32));
            const plaqueY = templeY + templeH;
            const plaqueH = Math.round(34 * uiScale);

            // 背景
            const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
            bgGrad.addColorStop(0, '#1E140C');
            bgGrad.addColorStop(0.5, '#120B06');
            bgGrad.addColorStop(1, '#0A0604');
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, W, H);

            // 大殿华光背景 (使用真实 assets/images/bg.png 寺庙大殿全景)
            const bgImg = images.bg || images.temple;
            if (bgImg && bgImg.width) {
                ctx.save();
                ctx.globalAlpha = 0.85;
                ctx.drawImage(bgImg, 0, templeY - 10, W, templeH + 20);
                const maskGrad = ctx.createLinearGradient(0, templeY, 0, plaqueY);
                maskGrad.addColorStop(0, 'rgba(18, 11, 6, 0.05)');
                maskGrad.addColorStop(0.7, 'rgba(18, 11, 6, 0.35)');
                maskGrad.addColorStop(1, '#120B06');
                ctx.fillStyle = maskGrad;
                ctx.fillRect(0, templeY - 10, W, templeH + 20);
                ctx.restore();
            }

            // Header 状态栏 (使用超清 3D 鎏金返回键)
            const btnBackX = 14;
            const btnBackY = ghSafeTop + (ghTopBarH - Math.round(32 * uiScale)) / 2;
            const btnBackSize = Math.round(32 * uiScale);
            drawVectorBackButton(ctx, btnBackX, btnBackY, btnBackSize);

            // 敲击值胶囊 (居中，带元宝矢量图标)
            const scoreW = Math.min(170, W * 0.46);
            const scoreH = ghTopBarH;
            const scoreX = (W - scoreW) / 2;
            const scoreY = ghSafeTop;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            drawRoundRect(ctx, scoreX, scoreY, scoreW, scoreH, scoreH / 2);
            ctx.fill();
            ctx.strokeStyle = '#F5C44B';
            ctx.lineWidth = 1.2;
            ctx.stroke();

            drawVectorIngot(ctx, scoreX + Math.round(16 * uiScale), scoreY + scoreH / 2, Math.round(5.5 * uiScale));
            ctx.fillStyle = '#FFE072';
            ctx.font = `bold ${Math.round(11.5 * uiScale)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(`敲击值: ${state.totalHit.toLocaleString()}`, scoreX + scoreW / 2 + Math.round(6 * uiScale), scoreY + scoreH / 2 + 4);

            // 大殿金字匾额与两翼按钮（左边规则，右边排行榜）
            const btnRuleX = 12;
            const btnRuleW = Math.round(52 * uiScale);
            const btnRankW = Math.round(60 * uiScale);
            const btnRankX = W - 12 - btnRankW;
            const plaqueX = btnRuleX + btnRuleW + 6;
            const plaqueW = btnRankX - 6 - plaqueX;

            // 1. 左侧【规则】按钮 (带典雅卷轴图标)
            ctx.fillStyle = '#26190E';
            drawRoundRect(ctx, btnRuleX, plaqueY + 3, btnRuleW, plaqueH - 6, 6);
            ctx.fill();
            ctx.strokeStyle = '#F5C44B';
            ctx.lineWidth = 1;
            ctx.stroke();
            drawVectorScroll(ctx, btnRuleX + Math.round(13 * uiScale), plaqueY + plaqueH / 2, Math.round(5 * uiScale));
            ctx.fillStyle = '#FFE072';
            ctx.font = `bold ${Math.round(10.5 * uiScale)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText('规则', btnRuleX + btnRuleW / 2 + Math.round(6 * uiScale), plaqueY + plaqueH / 2 + 4);

            // 2. 中间【佛光普照 · 功德寻宝】匾额
            ctx.fillStyle = '#7A1400';
            drawRoundRect(ctx, plaqueX, plaqueY + 3, plaqueW, plaqueH - 6, 6);
            ctx.fill();
            ctx.strokeStyle = '#F5C44B';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            const isFreeSpinMode = (state.gemHunt.freeSpinsRemaining || 0) > 0;
            ctx.fillStyle = isFreeSpinMode ? '#FFF566' : '#FFE072';
            ctx.font = `bold ${Math.round(11 * uiScale)}px sans-serif`;
            ctx.textAlign = 'center';
            if (isFreeSpinMode) {
                drawVectorGift(ctx, plaqueX + Math.round(18 * uiScale), plaqueY + plaqueH / 2, Math.round(6 * uiScale));
                ctx.fillText(`免费祈福中 (余 ${state.gemHunt.freeSpinsRemaining} 次)`, plaqueX + plaqueW / 2 + Math.round(6 * uiScale), plaqueY + plaqueH / 2 + 4);
            } else {
                ctx.fillText('✦ 佛光普照 · 功德寻宝 ✦', plaqueX + plaqueW / 2, plaqueY + plaqueH / 2 + 4);
            }

            // 3. 右侧【排行榜】按钮 (带纯金奖杯图标)
            ctx.fillStyle = '#26190E';
            drawRoundRect(ctx, btnRankX, plaqueY + 3, btnRankW, plaqueH - 6, 6);
            ctx.fill();
            ctx.strokeStyle = '#F5C44B';
            ctx.lineWidth = 1;
            ctx.stroke();
            drawVectorTrophy(ctx, btnRankX + Math.round(13 * uiScale), plaqueY + plaqueH / 2, Math.round(5.5 * uiScale));
            ctx.fillStyle = '#FFE072';
            ctx.font = `bold ${Math.round(10.5 * uiScale)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText('排行榜', btnRankX + btnRankW / 2 + Math.round(7 * uiScale), plaqueY + plaqueH / 2 + 4);

            // 5x3 滚轴网格
            const cabinetTop = plaqueY + plaqueH + 6;
            const availH = consoleY - cabinetTop - 8;
            const padX = 6;
            const padY = 6;
            const gap = 4;
            const cellW = Math.floor((W - 14 - padX * 2 - gap * 4) / 5);
            const maxCellH = Math.floor((availH - padY * 2 - gap * 2) / 3);
            const cellH = Math.min(maxCellH, Math.max(cellW, Math.floor(cellW * 1.22)));

            const cabinetW = padX * 2 + cellW * 5 + gap * 4;
            const cabinetH = padY * 2 + cellH * 3 + gap * 2;
            const cabinetX = (W - cabinetW) / 2;
            const cabinetY = cabinetTop + Math.max(0, Math.floor((availH - cabinetH) / 2));

            const boxGrad = ctx.createLinearGradient(cabinetX, cabinetY, cabinetX, cabinetY + cabinetH);
            boxGrad.addColorStop(0, '#2D1B10');
            boxGrad.addColorStop(0.5, '#1A0E08');
            boxGrad.addColorStop(1, '#100804');
            ctx.fillStyle = boxGrad;
            drawRoundRect(ctx, cabinetX, cabinetY, cabinetW, cabinetH, 10);
            ctx.fill();
            ctx.strokeStyle = '#F5C44B';
            ctx.lineWidth = 1.6;
            ctx.stroke();

            const nowTime = Date.now();
            const itemH = cellH + gap;
            const dummySymbols = [SYMBOLS[0], SYMBOLS[3], SYMBOLS[6], SYMBOLS[9]];
            const isIdleAndWon = !state.gemHunt.isSpinning && state.gemHunt.winningLines && state.gemHunt.winningLines.length > 0;
            const winPulse = isIdleAndWon ? (0.5 + 0.5 * Math.sin((nowTime - (state.gemHunt.winAnimStartTime || 0)) * 0.008)) : 0;

            const drawSymbolItem = (sym, cx, cy, colIdx, rowIdx) => {
                if (!sym) return;
                const isWinningCell = isIdleAndWon && state.gemHunt.winningCells && state.gemHunt.winningCells[`${colIdx}_${rowIdx}`];

                const haloRadius = Math.floor(cellW * 0.44);
                const haloGrad = ctx.createRadialGradient(cx + cellW / 2, cy + cellH / 2 - 4, 2, cx + cellW / 2, cy + cellH / 2 - 4, isWinningCell ? haloRadius * 1.35 : haloRadius);
                if (isWinningCell) {
                    haloGrad.addColorStop(0, `rgba(255, 230, 100, ${0.55 + 0.35 * winPulse})`);
                    haloGrad.addColorStop(0.5, `rgba(255, 180, 40, ${0.30 + 0.20 * winPulse})`);
                    haloGrad.addColorStop(1, 'rgba(255, 215, 0, 0)');
                } else {
                    haloGrad.addColorStop(0, 'rgba(245, 196, 75, 0.25)');
                    haloGrad.addColorStop(0.5, 'rgba(245, 196, 75, 0.08)');
                    haloGrad.addColorStop(1, 'rgba(245, 196, 75, 0)');
                }
                ctx.fillStyle = haloGrad;
                ctx.beginPath();
                ctx.arc(cx + cellW / 2, cy + cellH / 2 - 4, isWinningCell ? haloRadius * 1.35 : haloRadius, 0, Math.PI * 2);
                ctx.fill();

                if (isWinningCell) {
                    ctx.save();
                    ctx.shadowColor = '#FFD700';
                    ctx.shadowBlur = 14 * winPulse;
                    ctx.strokeStyle = `rgba(255, 240, 120, ${0.85 + 0.15 * winPulse})`;
                    ctx.lineWidth = 2.8;
                    drawRoundRect(ctx, cx, cy, cellW, cellH, 6);
                    ctx.stroke();
                    ctx.restore();
                }

                const imgW = Math.floor(cellW * 0.70);
                const imgH = imgW;
                const imgX = cx + (cellW - imgW) / 2;
                const imgY = cy + (cellH - imgH) / 2 - 5;

                if (images[sym.iconKey] && images[sym.iconKey].width) {
                    ctx.drawImage(images[sym.iconKey], imgX, imgY, imgW, imgH);
                } else {
                    ctx.font = `${Math.round(22 * uiScale)}px sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.fillText(sym.fallbackIcon || '✦', cx + cellW / 2, cy + cellH / 2 + 2);
                }

                if (sym.isWild) {
                    ctx.fillStyle = '#D48806';
                    drawRoundRect(ctx, cx + 4, cy + cellH - 14, cellW - 8, 11, 5);
                    ctx.fill();
                    ctx.strokeStyle = '#FFF566';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                    ctx.fillStyle = '#5C2B00';
                    ctx.font = `bold ${Math.max(8, Math.round(8.5 * uiScale))}px sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.fillText('万能', cx + cellW / 2, cy + cellH - 5);
                } else if (sym.isScatter) {
                    ctx.fillStyle = '#D9363E';
                    drawRoundRect(ctx, cx + 4, cy + cellH - 14, cellW - 8, 11, 5);
                    ctx.fill();
                    ctx.strokeStyle = '#FFCCC7';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                    ctx.fillStyle = '#FFFFFF';
                    ctx.font = `bold ${Math.max(8, Math.round(8.5 * uiScale))}px sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.fillText('方丈', cx + cellW / 2, cy + cellH - 5);
                } else {
                    ctx.fillStyle = isWinningCell ? '#FFF566' : '#FFE072';
                    ctx.font = `bold ${Math.max(8, Math.round(8.5 * uiScale))}px sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.fillText(sym.name, cx + cellW / 2, cy + cellH - 3);
                }

                if (isWinningCell && winPulse > 0.3) {
                    ctx.fillStyle = '#FFF566';
                    ctx.font = `${Math.round(11 * uiScale)}px sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.fillText('✦', cx + cellW - 8, cy + 12);
                }
                ctx.textAlign = 'left';
            };

            for (let col = 0; col < 5; col++) {
                const colX = cabinetX + padX + col * (cellW + gap);
                const colY = cabinetY + padY;
                const colH = 3 * cellH + 2 * gap;
                const reel = state.gemHunt.reels[col] || { status: 'idle', scrollPos: 0 };

                for (let row = 0; row < 3; row++) {
                    const cy = colY + row * itemH;
                    const cellGrad = ctx.createLinearGradient(colX, cy, colX, cy + cellH);
                    cellGrad.addColorStop(0, '#3A2518');
                    cellGrad.addColorStop(0.5, '#24160E');
                    cellGrad.addColorStop(1, '#1A0E08');
                    ctx.fillStyle = cellGrad;
                    drawRoundRect(ctx, colX, cy, cellW, cellH, 6);
                    ctx.fill();
                    ctx.strokeStyle = 'rgba(245, 196, 75, 0.2)';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }

                if (reel.status === 'spinning') {
                    reel.scrollPos = (reel.scrollPos + Math.round(20 * uiScale)) % itemH;
                    if (nowTime >= reel.stopTime) {
                        reel.status = 'landing';
                        reel.landingStartTime = nowTime;
                    }
                } else if (reel.status === 'landing') {
                    const progress = Math.min(1, (nowTime - reel.landingStartTime) / (reel.landingDuration || 340));
                    const ease = easeOutBackReel(progress);
                    reel.dropOffset = (1 - ease) * (-itemH * 3.2);

                    if (progress >= 0.55 && !reel.playedLandingSound) {
                        reel.playedLandingSound = true;
                        soundManager.playWoodHit();
                    }

                    if (progress >= 1) {
                        reel.status = 'idle';
                        reel.dropOffset = 0;
                        if (state.gemHunt.targetGrid && state.gemHunt.targetGrid[col]) {
                            state.gemHunt.grid[col] = state.gemHunt.targetGrid[col];
                        }
                    }
                }

                ctx.save();
                ctx.beginPath();
                drawRoundRect(ctx, colX - 1, colY - 1, cellW + 2, colH + 2, 6);
                ctx.clip();

                if (reel.status === 'spinning') {
                    for (let r = -1; r <= 3; r++) {
                        const symIdx = (col * 3 + (r + 4)) % dummySymbols.length;
                        const cy = colY + r * itemH + reel.scrollPos;
                        drawSymbolItem(dummySymbols[symIdx], colX, cy, col, r);
                    }
                } else if (reel.status === 'landing') {
                    const targetColSymbols = (state.gemHunt.targetGrid && state.gemHunt.targetGrid[col]) || state.gemHunt.grid[col];
                    for (let row = 0; row < 3; row++) {
                        const cy = colY + row * itemH + (reel.dropOffset || 0);
                        drawSymbolItem(targetColSymbols[row], colX, cy, col, row);
                    }
                } else {
                    for (let row = 0; row < 3; row++) {
                        const cy = colY + row * itemH;
                        drawSymbolItem(state.gemHunt.grid[col][row], colX, cy, col, row);
                    }
                }
                ctx.restore();
            }

            // 4. 所有 5 列全部就位后触发结算与大奖弹窗
            const allIdle = state.gemHunt.reels && state.gemHunt.reels.length === 5 && state.gemHunt.reels.every(r => r.status === 'idle');
            const isTimeout = state.gemHunt.isSpinning && state.gemHunt.startTime && (nowTime - state.gemHunt.startTime > 1800);

            if (state.gemHunt.isSpinning && (allIdle || isTimeout)) {
                state.gemHunt.isSpinning = false;
                if (state.gemHunt.reels) {
                    state.gemHunt.reels.forEach(r => { r.status = 'idle'; r.dropOffset = 0; });
                }
                if (state.gemHunt.targetGrid) {
                    state.gemHunt.grid = state.gemHunt.targetGrid;
                }
                const winScore = state.gemHunt.pendingWin || 0;
                if (winScore > 0 || state.gemHunt.pendingFreeSpinsWon > 0) {
                    consecutiveLossSpins = 0;
                } else {
                    consecutiveLossSpins++;
                }
                const currentBetVal = BET_TIERS[state.gemHunt.currentBetIdx] || 200;
                state.gemHunt.lastWin = winScore;
                state.totalHit += winScore;
                state.dailyHit = (state.dailyHit || 0) + winScore;
                state.gemHunt.winningLines = state.gemHunt.pendingWinningLines || [];
                state.gemHunt.winningCells = state.gemHunt.pendingWinningCells || {};
                state.gemHunt.winAnimStartTime = nowTime;

                if (state.gemHunt.pendingFreeSpinsWon > 0) {
                    state.gemHunt.freeSpinsRemaining = (state.gemHunt.freeSpinsRemaining || 0) + state.gemHunt.pendingFreeSpinsWon;
                }

                try {
                    if (wx.setStorageSync) {
                        wx.setStorageSync('qmy_total_hit', state.totalHit.toString());
                        wx.setStorageSync('qmy_daily_hit', state.dailyHit.toString());
                    }
                } catch (e) {}

                const winMultiplier = winScore / currentBetVal;
                if (winMultiplier >= 2) {
                    soundManager.playWin();
                    state.gemHunt.bigWinData = {
                        winAmount: winScore,
                        bet: currentBetVal,
                        multiplier: winMultiplier.toFixed(1)
                    };
                    state.currentModal = 'bigwin';
                } else if (winScore > 0) {
                    soundManager.playWin();
                    if (state.gemHunt.pendingFreeSpinsWon > 0) {
                        showToast(`祈福大吉！+${winScore.toLocaleString()} 敲击值，获赠 ${state.gemHunt.pendingFreeSpinsWon} 次免费祈福！`);
                    } else {
                        showToast(`祈福大吉！获得 +${winScore.toLocaleString()} 敲击值！`);
                    }
                } else if (state.gemHunt.pendingFreeSpinsWon > 0) {
                    soundManager.playWin();
                    showToast(`方丈显圣！获赠 ${state.gemHunt.pendingFreeSpinsWon} 次免消耗免费祈福！`);
                } else {
                    showToast(`祈福完成，心神更宁`);
                }
            }

            // 5. 绘制中奖格位整体呼吸放大浮凸与霓虹激光流光连线 (整个连续连线框变大还原呼吸动效)
            if (isIdleAndWon) {
                const zoomPulse = 0.5 + 0.5 * Math.sin((nowTime - (state.gemHunt.winAnimStartTime || 0)) * 0.007);
                const zoomScale = 1.0 + 0.12 * zoomPulse; // 1.0x 到 1.12x 连续平滑放大还原

                // 5.1 绘制所有中奖格位的呼吸放大浮凸框与高光法宝
                Object.keys(state.gemHunt.winningCells || {}).forEach(k => {
                    const [cStr, rStr] = k.split('_');
                    const c = parseInt(cStr, 10);
                    const r = parseInt(rStr, 10);
                    const sym = state.gemHunt.grid[c] && state.gemHunt.grid[c][r];
                    if (!sym) return;

                    const cellCenterX = cabinetX + padX + c * (cellW + gap) + cellW / 2;
                    const cellCenterY = cabinetY + padY + r * itemH + cellH / 2;

                    ctx.save();
                    ctx.translate(cellCenterX, cellCenterY);
                    ctx.scale(zoomScale, zoomScale);

                    // 1. 浮凸底座深色背景
                    const popGrad = ctx.createLinearGradient(0, -cellH / 2, 0, cellH / 2);
                    popGrad.addColorStop(0, '#4A301E');
                    popGrad.addColorStop(0.5, '#2D1A10');
                    popGrad.addColorStop(1, '#1E0E06');
                    ctx.fillStyle = popGrad;
                    drawRoundRect(ctx, -cellW / 2, -cellH / 2, cellW, cellH, 8);
                    ctx.fill();

                    // 2. 佛光大金晕扩散
                    const haloRadius = Math.floor(cellW * 0.55);
                    const haloGrad = ctx.createRadialGradient(0, -4, 2, 0, -4, haloRadius);
                    haloGrad.addColorStop(0, `rgba(255, 235, 120, ${0.60 + 0.35 * zoomPulse})`);
                    haloGrad.addColorStop(0.5, `rgba(255, 185, 45, ${0.35 + 0.25 * zoomPulse})`);
                    haloGrad.addColorStop(1, 'rgba(255, 215, 0, 0)');
                    ctx.fillStyle = haloGrad;
                    ctx.beginPath();
                    ctx.arc(0, -4, haloRadius, 0, Math.PI * 2);
                    ctx.fill();

                    // 3. 3D 鎏金高光外框与发光阴影
                    ctx.shadowColor = '#FFD700';
                    ctx.shadowBlur = 16 * zoomPulse + 6;
                    ctx.strokeStyle = `rgba(255, 245, 140, ${0.90 + 0.10 * zoomPulse})`;
                    ctx.lineWidth = 3.2;
                    drawRoundRect(ctx, -cellW / 2, -cellH / 2, cellW, cellH, 8);
                    ctx.stroke();

                    // 4. 绘制放大的法宝图标
                    const imgW = Math.floor(cellW * 0.72);
                    const imgH = imgW;
                    if (images[sym.iconKey] && images[sym.iconKey].width) {
                        ctx.drawImage(images[sym.iconKey], -imgW / 2, -imgH / 2 - 5, imgW, imgH);
                    } else {
                        ctx.font = `${Math.round(24 * uiScale)}px sans-serif`;
                        ctx.textAlign = 'center';
                        ctx.fillText(sym.fallbackIcon || '✦', 0, 4);
                    }

                    // 5. 法宝标签
                    if (sym.isWild) {
                        ctx.fillStyle = '#D48806';
                        drawRoundRect(ctx, -cellW / 2 + 4, cellH / 2 - 15, cellW - 8, 12, 5);
                        ctx.fill();
                        ctx.strokeStyle = '#FFF566';
                        ctx.lineWidth = 1;
                        ctx.stroke();
                        ctx.fillStyle = '#5C2B00';
                        ctx.font = `bold ${Math.max(8, Math.round(9 * uiScale))}px sans-serif`;
                        ctx.textAlign = 'center';
                        ctx.fillText('万能', 0, cellH / 2 - 5);
                    } else if (sym.isScatter) {
                        ctx.fillStyle = '#D9363E';
                        drawRoundRect(ctx, -cellW / 2 + 4, cellH / 2 - 15, cellW - 8, 12, 5);
                        ctx.fill();
                        ctx.strokeStyle = '#FFCCC7';
                        ctx.lineWidth = 1;
                        ctx.stroke();
                        ctx.fillStyle = '#FFFFFF';
                        ctx.font = `bold ${Math.max(8, Math.round(9 * uiScale))}px sans-serif`;
                        ctx.textAlign = 'center';
                        ctx.fillText('方丈', 0, cellH / 2 - 5);
                    } else {
                        ctx.fillStyle = '#FFF566';
                        ctx.font = `bold ${Math.max(8, Math.round(9 * uiScale))}px sans-serif`;
                        ctx.textAlign = 'center';
                        ctx.fillText(sym.name, 0, cellH / 2 - 4);
                    }

                    // 6. 四角璀璨星芒
                    if (zoomPulse > 0.4) {
                        ctx.fillStyle = '#FFF566';
                        ctx.font = `bold ${Math.round(11 * uiScale)}px sans-serif`;
                        ctx.fillText('✦', cellW / 2 - 10, -cellH / 2 + 13);
                        ctx.fillText('✦', -cellW / 2 + 10, cellH / 2 - 18);
                    }

                    ctx.restore();
                });

                // 5.2 绘制高亮激光霓虹流光连线 (覆盖在中奖格位之上)
                ctx.save();
                state.gemHunt.winningLines.forEach((wLine, lIdx) => {
                    const lineCoords = wLine.line;
                    const lineColors = ['#FFD700', '#FFA940', '#FF85C0', '#597EF7', '#52C41A', '#FF4D4F'];
                    const lineColor = lineColors[lIdx % lineColors.length];

                    // 外层激光光晕
                    ctx.shadowColor = lineColor;
                    ctx.shadowBlur = 18;
                    ctx.strokeStyle = lineColor;
                    ctx.lineWidth = 4.2 * zoomScale;
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';

                    ctx.beginPath();
                    for (let c = 0; c < lineCoords.length; c++) {
                        const r = lineCoords[c];
                        const ptX = cabinetX + padX + c * (cellW + gap) + cellW / 2;
                        const ptY = cabinetY + padY + r * itemH + cellH / 2;
                        if (c === 0) ctx.moveTo(ptX, ptY);
                        else ctx.lineTo(ptX, ptY);
                    }
                    ctx.stroke();

                    // 内层高光流光核心
                    ctx.shadowBlur = 0;
                    ctx.strokeStyle = '#FFFFFF';
                    ctx.lineWidth = 2.0;
                    ctx.stroke();

                    // 节点发光光球
                    for (let c = 0; c < lineCoords.length; c++) {
                        const r = lineCoords[c];
                        const ptX = cabinetX + padX + c * (cellW + gap) + cellW / 2;
                        const ptY = cabinetY + padY + r * itemH + cellH / 2;
                        ctx.fillStyle = '#FFFFFF';
                        ctx.beginPath();
                        ctx.arc(ptX, ptY, 5.5 * zoomScale, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.strokeStyle = lineColor;
                        ctx.lineWidth = 2;
                        ctx.stroke();
                    }
                });
                ctx.restore();
            }

            // 6. 控制台
            const consoleGrad = ctx.createLinearGradient(0, consoleY, 0, consoleY + consoleH);
            consoleGrad.addColorStop(0, '#4A515D');
            consoleGrad.addColorStop(0.3, '#2F3540');
            consoleGrad.addColorStop(1, '#1E222A');
            ctx.fillStyle = consoleGrad;
            ctx.fillRect(0, consoleY, W, consoleH);
            ctx.strokeStyle = '#687180';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, consoleY);
            ctx.lineTo(W, consoleY);
            ctx.stroke();

            const currentBet = BET_TIERS[state.gemHunt.currentBetIdx] || 200;
            const betCtrlX = 12;
            const betCtrlY = consoleY + 8;
            const betCtrlW = 134;
            const betCtrlH = 42;

            ctx.fillStyle = '#1B1E26';
            drawRoundRect(ctx, betCtrlX, betCtrlY, betCtrlW, betCtrlH, 10);
            ctx.fill();
            ctx.strokeStyle = '#474D5A';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.fillStyle = '#E5A93C';
            drawRoundRect(ctx, betCtrlX + 5, betCtrlY + 5, 32, 32, 16);
            ctx.fill();
            ctx.fillStyle = '#1A130B';
            ctx.font = `bold ${Math.round(18 * uiScale)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText('−', betCtrlX + 21, betCtrlY + 27);

            ctx.fillStyle = '#FFE072';
            ctx.font = `bold ${Math.round(15 * uiScale)}px sans-serif`;
            ctx.fillText(currentBet.toLocaleString(), betCtrlX + betCtrlW / 2, betCtrlY + 26);

            ctx.fillStyle = '#E5A93C';
            drawRoundRect(ctx, betCtrlX + betCtrlW - 37, betCtrlY + 5, 32, 32, 16);
            ctx.fill();
            ctx.fillStyle = '#1A130B';
            ctx.font = `bold ${Math.round(18 * uiScale)}px sans-serif`;
            ctx.fillText('+', betCtrlX + betCtrlW - 21, betCtrlY + 27);

            // 25 固定线
            ctx.fillStyle = '#1B1E26';
            drawRoundRect(ctx, betCtrlX + 144, betCtrlY, 44, betCtrlH, 8);
            ctx.fill();
            ctx.strokeStyle = '#474D5A';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.fillStyle = '#FFE072';
            ctx.font = `bold ${Math.round(13 * uiScale)}px sans-serif`;
            ctx.fillText('25', betCtrlX + 166, betCtrlY + 20);
            ctx.fillStyle = '#F5C44B';
            ctx.font = `bold ${Math.round(8.5 * uiScale)}px sans-serif`;
            ctx.fillText('固定线', betCtrlX + 166, betCtrlY + 34);

            const spinBtnW = Math.min(130, W - (betCtrlX + 200));
            const spinBtnH = 42;
            const spinBtnX = W - spinBtnW - 12;

            if (isFreeSpinMode) {
                ctx.fillStyle = state.gemHunt.isSpinning ? '#3B6B30' : '#52C41A';
                drawRoundRect(ctx, spinBtnX, betCtrlY, spinBtnW, spinBtnH, 12);
                ctx.fill();
                ctx.strokeStyle = '#95DE64';
                ctx.lineWidth = 1.5;
                ctx.stroke();
                drawVectorGift(ctx, spinBtnX + Math.round(18 * uiScale), betCtrlY + spinBtnH / 2, Math.round(6.5 * uiScale));
                ctx.fillStyle = '#FFFFFF';
                ctx.font = `bold ${Math.round(12 * uiScale)}px sans-serif`;
                ctx.fillText(state.gemHunt.isSpinning ? '祈福中...' : `免费(${state.gemHunt.freeSpinsRemaining})`, spinBtnX + spinBtnW / 2 + Math.round(8 * uiScale), betCtrlY + 26);
            } else {
                ctx.fillStyle = state.gemHunt.isSpinning ? '#888' : '#FFD700';
                drawRoundRect(ctx, spinBtnX, betCtrlY, spinBtnW, spinBtnH, 12);
                ctx.fill();
                drawVectorFlame(ctx, spinBtnX + Math.round(20 * uiScale), betCtrlY + spinBtnH / 2, Math.round(6.5 * uiScale), '#1A130B');
                ctx.fillStyle = '#1A130B';
                ctx.font = `bold ${Math.round(14 * uiScale)}px sans-serif`;
                ctx.fillText(state.gemHunt.isSpinning ? '祈福中...' : '开始', spinBtnX + spinBtnW / 2 + Math.round(8 * uiScale), betCtrlY + 26);
            }
            ctx.textAlign = 'left';

            drawScreenToast(ctx);
            ctx.restore();
            requestAnimationFrame(render);
            return;
        }

        // ------------------------------------------------------------------
        // 2. 首页敲击木鱼主界面
        // ------------------------------------------------------------------
        const bgGrad = ctx.createRadialGradient(W / 2, H * 0.3, 10, W / 2, H * 0.5, W);
        bgGrad.addColorStop(0, '#241D17');
        bgGrad.addColorStop(1, '#120E0A');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, W, H);

        if (images.bg && images.bg.width) {
            ctx.save();
            ctx.globalAlpha = 0.22;
            ctx.drawImage(images.bg, 0, 0, W, H * 0.35);
            ctx.restore();
        }

        const { current: titleInfo, next: nextTitle } = getCurrentTitle(state.totalHit);
        const btns = getButtonsLayout();
        const layout = getHomeLayout();
        const bgmRect = getBgmBtnRect();
        
        // 左上角 用户名 Badge
        const profileW = Math.min(Math.round(168 * uiScale), bgmRect.x - layout.side - 8);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        drawRoundRect(ctx, layout.side, layout.topY, profileW, layout.profileH, layout.profileH / 2);
        ctx.fill();
        ctx.strokeStyle = '#F5C44B';
        ctx.lineWidth = 1;
        ctx.stroke();

        const lotusRadius = Math.round(layout.profileH * 0.36);
        drawVectorLotus(ctx, layout.side + lotusRadius + 5, layout.topY + layout.profileH / 2, lotusRadius);

        const displayName = titleInfo.name || '初结善缘';
        ctx.fillStyle = '#FFE072';
        ctx.font = `bold ${Math.round(11.5 * uiScale)}px sans-serif`;
        ctx.fillText(displayName, layout.side + lotusRadius * 2 + 8, layout.topY + layout.profileH / 2 + 4);

        const lvW = Math.round(38 * uiScale);
        const lvH = Math.round(18 * uiScale);
        ctx.fillStyle = '#F5C44B';
        drawRoundRect(ctx, layout.side + profileW - lvW - 5, layout.topY + (layout.profileH - lvH) / 2, lvW, lvH, lvH / 2);
        ctx.fill();
        ctx.fillStyle = '#1A130B';
        ctx.font = `bold ${Math.round(10 * uiScale)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(`LV.${titleInfo.id}`, layout.side + profileW - lvW / 2 - 5, layout.topY + (layout.profileH - lvH) / 2 + lvH * 0.72);
        ctx.textAlign = 'left';

        // 右上角 BGM 快捷图标按钮
        drawVectorMusicButton(ctx, bgmRect.x, bgmRect.y, bgmRect.w, bgmRect.h, state.bgmEnabled);

        // 敲击值卡片 (带元宝图标)
        const cardW = (W - layout.side * 2 - Math.round(12 * uiScale)) / 2;
        const cardH = layout.statsH;
        const cardY = layout.statsY;

        ctx.fillStyle = 'rgba(42, 33, 26, 0.85)';
        drawRoundRect(ctx, layout.side, cardY, cardW, cardH, 10);
        ctx.fill();
        ctx.strokeStyle = 'rgba(245, 196, 75, 0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();

        drawVectorIngot(ctx, layout.side + cardW - Math.round(18 * uiScale), cardY + Math.round(20 * uiScale), Math.round(7.5 * uiScale), '#FFE072');
        ctx.fillStyle = '#A8988B';
        ctx.font = `${Math.round(11 * uiScale)}px sans-serif`;
        ctx.fillText('敲击值', layout.side + 12, cardY + Math.round(18 * uiScale));
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold ${Math.round(18 * uiScale)}px sans-serif`;
        ctx.fillText(state.totalHit.toLocaleString(), layout.side + 12, cardY + Math.round(41 * uiScale));

        // 当前称号卡片 (带皇冠图标)
        ctx.fillStyle = 'rgba(42, 33, 26, 0.85)';
        drawRoundRect(ctx, layout.side + cardW + Math.round(12 * uiScale), cardY, cardW, cardH, 10);
        ctx.fill();
        ctx.strokeStyle = 'rgba(245, 196, 75, 0.2)';
        ctx.stroke();

        drawVectorCrown(ctx, layout.side + cardW + Math.round(12 * uiScale) + cardW - Math.round(18 * uiScale), cardY + Math.round(20 * uiScale), Math.round(7.5 * uiScale), '#F5C44B');
        ctx.fillStyle = '#A8988B';
        ctx.font = `${Math.round(11 * uiScale)}px sans-serif`;
        ctx.fillText('当前称号', layout.side + cardW + Math.round(12 * uiScale) + 12, cardY + Math.round(18 * uiScale));
        ctx.fillStyle = '#F5C44B';
        ctx.font = `bold ${Math.round(15 * uiScale)}px sans-serif`;
        ctx.fillText(titleInfo.name, layout.side + cardW + Math.round(12 * uiScale) + 12, cardY + Math.round(41 * uiScale));

        // 三大互动快捷入口：每日一签 | 切换法殿 | 修行日历
        const actY = layout.actionRowY;
        const actH = layout.actionRowH;
        const actW = layout.actBtnW;
        const actGap = layout.actBtnGap;
        const btn1X = layout.side;
        const btn2X = btn1X + actW + actGap;
        const btn3X = btn2X + actW + actGap;
        const activeTemple = getCurrentTemple();

        // 按钮 1: 每日一签 (若今日已签到，显示「已签到」与绿色标识；未签到显示「每日一签」与红点)
        const isFortuneDone = !!(state.hasShakenFortuneToday || state.todayFortuneSlip);
        ctx.fillStyle = 'rgba(42, 33, 26, 0.92)';
        drawRoundRect(ctx, btn1X, actY, actW, actH, 8);
        ctx.fill();
        ctx.strokeStyle = isFortuneDone ? 'rgba(82, 196, 26, 0.45)' : '#F5C44B';
        ctx.lineWidth = isFortuneDone ? 1 : 1.4;
        ctx.stroke();

        drawVectorFortuneStick(ctx, btn1X + Math.round(14 * uiScale), actY + actH / 2, Math.round(6.5 * uiScale));
        ctx.font = `bold ${Math.round(10.5 * uiScale)}px sans-serif`;
        ctx.fillStyle = isFortuneDone ? '#95DE64' : '#FFE072';
        ctx.textAlign = 'center';
        ctx.fillText(isFortuneDone ? '已签到' : '每日一签', btn1X + actW / 2 + Math.round(6 * uiScale), actY + actH / 2 + Math.round(4 * uiScale));

        // 今日状态标记：未签到红点，已签到翡翠绿点
        if (!isFortuneDone) {
            ctx.fillStyle = '#FF4D4F';
            ctx.beginPath();
            ctx.arc(btn1X + actW - 7, actY + 7, 3.5 * uiScale, 0, Math.PI * 2);
            ctx.fill();
        } else {
            drawVectorDot(ctx, btn1X + actW - 7, actY + 7, 3 * uiScale, '#52C41A');
        }

        // 按钮 2: 切换法殿 (显示专属矢量法殿图标、名称与专属色调)
        ctx.fillStyle = 'rgba(42, 33, 26, 0.92)';
        drawRoundRect(ctx, btn2X, actY, actW, actH, 8);
        ctx.fill();
        ctx.strokeStyle = activeTemple.accentColor || 'rgba(245, 196, 75, 0.35)';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        const templeIconX = btn2X + Math.round(14 * uiScale);
        const templeIconY = actY + actH / 2;
        const templeIconS = Math.round(6.5 * uiScale);
        if (activeTemple.id === 'wenchang') {
            drawVectorBrush(ctx, templeIconX, templeIconY, templeIconS, activeTemple.accentColor);
        } else if (activeTemple.id === 'wealth') {
            drawVectorIngot(ctx, templeIconX, templeIconY, templeIconS, activeTemple.accentColor);
        } else if (activeTemple.id === 'jieyou') {
            drawVectorLeaf(ctx, templeIconX, templeIconY, templeIconS, activeTemple.accentColor);
        } else {
            drawVectorDove(ctx, templeIconX, templeIconY, templeIconS, activeTemple.accentColor);
        }

        ctx.font = `bold ${Math.round(10.5 * uiScale)}px sans-serif`;
        ctx.fillStyle = activeTemple.accentColor || '#FFE072';
        ctx.textAlign = 'center';
        ctx.fillText(`${activeTemple.name} ▾`, btn2X + actW / 2 + Math.round(6 * uiScale), actY + actH / 2 + Math.round(4 * uiScale));

        // 按钮 3: 修行日历 (带矢量日历图标)
        ctx.fillStyle = 'rgba(42, 33, 26, 0.92)';
        drawRoundRect(ctx, btn3X, actY, actW, actH, 8);
        ctx.fill();
        ctx.strokeStyle = 'rgba(245, 196, 75, 0.35)';
        ctx.lineWidth = 1;
        ctx.stroke();

        drawVectorCalendar(ctx, btn3X + Math.round(14 * uiScale), actY + actH / 2, Math.round(6.5 * uiScale));
        ctx.font = `bold ${Math.round(10.5 * uiScale)}px sans-serif`;
        ctx.fillStyle = '#FFE072';
        ctx.textAlign = 'center';
        ctx.fillText('修行日历', btn3X + actW / 2 + Math.round(6 * uiScale), actY + actH / 2 + Math.round(4 * uiScale));
        ctx.textAlign = 'left';

        // 暴击增益倒计时横幅卡片
        const bannerY = layout.bannerY;
        ctx.fillStyle = state.critRate > 1 ? 'rgba(42, 33, 26, 0.92)' : 'rgba(42, 33, 26, 0.72)';
        drawRoundRect(ctx, layout.side, bannerY, W - layout.side * 2, layout.bannerH, 12);
        ctx.fill();
        ctx.strokeStyle = state.critRate > 1 ? '#F5C44B' : 'rgba(245, 196, 75, 0.18)';
        ctx.lineWidth = 1;
        ctx.stroke();

        drawVectorBolt(ctx, layout.side + Math.round(18 * uiScale), bannerY + Math.round(25 * uiScale), Math.round(8.5 * uiScale), state.critRate > 1 ? '#FFE072' : '#8C7663');

        ctx.font = `bold ${Math.round(13 * uiScale)}px sans-serif`;
        ctx.fillStyle = state.critRate > 1 ? '#FFE072' : '#B8A99B';
        ctx.fillText(state.critRate > 1 ? `倍率 ×${state.critRate}` : '无倍率', layout.side + Math.round(36 * uiScale), bannerY + Math.round(20 * uiScale));
        ctx.fillStyle = state.critRate > 1 ? '#F5C44B' : '#9E8E81';
        ctx.font = `${Math.round(10 * uiScale)}px sans-serif`;
        ctx.fillText(state.critRate > 1 ? `剩余 ${formatTime(state.critRemainingSec)} · 每次敲击 +${state.critRate}` : '敲击获取基础 1x 敲击值', layout.side + Math.round(36 * uiScale), bannerY + Math.round(36 * uiScale));

        // 中心 3D 萌眼金边木鱼与木锤
        const woodfish = getWoodfishLayout();
        const wfScale = layout.woodfishScale * state.woodfishScale;
        draw3DVectorWoodfish(ctx, woodfish.cx, woodfish.cy, wfScale, state.isBlinking);
        drawWoodMallet(ctx, woodfish.cx, woodfish.cy, state.malletAngle, state.malletOffsetX, state.malletOffsetY);

        ctx.fillStyle = '#A08C78';
        ctx.font = `${Math.round(12 * uiScale)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('敲击木鱼  ·  心神澄明', W / 2, layout.hintY);
        ctx.textAlign = 'left';

        // 底部 2 个广告按钮
        [btns.critAd, btns.autoAd].forEach((b) => {
            const isCrit = b === btns.critAd;
            const left = isCrit ? (5 - state.dailyCritCount) : (5 - state.dailyAutoCount);
            
            ctx.fillStyle = 'rgba(42, 33, 26, 0.92)';
            drawRoundRect(ctx, b.x, b.y, b.w, b.h, 12);
            ctx.fill();
            ctx.strokeStyle = isCrit && state.critRate > 1 ? '#52C41A' : '#F5C44B';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.fillStyle = '#FFE072';
            if (isCrit) {
                drawVectorBolt(ctx, b.x + 16, b.y + Math.round(26 * uiScale), Math.round(9 * uiScale), state.critRate > 1 ? '#52C41A' : '#FFE072');
            } else {
                drawVectorBell(ctx, b.x + 16, b.y + Math.round(26 * uiScale), Math.round(9 * uiScale), state.isAutoHitting ? '#52C41A' : '#FFE072');
            }

            ctx.font = `bold ${Math.round(12 * uiScale)}px sans-serif`;
            ctx.fillStyle = isCrit && state.critRate > 1 ? '#52C41A' : '#FFE072';
            ctx.fillText(isCrit ? '暴击增益' : '自动敲击', b.x + Math.round(30 * uiScale), b.y + Math.round(20 * uiScale));

            ctx.font = `${Math.round(9.5 * uiScale)}px sans-serif`;
            ctx.fillStyle = (isCrit ? state.critRate > 1 : state.isAutoHitting) ? '#52C41A' : '#B8A99B';
            let labelDesc = '';
            if (isCrit) {
                labelDesc = state.critRate > 1 ? `×${state.critRate}倍 (${formatTime(state.critRemainingSec)})` : '(5/8/10倍 · 半小时)';
            } else {
                labelDesc = state.isAutoHitting ? `挂机中 (${formatTime(state.autoRemainingSec)})` : '(持续 1 小时)';
            }
            ctx.fillText(labelDesc, b.x + Math.round(30 * uiScale), b.y + Math.round(36 * uiScale));

            ctx.font = `${Math.round(10 * uiScale)}px sans-serif`;
            ctx.fillStyle = '#8C827A';
            ctx.textAlign = 'right';
            ctx.fillText(`${Math.max(0, left)}次`, b.x + b.w - 8, b.y + Math.round(30 * uiScale));
            ctx.textAlign = 'left';
        });

        // 底部 4 个导航按钮 (全部采用矢量几何图标渲染，100% 消除真机 Emoji 缺字/白块/不显示问题)
        ctx.fillStyle = 'rgba(26, 20, 16, 0.92)';
        drawRoundRect(ctx, btns.navBar.x, btns.navBar.y, btns.navBar.w, btns.navBar.h, 14);
        ctx.fill();
        ctx.strokeStyle = 'rgba(245, 196, 75, 0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();

        [btns.minigames, btns.rank, btns.titles, btns.settings].forEach((b) => {
            ctx.textAlign = 'center';
            const iconY = b.y + Math.round(18 * uiScale);
            const iconS = Math.round(8.5 * uiScale);
            if (b === btns.minigames) {
                drawVectorGamepad(ctx, b.x + b.w / 2, iconY, iconS);
            } else if (b === btns.rank) {
                drawVectorTrophy(ctx, b.x + b.w / 2, iconY, iconS);
            } else if (b === btns.titles) {
                drawVectorScroll(ctx, b.x + b.w / 2, iconY, iconS);
            } else if (b === btns.settings) {
                drawVectorGear(ctx, b.x + b.w / 2, iconY, iconS);
            }
            ctx.font = `${Math.round(11 * uiScale)}px sans-serif`;
            ctx.fillStyle = '#B8A99B';
            ctx.fillText(b.label, b.x + b.w / 2, b.y + Math.round(41 * uiScale));
            ctx.textAlign = 'left';
        });

                // 渲染敲击金色涟漪波纹
        if (state.hitRipples && state.hitRipples.length > 0) {
            for (let i = state.hitRipples.length - 1; i >= 0; i--) {
                const rp = state.hitRipples[i];
                ctx.save();
                ctx.strokeStyle = rp.color || '#FFE072';
                ctx.globalAlpha = Math.max(0, rp.alpha);
                ctx.lineWidth = 2.5 * uiScale;
                ctx.shadowColor = rp.color || '#FFE072';
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.arc(rp.x, rp.y, rp.radius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();

                rp.radius += 2.2 * uiScale;
                rp.alpha -= 0.08;
                if (rp.alpha <= 0 || rp.radius >= rp.maxRadius) {
                    state.hitRipples.splice(i, 1);
                }
            }
        }

        // 飘字动画
        for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
            const ft = state.floatingTexts[i];
            ctx.save();
            ctx.globalAlpha = Math.max(0, ft.alpha);
            ctx.fillStyle = '#FFE072';
            ctx.font = `bold ${Math.round(18 * ft.scale * uiScale)}px sans-serif`;
            ctx.fillText(ft.text, ft.x, ft.y);
            ctx.restore();

            ft.y -= 1.8;
            ft.alpha -= 0.025;
            if (ft.alpha <= 0) state.floatingTexts.splice(i, 1);
        }

        // ------------------------------------------------------------------
        // 10. 弹窗渲染体系 (全金色调 + 3 级大奖庆典弹窗)
        // ------------------------------------------------------------------
        if (state.currentModal) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            ctx.fillRect(0, 0, W, H);
                const cardW = W * 0.86;
                const cardH = (state.currentModal === 'ad_insufficient' || state.currentModal === 'ad_crit' || state.currentModal === 'ad_auto' || state.currentModal === 'ad_tier_unlock')
                    ? Math.min(H * 0.44, 275)
                    : ((state.currentModal === 'betpicker') ? Math.min(H * 0.58, 360) : ((state.currentModal === 'quick_ambient') ? Math.min(H * 0.64, 395) : ((state.currentModal === 'calendar' || state.currentModal === 'fortune_slip' || state.currentModal === 'fortune_gallery') ? Math.min(H * 0.74, 480) : Math.min(H * 0.65, 420))));
                const cardX = (W - cardW) / 2;
                const cardY = (H - cardH) / 2;

                if (state.currentModal !== 'bigwin') {
                    ctx.fillStyle = '#23160D';
                    drawRoundRect(ctx, cardX, cardY, cardW, cardH, 16);
                    ctx.fill();
                    ctx.strokeStyle = '#F5C44B';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }

                if (state.currentModal === 'rules') {
                ctx.fillStyle = '#FFE072';
                ctx.font = `bold ${Math.round(15 * uiScale)}px sans-serif`;
                ctx.textAlign = 'center';
                drawVectorScroll(ctx, W / 2 - Math.round(82 * uiScale), cardY + 22, Math.round(6.5 * uiScale));
                ctx.fillText('功德寻宝 · 规则说明', W / 2 + Math.round(7 * uiScale), cardY + 26);

                ctx.fillStyle = '#F5C44B';
                ctx.font = `bold ${Math.round(18 * uiScale)}px sans-serif`;
                ctx.fillText('×', cardX + cardW - 22, cardY + 26);

                const tw = (cardW - 24) / 4;
                const rTabs = [
                    { key: 'icons', label: '图标' },
                    { key: 'lines', label: '规则' },
                    { key: 'tiers', label: '战力' },
                    { key: 'help',  label: '说明' }
                ];

                rTabs.forEach((t, i) => {
                    const rx = cardX + 12 + i * tw;
                    const isCur = state.rulesTab === t.key;
                    ctx.fillStyle = isCur ? '#5B4028' : 'rgba(0,0,0,0.3)';
                    drawRoundRect(ctx, rx, cardY + 38, tw - 4, 26, 6);
                    ctx.fill();
                    ctx.strokeStyle = isCur ? '#F5C44B' : 'rgba(255,255,255,0.1)';
                    ctx.lineWidth = 1;
                    ctx.stroke();

                    const tabIconX = rx + Math.round(14 * uiScale);
                    const tabIconY = cardY + 51;
                    const iconColor = isCur ? '#FFE072' : '#D48806';
                    if (t.key === 'icons') drawVectorPhotoFrame(ctx, tabIconX, tabIconY, 4.5);
                    else if (t.key === 'lines') drawVectorScroll(ctx, tabIconX, tabIconY, 4.5);
                    else if (t.key === 'tiers') drawVectorBolt(ctx, tabIconX, tabIconY, 4.5, iconColor);
                    else drawVectorInfo(ctx, tabIconX, tabIconY, 4.5, iconColor);

                    ctx.fillStyle = isCur ? '#FFE072' : '#D48806';
                    ctx.font = `bold ${Math.round(9.5 * uiScale)}px sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.fillText(t.label, rx + (tw - 4) / 2 + Math.round(6 * uiScale), cardY + 55);
                });

                if (state.rulesTab === 'icons') {
                    const colW = Math.floor((cardW - 32) / 2);
                    const rowH = 46;
                    const rowGap = 6;
                    const colGap = 8;
                    const startY = cardY + 72;

                    SYMBOLS.forEach((sym, idx) => {
                        const col = idx % 2;
                        const row = Math.floor(idx / 2);
                        const sx = cardX + 12 + col * (colW + colGap);
                        const sy = startY + row * (rowH + rowGap);

                        ctx.fillStyle = 'rgba(42, 33, 26, 0.8)';
                        drawRoundRect(ctx, sx, sy, colW, rowH, 6);
                        ctx.fill();
                        ctx.strokeStyle = sym.isWild ? 'rgba(245, 196, 75, 0.4)' : (sym.isScatter ? 'rgba(255, 120, 117, 0.4)' : 'rgba(245, 196, 75, 0.15)');
                        ctx.lineWidth = 1;
                        ctx.stroke();

                        if (images[sym.iconKey] && images[sym.iconKey].width) {
                            ctx.drawImage(images[sym.iconKey], sx + 3, sy + (rowH - 28) / 2, 28, 28);
                        } else {
                            ctx.font = `${Math.round(16 * uiScale)}px sans-serif`;
                            ctx.textAlign = 'center';
                            ctx.fillText(sym.fallbackIcon || '✦', sx + 17, sy + rowH / 2 + 5);
                        }

                        ctx.textAlign = 'left';
                        ctx.fillStyle = sym.isWild ? '#FFD700' : (sym.isScatter ? '#FF7875' : '#FFE072');
                        ctx.font = `bold ${Math.round(10.5 * uiScale)}px sans-serif`;
                        ctx.fillText(sym.name, sx + 35, sy + 18);

                        ctx.fillStyle = '#F5C44B';
                        ctx.font = `${Math.round(8.5 * uiScale)}px sans-serif`;
                        const rateStr = sym.isWild ? '万能 · 3/12/50倍' : (sym.isScatter ? '免费祈福 · 5/10/15次' : `3/4/5连: ${sym.rates.map(r => (r/25).toFixed(1) + 'x').join('/')}`);
                        ctx.fillText(rateStr, sx + 35, sy + 34);
                    });
                } else if (state.rulesTab === 'lines') {
                    // 25 条固定连线 5x3 矩阵微缩图阵列 (2列 x 5行 分页展示)
                    const curPage = state.rulesPage || 0;
                    const startIndex = curPage * 10;
                    const colW = Math.floor((cardW - 32 - 10) / 2);
                    const rowH = Math.floor((cardH - 120) / 5);
                    const startY = cardY + 70;

                    for (let i = 0; i < 10; i++) {
                        const lineIdx = startIndex + i;
                        if (lineIdx >= PAYLINES.length) break;

                        const lineNum = lineIdx + 1;
                        const col = i % 2;
                        const row = Math.floor(i / 2);
                        const bx = cardX + 16 + col * (colW + 10);
                        const by = startY + row * (rowH + 4);

                        // 卡片底板
                        ctx.fillStyle = 'rgba(38, 26, 17, 0.9)';
                        drawRoundRect(ctx, bx, by, colW, rowH, 6);
                        ctx.fill();
                        ctx.strokeStyle = 'rgba(245, 196, 75, 0.28)';
                        ctx.lineWidth = 1;
                        ctx.stroke();

                        // 线路编号 (金色加粗)
                        ctx.fillStyle = '#FFE072';
                        ctx.font = `bold ${Math.round(13 * uiScale)}px sans-serif`;
                        ctx.textAlign = 'center';
                        ctx.fillText(lineNum < 10 ? `0${lineNum}` : `${lineNum}`, bx + 16 * uiScale, by + rowH / 2 + 5 * uiScale);

                        // 5x3 迷你点阵图
                        const cellW = Math.round(14 * uiScale);
                        const cellH = Math.round(9.5 * uiScale);
                        const cellGap = Math.round(2 * uiScale);
                        const matrixW = 5 * cellW + 4 * cellGap;
                        const matrixH = 3 * cellH + 2 * cellGap;
                        const matrixStartX = bx + colW - matrixW - Math.round(8 * uiScale);
                        const matrixStartY = by + (rowH - matrixH) / 2;

                        const path = PAYLINES[lineIdx];
                        for (let c = 0; c < 5; c++) {
                            for (let r = 0; r < 3; r++) {
                                const cx = matrixStartX + c * (cellW + cellGap);
                                const cy = matrixStartY + r * (cellH + cellGap);
                                const isActive = (path[c] === r);

                                if (isActive) {
                                    // 激活连线路径方块 (亮金高亮)
                                    ctx.fillStyle = '#D48806';
                                    drawRoundRect(ctx, cx, cy, cellW, cellH, 2);
                                    ctx.fill();
                                    ctx.strokeStyle = '#FFE072';
                                    ctx.lineWidth = 1;
                                    ctx.stroke();
                                } else {
                                    // 灰色静音底板方块
                                    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
                                    drawRoundRect(ctx, cx, cy, cellW, cellH, 2);
                                    ctx.fill();
                                    ctx.strokeStyle = 'rgba(245, 196, 75, 0.1)';
                                    ctx.lineWidth = 0.8;
                                    ctx.stroke();
                                }
                            }
                        }
                    }

                    // 底部 3 颗分页圆点与翻页提示
                    const dotsY = cardY + cardH - 18;
                    for (let p = 0; p < 3; p++) {
                        const dotX = W / 2 + (p - 1) * 22;
                        const isCur = (p === curPage);
                        ctx.beginPath();
                        ctx.arc(dotX, dotsY, isCur ? 5 : 3.5, 0, Math.PI * 2);
                        ctx.fillStyle = isCur ? '#FFE072' : 'rgba(245, 196, 75, 0.3)';
                        ctx.fill();
                        if (isCur) {
                            ctx.strokeStyle = '#D48806';
                            ctx.lineWidth = 1.5;
                            ctx.stroke();
                        }
                    }

                    // 翻页箭头
                    ctx.font = `bold ${Math.round(10.5 * uiScale)}px sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.fillStyle = curPage > 0 ? '#FFE072' : 'rgba(245, 196, 75, 0.25)';
                    ctx.fillText('◀ 上一页', W / 2 - 62, dotsY + 4);

                    ctx.fillStyle = curPage < 2 ? '#FFE072' : 'rgba(245, 196, 75, 0.25)';
                    ctx.fillText('下一页 ▶', W / 2 + 62, dotsY + 4);
                } else if (state.rulesTab === 'tiers') {
                    ctx.textAlign = 'center';
                    ctx.font = `bold ${Math.round(9.5 * uiScale)}px sans-serif`;
                    ctx.fillStyle = '#F5C44B';
                    ctx.fillText('战力越高单次消耗越多敲击值，连线大奖成倍暴增：', W / 2, cardY + 80);

                    const tierCards = [
                        { tag: '免费基础档', range: '200 / 500 / 1,000 战力', desc: '新手居士修行入门，平稳积累功德敲击值，稳健成长。', border: '#52C41A' },
                        { tag: '进阶高阶档', range: '2,000 / 5,000 / 10,000 战力', desc: '连线大奖倍率飙升，适合极速冲刺静心称号与排行榜！', border: '#F5C44B' },
                        { tag: '殿堂极品档', range: '20,000 / 50,000 / 100,000 战力', desc: '方丈密传最高战力，一击收获千万级海量敲击值！', border: '#FF4D4F' }
                    ];

                    tierCards.forEach((item, idx) => {
                        const cy = cardY + 98 + idx * 74;
                        ctx.fillStyle = 'rgba(42, 33, 26, 0.8)';
                        drawRoundRect(ctx, cardX + 16, cy, cardW - 32, 66, 8);
                        ctx.fill();
                        ctx.strokeStyle = item.border;
                        ctx.lineWidth = 1;
                        ctx.stroke();

                        if (idx === 0) {
                            drawVectorDove(ctx, cardX + 28, cy + 16, Math.round(6.5 * uiScale), '#52C41A');
                        } else if (idx === 1) {
                            drawVectorFlame(ctx, cardX + 28, cy + 16, Math.round(6.5 * uiScale), '#F5C44B');
                        } else {
                            drawVectorCrown(ctx, cardX + 28, cy + 16, Math.round(6.5 * uiScale), '#FF4D4F');
                        }

                        ctx.textAlign = 'left';
                        ctx.fillStyle = '#FFE072';
                        ctx.font = `bold ${Math.round(11 * uiScale)}px sans-serif`;
                        ctx.fillText(item.tag, cardX + 40, cy + 20);

                        ctx.fillStyle = '#FFE072';
                        ctx.font = `bold ${Math.round(9.5 * uiScale)}px sans-serif`;
                        ctx.fillText(item.range, cardX + 115, cy + 20);

                        ctx.fillStyle = '#F5C44B';
                        ctx.font = `${Math.round(9 * uiScale)}px sans-serif`;
                        ctx.fillText(item.desc, cardX + 24, cy + 44);
                    });
                } else {
                    ctx.textAlign = 'center';
                    ctx.font = `bold ${Math.round(9.5 * uiScale)}px sans-serif`;
                    ctx.fillStyle = '#F5C44B';
                    ctx.fillText('《功德寻宝》玩法修行指引：', W / 2, cardY + 80);

                    const helps = [
                        '1. 每次祈福消耗选定战力档位的对应【敲击值】。',
                        '2. 从左至右匹配 3/4/5 个相同法宝，即获对应倍数丰厚敲击值！',
                        '3. 盘面出 3/4/5 个【方丈】图标，立即获赠 5/10/15 次免消耗祈福！',
                        '4. 寻宝获取的所有敲击值实时计入总修行值，助您登顶排行榜！'
                    ];

                    helps.forEach((txt, idx) => {
                        const cy = cardY + 98 + idx * 56;
                        ctx.fillStyle = 'rgba(42, 33, 26, 0.8)';
                        drawRoundRect(ctx, cardX + 16, cy, cardW - 32, 48, 8);
                        ctx.fill();
                        ctx.strokeStyle = 'rgba(245, 196, 75, 0.15)';
                        ctx.lineWidth = 1;
                        ctx.stroke();

                        ctx.textAlign = 'left';
                        ctx.fillStyle = '#FFE072';
                        ctx.font = `${Math.round(9.5 * uiScale)}px sans-serif`;
                        ctx.fillText(txt, cardX + 22, cy + 28);
                    });
                }
            } else if (state.currentModal === 'minigames') {
                ctx.font = `bold ${Math.round(15 * uiScale)}px sans-serif`;
                ctx.fillStyle = '#FFE072';
                ctx.textAlign = 'center';
                drawVectorGamepad(ctx, W / 2 - Math.round(74 * uiScale), cardY + 24, Math.round(7 * uiScale));
                ctx.fillText('游艺坊 · 休闲阁', W / 2 + Math.round(8 * uiScale), cardY + 28);

                ctx.fillStyle = '#F5C44B';
                ctx.font = `bold ${Math.round(18 * uiScale)}px sans-serif`;
                ctx.fillText('×', cardX + cardW - 22, cardY + 28);

                ctx.fillStyle = 'rgba(60, 46, 32, 0.9)';
                drawRoundRect(ctx, cardX + 16, cardY + 54, cardW - 32, 96, 12);
                ctx.fill();
                ctx.strokeStyle = '#F5C44B';
                ctx.lineWidth = 1.5;
                ctx.stroke();

                drawVectorIngot(ctx, cardX + Math.round(44 * uiScale), cardY + 102, Math.round(12 * uiScale));
                drawVectorCrown(ctx, cardX + cardW - Math.round(44 * uiScale), cardY + 102, Math.round(12 * uiScale));

                ctx.fillStyle = '#FFE072';
                ctx.font = `bold ${Math.round(15 * uiScale)}px sans-serif`;
                ctx.fillText('《功德寻宝》', W / 2, cardY + 84);

                ctx.font = `bold ${Math.round(11.5 * uiScale)}px sans-serif`;
                ctx.fillStyle = '#F5C44B';
                ctx.fillText('5×3 滚轴连线 · 功德万能图标', W / 2, cardY + 108);

                ctx.fillStyle = '#FFD700';
                ctx.font = `bold ${Math.round(12.5 * uiScale)}px sans-serif`;
                ctx.fillText('点击开启游戏 ›', W / 2, cardY + 132);

            } else if (state.currentModal === 'rank') {
                ctx.font = `bold ${Math.round(15 * uiScale)}px sans-serif`;
                ctx.fillStyle = '#FFE072';
                ctx.textAlign = 'center';
                drawVectorTrophy(ctx, W / 2 - Math.round(86 * uiScale), cardY + 24, Math.round(7 * uiScale));
                ctx.fillText('功德排行榜 · 虔心争先', W / 2 + Math.round(8 * uiScale), cardY + 28);

                ctx.fillStyle = '#F5C44B';
                ctx.font = `bold ${Math.round(18 * uiScale)}px sans-serif`;
                ctx.fillText('×', cardX + cardW - 22, cardY + 28);

                // Tab 切换：微信好友榜 / 功德修行榜
                const rankTabW = (cardW - 32) / 2;
                const rankTabs = [
                    { key: 'friends', label: '微信好友榜' },
                    { key: 'world',   label: '功德修行榜' }
                ];
                rankTabs.forEach((t, i) => {
                    const tabX = cardX + 16 + i * rankTabW;
                    const isCur = state.rankTab === t.key;
                    ctx.fillStyle = isCur ? '#5B4028' : 'rgba(0,0,0,0.3)';
                    drawRoundRect(ctx, tabX, cardY + 42, rankTabW - 6, 28, 6);
                    ctx.fill();
                    ctx.strokeStyle = isCur ? '#F5C44B' : 'rgba(255,255,255,0.1)';
                    ctx.lineWidth = 1;
                    ctx.stroke();

                    const tabIconX = tabX + 20;
                    const tabIconY = cardY + 56;
                    if (t.key === 'friends') {
                        drawVectorUsers(ctx, tabIconX, tabIconY, Math.round(6.5 * uiScale), isCur ? '#FFE072' : '#D48806');
                    } else {
                        drawVectorTrophy(ctx, tabIconX, tabIconY, Math.round(6.5 * uiScale));
                    }

                    ctx.fillStyle = isCur ? '#FFE072' : '#D48806';
                    ctx.font = `bold ${Math.round(11 * uiScale)}px sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.fillText(t.label, tabX + (rankTabW - 6) / 2 + 8, cardY + 60);
                });

                if (state.rankTab === 'friends') {
                    // ----------------------------------------------------
                    // 1. 微信开放数据域（真实微信好友/群排行榜 SharedCanvas 贴图渲染）
                    // ----------------------------------------------------
                    const odc = getOpenDataContext();
                    const sharedAreaX = cardX + 10;
                    const sharedAreaY = cardY + 76;
                    const sharedAreaW = cardW - 20;
                    const sharedAreaH = cardH - 124;

                    if (odc && odc.canvas) {
                        try {
                            ctx.drawImage(odc.canvas, sharedAreaX, sharedAreaY, sharedAreaW, sharedAreaH);
                        } catch(e) {}
                    } else {
                        ctx.fillStyle = 'rgba(26, 18, 10, 0.98)';
                        drawRoundRect(ctx, sharedAreaX, sharedAreaY, sharedAreaW, sharedAreaH, 8);
                        ctx.fill();
                        ctx.fillStyle = '#FFE072';
                        ctx.font = `bold ${Math.round(13 * uiScale)}px sans-serif`;
                        ctx.textAlign = 'center';
                        ctx.fillText('正在同步微信好友修行榜...', W / 2, cardY + cardH / 2);
                    }

                    // 底部「邀请好友 / 微信群排行榜」操作栏
                    const inviteBtnX = cardX + 16;
                    const inviteBtnY = cardY + cardH - Math.round(38 * uiScale);
                    const inviteBtnW = cardW - 32;
                    const inviteBtnH = Math.round(28 * uiScale);
                    const btnGrad = ctx.createLinearGradient(inviteBtnX, inviteBtnY, inviteBtnX, inviteBtnY + inviteBtnH);
                    btnGrad.addColorStop(0, '#D4AF37');
                    btnGrad.addColorStop(1, '#8C6828');
                    ctx.fillStyle = btnGrad;
                    drawRoundRect(ctx, inviteBtnX, inviteBtnY, inviteBtnW, inviteBtnH, 14);
                    ctx.fill();
                    ctx.strokeStyle = '#FFE072';
                    ctx.lineWidth = 1;
                    ctx.stroke();

                    ctx.fillStyle = '#FFF8E7';
                    ctx.font = `bold ${Math.round(11 * uiScale)}px sans-serif`;
                    ctx.textAlign = 'center';
                    drawVectorEnvelope(ctx, inviteBtnX + Math.round(20 * uiScale), inviteBtnY + inviteBtnH / 2, Math.round(6.5 * uiScale)); ctx.fillText('邀请好友 · 转发至微信群查看群排行', inviteBtnX + inviteBtnW / 2 + Math.round(7 * uiScale), inviteBtnY + Math.round(18 * uiScale));

                } else {
                    // ----------------------------------------------------
                    // 2. 功德修行总榜（大德同修与法号境界）
                    // ----------------------------------------------------
                    const { current: myCurTitle } = getCurrentTitle(state.totalHit);
                    const myName = myCurTitle ? myCurTitle.name : '初结善缘';

                    const baseList = [
                        { name: '弘法宗师', loc: '总榜大德', score: 9999999 },
                        { name: '妙觉行者', loc: '总榜大德', score: 8866432 },
                        { name: '慈航渡世', loc: '总榜大德', score: 7654321 },
                        { name: '静心禅境', loc: '总榜大德', score: 6543210 },
                        { name: '普度众生', loc: '总榜大德', score: 5432109 },
                        { name: '妙悟行者', loc: '精进行者', score: 3280000 },
                        { name: '虚空禅客', loc: '精进行者', score: 1860000 }
                    ];
                    const myScore = state.totalHit || 0;
                    const myEntry = { name: myName, loc: '我的功德', score: myScore, isMe: true };
                    const displayList = [...baseList, myEntry].sort((a, b) => b.score - a.score);

                    // 绘制榜单条目列表
                    displayList.forEach((item, idx) => {
                        if (idx >= 7) return;
                        const ry = cardY + 78 + idx * 37;
                        ctx.fillStyle = item.isMe ? 'rgba(91, 64, 40, 0.88)' : 'rgba(42, 33, 26, 0.7)';
                        drawRoundRect(ctx, cardX + 12, ry, cardW - 24, 32, 7);
                        ctx.fill();
                        if (item.isMe) {
                            ctx.strokeStyle = '#F5C44B';
                            ctx.lineWidth = 1.2;
                            ctx.stroke();
                        }

                        drawRankMedal(ctx, cardX + 28, ry + 16, idx, uiScale);

                        ctx.textAlign = 'left';
                        ctx.fillStyle = item.isMe ? '#FFE072' : '#EDE7DF';
                        ctx.font = `bold ${Math.round(11 * uiScale)}px sans-serif`;
                        ctx.fillText(item.name + (item.isMe ? ' (我)' : ''), cardX + 46, ry + 15);
                        ctx.fillStyle = '#A8988B';
                        ctx.font = `${Math.round(8.5 * uiScale)}px sans-serif`;
                        ctx.fillText(item.loc, cardX + 46, ry + 26);

                        ctx.fillStyle = '#FFE072';
                        ctx.font = `bold ${Math.round(11 * uiScale)}px sans-serif`;
                        ctx.textAlign = 'right';
                        ctx.fillText(item.score.toLocaleString(), cardX + cardW - 16, ry + 20);
                    });

                    // 底部固定我的排名状态条
                    const myBarY = cardY + cardH - 32;
                    ctx.fillStyle = 'rgba(91, 64, 40, 0.95)';
                    drawRoundRect(ctx, cardX + 10, myBarY, cardW - 20, 26, 8);
                    ctx.fill();
                    ctx.strokeStyle = '#F5C44B';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                    ctx.fillStyle = '#FFE072';
                    ctx.font = `bold ${Math.round(10.5 * uiScale)}px sans-serif`;
                    ctx.textAlign = 'center';
                    const myRank = displayList.findIndex(x => x.isMe) + 1;
                    ctx.fillText(`我「${myName}」· 功德：${myScore.toLocaleString()} · 修行总榜第 ${myRank} 名`, W / 2, myBarY + 17);
                }
            } else if (state.currentModal === 'temple_picker') {
                // 四大法殿切换弹窗
                ctx.font = `bold ${Math.round(15 * uiScale)}px sans-serif`;
                ctx.fillStyle = '#FFE072';
                ctx.textAlign = 'center';
                drawVectorTemple(ctx, W / 2 - Math.round(102 * uiScale), cardY + 22, Math.round(7 * uiScale));
                ctx.fillText('切换祈愿法殿 (情绪对号入座)', W / 2 + Math.round(8 * uiScale), cardY + 26);

                ctx.fillStyle = '#F5C44B';
                ctx.font = `bold ${Math.round(18 * uiScale)}px sans-serif`;
                ctx.fillText('×', cardX + cardW - 22, cardY + 26);

                const tCols = 2;
                const tRows = 2;
                const tStartY = cardY + 48;
                const tGapX = Math.round(10 * uiScale);
                const tGapY = Math.round(10 * uiScale);
                const tW = (cardW - 24 - tGapX) / tCols;
                const tH = Math.round(92 * uiScale);

                TEMPLE_MODES.forEach((temple, idx) => {
                    const c = idx % 2;
                    const r = Math.floor(idx / 2);
                    const tx = cardX + 12 + c * (tW + tGapX);
                    const ty = tStartY + r * (tH + tGapY);
                    const isSelected = state.currentTempleId === temple.id;

                    ctx.fillStyle = isSelected ? temple.badgeColor : 'rgba(38, 28, 18, 0.85)';
                    drawRoundRect(ctx, tx, ty, tW, tH, 10);
                    ctx.fill();

                    ctx.strokeStyle = isSelected ? temple.accentColor : 'rgba(245, 196, 75, 0.2)';
                    ctx.lineWidth = isSelected ? 2 : 1;
                    ctx.stroke();

                    // 矢量专属法殿图标与标题
                    const tIconX = tx + 18;
                    const tIconY = ty + 20;
                    const tIconS = Math.round(8.5 * uiScale);
                    if (temple.id === 'wenchang') {
                        drawVectorBrush(ctx, tIconX, tIconY, tIconS, temple.accentColor);
                    } else if (temple.id === 'wealth') {
                        drawVectorIngot(ctx, tIconX, tIconY, tIconS, temple.accentColor);
                    } else if (temple.id === 'jieyou') {
                        drawVectorLeaf(ctx, tIconX, tIconY, tIconS, temple.accentColor);
                    } else {
                        drawVectorDove(ctx, tIconX, tIconY, tIconS, temple.accentColor);
                    }

                    ctx.textAlign = 'left';
                    ctx.font = `bold ${Math.round(12.5 * uiScale)}px sans-serif`;
                    ctx.fillStyle = isSelected ? temple.accentColor : '#FFE072';
                    ctx.fillText(temple.name, tx + 32, ty + 24);

                    if (isSelected) {
                        ctx.textAlign = 'right';
                        ctx.font = `bold ${Math.round(9 * uiScale)}px sans-serif`;
                        ctx.fillStyle = temple.accentColor;
                        ctx.fillText('● 修持中', tx + tW - 8, ty + 24);
                    }

                    // 描述
                    ctx.textAlign = 'left';
                    ctx.font = `${Math.round(9.5 * uiScale)}px sans-serif`;
                    ctx.fillStyle = '#E8D5B5';
                    ctx.fillText(temple.desc, tx + 10, ty + 46);

                    // 飘字预览标签
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
                    drawRoundRect(ctx, tx + 8, ty + 56, tW - 16, 26, 4);
                    ctx.fill();
                    ctx.font = `${Math.round(8.5 * uiScale)}px sans-serif`;
                    ctx.fillStyle = temple.accentColor;
                    ctx.fillText(`飘字：${temple.floatWords.slice(0, 2).join('、')}...`, tx + 12, ty + 73);
                });

                ctx.textAlign = 'center';
                ctx.font = `${Math.round(9 * uiScale)}px sans-serif`;
                ctx.fillStyle = '#A8988B';
                ctx.fillText('选择法殿后，敲击木鱼将自动弹出对应专属祈愿字句', W / 2, cardY + cardH - 12);

            } else if (state.currentModal === 'fortune_slip') {
                // 每日一签弹窗
                ctx.font = `bold ${Math.round(15 * uiScale)}px sans-serif`;
                ctx.fillStyle = '#FFE072';
                ctx.textAlign = 'center';
                drawVectorFortuneStick(ctx, W / 2 - Math.round(80 * uiScale), cardY + 22, Math.round(7 * uiScale));
                ctx.fillText('每日一签 · 灵签解惑', W / 2 + Math.round(8 * uiScale), cardY + 26);

                // 左上角【灵签谱】图鉴入口
                const galleryBtnW = Math.round(82 * uiScale);
                const galleryBtnH = Math.round(22 * uiScale);
                const galleryBtnX = cardX + 12;
                const galleryBtnY = cardY + 15;
                ctx.fillStyle = 'rgba(91, 64, 40, 0.85)';
                drawRoundRect(ctx, galleryBtnX, galleryBtnY, galleryBtnW, galleryBtnH, 4);
                ctx.fill();
                ctx.strokeStyle = '#F5C44B';
                ctx.lineWidth = 1;
                ctx.stroke();

                drawVectorScroll(ctx, galleryBtnX + Math.round(10 * uiScale), galleryBtnY + galleryBtnH / 2, Math.round(4.5 * uiScale));
                ctx.fillStyle = '#FFE072';
                ctx.font = `bold ${Math.round(9.5 * uiScale)}px sans-serif`;
                ctx.textAlign = 'left';
                const collCount = (Array.isArray(state.collectedSlips) ? state.collectedSlips.length : 0);
                const totalSlips = (FORTUNE_SLIPS_DATA && FORTUNE_SLIPS_DATA.length) || 59;
                ctx.fillText(`灵签谱 ${collCount}/${totalSlips}`, galleryBtnX + Math.round(18 * uiScale), galleryBtnY + Math.round(15 * uiScale));

                ctx.fillStyle = '#F5C44B';
                ctx.font = `bold ${Math.round(18 * uiScale)}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.fillText('×', cardX + cardW - 22, cardY + 26);

                const activeTemple = getCurrentTemple();
                const nowTime = Date.now();

                // 动画状态机流水线
                const potBaseCenterY = cardY + Math.round(cardH * 0.48);
                if (state.fortuneState === 'shaking') {
                    const elapsed = nowTime - state.fortuneStartTime;
                    // 产生升腾金光粒子 (从签筒口升起)
                    if (Math.random() < 0.6) {
                        spawnFortuneParticles(W / 2, potBaseCenterY - Math.round(45 * uiScale), 1);
                    }
                    if (elapsed >= 1400) {
                        state.fortuneState = 'rising';
                        state.fortuneRiseStartTime = nowTime;
                        try { soundManager.playChime(); } catch(e) {}
                        if (state.sfxEnabled && typeof wx !== 'undefined' && wx.vibrateShort) {
                            try { wx.vibrateShort({ type: 'medium', fail: () => {} }); } catch(e) {}
                        }
                    }
                } else if (state.fortuneState === 'rising') {
                    const riseElapsed = nowTime - state.fortuneRiseStartTime;
                    // 灵签升起时周围爆出璀璨星芒
                    if (Math.random() < 0.8) {
                        spawnFortuneParticles(W / 2, potBaseCenterY - Math.round(75 * uiScale), 2);
                    }
                    if (riseElapsed >= 750) {
                        state.fortuneState = 'revealed';
                        state.fortuneRevealTime = nowTime;
                        state.todayFortuneSlip = getDailyFortuneSlipFunc ? getDailyFortuneSlipFunc(getTodayDateStr(), state.currentTempleId) : null;
                        const isNewSlip = collectFortuneSlip(state.todayFortuneSlip);
                        state.hasShakenFortuneToday = true;
                        state.totalHit = (state.totalHit || 0) + 88;
                        state.dailyHit = (state.dailyHit || 0) + 88;
                        try {
                            if (typeof wx !== 'undefined' && wx.setStorageSync) {
                                wx.setStorageSync('qmy_fortune_date', getTodayDateStr());
                                wx.setStorageSync('qmy_fortune_slip', JSON.stringify(state.todayFortuneSlip));
                                wx.setStorageSync('qmy_total_hit', state.totalHit.toString());
                                wx.setStorageSync('qmy_daily_hit', state.dailyHit.toString());
                            }
                        } catch(e) {}
                        // 立即将抽签记录归档至修行日历
                        try {
                            recordCalendarProgress({
                                hasFortune: true,
                                fortuneSlip: state.todayFortuneSlip
                            });
                        } catch(e) {}
                        try { soundManager.playWin(); } catch(e) {}
                        if (state.sfxEnabled && typeof wx !== 'undefined' && wx.vibrateShort) {
                            try { wx.vibrateShort({ type: 'heavy', fail: () => {} }); } catch(e) {}
                        }
                        if (isNewSlip) {
                            showToast('🎉 首次点亮新灵签！已收录至【灵签谱】');
                        } else {
                            showToast('诚心抽签！获每日祈福功德 +88！');
                        }
                    }
                }

                const isRevealed = state.hasShakenFortuneToday || state.todayFortuneSlip || state.fortuneState === 'revealed';
                const slip = state.todayFortuneSlip || (getDailyFortuneSlipFunc ? getDailyFortuneSlipFunc(getTodayDateStr(), state.currentTempleId) : null);

                if (!isRevealed) {
                    // ==========================================
                    // 摇签阶段 (支持物理晃动、竹签跳跃、灵签飞升与粒子特效)
                    // ==========================================
                    let tipText = `【${activeTemple.name}】祈愿灵签 · 轻触按钮或晃动手机摇签`;
                    if (state.fortuneState === 'shaking') tipText = `诚心摇动中 · 诸神福佑 (心诚则灵)...`;
                    else if (state.fortuneState === 'rising') tipText = `灵签显现 · 吉星高照！`;

                    ctx.font = `${Math.round(11 * uiScale)}px sans-serif`;
                    ctx.fillStyle = (state.fortuneState === 'rising') ? '#FFE072' : '#E8D5B5';
                    ctx.textAlign = 'center';
                    ctx.fillText(tipText, W / 2, cardY + 54);

                    const potW = Math.round(102 * uiScale);
                    const potH = Math.round(144 * uiScale);
                    const potBaseX = W / 2;
                    const potBaseY = potBaseCenterY; // 签筒垂直黄金比例绝对居中定位

                    // 计算摇签倾角与上下浮动
                    let rotAngle = 0;
                    let bobY = 0;
                    if (state.fortuneState === 'shaking') {
                        const elapsed = nowTime - state.fortuneStartTime;
                        const p = Math.min(1, elapsed / 1400);
                        rotAngle = Math.sin(elapsed * 0.038) * (14 * (1 - 0.2 * p));
                        bobY = Math.abs(Math.sin(elapsed * 0.045)) * 8 * uiScale;
                    } else if (state.fortuneState === 'rising') {
                        const riseElapsed = nowTime - state.fortuneRiseStartTime;
                        const rp = Math.min(1, riseElapsed / 750);
                        rotAngle = Math.sin(rp * Math.PI * 4) * (4 * (1 - rp));
                        bobY = 0;
                    } else {
                        rotAngle = Math.sin(nowTime * 0.002) * 1.5;
                        bobY = 0;
                    }

                    // 绘制签筒背后光晕背景
                    const haloRadius = Math.round(78 * uiScale);
                    const haloGrad = ctx.createRadialGradient(potBaseX, potBaseY, 10, potBaseX, potBaseY, haloRadius);
                    if (state.fortuneState === 'shaking' || state.fortuneState === 'rising') {
                        haloGrad.addColorStop(0, 'rgba(255, 230, 100, 0.45)');
                        haloGrad.addColorStop(0.5, 'rgba(245, 196, 75, 0.22)');
                        haloGrad.addColorStop(1, 'rgba(245, 196, 75, 0)');
                    } else {
                        haloGrad.addColorStop(0, 'rgba(245, 196, 75, 0.22)');
                        haloGrad.addColorStop(1, 'rgba(245, 196, 75, 0)');
                    }
                    ctx.fillStyle = haloGrad;
                    ctx.beginPath();
                    ctx.arc(potBaseX, potBaseY, haloRadius, 0, Math.PI * 2);
                    ctx.fill();

                    // 绘制粒子系统 (在签筒后方与上方浮动)
                    for (let i = state.fortuneParticles.length - 1; i >= 0; i--) {
                        const pt = state.fortuneParticles[i];
                        pt.x += pt.vx;
                        pt.y += pt.vy;
                        pt.alpha -= 0.025;
                        if (pt.alpha <= 0) {
                            state.fortuneParticles.splice(i, 1);
                            continue;
                        }
                        ctx.save();
                        ctx.globalAlpha = Math.max(0, pt.alpha);
                        ctx.fillStyle = pt.color;
                        ctx.shadowColor = pt.color;
                        ctx.shadowBlur = 6;
                        ctx.beginPath();
                        ctx.arc(pt.x, pt.y, pt.size * uiScale, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.restore();
                    }

                    // 保存坐标系并旋转晃动签筒
                    ctx.save();
                    ctx.translate(potBaseX, potBaseY + bobY);
                    ctx.rotate((rotAngle * Math.PI) / 180);

                    // 绘制签条 (5 根参差竹签)
                    const sticks = [-2, -1, 0, 1, 2];
                    sticks.forEach((s) => {
                        const sx = s * 14 * uiScale;
                        let stickJump = 0;
                        let stickH = 46 * uiScale;
                        let stickW = 8.5 * uiScale;
                        let isChosenStick = (s === 0 && state.fortuneState === 'rising');

                        if (state.fortuneState === 'shaking') {
                            const elapsed = nowTime - state.fortuneStartTime;
                            stickJump = Math.sin(elapsed * 0.04 + s * 1.6) * 13 * uiScale;
                        } else if (isChosenStick) {
                            const riseElapsed = nowTime - state.fortuneRiseStartTime;
                            const riseProg = Math.min(1, riseElapsed / 750);
                            const easeRise = 1 - Math.pow(1 - riseProg, 3);
                            stickJump = -easeRise * 72 * uiScale;
                            stickH = (46 + easeRise * 18) * uiScale;
                            stickW = (8.5 + easeRise * 3) * uiScale;
                        } else if (state.fortuneState === 'rising') {
                            stickJump = 4 * uiScale; // 其余竹签沉落
                        } else {
                            stickJump = Math.abs(s) * 4 * uiScale;
                        }

                        const sy = -potH * 0.5 - 18 * uiScale + stickJump;

                        // 灵签跃起发光
                        if (isChosenStick) {
                            ctx.save();
                            ctx.shadowColor = '#FFD700';
                            ctx.shadowBlur = 14;
                            // 灵签金色主体
                            const goldStickGrad = ctx.createLinearGradient(sx - stickW / 2, sy, sx + stickW / 2, sy + stickH);
                            goldStickGrad.addColorStop(0, '#FFE072');
                            goldStickGrad.addColorStop(0.5, '#F5C44B');
                            goldStickGrad.addColorStop(1, '#D48806');
                            ctx.fillStyle = goldStickGrad;
                            drawRoundRect(ctx, sx - stickW / 2, sy, stickW, stickH, 4);
                            ctx.fill();
                            ctx.strokeStyle = '#FFFFFF';
                            ctx.lineWidth = 1.2;
                            ctx.stroke();

                            // 灵签红头
                            ctx.fillStyle = '#C0392B';
                            drawRoundRect(ctx, sx - stickW / 2, sy, stickW, 16 * uiScale, 3);
                            ctx.fill();

                            // 金字“吉”
                            ctx.fillStyle = '#FFF8E7';
                            ctx.font = `bold ${Math.round(8.5 * uiScale)}px sans-serif`;
                            ctx.textAlign = 'center';
                            ctx.fillText('吉', sx, sy + 11 * uiScale);
                            ctx.restore();
                        } else {
                            // 普通竹签
                            ctx.fillStyle = '#C89B58';
                            drawRoundRect(ctx, sx - stickW / 2, sy, stickW, stickH, 3);
                            ctx.fill();
                            ctx.strokeStyle = '#7A5424';
                            ctx.lineWidth = 0.8;
                            ctx.stroke();

                            // 红签头
                            ctx.fillStyle = '#B22222';
                            drawRoundRect(ctx, sx - stickW / 2, sy, stickW, 12 * uiScale, 2);
                            ctx.fill();
                        }
                    });

                    // 绘制签筒木纹主体 (高精 3D 浮雕质感)
                    const potLeft = -potW / 2;
                    const potTop = -potH * 0.5;

                    const potGrad = ctx.createLinearGradient(potLeft, potTop, potLeft + potW, potTop);
                    potGrad.addColorStop(0, '#3A1E0E');
                    potGrad.addColorStop(0.2, '#663B1C');
                    potGrad.addColorStop(0.5, '#8C5628');
                    potGrad.addColorStop(0.8, '#573016');
                    potGrad.addColorStop(1, '#2B1408');
                    ctx.fillStyle = potGrad;
                    drawRoundRect(ctx, potLeft, potTop, potW, potH, 10);
                    ctx.fill();

                    // 签筒上下双道鎏金箍圈
                    const drawPotBand = (bandY) => {
                        const bandGrad = ctx.createLinearGradient(potLeft, bandY, potLeft + potW, bandY);
                        bandGrad.addColorStop(0, '#8C6D1F');
                        bandGrad.addColorStop(0.5, '#FFE072');
                        bandGrad.addColorStop(1, '#8C6D1F');
                        ctx.fillStyle = bandGrad;
                        drawRoundRect(ctx, potLeft - 2, bandY, potW + 4, 8 * uiScale, 3);
                        ctx.fill();
                        ctx.strokeStyle = '#F5C44B';
                        ctx.lineWidth = 0.8;
                        ctx.stroke();
                    };
                    drawPotBand(potTop + 12 * uiScale);
                    drawPotBand(potTop + potH - 20 * uiScale);

                    // 筒身外金边
                    ctx.strokeStyle = '#F5C44B';
                    ctx.lineWidth = 1.6;
                    drawRoundRect(ctx, potLeft, potTop, potW, potH, 10);
                    ctx.stroke();

                    // 签筒中央金字牌匾
                    const plaqueW = 34 * uiScale;
                    const plaqueH = 64 * uiScale;
                    ctx.fillStyle = '#220E04';
                    drawRoundRect(ctx, -plaqueW / 2, -plaqueH / 2, plaqueW, plaqueH, 6);
                    ctx.fill();
                    ctx.strokeStyle = '#F5C44B';
                    ctx.lineWidth = 1.2;
                    ctx.stroke();

                    ctx.fillStyle = '#FFE072';
                    ctx.font = `bold ${Math.round(15 * uiScale)}px Kaiti, serif, sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.fillText('灵', 0, -plaqueH / 2 + 23 * uiScale);
                    ctx.fillText('签', 0, -plaqueH / 2 + 50 * uiScale);

                    ctx.restore(); // 恢复坐标系

                    // 底部摇签交互按钮
                    const shakeBtnW = cardW - 48;
                    const shakeBtnH = Math.round(38 * uiScale);
                    const shakeBtnX = (W - shakeBtnW) / 2;
                    const shakeBtnY = cardY + cardH - Math.round(52 * uiScale);

                    const isShakingOrRising = (state.fortuneState === 'shaking' || state.fortuneState === 'rising');
                    const btnGrad = ctx.createLinearGradient(shakeBtnX, shakeBtnY, shakeBtnX, shakeBtnY + shakeBtnH);
                    if (isShakingOrRising) {
                        btnGrad.addColorStop(0, '#8C6D1F');
                        btnGrad.addColorStop(1, '#5C4410');
                    } else {
                        btnGrad.addColorStop(0, '#FFE072');
                        btnGrad.addColorStop(0.5, '#F5C44B');
                        btnGrad.addColorStop(1, '#D48806');
                    }
                    ctx.fillStyle = btnGrad;
                    drawRoundRect(ctx, shakeBtnX, shakeBtnY, shakeBtnW, shakeBtnH, 10);
                    ctx.fill();
                    ctx.strokeStyle = isShakingOrRising ? '#A8988B' : '#FFF0A8';
                    ctx.lineWidth = 1.2;
                    ctx.stroke();

                    ctx.fillStyle = isShakingOrRising ? '#FFE072' : '#2B1A0A';
                    ctx.font = `bold ${Math.round(13 * uiScale)}px sans-serif`;
                    ctx.textAlign = 'center';
                    if (state.fortuneState === 'shaking') {
                        ctx.fillText('诚心摇荡中... (心诚则灵)', W / 2, shakeBtnY + Math.round(23 * uiScale));
                    } else if (state.fortuneState === 'rising') {
                        ctx.fillText('灵签高照 · 解签中...', W / 2, shakeBtnY + Math.round(23 * uiScale));
                    } else {
                        drawVectorFortuneStick(ctx, shakeBtnX + Math.round(22 * uiScale), shakeBtnY + shakeBtnH / 2, Math.round(8.5 * uiScale));
                        ctx.fillText('诚心摇签 · 抽取今日运势 (+88功德)', W / 2 + Math.round(8 * uiScale), shakeBtnY + Math.round(23 * uiScale));
                    }

                } else if (slip) {
                    // ==========================================
                    // 已解签：红笺画卷展示 (带入场呼吸光与朱砂印章 + 双分享按钮)
                    // ==========================================
                    const scrollX = cardX + 12;
                    const scrollY = cardY + 44;
                    const scrollW = cardW - 24;
                    const scrollH = cardH - 56;

                    // 红笺底纸
                    const scrollGrad = ctx.createLinearGradient(scrollX, scrollY, scrollX, scrollY + scrollH);
                    scrollGrad.addColorStop(0, 'rgba(68, 26, 20, 0.96)');
                    scrollGrad.addColorStop(1, 'rgba(42, 16, 12, 0.96)');
                    ctx.fillStyle = scrollGrad;
                    drawRoundRect(ctx, scrollX, scrollY, scrollW, scrollH, 10);
                    ctx.fill();
                    ctx.strokeStyle = '#D4AF37';
                    ctx.lineWidth = 1.5;
                    ctx.stroke();

                    // 内层金色边框 (增加古风卷轴精致感)
                    ctx.strokeStyle = 'rgba(245, 196, 75, 0.35)';
                    ctx.lineWidth = 1;
                    drawRoundRect(ctx, scrollX + 4, scrollY + 4, scrollW - 8, scrollH - 8, 8);
                    ctx.stroke();

                    // 1. 签题 (带卷轴图标)
                    const headerY = scrollY + Math.round(14 * uiScale);
                    drawVectorScroll(ctx, scrollX + 16, headerY + 8, Math.round(5.5 * uiScale));
                    ctx.textAlign = 'left';
                    ctx.font = `bold ${Math.round(13.5 * uiScale)}px sans-serif`;
                    ctx.fillStyle = '#FFE072';
                    const slipName = (slip && slip.name) ? String(slip.name) : '《祈愿灵签》';
                    ctx.fillText(slipName, scrollX + 28, headerY + 12);

                    // 朱砂印章 (带精致金边)
                    const stampW = Math.round(74 * uiScale);
                    const stampH = Math.round(24 * uiScale);
                    const stampX = scrollX + scrollW - stampW - 12;
                    const stampY = headerY;
                    ctx.fillStyle = 'rgba(192, 57, 43, 0.95)';
                    drawRoundRect(ctx, stampX, stampY, stampW, stampH, 4);
                    ctx.fill();
                    ctx.strokeStyle = '#FFD700';
                    ctx.lineWidth = 1.2;
                    ctx.stroke();
                    ctx.textAlign = 'center';
                    ctx.font = `bold ${Math.round(10.5 * uiScale)}px sans-serif`;
                    ctx.fillStyle = '#FFF8E7';
                    ctx.fillText((slip && slip.tier) ? String(slip.tier) : '【上上大吉】', stampX + stampW / 2, stampY + Math.round(16 * uiScale));

                    // 2. 四句签诗 (楷体书法美感，饱满间距，黄金居中，彻底消除上半部拥挤与下半部空旷)
                    ctx.textAlign = 'center';
                    ctx.font = `bold ${Math.round(14.5 * uiScale)}px Kaiti, STKaiti, KaiTi, serif, sans-serif`;
                    ctx.fillStyle = '#FFF2B2';
                    const poemStartY = scrollY + Math.round(62 * uiScale);
                    const poemGap = Math.round(23 * uiScale);
                    const poemList = (slip && Array.isArray(slip.poem) && slip.poem.length) 
                        ? slip.poem 
                        : ['心诚则灵福自来', '一念清净化尘埃', '诸般顺遂皆如意', '福慧圆满照灵台'];
                    poemList.forEach((line, pIdx) => {
                        ctx.fillText(String(line), W / 2, poemStartY + pIdx * poemGap);
                    });

                    // 3. 雅致双层金色分割线 + 中央璀璨星芒
                    const divY = poemStartY + (poemList.length - 1) * poemGap + Math.round(26 * uiScale);
                    ctx.strokeStyle = 'rgba(245, 196, 75, 0.35)';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(scrollX + 18, divY);
                    ctx.lineTo(W / 2 - Math.round(16 * uiScale), divY);
                    ctx.moveTo(W / 2 + Math.round(16 * uiScale), divY);
                    ctx.lineTo(scrollX + scrollW - 18, divY);
                    ctx.stroke();
                    drawVectorSparkle(ctx, W / 2, divY, 4.5 * uiScale, '#FFE072');

                    // 4. 今日所宜与所忌 (带雅致矢量圆点角标)
                    const yiY = divY + Math.round(19 * uiScale);
                    const jiY = divY + Math.round(39 * uiScale);
                    
                    ctx.textAlign = 'left';
                    drawVectorDot(ctx, scrollX + 18, yiY, 3.2, '#95DE64');
                    ctx.font = `bold ${Math.round(11 * uiScale)}px sans-serif`;
                    ctx.fillStyle = '#95DE64';
                    ctx.fillText(`【宜】${(slip && slip.yi) ? slip.yi : '静心笃行 · 广结善缘'}`, scrollX + 28, yiY + Math.round(3.5 * uiScale));

                    drawVectorDot(ctx, scrollX + 18, jiY, 3.2, '#FF7875');
                    ctx.fillStyle = '#FF7875';
                    ctx.fillText(`【忌】${(slip && slip.ji) ? slip.ji : '急躁内耗 · 执念过重'}`, scrollX + 28, jiY + Math.round(3.5 * uiScale));

                    // 5. 【禅师解惑】专属透金古风卡片 (填补中下部视觉空隙，层次丰富)
                    const descCardX = scrollX + Math.round(10 * uiScale);
                    const descCardY = jiY + Math.round(14 * uiScale);
                    const descCardW = scrollW - Math.round(20 * uiScale);
                    const btnH = Math.round(34 * uiScale);
                    const btnY = scrollY + scrollH - btnH - Math.round(30 * uiScale);
                    const descCardH = Math.max(Math.round(44 * uiScale), btnY - descCardY - Math.round(10 * uiScale));

                    ctx.fillStyle = 'rgba(20, 8, 5, 0.45)';
                    drawRoundRect(ctx, descCardX, descCardY, descCardW, descCardH, 6);
                    ctx.fill();
                    ctx.strokeStyle = 'rgba(245, 196, 75, 0.3)';
                    ctx.lineWidth = 1;
                    ctx.stroke();

                    // 卡片标题与禅语
                    drawVectorSparkle(ctx, descCardX + Math.round(12 * uiScale), descCardY + Math.round(14 * uiScale), 3.5 * uiScale, '#FFE072');
                    ctx.fillStyle = '#FFE072';
                    ctx.font = `bold ${Math.round(10 * uiScale)}px sans-serif`;
                    ctx.textAlign = 'left';
                    ctx.fillText('【禅师解惑】', descCardX + Math.round(20 * uiScale), descCardY + Math.round(17 * uiScale));

                    const descText = (slip && slip.desc) ? slip.desc : '心若安定，万事亨通。一念清净，福泽自生。';
                    ctx.fillStyle = '#EDE7DF';
                    ctx.font = `${Math.round(9.5 * uiScale)}px sans-serif`;
                    // 动态换行两行文本
                    const maxTextW = descCardW - Math.round(24 * uiScale);
                    let line1 = '', line2 = '';
                    for (let c of descText) {
                        if (ctx.measureText(line1 + c).width <= maxTextW && !line2) {
                            line1 += c;
                        } else {
                            line2 += c;
                        }
                    }
                    if (line2) {
                        ctx.fillText(line1, descCardX + Math.round(12 * uiScale), descCardY + Math.round(31 * uiScale));
                        ctx.fillText(line2, descCardX + Math.round(12 * uiScale), descCardY + Math.round(44 * uiScale));
                    } else {
                        ctx.fillText(line1, descCardX + Math.round(12 * uiScale), descCardY + Math.round(33 * uiScale));
                    }

                    // ==========================================
                    // 6. 底部功能按钮：【分享灵签】 与 【保存壁纸海报】
                    // ==========================================
                    const btnW = (scrollW - Math.round(24 * uiScale)) / 2;
                    const btn1X = scrollX + Math.round(8 * uiScale);
                    const btn2X = btn1X + btnW + Math.round(8 * uiScale);

                    // 按钮1：分享灵签 (金橙渐变 + 纯矢量信封分享图标)
                    const b1Grad = ctx.createLinearGradient(btn1X, btnY, btn1X, btnY + btnH);
                    b1Grad.addColorStop(0, '#E67E22');
                    b1Grad.addColorStop(1, '#D35400');
                    ctx.fillStyle = b1Grad;
                    drawRoundRect(ctx, btn1X, btnY, btnW, btnH, 6);
                    ctx.fill();
                    ctx.strokeStyle = '#FFE072';
                    ctx.lineWidth = 1;
                    ctx.stroke();

                    drawVectorEnvelope(ctx, btn1X + Math.round(18 * uiScale), btnY + btnH / 2, Math.round(7.5 * uiScale));
                    ctx.fillStyle = '#FFF8E7';
                    ctx.font = `bold ${Math.round(11 * uiScale)}px sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.fillText('分享灵签', btn1X + btnW / 2 + Math.round(7 * uiScale), btnY + Math.round(22 * uiScale));

                    // 按钮2：保存壁纸海报 (琥珀金渐变 + 纯矢量画框图标)
                    const b2Grad = ctx.createLinearGradient(btn2X, btnY, btn2X, btnY + btnH);
                    b2Grad.addColorStop(0, '#F39C12');
                    b2Grad.addColorStop(1, '#C0392B');
                    ctx.fillStyle = b2Grad;
                    drawRoundRect(ctx, btn2X, btnY, btnW, btnH, 6);
                    ctx.fill();
                    ctx.strokeStyle = '#FFD700';
                    ctx.lineWidth = 1;
                    ctx.stroke();

                    drawVectorPhotoFrame(ctx, btn2X + Math.round(18 * uiScale), btnY + btnH / 2, Math.round(7.5 * uiScale));
                    ctx.fillStyle = '#FFF8E7';
                    ctx.font = `bold ${Math.round(11 * uiScale)}px sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.fillText('保存壁纸海报', btn2X + btnW / 2 + Math.round(7 * uiScale), btnY + Math.round(22 * uiScale));

                    // 7. 底部归档日历提示 (优雅下移与底部保留舒适边距)
                    ctx.textAlign = 'center';
                    ctx.font = `${Math.round(8.5 * uiScale)}px sans-serif`;
                    ctx.fillStyle = 'rgba(212, 175, 55, 0.85)';
                    ctx.fillText('✦ 今日签到已圆满，明日 0 点刷新 · 记录已存入【修行日历】 ✦', W / 2, scrollY + scrollH - Math.round(10 * uiScale));
                }

            } else if (state.currentModal === 'calendar') {
                // 修行日历弹窗
                ctx.font = `bold ${Math.round(15 * uiScale)}px sans-serif`;
                ctx.fillStyle = '#FFE072';
                ctx.textAlign = 'center';
                drawVectorCalendar(ctx, W / 2 - Math.round(80 * uiScale), cardY + 22, Math.round(7 * uiScale));
                ctx.fillText('修行日历 · 功德画卷', W / 2 + Math.round(8 * uiScale), cardY + 26);

                ctx.fillStyle = '#F5C44B';
                ctx.font = `bold ${Math.round(18 * uiScale)}px sans-serif`;
                ctx.fillText('×', cardX + cardW - 22, cardY + 26);

                const now = new Date();
                const year = now.getFullYear();
                const month = now.getMonth();
                const todayDate = now.getDate();

                // ----------------------------------------------------
                // 1. 顶部双修概览卡片 (今日灵签 + 今日持咒进度)
                // ----------------------------------------------------
                const overviewY = cardY + 38;
                const overviewH = Math.round(68 * uiScale);
                ctx.fillStyle = 'rgba(42, 30, 20, 0.95)';
                drawRoundRect(ctx, cardX + 10, overviewY, cardW - 20, overviewH, 8);
                ctx.fill();
                ctx.strokeStyle = 'rgba(245, 196, 75, 0.35)';
                ctx.lineWidth = 1.2;
                ctx.stroke();

                // 1.1 今日灵签/签到状态条 (带矢量灵签图标)
                const hasFortune = !!(state.hasShakenFortuneToday || state.todayFortuneSlip);
                const fortuneTextY = overviewY + Math.round(18 * uiScale);
                drawVectorFortuneStick(ctx, cardX + 20, fortuneTextY - 3, 5.5);
                ctx.textAlign = 'left';
                if (hasFortune && state.todayFortuneSlip) {
                    const fTitle = (state.todayFortuneSlip && state.todayFortuneSlip.name) ? String(state.todayFortuneSlip.name).replace(/《|》/g, '') : '灵签';
                    ctx.font = `bold ${Math.round(11 * uiScale)}px sans-serif`;
                    ctx.fillStyle = '#FFE072';
                    ctx.fillText(`今日签到：已完成 · ${fTitle}`, cardX + 30, fortuneTextY);

                    ctx.font = `bold ${Math.round(9.5 * uiScale)}px sans-serif`;
                    ctx.fillStyle = '#FF7875';
                    ctx.fillText((state.todayFortuneSlip && state.todayFortuneSlip.tier) || '【上上大吉】', cardX + cardW - 85, fortuneTextY);

                    ctx.font = `${Math.round(9.5 * uiScale)}px sans-serif`;
                    ctx.fillStyle = '#95DE64';
                    ctx.fillText(`宜：${(state.todayFortuneSlip && state.todayFortuneSlip.yi) || '静心持诵'}`, cardX + 30, fortuneTextY + Math.round(16 * uiScale));
                } else {
                    ctx.font = `bold ${Math.round(11 * uiScale)}px sans-serif`;
                    ctx.fillStyle = '#FFA940';
                    ctx.fillText('今日签到：未完成 · 【点击前往签到摇签 (+88功德)】', cardX + 30, fortuneTextY);

                    ctx.font = `${Math.round(9.5 * uiScale)}px sans-serif`;
                    ctx.fillStyle = '#B8A99B';
                    ctx.fillText('心诚则灵 · 每日摇一签签到指引运势吉凶', cardX + 30, fortuneTextY + Math.round(16 * uiScale));
                }

                // 1.2 今日敲击持咒进度条 (带矢量禅钟图标)
                const isStamped = (state.dailyHit || 0) >= 108;
                const hitBarY = overviewY + Math.round(48 * uiScale);
                drawVectorBell(ctx, cardX + 20, hitBarY + 2, 5.5);
                ctx.font = `bold ${Math.round(10 * uiScale)}px sans-serif`;
                ctx.fillStyle = '#FFE072';
                ctx.fillText(`今日持咒：${state.dailyHit || 0}/108 下`, cardX + 30, hitBarY + 5);

                const barX = cardX + Math.round(135 * uiScale);
                const barW = cardW - Math.round(195 * uiScale);
                const barH = Math.round(8 * uiScale);
                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                drawRoundRect(ctx, barX, hitBarY - 2, barW, barH, barH / 2);
                ctx.fill();

                const prog = Math.min(1.0, (state.dailyHit || 0) / 108);
                if (prog > 0) {
                    const fillGrad = ctx.createLinearGradient(barX, hitBarY, barX + barW * prog, hitBarY);
                    fillGrad.addColorStop(0, '#FFE072');
                    fillGrad.addColorStop(1, '#F5C44B');
                    ctx.fillStyle = fillGrad;
                    drawRoundRect(ctx, barX, hitBarY - 2, Math.max(barH, barW * prog), barH, barH / 2);
                    ctx.fill();
                }

                // 圆满勋章
                if (isStamped) {
                    ctx.fillStyle = 'rgba(192, 57, 43, 0.95)';
                    drawRoundRect(ctx, cardX + cardW - 52, hitBarY - 8, 38, 16, 4);
                    ctx.fill();
                    ctx.strokeStyle = '#FFD700';
                    ctx.lineWidth = 0.8;
                    ctx.stroke();
                    ctx.font = `bold ${Math.round(8.5 * uiScale)}px sans-serif`;
                    ctx.fillStyle = '#FFF8E7';
                    ctx.textAlign = 'center';
                    ctx.fillText('圆满', cardX + cardW - 33, hitBarY + 3);
                }

                // ----------------------------------------------------
                // 2. 星期表头与月度日期网格
                // ----------------------------------------------------
                const weekDays = ['一', '二', '三', '四', '五', '六', '日'];
                const gridStartX = cardX + 10;
                const gridStartY = cardY + 114;
                const cellW = (cardW - 20) / 7;
                const cellH = Math.round(33 * uiScale);

                ctx.textAlign = 'center';
                weekDays.forEach((wd, i) => {
                    ctx.font = `bold ${Math.round(9.5 * uiScale)}px sans-serif`;
                    ctx.fillStyle = '#D4AF37';
                    ctx.fillText(wd, gridStartX + i * cellW + cellW / 2, gridStartY + 10);
                });

                // 计算当月排布
                const firstDay = new Date(year, month, 1).getDay();
                const startOffset = firstDay === 0 ? 6 : firstDay - 1;
                const daysInMonth = new Date(year, month + 1, 0).getDate();

                for (let d = 1; d <= daysInMonth; d++) {
                    const slot = startOffset + d - 1;
                    const col = slot % 7;
                    const row = Math.floor(slot / 7);
                    const cx = gridStartX + col * cellW;
                    const cy = gridStartY + 18 + row * cellH;

                    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                    const isToday = (d === todayDate);
                    const isSelected = (d === (state.selectedCalendarDay || todayDate));

                    // 取当天档案记录
                    const dayRec = isToday
                        ? { hits: state.dailyHit || 0, stamped: (state.dailyHit || 0) >= 108, hasFortune: hasFortune, fortuneSlip: state.todayFortuneSlip }
                        : (state.calendarRecords && state.calendarRecords[dateKey]);

                    const hasDayFortune = !!(dayRec && (dayRec.hasFortune || dayRec.fortuneSlip));
                    const isDayStamped = !!(dayRec && (dayRec.stamped || dayRec.hits >= 108));

                    // 格子背景
                    if (isSelected) {
                        ctx.fillStyle = 'rgba(245, 196, 75, 0.28)';
                        drawRoundRect(ctx, cx + 2, cy + 2, cellW - 4, cellH - 4, 4);
                        ctx.fill();
                        ctx.strokeStyle = '#FFD700';
                        ctx.lineWidth = 1.4;
                        ctx.stroke();
                    } else if (isToday) {
                        ctx.fillStyle = 'rgba(245, 196, 75, 0.12)';
                        drawRoundRect(ctx, cx + 2, cy + 2, cellW - 4, cellH - 4, 4);
                        ctx.fill();
                        ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
                        ctx.lineWidth = 1;
                        ctx.stroke();
                    }

                    // 日期文字
                    ctx.font = `bold ${Math.round(9 * uiScale)}px sans-serif`;
                    ctx.fillStyle = isToday ? '#FFE072' : (d < todayDate ? '#D4AF37' : '#736254');
                    ctx.fillText(d.toString(), cx + cellW / 2, cy + 13);

                    // 灵签角标 (右上角金星)
                    if (hasDayFortune) {
                        ctx.font = `${Math.round(8 * uiScale)}px sans-serif`;
                        ctx.fillText('★', cx + cellW - 7, cy + 9);
                    }

                    // 朱砂印章【圆满】或【已签】
                    if (isDayStamped) {
                        ctx.fillStyle = 'rgba(192, 57, 43, 0.9)';
                        drawRoundRect(ctx, cx + cellW / 2 - 11, cy + 16, 22, 12, 3);
                        ctx.fill();
                        ctx.font = `bold ${Math.round(7 * uiScale)}px sans-serif`;
                        ctx.fillStyle = '#FFF8E7';
                        ctx.fillText('圆满', cx + cellW / 2, cy + 24);
                    } else if (hasDayFortune && !isDayStamped) {
                        // 若已抽签签到但未满108下，盖【已签】印
                        ctx.fillStyle = 'rgba(46, 117, 89, 0.85)';
                        drawRoundRect(ctx, cx + cellW / 2 - 11, cy + 16, 22, 12, 3);
                        ctx.fill();
                        ctx.font = `bold ${Math.round(7 * uiScale)}px sans-serif`;
                        ctx.fillStyle = '#E8FFE8';
                        ctx.fillText('已签', cx + cellW / 2, cy + 24);
                    }
                }

                // ----------------------------------------------------
                // 3. 底部选中日期详细手账与悟道箴言
                // ----------------------------------------------------
                const selD = state.selectedCalendarDay || todayDate;
                const selKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(selD).padStart(2, '0')}`;
                const selRec = (selD === todayDate)
                    ? { hits: state.dailyHit || 0, stamped: (state.dailyHit || 0) >= 108, hasFortune: hasFortune, fortuneSlip: state.todayFortuneSlip }
                    : (state.calendarRecords && state.calendarRecords[selKey]);

                ctx.textAlign = 'center';
                const footBarY = cardY + cardH - Math.round(28 * uiScale);

                ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
                drawRoundRect(ctx, cardX + 10, footBarY - 14, cardW - 20, 26, 6);
                ctx.fill();

                if (selRec && (selRec.hits > 0 || selRec.fortuneSlip || selRec.hasFortune)) {
                    const fName = (selRec.fortuneSlip && selRec.fortuneSlip.name) 
                        ? String(selRec.fortuneSlip.name).replace(/《|》/g, '') 
                        : (selRec.hasFortune ? '灵签' : '未摇签');
                    ctx.font = `bold ${Math.round(8.5 * uiScale)}px sans-serif`;
                    ctx.fillStyle = '#FFE072';
                    ctx.fillText(`✦ ${month + 1}月${selD}日：持咒 ${selRec.hits || 0}下 · 灵签《${fName}》${selRec.stamped ? '【圆满】' : ''} ✦`, W / 2, footBarY + 3);
                } else {
                    ctx.font = `${Math.round(8.5 * uiScale)}px sans-serif`;
                    ctx.fillStyle = '#A8988B';
                    ctx.fillText('✦ 每日摇签解惑 + 持咒满108下，自动盖【圆满】朱砂印 ✦', W / 2, footBarY + 3);
                }

            } else if (state.currentModal === 'fortune_gallery') {
                // ==========================================
                // 灵签谱 · 功德图鉴 (立式 3 列古风朱砂竹木牌位展陈)
                // ==========================================
                const allSlips = FORTUNE_SLIPS_DATA || [];
                const collCount = (Array.isArray(state.collectedSlips) ? state.collectedSlips.length : 0);
                const totalSlips = allSlips.length || 59;
                const progressPct = Math.min(100, Math.round((collCount / totalSlips) * 100));

                if (state.viewingGallerySlip) {
                    // ----------------------------------------------------
                    // A. 单签放大研读视图 (复用红笺画卷，纯研读 + 返回图鉴)
                    // ----------------------------------------------------
                    const vSlip = state.viewingGallerySlip;
                    const scrollX = cardX + 12;
                    const scrollY = cardY + 16;
                    const scrollW = cardW - 24;
                    const scrollH = cardH - 32;

                    // 红笺底纸
                    const scrollGrad = ctx.createLinearGradient(scrollX, scrollY, scrollX, scrollY + scrollH);
                    scrollGrad.addColorStop(0, 'rgba(68, 26, 20, 0.98)');
                    scrollGrad.addColorStop(1, 'rgba(42, 16, 12, 0.98)');
                    ctx.fillStyle = scrollGrad;
                    drawRoundRect(ctx, scrollX, scrollY, scrollW, scrollH, 10);
                    ctx.fill();
                    ctx.strokeStyle = '#D4AF37';
                    ctx.lineWidth = 1.5;
                    ctx.stroke();

                    // 内层金色边框
                    ctx.strokeStyle = 'rgba(245, 196, 75, 0.35)';
                    ctx.lineWidth = 1;
                    drawRoundRect(ctx, scrollX + 4, scrollY + 4, scrollW - 8, scrollH - 8, 8);
                    ctx.stroke();

                    // 1. 签题
                    const headerY = scrollY + Math.round(14 * uiScale);
                    drawVectorScroll(ctx, scrollX + 16, headerY + 8, Math.round(5.5 * uiScale));
                    ctx.textAlign = 'left';
                    ctx.font = `bold ${Math.round(13.5 * uiScale)}px sans-serif`;
                    ctx.fillStyle = '#FFE072';
                    ctx.fillText(String(vSlip.name || '《祈愿灵签》'), scrollX + 28, headerY + 12);

                    // 朱砂印章
                    const stampW = Math.round(74 * uiScale);
                    const stampH = Math.round(24 * uiScale);
                    const stampX = scrollX + scrollW - stampW - 12;
                    const stampY = headerY;
                    ctx.fillStyle = 'rgba(192, 57, 43, 0.95)';
                    drawRoundRect(ctx, stampX, stampY, stampW, stampH, 4);
                    ctx.fill();
                    ctx.strokeStyle = '#FFD700';
                    ctx.lineWidth = 1.2;
                    ctx.stroke();
                    ctx.textAlign = 'center';
                    ctx.font = `bold ${Math.round(10.5 * uiScale)}px sans-serif`;
                    ctx.fillStyle = '#FFF8E7';
                    ctx.fillText(String(vSlip.tier || '【上上大吉】'), stampX + stampW / 2, stampY + Math.round(16 * uiScale));

                    // 2. 四句签诗
                    ctx.textAlign = 'center';
                    ctx.font = `bold ${Math.round(14.5 * uiScale)}px Kaiti, STKaiti, KaiTi, serif, sans-serif`;
                    ctx.fillStyle = '#FFF2B2';
                    const poemStartY = scrollY + Math.round(62 * uiScale);
                    const poemGap = Math.round(23 * uiScale);
                    const poemList = (vSlip && Array.isArray(vSlip.poem) && vSlip.poem.length) ? vSlip.poem : ['心诚则灵福自来', '一念清净化尘埃', '诸般顺遂皆如意', '福慧圆满照灵台'];
                    poemList.forEach((line, pIdx) => {
                        ctx.fillText(String(line), W / 2, poemStartY + pIdx * poemGap);
                    });

                    // 3. 璀璨星芒金线
                    const divY = poemStartY + (poemList.length - 1) * poemGap + Math.round(26 * uiScale);
                    ctx.strokeStyle = 'rgba(245, 196, 75, 0.35)';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(scrollX + 18, divY);
                    ctx.lineTo(W / 2 - Math.round(16 * uiScale), divY);
                    ctx.moveTo(W / 2 + Math.round(16 * uiScale), divY);
                    ctx.lineTo(scrollX + scrollW - 18, divY);
                    ctx.stroke();
                    drawVectorSparkle(ctx, W / 2, divY, 4.5 * uiScale, '#FFE072');

                    // 4. 宜忌
                    const yiY = divY + Math.round(19 * uiScale);
                    const jiY = divY + Math.round(39 * uiScale);
                    ctx.textAlign = 'left';
                    drawVectorDot(ctx, scrollX + 18, yiY, 3.2, '#95DE64');
                    ctx.font = `bold ${Math.round(11 * uiScale)}px sans-serif`;
                    ctx.fillStyle = '#95DE64';
                    ctx.fillText(`【宜】${vSlip.yi || '静心笃行 · 广结善缘'}`, scrollX + 28, yiY + Math.round(3.5 * uiScale));

                    drawVectorDot(ctx, scrollX + 18, jiY, 3.2, '#FF7875');
                    ctx.fillStyle = '#FF7875';
                    ctx.fillText(`【忌】${vSlip.ji || '急躁内耗 · 执念过重'}`, scrollX + 28, jiY + Math.round(3.5 * uiScale));

                    // 5. 禅师解惑卡片
                    const descCardX = scrollX + Math.round(10 * uiScale);
                    const descCardY = jiY + Math.round(14 * uiScale);
                    const descCardW = scrollW - Math.round(20 * uiScale);
                    const btnH = Math.round(34 * uiScale);
                    const btnY = scrollY + scrollH - btnH - Math.round(20 * uiScale);
                    const descCardH = Math.max(Math.round(44 * uiScale), btnY - descCardY - Math.round(10 * uiScale));

                    ctx.fillStyle = 'rgba(20, 8, 5, 0.45)';
                    drawRoundRect(ctx, descCardX, descCardY, descCardW, descCardH, 6);
                    ctx.fill();
                    ctx.strokeStyle = 'rgba(245, 196, 75, 0.3)';
                    ctx.lineWidth = 1;
                    ctx.stroke();

                    drawVectorSparkle(ctx, descCardX + Math.round(12 * uiScale), descCardY + Math.round(14 * uiScale), 3.5 * uiScale, '#FFE072');
                    ctx.fillStyle = '#FFE072';
                    ctx.font = `bold ${Math.round(10 * uiScale)}px sans-serif`;
                    ctx.textAlign = 'left';
                    ctx.fillText('【禅师解惑】', descCardX + Math.round(20 * uiScale), descCardY + Math.round(17 * uiScale));

                    const descText = vSlip.desc || '心若安定，万事亨通。一念清净，福泽自生。';
                    ctx.fillStyle = '#EDE7DF';
                    ctx.font = `${Math.round(9.5 * uiScale)}px sans-serif`;
                    const maxTextW = descCardW - Math.round(24 * uiScale);
                    let line1 = '', line2 = '';
                    for (let c of descText) {
                        if (ctx.measureText(line1 + c).width <= maxTextW && !line2) line1 += c;
                        else line2 += c;
                    }
                    if (line2) {
                        ctx.fillText(line1, descCardX + Math.round(12 * uiScale), descCardY + Math.round(31 * uiScale));
                        ctx.fillText(line2, descCardX + Math.round(12 * uiScale), descCardY + Math.round(44 * uiScale));
                    } else {
                        ctx.fillText(line1, descCardX + Math.round(12 * uiScale), descCardY + Math.round(33 * uiScale));
                    }

                    // 6. 底部操作按钮：返回灵签谱
                    const returnBtnW = scrollW - Math.round(24 * uiScale);
                    const returnBtnX = scrollX + Math.round(12 * uiScale);
                    const retGrad = ctx.createLinearGradient(returnBtnX, btnY, returnBtnX, btnY + btnH);
                    retGrad.addColorStop(0, '#5B4028');
                    retGrad.addColorStop(1, '#3D2817');
                    ctx.fillStyle = retGrad;
                    drawRoundRect(ctx, returnBtnX, btnY, returnBtnW, btnH, 6);
                    ctx.fill();
                    ctx.strokeStyle = '#FFE072';
                    ctx.lineWidth = 1;
                    ctx.stroke();

                    ctx.fillStyle = '#FFF8E7';
                    ctx.font = `bold ${Math.round(11.5 * uiScale)}px sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.fillText('‹ 返回灵签谱', returnBtnX + returnBtnW / 2, btnY + Math.round(22 * uiScale));

                } else {
                    // ----------------------------------------------------
                    // B. 灵签谱主图鉴列表：3 列立式红木竹签牌位展陈
                    // ----------------------------------------------------
                    const headerY = cardY + Math.round(14 * uiScale);

                    // 1. 顶部标题栏 (左侧卷轴标题 + 右侧收集进度胶囊 + 关闭按钮)
                    drawVectorScroll(ctx, cardX + Math.round(20 * uiScale), headerY + Math.round(8 * uiScale), Math.round(6 * uiScale));
                    ctx.textAlign = 'left';
                    ctx.font = `bold ${Math.round(14 * uiScale)}px sans-serif`;
                    ctx.fillStyle = '#FFE072';
                    ctx.fillText('灵签谱 · 诸法善缘', cardX + Math.round(32 * uiScale), headerY + Math.round(12 * uiScale));

                    // 收集进度小胶囊 (嵌入顶栏右侧，美观清爽)
                    const badgeW = Math.round(92 * uiScale);
                    const badgeH = Math.round(20 * uiScale);
                    const badgeX = cardX + cardW - badgeW - Math.round(36 * uiScale);
                    const badgeY = headerY + Math.round(1 * uiScale);
                    ctx.fillStyle = 'rgba(42, 26, 18, 0.9)';
                    drawRoundRect(ctx, badgeX, badgeY, badgeW, badgeH, 10);
                    ctx.fill();
                    ctx.strokeStyle = '#D4AF37';
                    ctx.lineWidth = 1;
                    ctx.stroke();

                    ctx.textAlign = 'center';
                    ctx.font = `bold ${Math.round(9 * uiScale)}px sans-serif`;
                    ctx.fillStyle = '#95DE64';
                    ctx.fillText(`已收录 ${collCount}/${totalSlips} (${progressPct}%)`, badgeX + badgeW / 2, badgeY + Math.round(14 * uiScale));

                    // 右上角关闭 ×
                    ctx.fillStyle = '#F5C44B';
                    ctx.font = `bold ${Math.round(18 * uiScale)}px sans-serif`;
                    ctx.fillText('×', cardX + cardW - 20, headerY + Math.round(14 * uiScale));

                    // 顶部分割微光线
                    const divLineY = cardY + Math.round(40 * uiScale);
                    ctx.strokeStyle = 'rgba(245, 196, 75, 0.25)';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(cardX + 14, divLineY);
                    ctx.lineTo(cardX + cardW - 14, divLineY);
                    ctx.stroke();

                    // 2. 分类切换 Tabs (4 个雅致圆角胶囊)
                    const tabY = cardY + Math.round(48 * uiScale);
                    const tabH = Math.round(26 * uiScale);
                    const gTabs = [
                        { key: 'all',     label: `全部 59` },
                        { key: 'general', label: '通用 20' },
                        { key: 'temple',  label: '法殿 15' },
                        { key: 'solar',   label: '节气 24' }
                    ];
                    const tabW = (cardW - Math.round(24 * uiScale)) / gTabs.length;
                    gTabs.forEach((t, idx) => {
                        const tx = cardX + Math.round(12 * uiScale) + idx * tabW;
                        const isCur = (state.galleryTab || 'all') === t.key;
                        
                        if (isCur) {
                            const tGrad = ctx.createLinearGradient(tx + 2, tabY, tx + 2, tabY + tabH);
                            tGrad.addColorStop(0, '#8C5824');
                            tGrad.addColorStop(1, '#5A3412');
                            ctx.fillStyle = tGrad;
                        } else {
                            ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
                        }
                        drawRoundRect(ctx, tx + 2, tabY, tabW - 4, tabH, 5);
                        ctx.fill();
                        ctx.strokeStyle = isCur ? '#FFD700' : 'rgba(255, 255, 255, 0.1)';
                        ctx.lineWidth = 1;
                        ctx.stroke();

                        ctx.fillStyle = isCur ? '#FFF8E7' : '#A8988B';
                        ctx.font = `bold ${Math.round(10 * uiScale)}px sans-serif`;
                        ctx.textAlign = 'center';
                        ctx.fillText(t.label, tx + tabW / 2, tabY + Math.round(17 * uiScale));
                    });

                    // 3. 3 列立式红木竹签牌位网格 (每页 6 支: 3 列 x 2 行)
                    const filtered = getGalleryFilteredSlips(state.galleryTab || 'all');
                    const pageSize = 6;
                    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
                    const curPage = Math.min(totalPages - 1, Math.max(0, state.galleryPage || 0));
                    const pageItems = filtered.slice(curPage * pageSize, (curPage + 1) * pageSize);

                    const gridY = tabY + tabH + Math.round(12 * uiScale);
                    const colGap = Math.round(8 * uiScale);
                    const rowGap = Math.round(10 * uiScale);
                    const colW = (cardW - Math.round(24 * uiScale) - colGap * 2) / 3;
                    const rowH = Math.round(112 * uiScale);

                    pageItems.forEach((slip, idx) => {
                        const col = idx % 3;
                        const row = Math.floor(idx / 3);
                        const itemX = cardX + Math.round(12 * uiScale) + col * (colW + colGap);
                        const itemY = gridY + row * (rowH + rowGap);

                        const isUnlocked = Array.isArray(state.collectedSlips) && state.collectedSlips.includes(slip.name);

                        // 解析牌位两行文字
                        const cleanName = String(slip.name || '').replace(/《|》/g, '');
                        const nameParts = cleanName.split('·').map(s => s.trim());
                        const tagText = nameParts.length >= 2 ? nameParts[0] : '灵签';
                        const titleText = nameParts.length >= 2 ? nameParts[1] : cleanName;

                        if (isUnlocked) {
                            // ------------------------------------
                            // 已点亮牌位 (红木金纹 + 朱砂印 + 楷体金字)
                            // ------------------------------------
                            const pGrad = ctx.createLinearGradient(itemX, itemY, itemX, itemY + rowH);
                            pGrad.addColorStop(0, '#421A14');
                            pGrad.addColorStop(0.5, '#2F110B');
                            pGrad.addColorStop(1, '#1F0A06');
                            ctx.fillStyle = pGrad;
                            drawRoundRect(ctx, itemX, itemY, colW, rowH, 8);
                            ctx.fill();
                            ctx.strokeStyle = '#D4AF37';
                            ctx.lineWidth = 1.2;
                            ctx.stroke();

                            // 内层极细金边
                            ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)';
                            ctx.lineWidth = 0.8;
                            drawRoundRect(ctx, itemX + 3, itemY + 3, colW - 6, rowH - 6, 6);
                            ctx.stroke();

                            // 顶部红绸木签头
                            ctx.fillStyle = '#A93226';
                            drawRoundRect(ctx, itemX + 3, itemY + 3, colW - 6, Math.round(12 * uiScale), 4);
                            ctx.fill();

                            // 朱砂微型印章 (【上上大吉】/【上吉】/【安吉】)
                            const sW = Math.round(58 * uiScale);
                            const sH = Math.round(16 * uiScale);
                            const sX = itemX + (colW - sW) / 2;
                            const sY = itemY + Math.round(18 * uiScale);
                            ctx.fillStyle = 'rgba(192, 57, 43, 0.95)';
                            drawRoundRect(ctx, sX, sY, sW, sH, 3);
                            ctx.fill();
                            ctx.strokeStyle = '#FFD700';
                            ctx.lineWidth = 0.8;
                            ctx.stroke();

                            ctx.textAlign = 'center';
                            ctx.font = `bold ${Math.round(8 * uiScale)}px sans-serif`;
                            ctx.fillStyle = '#FFF8E7';
                            ctx.fillText(slip.tier || '【吉】', sX + sW / 2, sY + Math.round(11.5 * uiScale));

                            // 牌位主标题 (两行层次分明)
                            ctx.font = `bold ${Math.round(9.5 * uiScale)}px sans-serif`;
                            ctx.fillStyle = '#E5C07B';
                            ctx.fillText(tagText, itemX + colW / 2, itemY + Math.round(51 * uiScale));

                            ctx.font = `bold ${Math.round(12 * uiScale)}px Kaiti, STKaiti, serif, sans-serif`;
                            ctx.fillStyle = '#FFF2B2';
                            ctx.fillText(titleText, itemX + colW / 2, itemY + Math.round(71 * uiScale));

                            // 底部操作角标 (点击研读)
                            const bW = Math.round(56 * uiScale);
                            const bH = Math.round(15 * uiScale);
                            const bX = itemX + (colW - bW) / 2;
                            const bY = itemY + rowH - bH - Math.round(6 * uiScale);
                            ctx.fillStyle = 'rgba(46, 117, 89, 0.55)';
                            drawRoundRect(ctx, bX, bY, bW, bH, 3);
                            ctx.fill();
                            ctx.strokeStyle = '#95DE64';
                            ctx.lineWidth = 0.6;
                            ctx.stroke();

                            ctx.font = `bold ${Math.round(7.5 * uiScale)}px sans-serif`;
                            ctx.fillStyle = '#95DE64';
                            ctx.fillText('● 点击研读', bX + bW / 2, bY + Math.round(11 * uiScale));

                        } else {
                            // ------------------------------------
                            // 未解锁牌位 (古铜锁头 + 暗雅木质)
                            // ------------------------------------
                            ctx.fillStyle = 'rgba(22, 15, 11, 0.85)';
                            drawRoundRect(ctx, itemX, itemY, colW, rowH, 8);
                            ctx.fill();
                            ctx.strokeStyle = 'rgba(200, 180, 160, 0.15)';
                            ctx.lineWidth = 0.8;
                            ctx.stroke();

                            // 顶部暗色签头
                            ctx.fillStyle = 'rgba(40, 28, 20, 0.8)';
                            drawRoundRect(ctx, itemX + 3, itemY + 3, colW - 6, Math.round(10 * uiScale), 4);
                            ctx.fill();

                            // 锁头图标
                            drawVectorLock(ctx, itemX + colW / 2, itemY + Math.round(30 * uiScale), Math.round(7.5 * uiScale), '#7A6B5E');

                            ctx.textAlign = 'center';
                            ctx.font = `bold ${Math.round(9 * uiScale)}px sans-serif`;
                            ctx.fillStyle = '#6B5E52';
                            ctx.fillText(tagText, itemX + colW / 2, itemY + Math.round(56 * uiScale));

                            ctx.font = `bold ${Math.round(11 * uiScale)}px Kaiti, STKaiti, serif, sans-serif`;
                            ctx.fillStyle = '#52463C';
                            ctx.fillText('待缘启封', itemX + colW / 2, itemY + Math.round(74 * uiScale));

                            ctx.font = `${Math.round(7.5 * uiScale)}px sans-serif`;
                            ctx.fillStyle = '#42372E';
                            ctx.fillText('诚心抽签点亮', itemX + colW / 2, itemY + rowH - Math.round(10 * uiScale));
                        }
                    });

                    // 4. 底部翻页栏与操作
                    const footY = gridY + 2 * (rowH + rowGap) + Math.round(8 * uiScale);
                    const pageBtnW = Math.round(68 * uiScale);
                    const pageBtnH = Math.round(26 * uiScale);

                    // 上一页
                    const prevX = cardX + Math.round(16 * uiScale);
                    const canPrev = curPage > 0;
                    ctx.fillStyle = canPrev ? '#5B4028' : 'rgba(0,0,0,0.2)';
                    drawRoundRect(ctx, prevX, footY, pageBtnW, pageBtnH, 4);
                    ctx.fill();
                    ctx.strokeStyle = canPrev ? '#F5C44B' : 'rgba(255,255,255,0.08)';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                    ctx.fillStyle = canPrev ? '#FFE072' : '#6B5E54';
                    ctx.font = `bold ${Math.round(10 * uiScale)}px sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.fillText('‹ 上一卷', prevX + pageBtnW / 2, footY + Math.round(17 * uiScale));

                    // 页码指示 (楷体卷轴感)
                    ctx.font = `bold ${Math.round(11.5 * uiScale)}px Kaiti, serif, sans-serif`;
                    ctx.fillStyle = '#FFE072';
                    ctx.fillText(`第 ${curPage + 1} / ${totalPages} 卷`, W / 2, footY + Math.round(17 * uiScale));

                    // 下一页
                    const nextX = cardX + cardW - Math.round(16 * uiScale) - pageBtnW;
                    const canNext = curPage < totalPages - 1;
                    ctx.fillStyle = canNext ? '#5B4028' : 'rgba(0,0,0,0.2)';
                    drawRoundRect(ctx, nextX, footY, pageBtnW, pageBtnH, 4);
                    ctx.fill();
                    ctx.strokeStyle = canNext ? '#F5C44B' : 'rgba(255,255,255,0.08)';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                    ctx.fillStyle = canNext ? '#FFE072' : '#6B5E54';
                    ctx.fillText('下一卷 ›', nextX + pageBtnW / 2, footY + Math.round(17 * uiScale));

                    // 底注提示
                    ctx.font = `${Math.round(8.5 * uiScale)}px sans-serif`;
                    ctx.fillStyle = 'rgba(212, 175, 55, 0.8)';
                    ctx.fillText('✦ 每日诚心摇签，广结十方善缘 · 诸签随缘点亮 ✦', W / 2, cardY + cardH - Math.round(10 * uiScale));
                }

            } else if (state.currentModal === 'quick_ambient') {
                // 方案 A：主页快捷声景浮层 (双列 5x2 卡片)
                ctx.textAlign = 'left';
                drawVectorMusicNote(ctx, cardX + Math.round(20 * uiScale), cardY + 24, Math.round(6.5 * uiScale), '#FFE072');
                ctx.font = `bold ${Math.round(14 * uiScale)}px sans-serif`;
                ctx.fillStyle = '#FFE072';
                ctx.fillText('自然声景 (10款现实白噪音)', cardX + Math.round(32 * uiScale), cardY + 28);

                // 右上角关闭按钮 '×'
                ctx.textAlign = 'center';
                ctx.fillStyle = '#F5C44B';
                ctx.font = `bold ${Math.round(18 * uiScale)}px sans-serif`;
                ctx.fillText('×', cardX + cardW - 20, cardY + 28);

                // 快速静音/播放按钮
                const muteBtnW = Math.round(76 * uiScale);
                const muteBtnH = Math.round(24 * uiScale);
                const muteBtnX = cardX + cardW - 38 - muteBtnW;
                const muteBtnY = cardY + 16;
                ctx.fillStyle = state.bgmEnabled ? 'rgba(82, 196, 26, 0.25)' : 'rgba(100, 80, 60, 0.4)';
                drawRoundRect(ctx, muteBtnX, muteBtnY, muteBtnW, muteBtnH, 12);
                ctx.fill();
                ctx.strokeStyle = state.bgmEnabled ? '#52C41A' : '#8C8C8C';
                ctx.lineWidth = 1;
                ctx.stroke();

                drawVectorMusicNote(ctx, muteBtnX + Math.round(14 * uiScale), muteBtnY + muteBtnH / 2, 5, state.bgmEnabled ? '#52C41A' : '#BFBFBF');
                ctx.font = `bold ${Math.round(9.5 * uiScale)}px sans-serif`;
                ctx.fillStyle = state.bgmEnabled ? '#95DE64' : '#BFBFBF';
                ctx.fillText(state.bgmEnabled ? '正在播放' : '已静音', muteBtnX + muteBtnW / 2 + Math.round(6 * uiScale), muteBtnY + 16);

                // 10 首曲目网格 (2列 x 5行)
                const gridStartX = cardX + 10;
                const gridStartY = cardY + 48;
                const gapX = Math.round(8 * uiScale);
                const gapY = Math.round(5 * uiScale);
                const cols = 2;
                const rows = 5;
                const itW = (cardW - 20 - gapX) / cols;
                const itH = Math.floor((cardH - 54 - 24 - (rows - 1) * gapY) / rows);

                BGM_TRACKS.forEach((track, idx) => {
                    const c = idx % 2;
                    const r = Math.floor(idx / 2);
                    const itX = gridStartX + c * (itW + gapX);
                    const itY = gridStartY + r * (itH + gapY);
                    const isSelected = state.selectedTrackIdx === idx;

                    // 背景卡片
                    ctx.fillStyle = isSelected
                        ? (state.bgmEnabled ? 'rgba(74, 52, 22, 0.98)' : 'rgba(52, 40, 26, 0.9)')
                        : 'rgba(38, 28, 18, 0.75)';
                    drawRoundRect(ctx, itX, itY, itW, itH, 8);
                    ctx.fill();

                    ctx.strokeStyle = isSelected
                        ? (state.bgmEnabled ? '#FFD700' : '#D4AF37')
                        : 'rgba(245, 196, 75, 0.18)';
                    ctx.lineWidth = isSelected ? 1.6 : 1;
                    ctx.stroke();

                    // 歌名与图标
                    ctx.textAlign = 'left';
                    drawVectorMusicNote(ctx, itX + Math.round(14 * uiScale), itY + 14, 4.5, isSelected ? '#FFE072' : '#F5C44B');
                    ctx.font = `bold ${Math.round(10.5 * uiScale)}px sans-serif`;
                    ctx.fillStyle = isSelected ? '#FFE072' : '#F5C44B';
                    ctx.fillText(`${track.name}`, itX + Math.round(22 * uiScale), itY + 16);

                    // 播放状态小图标 (右侧)
                    if (isSelected && state.bgmEnabled) {
                        ctx.textAlign = 'right';
                        ctx.font = `bold ${Math.round(8.5 * uiScale)}px sans-serif`;
                        ctx.fillStyle = '#52C41A';
                        ctx.fillText('▶ 播', itX + itW - 6, itY + 16);
                    }

                    // 副标题描述
                    ctx.textAlign = 'left';
                    ctx.font = `${Math.round(8.5 * uiScale)}px sans-serif`;
                    ctx.fillStyle = isSelected ? '#FFD591' : '#A89275';
                    ctx.fillText(track.desc, itX + 8, itY + Math.round(itH - 8));
                });

                // 底部提示小字
                ctx.textAlign = 'center';
                ctx.font = `${Math.round(8.5 * uiScale)}px sans-serif`;
                ctx.fillStyle = '#A8988B';
                ctx.fillText('点击任意卡片即刻切换 · 点击外部空白区域收起面板', W / 2, cardY + cardH - 8);

            } else if (state.currentModal === 'settings') {
                ctx.font = `bold ${Math.round(15 * uiScale)}px sans-serif`;
                ctx.fillStyle = '#FFE072';
                ctx.textAlign = 'center';
                drawVectorGear(ctx, W / 2 - Math.round(86 * uiScale), cardY + 22, Math.round(7 * uiScale));
                ctx.fillText('游戏设置 & 禅音曲库', W / 2 + Math.round(8 * uiScale), cardY + 26);

                ctx.fillStyle = '#F5C44B';
                ctx.font = `bold ${Math.round(18 * uiScale)}px sans-serif`;
                ctx.fillText('×', cardX + cardW - 22, cardY + 26);

                const toggle1Y = cardY + 38;
                ctx.fillStyle = 'rgba(60, 46, 32, 0.9)';
                drawRoundRect(ctx, cardX + 12, toggle1Y, cardW - 24, 32, 6);
                ctx.fill();
                ctx.strokeStyle = state.sfxEnabled ? '#F5C44B' : 'rgba(255, 255, 255, 0.1)';
                ctx.lineWidth = 1;
                ctx.stroke();

                ctx.textAlign = 'left';
                drawVectorBell(ctx, cardX + 24, toggle1Y + 16, 6);
                ctx.font = `${Math.round(11 * uiScale)}px sans-serif`;
                ctx.fillStyle = '#FFE072';
                ctx.fillText('木鱼敲击音效', cardX + 36, toggle1Y + 21);
                ctx.textAlign = 'right';
                ctx.fillStyle = state.sfxEnabled ? '#FFD700' : '#D48806';
                ctx.font = `bold ${Math.round(10.5 * uiScale)}px sans-serif`;
                ctx.fillText(state.sfxEnabled ? '【已开启】' : '【已静音】', cardX + cardW - 22, toggle1Y + 21);

                const toggle2Y = cardY + 74;
                ctx.fillStyle = 'rgba(60, 46, 32, 0.9)';
                drawRoundRect(ctx, cardX + 12, toggle2Y, cardW - 24, 32, 6);
                ctx.fill();
                ctx.strokeStyle = state.bgmEnabled ? '#F5C44B' : 'rgba(255, 255, 255, 0.1)';
                ctx.lineWidth = 1;
                ctx.stroke();

                ctx.textAlign = 'left';
                drawVectorMusicNote(ctx, cardX + 24, toggle2Y + 16, 6);
                ctx.font = `${Math.round(11 * uiScale)}px sans-serif`;
                ctx.fillStyle = '#FFE072';
                ctx.fillText('静心自然声景', cardX + 36, toggle2Y + 21);
                ctx.textAlign = 'right';
                ctx.fillStyle = state.bgmEnabled ? '#FFD700' : '#D48806';
                ctx.font = `bold ${Math.round(10.5 * uiScale)}px sans-serif`;
                ctx.fillText(state.bgmEnabled ? '【已开启】' : '【已关闭】', cardX + cardW - 22, toggle2Y + 21);

                ctx.textAlign = 'left';
                drawVectorMusicNote(ctx, cardX + 22, cardY + 124, 5.5);
                ctx.font = `bold ${Math.round(11 * uiScale)}px sans-serif`;
                ctx.fillStyle = '#FFE072';
                ctx.fillText('自然声景曲库 (10款现实白噪音 · 点击直切)', cardX + 32, cardY + 128);

                const trackStartY = cardY + 138;
                const cols = 2;
                const rows = 5;
                const gapX = Math.round(8 * uiScale);
                const gapY = Math.round(4 * uiScale);
                const itW = (cardW - 24 - gapX) / cols;
                const itH = 28;

                BGM_TRACKS.forEach((track, idx) => {
                    const c = idx % 2;
                    const r = Math.floor(idx / 2);
                    const tx = cardX + 12 + c * (itW + gapX);
                    const ty = trackStartY + r * (itH + gapY);
                    const isSelected = state.selectedTrackIdx === idx;

                    ctx.fillStyle = isSelected ? 'rgba(68, 50, 28, 0.95)' : 'rgba(38, 30, 22, 0.75)';
                    drawRoundRect(ctx, tx, ty, itW, itH, 6);
                    ctx.fill();
                    ctx.strokeStyle = isSelected ? '#F5C44B' : 'rgba(245, 196, 75, 0.15)';
                    ctx.lineWidth = isSelected ? 1.5 : 1;
                    ctx.stroke();

                    ctx.textAlign = 'left';
                    ctx.font = `bold ${Math.round(9.5 * uiScale)}px sans-serif`;
                    ctx.fillStyle = isSelected ? '#FFE072' : '#F5C44B';
                    ctx.fillText(`${track.name}`, tx + 6, ty + 18);

                    if (isSelected && state.bgmEnabled) {
                        ctx.textAlign = 'right';
                        ctx.font = `bold ${Math.round(8 * uiScale)}px sans-serif`;
                        ctx.fillStyle = '#52C41A';
                        ctx.fillText('● 播', tx + itW - 6, ty + 18);
                    }
                });

                // 官方合规入口：适龄提示 8+ 与 隐私协议
                const compY = trackStartY + rows * (itH + gapY) + 8;
                const compBtnW = (cardW - 32) / 2;
                const compBtnH = 26;

                // 适龄提示按钮 (CADPA 8+)
                ctx.fillStyle = 'rgba(50, 38, 26, 0.9)';
                drawRoundRect(ctx, cardX + 12, compY, compBtnW, compBtnH, 6);
                ctx.fill();
                ctx.strokeStyle = '#52C41A';
                ctx.lineWidth = 1;
                ctx.stroke();
                drawVectorShield(ctx, cardX + 12 + Math.round(14 * uiScale), compY + 13, 5.5, '#52C41A');
                ctx.fillStyle = '#95DE64';
                ctx.font = `bold ${Math.round(9.5 * uiScale)}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.fillText('CADPA 8+ 适龄提示', cardX + 12 + compBtnW / 2 + Math.round(6 * uiScale), compY + 17);

                // 微信官方隐私协议入口
                ctx.fillStyle = 'rgba(50, 38, 26, 0.9)';
                drawRoundRect(ctx, cardX + 12 + compBtnW + 8, compY, compBtnW, compBtnH, 6);
                ctx.fill();
                ctx.strokeStyle = 'rgba(245, 196, 75, 0.4)';
                ctx.lineWidth = 1;
                ctx.stroke();
                drawVectorScroll(ctx, cardX + 12 + compBtnW + 8 + Math.round(14 * uiScale), compY + 13, 5.5, '#FFE072');
                ctx.fillStyle = '#FFE072';
                ctx.font = `bold ${Math.round(9.5 * uiScale)}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.fillText('微信官方隐私协议', cardX + 12 + compBtnW + 8 + compBtnW / 2 + Math.round(6 * uiScale), compY + 17);

                // 底部合规备案小字
                ctx.textAlign = 'center';
                ctx.font = `${Math.round(8.5 * uiScale)}px sans-serif`;
                ctx.fillStyle = '#A8988B';
                ctx.fillText('本游戏适合 8 岁及以上用户 · 抵制不良游戏 享受健康生活', W / 2, cardY + cardH - 10);
            } else if (state.currentModal === 'age_advisory') {
                // CADPA 8+ 适龄提示说明弹窗 (完全符合国家新闻出版署与微信小游戏官方规范)
                ctx.font = `bold ${Math.round(15 * uiScale)}px sans-serif`;
                const titleText = 'CADPA 适龄提示 (8+)';
                const titleTextW = ctx.measureText(titleText).width;
                const titleShieldS = Math.round(7 * uiScale);
                const titleGap = Math.round(6 * uiScale);
                const totalTitleW = titleShieldS * 1.5 + titleGap + titleTextW;
                const titleStartX = (W - totalTitleW) / 2;
                const titleCenterY = cardY + 24;

                drawVectorShield(ctx, titleStartX + titleShieldS * 0.75, titleCenterY, titleShieldS, '#52C41A');
                ctx.fillStyle = '#FFE072';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText(titleText, titleStartX + titleShieldS * 1.5 + titleGap, titleCenterY);
                ctx.textBaseline = 'alphabetic';

                ctx.fillStyle = '#F5C44B';
                ctx.font = `bold ${Math.round(18 * uiScale)}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.fillText('×', cardX + cardW - 22, cardY + 26);

                // 绿色盾牌 CADPA 8+ 标识胶囊 (动态精准居中，盾牌与文字绝不重叠)
                const shieldY = cardY + Math.round(44 * uiScale);
                const badgeH = Math.round(28 * uiScale);
                const s = Math.round(6 * uiScale);
                const gap = Math.round(7 * uiScale);

                ctx.font = `bold ${Math.round(12.5 * uiScale)}px sans-serif`;
                const badgeText = 'CADPA 8+';
                const textW = ctx.measureText(badgeText).width;
                const innerW = s * 1.5 + gap + textW;
                const padX = Math.round(14 * uiScale);
                const badgeW = innerW + padX * 2;
                const badgeX = (W - badgeW) / 2;

                // 绘制圆角绿底胶囊
                ctx.fillStyle = '#237804';
                drawRoundRect(ctx, badgeX, shieldY, badgeW, badgeH, Math.round(6 * uiScale));
                ctx.fill();
                ctx.strokeStyle = '#52C41A';
                ctx.lineWidth = 1.5;
                ctx.stroke();

                // 居中绘制 [白色盾牌 + CADPA 8+ 文字]
                const contentStartX = badgeX + (badgeW - innerW) / 2;
                const iconCenterX = contentStartX + s * 0.75;
                const centerY = shieldY + badgeH / 2;

                drawVectorShield(ctx, iconCenterX, centerY, s, '#FFFFFF');

                ctx.fillStyle = '#FFFFFF';
                ctx.font = `bold ${Math.round(12.5 * uiScale)}px sans-serif`;
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText(badgeText, iconCenterX + s * 0.75 + gap, centerY);
                ctx.textBaseline = 'alphabetic';

                // 说明文本卡片
                const textCardY = cardY + 80;
                const textCardH = cardH - 142;
                ctx.fillStyle = 'rgba(38, 26, 17, 0.9)';
                drawRoundRect(ctx, cardX + 14, textCardY, cardW - 28, textCardH, 8);
                ctx.fill();
                ctx.strokeStyle = 'rgba(245, 196, 75, 0.25)';
                ctx.lineWidth = 1;
                ctx.stroke();

                ctx.textAlign = 'left';
                ctx.fillStyle = '#EDE7DF';
                const fontSize = Math.round(10.5 * uiScale);
                const lineHeight = Math.round(18 * uiScale);
                const paraGap = Math.round(8 * uiScale);
                ctx.font = `${fontSize}px sans-serif`;

                const advisoryParas = [
                    '1. 《静心敲木鱼》是一款以中华传统静心文化为背景的休闲益智小游戏，适用于年满 8 周岁及以上的用户。',
                    '2. 游戏旨在帮助用户在闲暇时放松身心、舒缓压力，倡导静心专注的积极生活态度。',
                    '3. 游戏内无暴力、血腥或不良诱导内容。所有木鱼敲击与趣味寻宝玩法均为休闲娱乐设计。',
                    '4. 未成年人请在监护人指导下体验，请合理安排作息时间，注意保护视力，享受健康生活。'
                ];

                const textPadX = cardX + 22;
                const textMaxW = cardW - 44;
                let curY = textCardY + Math.round(18 * uiScale);

                advisoryParas.forEach(para => {
                    let curLine = '';
                    for (let i = 0; i < para.length; i++) {
                        const char = para[i];
                        const testLine = curLine + char;
                        if (ctx.measureText(testLine).width > textMaxW && curLine.length > 0) {
                            ctx.fillText(curLine, textPadX, curY);
                            curLine = char;
                            curY += lineHeight;
                        } else {
                            curLine = testLine;
                        }
                    }
                    if (curLine) {
                        ctx.fillText(curLine, textPadX, curY);
                        curY += lineHeight;
                    }
                    curY += paraGap;
                });

                // [我知道了] 确认按钮
                const okBtnY = cardY + cardH - 50;
                ctx.fillStyle = '#D48806';
                drawRoundRect(ctx, cardX + 30, okBtnY, cardW - 60, 36, 18);
                ctx.fill();
                ctx.strokeStyle = '#FFE072';
                ctx.lineWidth = 1.2;
                ctx.stroke();
                ctx.fillStyle = '#FFE072';
                ctx.font = `bold ${Math.round(13 * uiScale)}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.fillText('我知道了', W / 2, okBtnY + 23);

            } else if (state.currentModal === 'privacy_policy') {
                // 用户隐私指引与健康游戏忠告弹窗 (与微信公众平台后台隐私保护指引严格一一对应)
                ctx.font = `bold ${Math.round(15 * uiScale)}px sans-serif`;
                const privTitleText = '《用户隐私保护指引》';
                const privTitleW = ctx.measureText(privTitleText).width;
                const privScrollS = Math.round(7 * uiScale);
                const privGap = Math.round(6 * uiScale);
                const totalPrivW = privScrollS * 1.5 + privGap + privTitleW;
                const privStartX = (W - totalPrivW) / 2;
                const privCenterY = cardY + 24;

                drawVectorScroll(ctx, privStartX + privScrollS * 0.75, privCenterY, privScrollS);
                ctx.fillStyle = '#FFE072';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText(privTitleText, privStartX + privScrollS * 1.5 + privGap, privCenterY);
                ctx.textBaseline = 'alphabetic';

                ctx.fillStyle = '#F5C44B';
                ctx.font = `bold ${Math.round(18 * uiScale)}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.fillText('×', cardX + cardW - 22, cardY + 26);

                const textCardY = cardY + 44;
                const textCardH = cardH - 106;
                ctx.fillStyle = 'rgba(38, 26, 17, 0.9)';
                drawRoundRect(ctx, cardX + 14, textCardY, cardW - 28, textCardH, 8);
                ctx.fill();
                ctx.strokeStyle = 'rgba(245, 196, 75, 0.25)';
                ctx.lineWidth = 1;
                ctx.stroke();

                ctx.textAlign = 'left';
                const textPadX = cardX + 22;
                const textMaxW = cardW - 44;
                let curY = textCardY + Math.round(16 * uiScale);

                // 1. 处理的信息与用途 (四项已向微信官方申报的权限)
                ctx.fillStyle = '#FFD700';
                ctx.font = `bold ${Math.round(11 * uiScale)}px sans-serif`;
                ctx.fillText('【处理的信息及用途说明】', textPadX, curY);
                curY += Math.round(16 * uiScale);

                ctx.fillStyle = '#EDE7DF';
                ctx.font = `${Math.round(9.5 * uiScale)}px sans-serif`;
                const privacyItems = [
                    '1. 昵称与头像：在游戏名牌及微信好友榜展示本人头像与修行功德。',
                    '2. 相册（仅写入）：用于将每日抽取的灵签壁纸海报保存至手机本地。',
                    '3. 微信朋友关系：用于微信好友功德排行榜互动与好友修行比拼。',
                    '4. 加速传感器：支持玩家通过摇一摇手机晃动签筒抽取每日灵签。'
                ];
                privacyItems.forEach(item => {
                    let curLine = '';
                    for (let i = 0; i < item.length; i++) {
                        const char = item[i];
                        const testLine = curLine + char;
                        if (ctx.measureText(testLine).width > textMaxW && curLine.length > 0) {
                            ctx.fillText(curLine, textPadX, curY);
                            curLine = char;
                            curY += Math.round(15 * uiScale);
                        } else {
                            curLine = testLine;
                        }
                    }
                    if (curLine) {
                        ctx.fillText(curLine, textPadX, curY);
                        curY += Math.round(15 * uiScale);
                    }
                    curY += Math.round(2 * uiScale);
                });

                curY += Math.round(4 * uiScale);

                // 2. 信息存储期限与保护承诺
                ctx.fillStyle = '#FFD700';
                ctx.font = `bold ${Math.round(11 * uiScale)}px sans-serif`;
                ctx.fillText('【数据存储与保护承诺】', textPadX, curY);
                curY += Math.round(16 * uiScale);

                ctx.fillStyle = '#EDE7DF';
                ctx.font = `${Math.round(9.5 * uiScale)}px sans-serif`;
                const storageItems = [
                    '· 遵循最小必要原则，仅在实现功能所需最短时间内安全存储。',
                    '· 绝不收集手机号或通讯录，用户可随时在微信设置中撤回授权。'
                ];
                storageItems.forEach(item => {
                    let curLine = '';
                    for (let i = 0; i < item.length; i++) {
                        const char = item[i];
                        const testLine = curLine + char;
                        if (ctx.measureText(testLine).width > textMaxW && curLine.length > 0) {
                            ctx.fillText(curLine, textPadX, curY);
                            curLine = char;
                            curY += Math.round(15 * uiScale);
                        } else {
                            curLine = testLine;
                        }
                    }
                    if (curLine) {
                        ctx.fillText(curLine, textPadX, curY);
                        curY += Math.round(15 * uiScale);
                    }
                });

                // [查看官方完整协议 / 我知道了] 按钮
                const okBtnY = cardY + cardH - 50;
                ctx.fillStyle = '#D48806';
                drawRoundRect(ctx, cardX + 30, okBtnY, cardW - 60, 36, 18);
                ctx.fill();
                ctx.strokeStyle = '#FFE072';
                ctx.lineWidth = 1.2;
                ctx.stroke();
                ctx.fillStyle = '#FFE072';
                ctx.font = `bold ${Math.round(13 * uiScale)}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.fillText('查看微信官方完整协议', W / 2, okBtnY + 23);

            } else if (state.currentModal === 'titles') {
                ctx.font = `bold ${Math.round(15 * uiScale)}px sans-serif`;
                ctx.fillStyle = '#FFE072';
                ctx.textAlign = 'center';
                ctx.fillText('静心称号', W / 2 + 10, cardY + 28);
                drawVectorCrown(ctx, W / 2 - 38, cardY + 24, Math.round(9 * uiScale));

                ctx.fillStyle = '#F5C44B';
                ctx.font = `bold ${Math.round(18 * uiScale)}px sans-serif`;
                ctx.fillText('×', cardX + cardW - 22, cardY + 28);

                ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
                drawRoundRect(ctx, cardX + 12, cardY + 38, cardW - 24, 26, 6);
                ctx.fill();
                ctx.strokeStyle = 'rgba(245, 196, 75, 0.25)';
                ctx.lineWidth = 1;
                ctx.stroke();

                ctx.fillStyle = '#FFE072';
                ctx.font = `${Math.round(10 * uiScale)}px sans-serif`;
                ctx.fillText(`当前称号：【${titleInfo.name}】（累计敲击值：${state.totalHit.toLocaleString()}）`, W / 2, cardY + 55);

                const listX = cardX + 12;
                const listY = cardY + 70;
                const listW = cardW - 24;
                const listH = cardH - 82;

                ctx.save();
                ctx.beginPath();
                ctx.rect(listX, listY, listW, listH);
                ctx.clip();

                const itemH = 64;
                const itemGap = 8;

                TITLES.forEach((item, idx) => {
                    const isUnlocked = state.totalHit >= item.minHit;
                    const isCurrent = titleInfo.id === item.id;
                    const progress = isUnlocked ? 100 : Math.min(99.9, (state.totalHit / item.minHit) * 100);
                    const itemY = listY + state.titleScrollY + idx * (itemH + itemGap);

                    if (itemY + itemH >= listY && itemY <= listY + listH + itemH) {
                        ctx.fillStyle = isCurrent ? 'rgba(64, 48, 28, 0.95)' : (isUnlocked ? 'rgba(40, 32, 24, 0.85)' : 'rgba(28, 22, 18, 0.75)');
                        drawRoundRect(ctx, listX, itemY, listW, itemH, 8);
                        ctx.fill();
                        ctx.strokeStyle = isCurrent ? '#F5C44B' : (isUnlocked ? 'rgba(245, 196, 75, 0.35)' : 'rgba(255, 255, 255, 0.08)');
                        ctx.lineWidth = isCurrent ? 1.5 : 1;
                        ctx.stroke();

                        if (isCurrent) {
                            drawVectorCrown(ctx, listX + 18, itemY + 16, Math.round(7.5 * uiScale));
                        } else if (isUnlocked) {
                            drawVectorSparkle(ctx, listX + 18, itemY + 16, Math.round(7 * uiScale));
                        } else {
                            drawVectorLock(ctx, listX + 18, itemY + 16, Math.round(6.5 * uiScale));
                        }

                        ctx.textAlign = 'left';
                        ctx.font = `bold ${Math.round(12 * uiScale)}px sans-serif`;
                        ctx.fillStyle = isCurrent || isUnlocked ? '#FFE072' : '#8C827A';
                        ctx.fillText(item.name, listX + 30, itemY + 20);

                        const badgeW = isCurrent ? 54 : (isUnlocked ? 48 : 50);
                        const badgeH = 18;
                        const badgeX = listX + listW - badgeW - 8;
                        const badgeY = itemY + 6;

                        ctx.fillStyle = isCurrent ? '#F5C44B' : (isUnlocked ? 'rgba(82, 196, 26, 0.2)' : 'rgba(255, 255, 255, 0.08)');
                        drawRoundRect(ctx, badgeX, badgeY, badgeW, badgeH, 4);
                        ctx.fill();
                        if (isUnlocked && !isCurrent) {
                            ctx.strokeStyle = '#52C41A';
                            ctx.lineWidth = 1;
                            ctx.stroke();
                        }

                        ctx.textAlign = 'center';
                        ctx.font = `bold ${Math.round(9 * uiScale)}px sans-serif`;
                        ctx.fillStyle = isCurrent ? '#1A130B' : (isUnlocked ? '#52C41A' : '#8C827A');
                        const badgeText = isCurrent ? '佩戴中' : (isUnlocked ? '已解锁' : `${progress.toFixed(1)}%`);
                        ctx.fillText(badgeText, badgeX + badgeW / 2, badgeY + 13);

                        ctx.textAlign = 'left';
                        ctx.font = `${Math.round(9.5 * uiScale)}px sans-serif`;
                        ctx.fillStyle = '#F5C44B';
                        ctx.fillText(item.desc, listX + 12, itemY + 36);

                        ctx.font = `${Math.round(8.5 * uiScale)}px sans-serif`;
                        ctx.fillStyle = '#D48806';
                        const condText = item.maxHit === Infinity ? `需 ≥ ${item.minHit.toLocaleString()} 敲击值` : `需 ${item.minHit.toLocaleString()} ~ ${item.maxHit.toLocaleString()} 敲击值`;
                        ctx.fillText(condText, listX + 12, itemY + 52);

                        const trackX = listX + listW - 74;
                        const trackY = itemY + 44;
                        const trackW = 66;
                        const trackH = 4;
                        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
                        drawRoundRect(ctx, trackX, trackY, trackW, trackH, 2);
                        ctx.fill();

                        if (progress > 0) {
                            ctx.fillStyle = isUnlocked ? '#52C41A' : '#F5C44B';
                            const fillW = Math.max(3, (progress / 100) * trackW);
                            drawRoundRect(ctx, trackX, trackY, fillW, trackH, 2);
                            ctx.fill();
                        }
                    }
                });
                ctx.restore();
            } else if (state.currentModal === 'ad_insufficient') {
                ctx.textAlign = 'center';
                ctx.font = `bold ${Math.round(15 * uiScale)}px sans-serif`;
                ctx.fillStyle = '#FFE072';
                ctx.fillText('功德不足 · 善缘化缘', W / 2 + 10, cardY + 26);
                drawVectorBowl(ctx, W / 2 - 80, cardY + 22, Math.round(8.5 * uiScale));

                ctx.fillStyle = '#F5C44B';
                ctx.font = `bold ${Math.round(18 * uiScale)}px sans-serif`;
                ctx.fillText('×', cardX + cardW - 22, cardY + 26);

                const iconR = 20;
                const haloGrad = ctx.createRadialGradient(W / 2, cardY + 68, 2, W / 2, cardY + 68, iconR);
                haloGrad.addColorStop(0, 'rgba(245, 196, 75, 0.45)');
                haloGrad.addColorStop(1, 'rgba(245, 196, 75, 0)');
                ctx.fillStyle = haloGrad;
                ctx.beginPath();
                ctx.arc(W / 2, cardY + 68, iconR, 0, Math.PI * 2);
                ctx.fill();

                if (images.bowl && images.bowl.width) {
                    ctx.drawImage(images.bowl, W / 2 - 18, cardY + 50, 36, 36);
                } else {
                    ctx.font = `${Math.round(28 * uiScale)}px sans-serif`;
                    drawVectorBell(ctx, W / 2, cardY + 68, 15, '#FFE072');
                }

                const isAlmsExhausted = (state.dailyAlmsCount >= 5);
                const leftAlms = Math.max(0, 5 - (state.dailyAlmsCount || 0));

                ctx.textAlign = 'center';
                ctx.fillStyle = '#FFE072';
                ctx.font = `bold ${Math.round(13.5 * uiScale)}px sans-serif`;
                ctx.fillText(`当前敲击值不足【${(state.insufficientBet || 200).toLocaleString()}】`, W / 2, cardY + 110);

                ctx.fillStyle = isAlmsExhausted ? '#A8988B' : '#F5C44B';
                ctx.font = `bold ${Math.round(10.5 * uiScale)}px sans-serif`;
                if (isAlmsExhausted) {
                    ctx.fillText('今日善缘化缘福报已满（已达 5/5 次），请明日再来！', W / 2, cardY + 134);
                } else {
                    ctx.fillText(`观看一段禅意短视频，获赠【+2,000 敲击值】(今日剩余 ${leftAlms}/5 次)`, W / 2, cardY + 134);
                }

                const adBtnY = cardY + 158;
                const adGrad = ctx.createLinearGradient(cardX + 24, adBtnY, cardX + 24, adBtnY + 42);
                if (isAlmsExhausted) {
                    adGrad.addColorStop(0, 'rgba(80, 70, 60, 0.9)');
                    adGrad.addColorStop(1, 'rgba(50, 40, 32, 0.9)');
                    ctx.fillStyle = adGrad;
                    drawRoundRect(ctx, cardX + 24, adBtnY, cardW - 48, 42, 21);
                    ctx.fill();
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
                    ctx.lineWidth = 1;
                    ctx.stroke();

                    ctx.fillStyle = '#8C7B6E';
                    ctx.font = `bold ${Math.round(13 * uiScale)}px sans-serif`;
                    ctx.fillText('今日化缘已达上限 (0/5)', W / 2, adBtnY + 26);
                } else {
                    adGrad.addColorStop(0, '#52C41A');
                    adGrad.addColorStop(1, '#237804');
                    ctx.fillStyle = adGrad;
                    drawRoundRect(ctx, cardX + 24, adBtnY, cardW - 48, 42, 21);
                    ctx.fill();
                    ctx.strokeStyle = '#95DE64';
                    ctx.lineWidth = 1.5;
                    ctx.stroke();

                    ctx.fillStyle = '#FFE072';
                    ctx.font = `bold ${Math.round(13 * uiScale)}px sans-serif`;
                    drawVectorVideoClapper(ctx, cardX + 38, adBtnY + 21, Math.round(7.5 * uiScale)); ctx.fillText(`观看视频化缘 (+2,000) · 剩余 ${leftAlms} 次`, W / 2 + 10, adBtnY + 26);
                }

                const closeBtnY = cardY + 212;
                const closeGrad = ctx.createLinearGradient(cardX + 24, closeBtnY, cardX + 24, closeBtnY + 38);
                closeGrad.addColorStop(0, 'rgba(64, 46, 32, 0.95)');
                closeGrad.addColorStop(1, 'rgba(38, 24, 14, 0.95)');
                ctx.fillStyle = closeGrad;
                drawRoundRect(ctx, cardX + 24, closeBtnY, cardW - 48, 38, 19);
                ctx.fill();
                ctx.strokeStyle = 'rgba(245, 196, 75, 0.45)';
                ctx.lineWidth = 1.2;
                ctx.stroke();

                ctx.fillStyle = '#FFE072';
                ctx.font = `bold ${Math.round(12 * uiScale)}px sans-serif`;
                ctx.fillText('关闭', W / 2, closeBtnY + 24);
            } else if (state.currentModal === 'ad_crit') {
                const isCritExhausted = state.dailyCritCount >= 5;
                const isCritActive = state.critRate > 1 && state.critRemainingSec > 0;

                ctx.textAlign = 'center';
                ctx.font = `bold ${Math.round(15 * uiScale)}px sans-serif`;
                ctx.fillStyle = '#FFE072';
                ctx.fillText('暴击增益 · 佛光护佑', W / 2 + 10, cardY + 26);
                drawVectorBolt(ctx, W / 2 - 80, cardY + 22, Math.round(8.5 * uiScale), '#FFE072');

                ctx.fillStyle = '#F5C44B';
                ctx.font = `bold ${Math.round(18 * uiScale)}px sans-serif`;
                ctx.fillText('×', cardX + cardW - 22, cardY + 26);

                const iconR = 20;
                const haloGrad = ctx.createRadialGradient(W / 2, cardY + 68, 2, W / 2, cardY + 68, iconR);
                haloGrad.addColorStop(0, 'rgba(245, 196, 75, 0.5)');
                haloGrad.addColorStop(1, 'rgba(245, 196, 75, 0)');
                ctx.fillStyle = haloGrad;
                ctx.beginPath();
                ctx.arc(W / 2, cardY + 68, iconR, 0, Math.PI * 2);
                ctx.fill();

                drawVectorBolt(ctx, W / 2, cardY + 68, 16, '#FFE072');

                ctx.textAlign = 'center';
                ctx.fillStyle = '#FFE072';
                ctx.font = `bold ${Math.round(13.5 * uiScale)}px sans-serif`;
                ctx.fillText('随机暴击倍率 【 5倍 · 8倍 · 10倍 】', W / 2, cardY + 110);

                const leftCrit = Math.max(0, 5 - state.dailyCritCount);
                if (isCritExhausted) {
                    ctx.fillStyle = '#FF7875';
                    ctx.font = `bold ${Math.round(11 * uiScale)}px sans-serif`;
                    ctx.fillText('今日 5 次暴击化缘已全部领完，明日 0 点刷新！', W / 2, cardY + 134);
                } else if (isCritActive) {
                    ctx.fillStyle = '#52C41A';
                    ctx.font = `bold ${Math.round(11 * uiScale)}px sans-serif`;
                    ctx.fillText(`暴击生效中 (${formatTime(state.critRemainingSec)})，结束后可再次化缘`, W / 2, cardY + 134);
                } else {
                    ctx.fillStyle = '#F5C44B';
                    ctx.font = `bold ${Math.round(10.5 * uiScale)}px sans-serif`;
                    ctx.fillText(`观看一段禅意短片，获赠 30 分钟暴击！(今日余 ${leftCrit}/5次)`, W / 2, cardY + 134);
                }

                const adBtnY = cardY + 158;
                if (isCritExhausted) {
                    ctx.fillStyle = 'rgba(50, 40, 32, 0.9)';
                    drawRoundRect(ctx, cardX + 24, adBtnY, cardW - 48, 42, 21);
                    ctx.fill();
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                    ctx.fillStyle = '#8C827A';
                    ctx.font = `bold ${Math.round(13 * uiScale)}px sans-serif`;
                    ctx.fillText('今日次数已用尽 (5/5次)', W / 2, adBtnY + 26);
                } else if (isCritActive) {
                    ctx.fillStyle = 'rgba(38, 70, 30, 0.95)';
                    drawRoundRect(ctx, cardX + 24, adBtnY, cardW - 48, 42, 21);
                    ctx.fill();
                    ctx.strokeStyle = '#52C41A';
                    ctx.lineWidth = 1.2;
                    ctx.stroke();
                    ctx.fillStyle = '#52C41A';
                    ctx.font = `bold ${Math.round(12.5 * uiScale)}px sans-serif`;
                    ctx.fillText(`暴击生效中 (${formatTime(state.critRemainingSec)})`, W / 2, adBtnY + 26);
                } else {
                    const adGrad = ctx.createLinearGradient(cardX + 24, adBtnY, cardX + 24, adBtnY + 42);
                    adGrad.addColorStop(0, '#52C41A');
                    adGrad.addColorStop(1, '#237804');
                    ctx.fillStyle = adGrad;
                    drawRoundRect(ctx, cardX + 24, adBtnY, cardW - 48, 42, 21);
                    ctx.fill();
                    ctx.strokeStyle = '#95DE64';
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
                    ctx.fillStyle = '#FFE072';
                    ctx.font = `bold ${Math.round(13.5 * uiScale)}px sans-serif`;
                    drawVectorVideoClapper(ctx, cardX + 44, adBtnY + 21, Math.round(7.5 * uiScale)); ctx.fillText('观看视频开启暴击', W / 2 + 10, adBtnY + 26);
                }

                const closeBtnY = cardY + 212;
                const closeGrad = ctx.createLinearGradient(cardX + 24, closeBtnY, cardX + 24, closeBtnY + 38);
                closeGrad.addColorStop(0, 'rgba(64, 46, 32, 0.95)');
                closeGrad.addColorStop(1, 'rgba(38, 24, 14, 0.95)');
                ctx.fillStyle = closeGrad;
                drawRoundRect(ctx, cardX + 24, closeBtnY, cardW - 48, 38, 19);
                ctx.fill();
                ctx.strokeStyle = 'rgba(245, 196, 75, 0.45)';
                ctx.lineWidth = 1.2;
                ctx.stroke();

                ctx.fillStyle = '#FFE072';
                ctx.font = `bold ${Math.round(12 * uiScale)}px sans-serif`;
                ctx.fillText('关闭', W / 2, closeBtnY + 24);

            } else if (state.currentModal === 'ad_auto') {
                const isAutoExhausted = state.dailyAutoCount >= 5;

                ctx.textAlign = 'center';
                ctx.font = `bold ${Math.round(15 * uiScale)}px sans-serif`;
                ctx.fillStyle = '#FFE072';
                ctx.fillText('自动敲击 · 禅意挂机', W / 2 + 10, cardY + 26);
                drawVectorBell(ctx, W / 2 - 80, cardY + 22, Math.round(8.5 * uiScale), '#FFE072');

                ctx.fillStyle = '#F5C44B';
                ctx.font = `bold ${Math.round(18 * uiScale)}px sans-serif`;
                ctx.fillText('×', cardX + cardW - 22, cardY + 26);

                const iconR = 20;
                const haloGrad = ctx.createRadialGradient(W / 2, cardY + 68, 2, W / 2, cardY + 68, iconR);
                haloGrad.addColorStop(0, 'rgba(245, 196, 75, 0.5)');
                haloGrad.addColorStop(1, 'rgba(245, 196, 75, 0)');
                ctx.fillStyle = haloGrad;
                ctx.beginPath();
                ctx.arc(W / 2, cardY + 68, iconR, 0, Math.PI * 2);
                ctx.fill();

                drawVectorBell(ctx, W / 2, cardY + 68, 15, '#FFE072');

                ctx.textAlign = 'center';
                ctx.fillStyle = '#FFE072';
                ctx.font = `bold ${Math.round(13.5 * uiScale)}px sans-serif`;
                ctx.fillText('挂机敲木鱼 【 +1 小时时长 (可叠加) 】', W / 2, cardY + 110);

                const leftAuto = Math.max(0, 5 - state.dailyAutoCount);
                if (isAutoExhausted) {
                    ctx.fillStyle = '#FF7875';
                    ctx.font = `bold ${Math.round(11 * uiScale)}px sans-serif`;
                    ctx.fillText('今日 5 次自动挂机已全部领完，明日 0 点刷新！', W / 2, cardY + 134);
                } else {
                    ctx.fillStyle = '#F5C44B';
                    ctx.font = `bold ${Math.round(10.5 * uiScale)}px sans-serif`;
                    ctx.fillText(`观看一段禅意短片，自动连续敲木鱼修功德！(今日余 ${leftAuto}/5次)`, W / 2, cardY + 134);
                }

                const adBtnY = cardY + 158;
                if (isAutoExhausted) {
                    ctx.fillStyle = 'rgba(50, 40, 32, 0.9)';
                    drawRoundRect(ctx, cardX + 24, adBtnY, cardW - 48, 42, 21);
                    ctx.fill();
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                    ctx.fillStyle = '#8C827A';
                    ctx.font = `bold ${Math.round(13 * uiScale)}px sans-serif`;
                    ctx.fillText('今日次数已用尽 (5/5次)', W / 2, adBtnY + 26);
                } else {
                    const adGrad = ctx.createLinearGradient(cardX + 24, adBtnY, cardX + 24, adBtnY + 42);
                    adGrad.addColorStop(0, '#52C41A');
                    adGrad.addColorStop(1, '#237804');
                    ctx.fillStyle = adGrad;
                    drawRoundRect(ctx, cardX + 24, adBtnY, cardW - 48, 42, 21);
                    ctx.fill();
                    ctx.strokeStyle = '#95DE64';
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
                    ctx.fillStyle = '#FFE072';
                    ctx.font = `bold ${Math.round(13.5 * uiScale)}px sans-serif`;
                    drawVectorVideoClapper(ctx, cardX + 44, adBtnY + 21, Math.round(7.5 * uiScale)); ctx.fillText('观看视频开启挂机', W / 2 + 10, adBtnY + 26);
                }

                const closeBtnY = cardY + 212;
                const closeGrad = ctx.createLinearGradient(cardX + 24, closeBtnY, cardX + 24, closeBtnY + 38);
                closeGrad.addColorStop(0, 'rgba(64, 46, 32, 0.95)');
                closeGrad.addColorStop(1, 'rgba(38, 24, 14, 0.95)');
                ctx.fillStyle = closeGrad;
                drawRoundRect(ctx, cardX + 24, closeBtnY, cardW - 48, 38, 19);
                ctx.fill();
                ctx.strokeStyle = 'rgba(245, 196, 75, 0.45)';
                ctx.lineWidth = 1.2;
                ctx.stroke();

                ctx.fillStyle = '#FFE072';
                ctx.font = `bold ${Math.round(12 * uiScale)}px sans-serif`;
                ctx.fillText('关闭', W / 2, closeBtnY + 24);

            } else if (state.currentModal === 'ad_tier_unlock') {
                ctx.textAlign = 'center';
                ctx.font = `bold ${Math.round(15 * uiScale)}px sans-serif`;
                ctx.fillStyle = '#FFE072';
                ctx.fillText('战力解锁 · 尊荣特权', W / 2 + 10, cardY + 26);
                drawVectorCrown(ctx, W / 2 - 80, cardY + 22, Math.round(8.5 * uiScale));

                ctx.fillStyle = '#F5C44B';
                ctx.font = `bold ${Math.round(18 * uiScale)}px sans-serif`;
                ctx.fillText('×', cardX + cardW - 22, cardY + 26);

                const iconR = 20;
                const haloGrad = ctx.createRadialGradient(W / 2, cardY + 68, 2, W / 2, cardY + 68, iconR);
                haloGrad.addColorStop(0, 'rgba(245, 196, 75, 0.5)');
                haloGrad.addColorStop(1, 'rgba(245, 196, 75, 0)');
                ctx.fillStyle = haloGrad;
                ctx.beginPath();
                ctx.arc(W / 2, cardY + 68, iconR, 0, Math.PI * 2);
                ctx.fill();

                drawVectorTrophy(ctx, W / 2, cardY + 68, 15);

                const targetIdx = state.targetUnlockTierIdx || 3;
                const targetBet = BET_TIERS[targetIdx] || 2000;
                ctx.textAlign = 'center';
                ctx.fillStyle = '#FFE072';
                ctx.font = `bold ${Math.round(13.5 * uiScale)}px sans-serif`;
                ctx.fillText(`解锁高阶战力 【 ${targetBet.toLocaleString()} 战力 】`, W / 2, cardY + 110);

                ctx.fillStyle = '#F5C44B';
                ctx.font = `bold ${Math.round(10.5 * uiScale)}px sans-serif`;
                ctx.fillText('观看一段禅意短视频，立即解锁该战力【24 小时】修行特权！', W / 2, cardY + 134);

                const adBtnY = cardY + 158;
                const adGrad = ctx.createLinearGradient(cardX + 24, adBtnY, cardX + 24, adBtnY + 42);
                adGrad.addColorStop(0, '#52C41A');
                adGrad.addColorStop(1, '#237804');
                ctx.fillStyle = adGrad;
                drawRoundRect(ctx, cardX + 24, adBtnY, cardW - 48, 42, 21);
                ctx.fill();
                ctx.strokeStyle = '#95DE64';
                ctx.lineWidth = 1.5;
                ctx.stroke();

                ctx.fillStyle = '#FFE072';
                ctx.font = `bold ${Math.round(13.5 * uiScale)}px sans-serif`;
                drawVectorVideoClapper(ctx, cardX + 40, adBtnY + 21, Math.round(7.5 * uiScale)); ctx.fillText('观看视频解锁 24 小时', W / 2 + 10, adBtnY + 26);

                const closeBtnY = cardY + 212;
                const closeGrad = ctx.createLinearGradient(cardX + 24, closeBtnY, cardX + 24, closeBtnY + 38);
                closeGrad.addColorStop(0, 'rgba(64, 46, 32, 0.95)');
                closeGrad.addColorStop(1, 'rgba(38, 24, 14, 0.95)');
                ctx.fillStyle = closeGrad;
                drawRoundRect(ctx, cardX + 24, closeBtnY, cardW - 48, 38, 19);
                ctx.fill();
                ctx.strokeStyle = 'rgba(245, 196, 75, 0.45)';
                ctx.lineWidth = 1.2;
                ctx.stroke();

                ctx.fillStyle = '#FFE072';
                ctx.font = `bold ${Math.round(12 * uiScale)}px sans-serif`;
                ctx.fillText('关闭', W / 2, closeBtnY + 24);

            } else if (state.currentModal === 'betpicker') {
                ctx.font = `bold ${Math.round(15 * uiScale)}px sans-serif`;
                ctx.fillStyle = '#FFE072';
                ctx.textAlign = 'center';
                ctx.fillText('选择祈福战力', W / 2 + 10, cardY + 28);
                drawVectorBolt(ctx, W / 2 - 58, cardY + 24, Math.round(8.5 * uiScale), '#FFE072');

                ctx.fillStyle = '#F5C44B';
                ctx.font = `bold ${Math.round(18 * uiScale)}px sans-serif`;
                ctx.fillText('×', cardX + cardW - 22, cardY + 28);

                ctx.fillStyle = '#F5C44B';
                ctx.font = `bold ${Math.round(9.5 * uiScale)}px sans-serif`;
                ctx.fillText('战力越高单次消耗越多敲击值，连线大奖越丰厚：', W / 2, cardY + 50);

                const gridX = cardX + 14;
                const gridY = cardY + 66;
                const gridW = cardW - 28;
                const gridH = cardH - 80;
                const colW = Math.floor((gridW - 12) / 3);
                const rowH = Math.floor((gridH - 12) / 3);

                BET_TIERS.forEach((bet, idx) => {
                    const col = idx % 3;
                    const row = Math.floor(idx / 3);
                    const bx = gridX + col * (colW + 6);
                    const by = gridY + row * (rowH + 6);
                    const isSelected = state.gemHunt.currentBetIdx === idx;
                    const isUnlocked = isTierUnlocked(idx);
                    const isPrevUnlocked = idx === 0 || isTierUnlocked(idx - 1);

                    if (isSelected) {
                        ctx.fillStyle = 'rgba(68, 50, 28, 0.95)';
                    } else if (isUnlocked) {
                        ctx.fillStyle = 'rgba(38, 30, 22, 0.85)';
                    } else if (isPrevUnlocked) {
                        ctx.fillStyle = 'rgba(46, 32, 20, 0.85)';
                    } else {
                        ctx.fillStyle = 'rgba(24, 18, 14, 0.75)';
                    }

                    drawRoundRect(ctx, bx, by, colW, rowH, 8);
                    ctx.fill();

                    if (isSelected) {
                        ctx.strokeStyle = '#FFD700';
                        ctx.lineWidth = 2;
                    } else if (isUnlocked) {
                        ctx.strokeStyle = 'rgba(245, 196, 75, 0.3)';
                        ctx.lineWidth = 1;
                    } else if (isPrevUnlocked) {
                        ctx.strokeStyle = 'rgba(245, 196, 75, 0.2)';
                        ctx.lineWidth = 1;
                    } else {
                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
                        ctx.lineWidth = 1;
                    }
                    ctx.stroke();

                    ctx.textAlign = 'center';
                    ctx.font = `bold ${Math.round(13 * uiScale)}px sans-serif`;
                    if (isSelected) {
                        ctx.fillStyle = '#FFE072';
                    } else if (isUnlocked) {
                        ctx.fillStyle = '#FFE072';
                    } else if (isPrevUnlocked) {
                        ctx.fillStyle = '#F5C44B';
                    } else {
                        ctx.fillStyle = '#8C7663';
                    }
                    ctx.fillText(bet.toLocaleString(), bx + colW / 2, by + rowH * 0.44);

                    const tagW = Math.min(58, colW - 8);
                    const tagH = 15;
                    const tagX = bx + (colW - tagW) / 2;
                    const tagY = by + rowH * 0.58;

                    if (isSelected) {
                        ctx.fillStyle = '#F5C44B';
                        drawRoundRect(ctx, tagX, tagY, tagW, tagH, 4);
                        ctx.fill();
                        drawVectorCrown(ctx, tagX + 11, tagY + 7.5, Math.round(4.5 * uiScale));
                        ctx.fillStyle = '#1A130B';
                        ctx.font = `bold ${Math.round(8.5 * uiScale)}px sans-serif`;
                        ctx.fillText('当前', tagX + tagW / 2 + 5, tagY + 11);
                    } else if (isUnlocked) {
                        if (idx < 3) {
                            ctx.fillStyle = 'rgba(82, 196, 26, 0.2)';
                            drawRoundRect(ctx, tagX, tagY, tagW, tagH, 4);
                            ctx.fill();
                            ctx.strokeStyle = '#52C41A';
                            ctx.lineWidth = 1;
                            ctx.stroke();
                            drawVectorDot(ctx, tagX + 11, tagY + 7.5, Math.round(3.5 * uiScale), '#52C41A');
                            ctx.fillStyle = '#52C41A';
                            ctx.font = `bold ${Math.round(8.5 * uiScale)}px sans-serif`;
                            ctx.fillText('免费', tagX + tagW / 2 + 5, tagY + 11);
                        } else {
                            const remainH = Math.max(1, Math.ceil((state.unlockedTiers[idx] - Date.now()) / (3600 * 1000)));
                            ctx.fillStyle = 'rgba(82, 196, 26, 0.25)';
                            drawRoundRect(ctx, tagX, tagY, tagW, tagH, 4);
                            ctx.fill();
                            ctx.strokeStyle = '#52C41A';
                            ctx.lineWidth = 1;
                            ctx.stroke();
                            drawVectorBolt(ctx, tagX + 11, tagY + 7.5, Math.round(4 * uiScale), '#52C41A');
                            ctx.fillStyle = '#52C41A';
                            ctx.font = `bold ${Math.round(8.5 * uiScale)}px sans-serif`;
                            ctx.fillText(`余${remainH}h`, tagX + tagW / 2 + 5, tagY + 11);
                        }
                    } else if (isPrevUnlocked) {
                        ctx.fillStyle = 'rgba(245, 196, 75, 0.2)';
                        drawRoundRect(ctx, tagX, tagY, tagW, tagH, 4);
                        ctx.fill();
                        ctx.strokeStyle = '#F5C44B';
                        ctx.lineWidth = 1;
                        ctx.stroke();
                        drawVectorVideoClapper(ctx, tagX + 10, tagY + 7.5, Math.round(4 * uiScale));
                        ctx.fillStyle = '#FFE072';
                        ctx.font = `bold ${Math.round(8 * uiScale)}px sans-serif`;
                        ctx.fillText('解锁24h', tagX + tagW / 2 + 6, tagY + 11);
                    } else {
                        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
                        drawRoundRect(ctx, tagX, tagY, tagW, tagH, 4);
                        ctx.fill();
                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
                        ctx.lineWidth = 1;
                        ctx.stroke();
                        drawVectorLock(ctx, tagX + 11, tagY + 7.5, Math.round(4 * uiScale));
                        ctx.fillStyle = '#7A6E64';
                        ctx.font = `${Math.round(8 * uiScale)}px sans-serif`;
                        ctx.fillText('待前置', tagX + tagW / 2 + 5, tagY + 11);
                    }
                });
            } else if (state.currentModal === 'bigwin') {
                const bw = state.gemHunt.bigWinData || { winAmount: 1000, bet: 200, multiplier: '5.0' };
                const mult = parseFloat(bw.multiplier || '2.0');
                const nowTime = Date.now();

                let tierTitle = '佛光普照 · 功德大吉';
                let tierBadge = '✦ 喜乐翻倍 · 欢喜纳福 ✦';
                let btnText = '恭领福报';
                let haloColor = 'rgba(255, 215, 0, 0.45)';
                let glowBorder = '#FFD700';
                let innerDiscGrad1 = '#422412';
                let innerDiscGrad2 = '#1A0E06';

                if (mult >= 15) {
                    tierTitle = '震古烁今 · 九品至尊';
                    tierBadge = '✦ 至尊无上 · 万佛朝宗 ✦';
                    btnText = '至尊领受';
                    haloColor = 'rgba(255, 77, 79, 0.5)';
                    glowBorder = '#FFA39E';
                    innerDiscGrad1 = '#4E1412';
                    innerDiscGrad2 = '#1E0605';
                } else if (mult >= 5) {
                    tierTitle = '鸿运齐天 · 万福齐聚';
                    tierBadge = '✦ 鸿运当头 · 功德无量 ✦';
                    btnText = '恭谢恩典';
                    haloColor = 'rgba(255, 170, 0, 0.5)';
                    glowBorder = '#FFC53D';
                    innerDiscGrad1 = '#46230C';
                    innerDiscGrad2 = '#1C0D05';
                }

                // 1. 全屏旋转佛光光芒射线 (柔和向外发散，带渐隐羽化)
                ctx.save();
                ctx.translate(W / 2, H / 2 - Math.round(15 * uiScale));
                const rayCount = mult >= 15 ? 18 : 14;
                const angleOffset = (nowTime * 0.0008) % (Math.PI * 2);
                for (let i = 0; i < rayCount; i++) {
                    const a = angleOffset + (i * Math.PI * 2) / rayCount;
                    ctx.fillStyle = haloColor;
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.arc(0, 0, W * 0.95, a - 0.08, a + 0.08);
                    ctx.closePath();
                    ctx.fill();
                }
                ctx.restore();

                // 2. 庆典核心圆形宝鉴 (大德金轮宝镜)
                const centerCX = W / 2;
                const centerCY = H / 2 - Math.round(15 * uiScale);
                const radius = Math.min(W * 0.42, H * 0.24, 162);

                // 2.1 外圈旋转金光粒子与佛光大光晕
                const outerBloom = ctx.createRadialGradient(centerCX, centerCY, radius * 0.5, centerCX, centerCY, radius * 1.32);
                outerBloom.addColorStop(0, haloColor);
                outerBloom.addColorStop(0.6, 'rgba(255, 215, 0, 0.18)');
                outerBloom.addColorStop(1, 'rgba(255, 215, 0, 0)');
                ctx.fillStyle = outerBloom;
                ctx.beginPath();
                ctx.arc(centerCX, centerCY, radius * 1.32, 0, Math.PI * 2);
                ctx.fill();

                // 2.2 外缘 24 瓣金莲花瓣/吉祥圆珠光环
                const dotCount = 24;
                const dotRingR = radius + 6;
                const dotPulse = 0.5 + 0.5 * Math.sin(nowTime * 0.005);
                for (let i = 0; i < dotCount; i++) {
                    const da = (i * Math.PI * 2) / dotCount - angleOffset;
                    const dx = centerCX + Math.cos(da) * dotRingR;
                    const dy = centerCY + Math.sin(da) * dotRingR;
                    ctx.fillStyle = (i % 2 === 0) ? '#FFE072' : '#D48806';
                    ctx.beginPath();
                    ctx.arc(dx, dy, (i % 2 === 0 ? 3.2 : 2.0) * (1 + 0.18 * dotPulse), 0, Math.PI * 2);
                    ctx.fill();
                }

                // 2.3 外层双重 3D 鎏金圆环
                const outerGoldGrad = ctx.createLinearGradient(centerCX - radius, centerCY - radius, centerCX + radius, centerCY + radius);
                outerGoldGrad.addColorStop(0, '#FFF566');
                outerGoldGrad.addColorStop(0.3, '#FFD700');
                outerGoldGrad.addColorStop(0.7, '#D48806');
                outerGoldGrad.addColorStop(1, '#8C5618');
                ctx.fillStyle = outerGoldGrad;
                ctx.beginPath();
                ctx.arc(centerCX, centerCY, radius, 0, Math.PI * 2);
                ctx.fill();

                ctx.strokeStyle = '#FFE072';
                ctx.lineWidth = 2.2;
                ctx.stroke();

                // 2.4 内层深邃沉香漆金底盘
                const innerR = radius - 6.5;
                const innerDiscGrad = ctx.createRadialGradient(centerCX, centerCY - innerR * 0.2, innerR * 0.1, centerCX, centerCY, innerR);
                innerDiscGrad.addColorStop(0, innerDiscGrad1);
                innerDiscGrad.addColorStop(0.75, innerDiscGrad2);
                innerDiscGrad.addColorStop(1, '#0C0603');
                ctx.fillStyle = innerDiscGrad;
                ctx.beginPath();
                ctx.arc(centerCX, centerCY, innerR, 0, Math.PI * 2);
                ctx.fill();

                // 2.5 内壁同心金丝花纹
                ctx.strokeStyle = 'rgba(245, 196, 75, 0.45)';
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.arc(centerCX, centerCY, innerR - 5, 0, Math.PI * 2);
                ctx.stroke();

                // 八方如意暗纹射线
                ctx.strokeStyle = 'rgba(245, 196, 75, 0.12)';
                ctx.lineWidth = 1;
                for (let i = 0; i < 8; i++) {
                    const lineA = (i * Math.PI * 2) / 8;
                    ctx.beginPath();
                    ctx.moveTo(centerCX + Math.cos(lineA) * (innerR * 0.25), centerCY + Math.sin(lineA) * (innerR * 0.25));
                    ctx.lineTo(centerCX + Math.cos(lineA) * (innerR - 7), centerCY + Math.sin(lineA) * (innerR - 7));
                    ctx.stroke();
                }

                // 3. 圆盘内排版内容 (居中呈现华彩称号与超大高光功德数字，无多余遮挡)
                // 3.1 顶部华彩主标题
                ctx.textAlign = 'center';
                ctx.save();
                ctx.shadowColor = '#FFD700';
                ctx.shadowBlur = 14;
                ctx.font = `bold ${Math.round(18 * uiScale)}px sans-serif`;
                ctx.fillStyle = '#FFE072';
                ctx.fillText(tierTitle, centerCX, centerCY - innerR * 0.46);
                ctx.restore();

                // 3.2 副标题金色飘带徽章
                const ribbonW = Math.min(innerR * 1.55, 172);
                const ribbonH = 22;
                const ribbonX = centerCX - ribbonW / 2;
                const ribbonY = centerCY - innerR * 0.28;
                ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
                drawRoundRect(ctx, ribbonX, ribbonY, ribbonW, ribbonH, 11);
                ctx.fill();
                ctx.strokeStyle = 'rgba(245, 196, 75, 0.5)';
                ctx.lineWidth = 1;
                ctx.stroke();

                ctx.font = `bold ${Math.round(10.5 * uiScale)}px sans-serif`;
                ctx.fillStyle = '#F5C44B';
                ctx.fillText(tierBadge, centerCX, ribbonY + 15);

                // 3.3 核心超大额功德数字 (超大金光立体高亮大字，无逗号纯净大字)
                const numPulse = 0.5 + 0.5 * Math.sin(nowTime * 0.006);
                ctx.save();
                ctx.shadowColor = '#FFD700';
                ctx.shadowBlur = 20 + 10 * numPulse;
                ctx.font = `bold ${Math.round(48 * uiScale)}px sans-serif`;
                ctx.fillStyle = '#FFFDF0';
                ctx.fillText(`+${bw.winAmount}`, centerCX, centerCY + innerR * 0.22);
                ctx.restore();

                // 3.4 底部典雅功德注脚
                ctx.font = `bold ${Math.round(10 * uiScale)}px sans-serif`;
                ctx.fillStyle = '#D4AF37';
                ctx.fillText('✦ 功德福报 ✦', centerCX, centerCY + innerR * 0.48);

                // 4. 圆盘下方呼吸提示文案：“—— 轻触屏幕任意处关闭 ——”
                const promptY = centerCY + radius + Math.round(28 * uiScale);
                const promptAlpha = 0.65 + 0.35 * Math.sin(nowTime * 0.004);
                ctx.save();
                ctx.globalAlpha = promptAlpha;
                ctx.font = `bold ${Math.round(11.5 * uiScale)}px sans-serif`;
                ctx.fillStyle = '#FFE072';
                ctx.fillText('—— 轻触屏幕任意处关闭 ——', centerCX, promptY);
                ctx.restore();
            }
        }

        // 全局最高层级：屏幕中心浮动提示 Toast
        drawScreenToast(ctx);

        ctx.restore();
    } catch (e) {
        console.error('渲染过程捕获异常:', e);
        try { ctx.restore(); } catch (err) {}
    }

    if (typeof requestAnimationFrame !== 'undefined') {
        requestAnimationFrame(render);
    }
}

// ------------------------------------------------------------------
// 处理启动参数与落地直达（如通过好友灵签分享直达抽签页、群排行榜等）
// ------------------------------------------------------------------
function handleLaunchQuery(query) {
    if (!query) return;
    try {
        if (query.modal === 'fortune_slip') {
            if (query.temple && TEMPLE_MODES.some(t => t.id === query.temple)) {
                state.currentTempleId = query.temple;
                if (typeof wx !== 'undefined' && wx.setStorageSync) {
                    try { wx.setStorageSync('qmy_temple_id', state.currentTempleId); } catch(e) {}
                }
            }
            state.currentModal = 'fortune_slip';
            state.fortuneState = 'idle';
            startFortuneShakeListener();
        } else if (query.modal === 'gemhunt') {
            state.currentModal = 'gemhunt';
        } else if (query.modal === 'rank') {
            state.currentModal = 'rank';
            reportScoreToFriendCloud();
            requestFriendRankData();
        }
    } catch(e) {}
}

// 启动时检查首次启动参数
if (typeof wx !== 'undefined' && wx.getLaunchOptionsSync) {
    try {
        const launchOpts = wx.getLaunchOptionsSync();
        if (launchOpts && launchOpts.query) {
            handleLaunchQuery(launchOpts.query);
        }
    } catch(e) {}
}

// 启动时自动启播静心 BGM
setTimeout(() => {
    soundManager.updateBgmState();
}, 500);

if (typeof wx !== 'undefined' && wx.onShow) {
    wx.onShow((res) => {
        soundManager.updateBgmState();
        if (res && res.query) {
            handleLaunchQuery(res.query);
        }
    });
}
if (typeof wx !== 'undefined' && wx.onHide) {
    wx.onHide(() => {
        soundManager.stopBgm();
    });
}

// 开启微信右上角分享与朋友圈支持 (完全合规、无诱导分享)
if (typeof wx !== 'undefined') {
    if (wx.showShareMenu) {
        try {
            wx.showShareMenu({
                withShareTicket: true,
                menus: ['shareAppMessage', 'shareTimeline']
            });
        } catch (e) {}
    }
    if (wx.onShareAppMessage) {
        wx.onShareAppMessage(() => {
            const temple = getCurrentTemple();
            if (state.currentModal === 'fortune_slip' && state.todayFortuneSlip) {
                const slip = state.todayFortuneSlip;
                const tierText = slip.tier ? slip.tier.replace(/【|】/g, '') : '大吉';
                const poemFirstLine = (slip.poem && slip.poem[0]) ? slip.poem[0] : '诸般顺遂皆如意';
                return {
                    title: `喜提【${tierText}】！我在${temple.name}抽到${slip.name}：“${poemFirstLine}”～快来测测今日运势！`,
                    imageUrl: 'share_500x400.jpg',
                    query: `modal=fortune_slip&temple=${temple.id}`
                };
            }
            return {
                title: '敲电子木鱼，修静心功德！快来和我一起沉浸解压修行吧～',
                imageUrl: 'share_500x400.jpg',
                query: 'modal=woodfish'
            };
        });
    }
    if (wx.onShareTimeline) {
        wx.onShareTimeline(() => ({
            title: '敲电子木鱼，修静心功德！静心凝神，福运常伴。'
        }));
    }
}

if (typeof requestAnimationFrame !== 'undefined') {
    requestAnimationFrame(render);
} else {
    setInterval(render, 16);
}
