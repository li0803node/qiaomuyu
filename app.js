if (typeof App !== 'undefined') {
    try {
        App({ onLaunch() { console.log('《静心敲木鱼》小程序环境启动'); } });
    } catch(e) {}
}

/**
 * 《静心敲木鱼》全功能 Web 交互原型驱动引擎
 * 纯原生、无依赖、稳健架构：敲击动画、木槌击打、WebAudio 算法音效与背景音乐、14档称号、多榜单、广告模拟
 */

// 14 档静心称号配置 (严禁任何宗教玄学词汇)
const TITLE_CONFIGS = [
    { id: 1,  name: '初闻叩响', minHit: 0,        maxHit: 999,      desc: '始于指尖微鸣，心绪初定' },
    { id: 2,  name: '浅叩静心', minHit: 1000,     maxHit: 2999,     desc: '叩响渐入佳境，宁静自生' },
    { id: 3,  name: '闲音入耳', minHit: 3000,     maxHit: 6999,     desc: '音律悠然如风，尘虑渐消' },
    { id: 4,  name: '心随音静', minHit: 7000,     maxHit: 14999,    desc: '音起心随，万物皆安' },
    { id: 5,  name: '静叩闲客', minHit: 15000,    maxHit: 29999,    desc: '闲庭信步，安享清宁' },
    { id: 6,  name: '清音渡绪', minHit: 30000,    maxHit: 59999,    desc: '一曲清音，抚平千层杂绪' },
    { id: 7,  name: '平心观意', minHit: 60000,    maxHit: 119999,   desc: '观心自在，波澜不惊' },
    { id: 8,  name: '漫叩流年', minHit: 120000,   maxHit: 249999,   desc: '流年似水，步步澄明' },
    { id: 9,  name: '尘扰皆息', minHit: 250000,   maxHit: 499999,   desc: '红尘扰攘，至此悄然平息' },
    { id: 10, name: '静心渡己', minHit: 500000,   maxHit: 999999,   desc: '守心如玉，自度清欢' },
    { id: 11, name: '万音归寂', minHit: 1000000,  maxHit: 1999999,  desc: '天地广阔，万物归于寂然' },
    { id: 12, name: '虚境听禅', minHit: 2000000,  maxHit: 4999999,  desc: '神思超然，心境澄澈空明' },
    { id: 13, name: '云间叩者', minHit: 5000000,  maxHit: 9999999,  desc: '如立云端，俯瞰世间纷扰' },
    { id: 14, name: '尘梦尽宁', minHit: 10000000, maxHit: Infinity, desc: '大梦初醒，天地万籁俱宁' }
];

const CONFIG = {
    DAILY_CRIT_AD_MAX: 6,
    DAILY_AUTO_AD_MAX: 5,
    CRIT_DURATION_MS: 60 * 60 * 1000, // 60 分钟
    AUTO_HIT_DURATION_SEC: 10 * 60,   // 10 分钟
    AUTO_HIT_INTERVAL_MS: 600         // 600ms 敲一次
};

// 游戏状态
const state = {
    totalHit: 0,
    critRate: 1,
    critEndTime: 0,
    isAutoHiting: false,
    autoRemainingSec: 0,
    dailyCritCount: 0,
    dailyAutoCount: 0,
    sfxEnabled: true,
    bgmEnabled: true,
    userProvince: '',
    userCity: '',
    userDistrict: '',
    currentTitleId: 1,
    userProfile: {
        nickname: '静心居士',
        avatarIcon: '🪷',
        customAvatarImg: '',
        openid: 'wx_zen_8892147',
        uid: '2026081042',
        account: ''
    },
    // 健康防疲劳休息系统 (连续敲击1小时休息10分钟)
    continuousTappingSec: 0,
    isResting: false,
    restRemainingSec: 0,

    // 游艺坊 · 功德寻宝 (5x3 滚轴连线)
    gemHunt: {
        currentBetIndex: 0, // 默认 200
        unlockedBets: {},   // { 2000: timestamp, 5000: timestamp, ... }
        isSpinning: false,
        isAutoSpinning: false,
        freeSpinsRemaining: 0,
        skipWinAnimation: false,
        dailyAdScoreCount: 0,
        scatterCount: 0,
        grid: [
            [null, null, null],
            [null, null, null],
            [null, null, null],
            [null, null, null],
            [null, null, null]
        ]
    }
};

// Web Audio 上下文与音频引擎
let audioCtx = null;

function initAudio() {
    try {
        const AudioClass = window.AudioContext || window.webkitAudioContext;
        if (AudioClass && !audioCtx) {
            audioCtx = new AudioClass();
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    } catch (e) {
        console.warn('[Audio] WebAudio not supported');
    }
}

/**
 * 物理声学算法合成木鱼敲击声 (不同倍率具有不同泛音深度)
 */
function playWoodHitSound(critRate = 1) {
    if (!state.sfxEnabled) return;
    initAudio();
    if (!audioCtx) return;

    const now = audioCtx.currentTime;

    // 1. 瞬态打击声 (温和圆润木质敲击接触)
    const bufferSize = Math.floor(audioCtx.sampleRate * 0.008);
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
    }
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    const noiseFilter = audioCtx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 1800; // 过滤掉刺耳的高频白噪毛刺

    const noiseGain = audioCtx.createGain();
    noiseGain.gain.setValueAtTime(0.15, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.008);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(audioCtx.destination);
    noise.start(now);

    // 2. 木腔共振温润正弦基频 (沉稳檀木共振)
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const baseFreq = 300 - (critRate - 1) * 6;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq * 1.35, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq, now + 0.018);

    const decay = 0.15 + critRate * 0.02;
    gain.gain.setValueAtTime(0.65, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + decay);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + decay);

    // 3. 高阶暴击金石清脆泛音 (3倍以上)
    if (critRate >= 3) {
        const harmOsc = audioCtx.createOscillator();
        const harmGain = audioCtx.createGain();
        harmOsc.type = 'sine';
        harmOsc.frequency.setValueAtTime(baseFreq * 2.8, now);
        harmGain.gain.setValueAtTime(0.12 * (critRate / 5), now);
        harmGain.gain.exponentialRampToValueAtTime(0.0001, now + decay * 1.2);

        harmOsc.connect(harmGain);
        harmGain.connect(audioCtx.destination);
        harmOsc.start(now);
        harmOsc.stop(now + decay * 1.2);
    }
}

// 6 首极致纯净静心禅音曲目定义 (含真实僧众诵经梵唱)
const BGM_TRACK_CONFIGS = [
    { id: 1, name: '《大悲梵呗》', desc: '梵音诵经 · 僧众梵唱 · 极具静心' },
    { id: 2, name: '《空谷清磬》', desc: '432Hz 水晶钵 · 纯净空灵' },
    { id: 3, name: '《平湖秋月》', desc: '古琴清音 · 温润和声' },
    { id: 4, name: '《云端风铃》', desc: '水晶风铃 · 清透无瑕' },
    { id: 5, name: '《滴水落玉》', desc: '水滴如磬 · 纯正弦波' },
    { id: 6, name: '《虚境无尘》', desc: 'Alpha 冥想 · 安神助眠' },
    { id: 0, name: '《自定义音频》', desc: '本地导入专属背景音乐' }
];

// ==========================================================================
// 🔊 游艺坊 · 功德寻宝物理音效引擎 (纯 WebAudio 合成)
// ==========================================================================
function playSpinStartSound() {
    if (!state.sfxEnabled) return;
    initAudio();
    if (!audioCtx) return;
    try {
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(480, now + 0.18);
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.35);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.18, now + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
    } catch (e) {}
}

function playReelStopSound(col) {
    if (!state.sfxEnabled) return;
    initAudio();
    if (!audioCtx) return;
    try {
        const now = audioCtx.currentTime;
        const baseFreq = 180 + col * 40;

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.09);
    } catch (e) {}
}

function playScatterCollectSound() {
    if (!state.sfxEnabled) return;
    initAudio();
    if (!audioCtx) return;
    try {
        const now = audioCtx.currentTime;
        const chimeFreqs = [523.25, 659.25, 783.99, 1046.5];
        chimeFreqs.forEach((f, i) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(f, now + i * 0.05);

            gain.gain.setValueAtTime(0.001, now + i * 0.05);
            gain.gain.linearRampToValueAtTime(0.18, now + i * 0.05 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.6);

            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(now + i * 0.05);
            osc.stop(now + i * 0.05 + 0.6);
        });
    } catch (e) {}
}

function playWinFanfareSound(winAmount) {
    if (!state.sfxEnabled) return;
    initAudio();
    if (!audioCtx) return;
    try {
        const now = audioCtx.currentTime;
        const notes = [440, 554.37, 659.25, 880, 1108.7];
        notes.forEach((freq, idx) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.08);

            gain.gain.setValueAtTime(0.001, now + idx * 0.08);
            gain.gain.linearRampToValueAtTime(0.22, now + idx * 0.08 + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.8);

            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(now + idx * 0.08);
            osc.stop(now + idx * 0.08 + 0.8);
        });

        for (let i = 0; i < 8; i++) {
            const coinOsc = audioCtx.createOscillator();
            const coinGain = audioCtx.createGain();
            coinOsc.type = 'triangle';
            coinOsc.frequency.setValueAtTime(1200 + Math.random() * 800, now + 0.2 + i * 0.05);

            coinGain.gain.setValueAtTime(0.08, now + 0.2 + i * 0.05);
            coinGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2 + i * 0.05 + 0.06);

            coinOsc.connect(coinGain);
            coinGain.connect(audioCtx.destination);
            coinOsc.start(now + 0.2 + i * 0.05);
            coinOsc.stop(now + 0.2 + i * 0.05 + 0.06);
        }
    } catch (e) {}
}

/**
 * 本地 IndexedDB 音频持久化管理器
 */
const AudioDB = {
    dbName: 'QiaoMuYu_Audio_DB',
    storeName: 'custom_audio_store',
    
    open() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(this.dbName, 1);
            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName, { keyPath: 'id' });
                }
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    },

    async save(name, arrayBuffer) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.storeName, 'readwrite');
            const store = tx.objectStore(this.storeName);
            store.put({ id: 'custom_bgm', name, data: arrayBuffer, timestamp: Date.now() });
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => reject(tx.error);
        });
    },

    async get() {
        try {
            const db = await this.open();
            return new Promise((resolve) => {
                const tx = db.transaction(this.storeName, 'readonly');
                const store = tx.objectStore(this.storeName);
                const req = store.get('custom_bgm');
                req.onsuccess = () => resolve(req.result || null);
                req.onerror = () => resolve(null);
            });
        } catch (e) {
            return null;
        }
    },

    async delete() {
        try {
            const db = await this.open();
            return new Promise((resolve) => {
                const tx = db.transaction(this.storeName, 'readwrite');
                const store = tx.objectStore(this.storeName);
                store.delete('custom_bgm');
                tx.oncomplete = () => resolve(true);
                tx.onerror = () => resolve(false);
            });
        } catch (e) {
            return false;
        }
    }
};

/**
 * 算法级静心禅意背景音乐引擎 (ZenBGMPlayer - 含梵音诵经声学共振峰合成)
 */
class ZenBGMPlayer {
    constructor() {
        this.isPlaying = false;
        this.timer = null;
        this.baseOscillators = [];
        this.masterGain = null;
        this.currentTrackId = 1;
        this.customAudioBuffer = null;
        this.customAudioName = '';
        this.customSourceNode = null;
    }

    setCustomAudio(name, audioBuffer) {
        this.customAudioName = name;
        this.customAudioBuffer = audioBuffer;
        updateCustomTrackUI();
    }

    setTrack(trackId) {
        this.currentTrackId = trackId;
        localStorage.setItem('qmy_bgm_track', trackId.toString());
        if (this.isPlaying) {
            this.stop();
            this.start();
        }
        updateTrackUI();
    }

    start() {
        if (this.isPlaying) return;
        initAudio();
        if (!audioCtx) return;

        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        this.isPlaying = true;

        this.masterGain = audioCtx.createGain();
        this.masterGain.gain.setValueAtTime(0.24, audioCtx.currentTime);
        this.masterGain.connect(audioCtx.destination);

        switch (this.currentTrackId) {
            case 0:
                this.startTrackCustom();
                break;
            case 1:
                this.startTrackBuddhistChanting();
                break;
            case 2:
                this.startTrackSingingBowl();
                break;
            case 3:
                this.startTrackGuqinMoon();
                break;
            case 4:
                this.startTrackCrystalChimes();
                break;
            case 5:
                this.startTrackJadeDrops();
                break;
            case 6:
                this.startTrackAlphaZen();
                break;
            default:
                this.startTrackBuddhistChanting();
                break;
        }

        updateBgmVisual(true);
    }

    // 曲目 1: 《大悲梵呗 · 梵音诵经》
    startTrackBuddhistChanting() {
        const chantDrones = [108.0, 216.0];
        
        chantDrones.forEach(freq => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

            const formantFilter = audioCtx.createBiquadFilter();
            formantFilter.type = 'bandpass';
            formantFilter.frequency.setValueAtTime(520, audioCtx.currentTime);
            formantFilter.Q.setValueAtTime(4.5, audioCtx.currentTime);

            gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
            gain.gain.linearRampToValueAtTime(0.07, audioCtx.currentTime + 3.0);

            osc.connect(formantFilter);
            formantFilter.connect(gain);
            gain.connect(this.masterGain);
            osc.start();
            this.baseOscillators.push(osc);
        });

        const chantNotes = [108.0, 144.0, 162.0, 192.0, 216.0];
        const chantVowels = [450, 680, 850, 1100];
        let chantIdx = 0;

        const playChantVoice = () => {
            if (!this.isPlaying || !audioCtx || !this.masterGain) return;
            const now = audioCtx.currentTime;

            chantIdx = (chantIdx + 1) % chantNotes.length;
            const pitch = chantNotes[chantIdx];
            const vowelF = chantVowels[Math.floor(Math.random() * chantVowels.length)];

            const osc = audioCtx.createOscillator();
            const filter = audioCtx.createBiquadFilter();
            const gain = audioCtx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(pitch, now);

            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(vowelF, now);
            filter.Q.setValueAtTime(5.0, now);

            gain.gain.setValueAtTime(0.0001, now);
            gain.gain.linearRampToValueAtTime(0.22, now + 0.8);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 4.2);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain);
            osc.start(now);
            osc.stop(now + 4.2);

            if (Math.random() > 0.4) {
                const bellOsc = audioCtx.createOscillator();
                const bellGain = audioCtx.createGain();
                bellOsc.type = 'sine';
                bellOsc.frequency.setValueAtTime(864, now + 0.1);

                bellGain.gain.setValueAtTime(0.001, now + 0.1);
                bellGain.gain.linearRampToValueAtTime(0.08, now + 0.14);
                bellGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.2);

                bellOsc.connect(bellGain);
                bellGain.connect(this.masterGain);
                bellOsc.start(now + 0.1);
                bellOsc.stop(now + 3.2);
            }

            this.timer = setTimeout(playChantVoice, 3200 + Math.random() * 1200);
        };

        playChantVoice();
    }

    // 曲目 0: 用户自定义上传音频循环播放
    startTrackCustom() {
        if (!this.customAudioBuffer || !audioCtx || !this.masterGain) {
            // 如果尚未上传，自动回退到曲目 1
            showToast('未检测到自定义音频，正在为您播放《空谷清磬》');
            this.currentTrackId = 1;
            this.startTrackSingingBowl();
            updateTrackUI();
            return;
        }

        try {
            const source = audioCtx.createBufferSource();
            source.buffer = this.customAudioBuffer;
            source.loop = true; // 无缝循环播放
            source.connect(this.masterGain);
            source.start();
            this.customSourceNode = source;
            this.baseOscillators.push(source);
        } catch (e) {
            console.error('[Audio] Play custom audio error:', e);
            showToast('播放自定义音频失败，已切换至《空谷清磬》');
            this.currentTrackId = 1;
            this.startTrackSingingBowl();
            updateTrackUI();
        }
    }

    // 曲目 1: 《空谷清磬》 (432Hz 纯净水晶钵共振，无任何杂音)
    startTrackSingingBowl() {
        // 432Hz 纯正五音音阶 (D4, E4, F#4, A4, B4, D5, E5, F#5)
        const scale = [288.0, 324.0, 360.0, 432.0, 486.0, 576.0, 648.0, 720.0];
        let idx = 3; // 从 432Hz 开始

        const playBowlNote = () => {
            if (!this.isPlaying || !audioCtx || !this.masterGain) return;
            const now = audioCtx.currentTime;

            idx = Math.max(0, Math.min(scale.length - 1, idx + (Math.floor(Math.random() * 3) - 1)));
            const freq = scale[idx];

            // 1. 基频纯净正弦波 (水晶钵主音)
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now);

            // 丝滑柔顺的 Attack(0.12s) 与自然的长衰减(4.2s)
            gain.gain.setValueAtTime(0.0001, now);
            gain.gain.linearRampToValueAtTime(0.25, now + 0.12);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 4.2);

            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(now);
            osc.stop(now + 4.2);

            // 2. 纯净泛音 (水晶钵 2.76 倍物理共振泛音，极微弱点缀)
            const harmOsc = audioCtx.createOscillator();
            const harmGain = audioCtx.createGain();
            harmOsc.type = 'sine';
            harmOsc.frequency.setValueAtTime(freq * 2.76, now);

            harmGain.gain.setValueAtTime(0.0001, now);
            harmGain.gain.linearRampToValueAtTime(0.06, now + 0.08);
            harmGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.5);

            harmOsc.connect(harmGain);
            harmGain.connect(this.masterGain);
            harmOsc.start(now);
            harmOsc.stop(now + 2.5);

            this.timer = setTimeout(playBowlNote, 2400 + Math.random() * 1600);
        };

        playBowlNote();
    }

    // 曲目 2: 《平湖秋月》 (古琴清音泛音，温润儒雅)
    startTrackGuqinMoon() {
        const guqinScale = [144.0, 192.0, 216.0, 288.0, 324.0, 384.0, 432.0, 576.0];
        let idx = 2;

        const playGuqinNote = () => {
            if (!this.isPlaying || !audioCtx || !this.masterGain) return;
            const now = audioCtx.currentTime;

            idx = Math.max(0, Math.min(guqinScale.length - 1, idx + (Math.floor(Math.random() * 3) - 1)));
            const freq = guqinScale[idx];

            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now);

            gain.gain.setValueAtTime(0.0001, now);
            gain.gain.linearRampToValueAtTime(0.28, now + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.6);

            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(now);
            osc.stop(now + 3.6);

            // 温和的八度泛音
            const harmOsc = audioCtx.createOscillator();
            const harmGain = audioCtx.createGain();
            harmOsc.type = 'sine';
            harmOsc.frequency.setValueAtTime(freq * 2.0, now);
            harmGain.gain.setValueAtTime(0.0001, now);
            harmGain.gain.linearRampToValueAtTime(0.08, now + 0.04);
            harmGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.0);

            harmOsc.connect(harmGain);
            harmGain.connect(this.masterGain);
            harmOsc.start(now);
            harmOsc.stop(now + 2.0);

            this.timer = setTimeout(playGuqinNote, 2200 + Math.random() * 1500);
        };

        playGuqinNote();
    }

    // 曲目 3: 《云端风铃》 (纯正弦波高音水晶风铃，通透空灵)
    startTrackCrystalChimes() {
        const chimeFreqs = [648.0, 810.0, 972.0, 1296.0, 1458.0, 1620.0, 1944.0];

        const playChime = () => {
            if (!this.isPlaying || !audioCtx || !this.masterGain) return;
            const now = audioCtx.currentTime;
            const freq = chimeFreqs[Math.floor(Math.random() * chimeFreqs.length)];

            // 主风铃音
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now);

            gain.gain.setValueAtTime(0.0001, now);
            gain.gain.linearRampToValueAtTime(0.18, now + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.0);

            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(now);
            osc.stop(now + 3.0);

            // 偶尔触发微风清脆双音
            if (Math.random() > 0.4) {
                const echoFreq = chimeFreqs[Math.floor(Math.random() * chimeFreqs.length)];
                const echoOsc = audioCtx.createOscillator();
                const echoGain = audioCtx.createGain();
                echoOsc.type = 'sine';
                echoOsc.frequency.setValueAtTime(echoFreq, now + 0.15);

                echoGain.gain.setValueAtTime(0.0001, now + 0.15);
                echoGain.gain.linearRampToValueAtTime(0.12, now + 0.17);
                echoGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.5);

                echoOsc.connect(echoGain);
                echoGain.connect(this.masterGain);
                echoOsc.start(now + 0.15);
                echoOsc.stop(now + 2.5);
            }

            this.timer = setTimeout(playChime, 1800 + Math.random() * 1800);
        };

        playChime();
    }

    // 曲目 4: 《滴水落玉》 (纯正弦波水滴与颂钵余音，无任何杂音白噪)
    startTrackJadeDrops() {
        const dropFreqs = [576.0, 648.0, 720.0, 864.0, 972.0, 1152.0];

        const playDrop = () => {
            if (!this.isPlaying || !audioCtx || !this.masterGain) return;
            const now = audioCtx.currentTime;
            const targetFreq = dropFreqs[Math.floor(Math.random() * dropFreqs.length)];

            // 水滴纯正弦频移 (从 1.25x 快速滑降至基频，模拟清脆落水)
            const dropOsc = audioCtx.createOscillator();
            const dropGain = audioCtx.createGain();
            dropOsc.type = 'sine';
            dropOsc.frequency.setValueAtTime(targetFreq * 1.22, now);
            dropOsc.frequency.exponentialRampToValueAtTime(targetFreq, now + 0.05);

            dropGain.gain.setValueAtTime(0.0001, now);
            dropGain.gain.linearRampToValueAtTime(0.20, now + 0.015);
            dropGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

            dropOsc.connect(dropGain);
            dropGain.connect(this.masterGain);
            dropOsc.start(now);
            dropOsc.stop(now + 1.8);

            this.timer = setTimeout(playDrop, 1200 + Math.random() * 1400);
        };

        playDrop();
    }

    // 曲目 5: 《虚境无尘》 (432Hz 纯正弦双耳 6Hz Alpha 助眠冥想波)
    startTrackAlphaZen() {
        // 双耳拍频 (432Hz + 438Hz = 6Hz Alpha 舒缓深层冥想脑波)
        const alphaPairs = [
            { f: 216.0, g: 0.06 },
            { f: 222.0, g: 0.06 },
            { f: 432.0, g: 0.08 },
            { f: 438.0, g: 0.08 }
        ];

        alphaPairs.forEach(item => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(item.f, audioCtx.currentTime);

            gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
            gain.gain.linearRampToValueAtTime(item.g, audioCtx.currentTime + 2.0);

            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start();
            this.baseOscillators.push(osc);
        });

        // 柔和的冥想五音和声漫步
        const zenScale = [324.0, 432.0, 486.0, 540.0, 648.0];
        const playZenNote = () => {
            if (!this.isPlaying || !audioCtx || !this.masterGain) return;
            const now = audioCtx.currentTime;
            const freq = zenScale[Math.floor(Math.random() * zenScale.length)];

            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now);

            gain.gain.setValueAtTime(0.0001, now);
            gain.gain.linearRampToValueAtTime(0.16, now + 0.4);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 4.5);

            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(now);
            osc.stop(now + 4.5);

            this.timer = setTimeout(playZenNote, 2800 + Math.random() * 2000);
        };

        playZenNote();
    }

    stop() {
        if (!this.isPlaying) return;
        this.isPlaying = false;

        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }

        if (this.masterGain && audioCtx) {
            try {
                this.masterGain.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
            } catch (e) {}
        }

        setTimeout(() => {
            this.baseOscillators.forEach(node => {
                try {
                    node.stop();
                    node.disconnect();
                } catch (e) {}
            });
            this.baseOscillators = [];
            this.masterGain = null;
        }, 350);

        updateBgmVisual(false);
    }
}

const zenBGM = new ZenBGMPlayer();

function playGenerativeBGM() {
    if (state.bgmEnabled) {
        zenBGM.start();
    }
}

function stopGenerativeBGM() {
    zenBGM.stop();
}

function updateBgmVisual(isPlaying) {
    const icon = document.getElementById('bgm-indicator-btn');
    if (icon) {
        if (isPlaying) {
            icon.classList.add('playing');
            const track = BGM_TRACK_CONFIGS.find(t => t.id === zenBGM.currentTrackId) || BGM_TRACK_CONFIGS[0];
            icon.title = `静心背景音乐：${track.name} 播放中 (点击切换)`;
        } else {
            icon.classList.remove('playing');
            icon.title = '静心背景音乐：已暂停 (点击开启)';
        }
    }
}

function updateTrackUI() {
    let trackName = '《空谷清磬》';
    if (zenBGM.currentTrackId === 0) {
        trackName = zenBGM.customAudioName ? `《${zenBGM.customAudioName}》` : '《自定义音频》';
    } else {
        const track = BGM_TRACK_CONFIGS.find(t => t.id === zenBGM.currentTrackId) || BGM_TRACK_CONFIGS[0];
        trackName = track.name;
    }

    const nameLabel = document.getElementById('current-track-name');
    if (nameLabel) {
        nameLabel.textContent = trackName;
    }

    document.querySelectorAll('.track-item-btn').forEach(btn => {
        const id = parseInt(btn.getAttribute('data-track'), 10);
        if (id === zenBGM.currentTrackId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    updateCustomTrackUI();
}

function updateCustomTrackUI() {
    const customTitleEl = document.getElementById('custom-track-title');
    const customDescEl = document.getElementById('custom-track-desc');
    const btnClear = document.getElementById('btn-clear-custom');

    if (zenBGM.customAudioBuffer && zenBGM.customAudioName) {
        if (customTitleEl) customTitleEl.textContent = `6. 《${zenBGM.customAudioName}》`;
        if (customDescEl) customDescEl.textContent = '已导入 · 点击即播自定义专属音乐';
        if (btnClear) btnClear.classList.remove('hidden');
    } else {
        if (customTitleEl) customTitleEl.textContent = '6. 自定义专属音频';
        if (customDescEl) customDescEl.textContent = '未上传 · 支持 MP3/WAV/M4A';
        if (btnClear) btnClear.classList.add('hidden');
    }
}

// DOM 元素引用集合
let dom = {};

function initDomReferences() {
    dom = {
        totalHit: document.getElementById('total-hit'),
        currentTitle: document.getElementById('current-title'),
        critStatusCard: document.getElementById('crit-status-card'),
        critTitle: document.getElementById('crit-title'),
        critTimer: document.getElementById('crit-timer'),
        auraHalo: document.getElementById('aura-halo'),
        woodfishBtn: document.getElementById('woodfish-btn'),
        woodMallet: document.getElementById('wood-mallet'),
        floatContainer: document.getElementById('floating-text-container'),
        toastBox: document.getElementById('toast-box'),
        toastText: document.getElementById('toast-text'),
        btnCritAd: document.getElementById('btn-crit-ad'),
        critAdCountLabel: document.getElementById('crit-ad-count-label'),
        btnAutoAd: document.getElementById('btn-auto-ad'),
        autoBtnMainTitle: document.getElementById('auto-btn-main-title'),
        autoAdCountLabel: document.getElementById('auto-ad-count-label'),
        modalRank: document.getElementById('modal-rank'),
        modalTitle: document.getElementById('modal-title'),
        modalSettings: document.getElementById('modal-settings'),
        modalPrivacy: document.getElementById('modal-privacy'),
        modalAdPlayer: document.getElementById('modal-ad-player'),
        modalInterstitial: document.getElementById('modal-interstitial'),
        modalUser: document.getElementById('modal-user'),
        toggleSfx: document.getElementById('toggle-sfx'),
        toggleBgm: document.getElementById('toggle-bgm'),
        // 个人中心 DOM
        btnOpenUserModal: document.getElementById('btn-open-user-modal'),
        btnCloseUser: document.getElementById('btn-close-user'),
        headerAvatarBox: document.getElementById('header-avatar-box'),
        headerUserNickname: document.getElementById('header-user-nickname'),
        headerUserTag: document.getElementById('header-user-tag'),
        userLargeAvatarBox: document.getElementById('user-large-avatar-box'),
        inputNickname: document.getElementById('input-nickname'),
        btnSaveNickname: document.getElementById('btn-save-nickname'),
        btnTriggerAvatarUpload: document.getElementById('btn-trigger-avatar-upload'),
        inputCustomAvatar: document.getElementById('input-custom-avatar'),
        btnAccLogin: document.getElementById('btn-acc-login'),
        btnAccBind: document.getElementById('btn-acc-bind'),
        inputAccName: document.getElementById('input-account-name'),
        inputAccPwd: document.getElementById('input-account-pwd'),
        accOpenidVal: document.getElementById('acc-openid-val'),
        accUidVal: document.getElementById('acc-uid-val'),
        // 游艺坊与功德寻宝 DOM
        btnOpenMinigames: document.getElementById('btn-open-minigames'),
        modalMinigames: document.getElementById('modal-minigames'),
        btnCloseMinigames: document.getElementById('btn-close-minigames'),
        btnEnterGemHunt: document.getElementById('btn-enter-gem-hunt'),
        modalGemHunt: document.getElementById('modal-gem-hunt'),
        btnExitGemHunt: document.getElementById('btn-exit-gem-hunt'),
        ghTotalHit: document.getElementById('gh-total-hit'),
        btnGhAdScore: document.getElementById('btn-gh-ad-score'),
        ghAdScoreLeftHint: document.getElementById('gh-ad-score-left-hint'),
        btnGhOpenRank: document.getElementById('btn-gh-open-rank'),
        toggleSkipWinAnim: document.getElementById('toggle-skip-win-anim'),
        btnGhRules: document.getElementById('btn-gh-rules'),
        modalGemRules: document.getElementById('modal-gem-rules'),
        btnCloseGemRules: document.getElementById('btn-close-gem-rules'),
        btnBetMinus: document.getElementById('btn-bet-minus'),
        btnBetPlus: document.getElementById('btn-bet-plus'),
        btnOpenBetModal: document.getElementById('btn-open-bet-modal'),
        ghCurrentBet: document.getElementById('gh-current-bet'),
        ghBetLockIcon: document.getElementById('gh-bet-lock-icon'),
        btnGhSpin: document.getElementById('btn-gh-spin'),
        ghSpinText: document.getElementById('gh-spin-text'),
        ghFreeSpinsBar: document.getElementById('gh-free-spins-bar'),
        ghFreeSpinsCount: document.getElementById('gh-free-spins-count'),
        modalGemWin: document.getElementById('modal-gem-win'),
        winScoreNum: document.getElementById('win-score-num'),
        modalBetPicker: document.getElementById('modal-bet-picker'),
        btnCloseBetPicker: document.getElementById('btn-close-bet-picker'),
        modalUnlockBet: document.getElementById('modal-unlock-bet'),
        btnCloseUnlockBet: document.getElementById('btn-close-unlock-bet'),
        unlockBetTitle: document.getElementById('unlock-bet-title'),
        btnConfirmWatchAdBet: document.getElementById('btn-confirm-watch-ad-bet'),
        modalNotEnoughScore: document.getElementById('modal-not-enough-score'),
        btnCloseNotEnoughScore: document.getElementById('btn-close-not-enough-score'),
        btnCancelNotEnough: document.getElementById('btn-cancel-not-enough'),
        btnConfirmWatchAdForScore: document.getElementById('btn-confirm-watch-ad-for-score'),
        zenRestOverlay: document.getElementById('zen-rest-overlay'),
        restTimerVal: document.getElementById('rest-timer-val')
    };
}

// 渲染个人中心资料 (纯净背景渲染模式)
function renderUserProfile() {
    const p = state.userProfile;
    // 顶部状态栏
    if (dom.headerUserNickname) dom.headerUserNickname.textContent = p.nickname;
    if (dom.headerUserTag) {
        const title = getCurrentTitle(state.totalHit);
        dom.headerUserTag.textContent = `LV.${title.id}`;
    }

    // 顶部头像与弹窗大头像纯净渲染 (使用 CSS background-image，彻底无文字乱码)
    if (p.customAvatarImg) {
        if (dom.headerAvatarBox) {
            dom.headerAvatarBox.style.backgroundImage = `url("${p.customAvatarImg}")`;
            dom.headerAvatarBox.textContent = '';
        }
        if (dom.userLargeAvatarBox) {
            dom.userLargeAvatarBox.style.backgroundImage = `url("${p.customAvatarImg}")`;
            dom.userLargeAvatarBox.textContent = '';
        }
    } else {
        const icon = p.avatarIcon || '🪷';
        if (dom.headerAvatarBox) {
            dom.headerAvatarBox.style.backgroundImage = 'none';
            dom.headerAvatarBox.textContent = icon;
        }
        if (dom.userLargeAvatarBox) {
            dom.userLargeAvatarBox.style.backgroundImage = 'none';
            dom.userLargeAvatarBox.textContent = icon;
        }
    }

    if (dom.inputNickname) dom.inputNickname.value = p.nickname;
    if (dom.accOpenidVal) dom.accOpenidVal.textContent = p.openid;
    if (dom.accUidVal) dom.accUidVal.textContent = `UID: ${p.uid}`;

    // 高亮预设头像
    document.querySelectorAll('.preset-avatar-btn').forEach(btn => {
        const icon = btn.getAttribute('data-icon');
        if (!p.customAvatarImg && icon === p.avatarIcon) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// 读取数据
function loadData() {
    const today = new Date().toISOString().split('T')[0];
    const savedDate = localStorage.getItem('qmy_date');
    if (savedDate !== today) {
        localStorage.setItem('qmy_date', today);
        localStorage.setItem('qmy_crit_count', '0');
        localStorage.setItem('qmy_auto_count', '0');
        state.dailyCritCount = 0;
        state.dailyAutoCount = 0;
    } else {
        state.dailyCritCount = parseInt(localStorage.getItem('qmy_crit_count') || '0', 10);
        state.dailyAutoCount = parseInt(localStorage.getItem('qmy_auto_count') || '0', 10);
    }

    state.totalHit = parseInt(localStorage.getItem('qmy_total_hit') || '0', 10);
    const savedEndTime = parseInt(localStorage.getItem('qmy_crit_end') || '0', 10);
    const savedRate = parseInt(localStorage.getItem('qmy_crit_rate') || '1', 10);

    if (savedEndTime > Date.now() && savedRate > 1) {
        state.critRate = savedRate;
        state.critEndTime = savedEndTime;
    } else {
        state.critRate = 1;
        state.critEndTime = 0;
    }

    state.userProvince = localStorage.getItem('qmy_province') || '广东省';
    state.userCity = localStorage.getItem('qmy_city') || '广州市';
    state.userDistrict = localStorage.getItem('qmy_district') || '天河区';
    state.sfxEnabled = localStorage.getItem('qmy_sfx') !== 'false';
    state.bgmEnabled = localStorage.getItem('qmy_bgm') !== 'false';

    // 读取用户个人中心资料
    const savedProfile = localStorage.getItem('qmy_user_profile');
    if (savedProfile) {
        try {
            state.userProfile = Object.assign(state.userProfile, JSON.parse(savedProfile));
        } catch (e) {}
    }

    const savedTrack = parseInt(localStorage.getItem('qmy_bgm_track') || '1', 10);
    zenBGM.currentTrackId = (savedTrack >= 0 && savedTrack <= 5) ? savedTrack : 1;
    updateTrackUI();

    // 尝试异步恢复 IndexedDB 中的自定义本地音频
    AudioDB.get().then(record => {
        if (record && record.data) {
            initAudio();
            if (audioCtx) {
                audioCtx.decodeAudioData(record.data.slice(0)).then(decoded => {
                    zenBGM.setCustomAudio(record.name, decoded);
                    updateTrackUI();
                }).catch(e => {
                    console.warn('[AudioDB] decode saved custom audio error:', e);
                });
            }
        }
    });

    // 读取游艺坊 · 功德寻宝配置与战力解锁
    const savedGhAdCount = localStorage.getItem('qmy_gh_ad_count');
    state.gemHunt.dailyAdScoreCount = (savedDate !== today) ? 0 : parseInt(savedGhAdCount || '0', 10);
    state.gemHunt.skipWinAnimation = localStorage.getItem('qmy_gh_skip_anim') === 'true';
    state.gemHunt.currentBetIndex = parseInt(localStorage.getItem('qmy_gh_bet_idx') || '0', 10);
    
    const savedUnlocked = localStorage.getItem('qmy_gh_unlocked_bets');
    if (savedUnlocked) {
        try {
            state.gemHunt.unlockedBets = JSON.parse(savedUnlocked);
        } catch (e) {}
    }

    if (dom.toggleSfx) dom.toggleSfx.checked = state.sfxEnabled;
    if (dom.toggleBgm) dom.toggleBgm.checked = state.bgmEnabled;

    renderUserProfile();
    updateUI();
    renderGemHuntUI();
}

function saveData() {
    localStorage.setItem('qmy_total_hit', state.totalHit.toString());
    localStorage.setItem('qmy_crit_rate', state.critRate.toString());
    localStorage.setItem('qmy_crit_end', state.critEndTime.toString());
    localStorage.setItem('qmy_crit_count', state.dailyCritCount.toString());
    localStorage.setItem('qmy_auto_count', state.dailyAutoCount.toString());
    localStorage.setItem('qmy_province', state.userProvince);
    localStorage.setItem('qmy_city', state.userCity);
    localStorage.setItem('qmy_district', state.userDistrict);
    localStorage.setItem('qmy_user_profile', JSON.stringify(state.userProfile));

    // 存储功德寻宝数据
    localStorage.setItem('qmy_gh_ad_count', state.gemHunt.dailyAdScoreCount.toString());
    localStorage.setItem('qmy_gh_skip_anim', state.gemHunt.skipWinAnimation.toString());
    localStorage.setItem('qmy_gh_bet_idx', state.gemHunt.currentBetIndex.toString());
    localStorage.setItem('qmy_gh_unlocked_bets', JSON.stringify(state.gemHunt.unlockedBets));
}

// 称号计算
function getCurrentTitle(hits) {
    for (let i = TITLE_CONFIGS.length - 1; i >= 0; i--) {
        if (hits >= TITLE_CONFIGS[i].minHit) {
            return TITLE_CONFIGS[i];
        }
    }
    return TITLE_CONFIGS[0];
}

// 统一 UI 刷新
function updateUI() {
    if (!dom.totalHit) return;

    dom.totalHit.textContent = state.totalHit.toLocaleString();

    const title = getCurrentTitle(state.totalHit);
    if (dom.currentTitle) {
        dom.currentTitle.textContent = title.name;
    }
    if (title.id !== state.currentTitleId) {
        state.currentTitleId = title.id;
        showToast(`✨ 达成新称号：【${title.name}】！`);
    }

    // 暴击 Buff 视觉
    if (state.critRate > 1 && state.critEndTime > Date.now()) {
        if (dom.critStatusCard) dom.critStatusCard.className = 'crit-status-card buff-active';
        if (dom.critTitle) dom.critTitle.textContent = `倍率 ×${state.critRate}`;
        const secLeft = Math.max(0, Math.floor((state.critEndTime - Date.now()) / 1000));
        const m = Math.floor(secLeft / 60);
        const s = secLeft % 60;
        if (dom.critTimer) dom.critTimer.textContent = `剩余 ${m}:${s < 10 ? '0' : ''}${s} · 每次敲击 +${state.critRate}`;
    } else {
        if (dom.critStatusCard) dom.critStatusCard.className = 'crit-status-card buff-inactive';
        if (dom.critTitle) dom.critTitle.textContent = '无倍率';
        if (dom.critTimer) dom.critTimer.textContent = '敲击获取基础 1x 敲击值';
    }

    // 光晕类名切换
    if (dom.auraHalo) {
        dom.auraHalo.className = `aura-halo rate-${state.critRate > 1 && state.critEndTime > Date.now() ? state.critRate : 1}`;
    }

    // 按钮文字更新
    const remainingCrit = Math.max(0, CONFIG.DAILY_CRIT_AD_MAX - state.dailyCritCount);
    if (dom.critAdCountLabel) {
        dom.critAdCountLabel.textContent = `今日剩余 ${remainingCrit}/${CONFIG.DAILY_CRIT_AD_MAX} 次`;
    }

    if (state.isAutoHiting) {
        const m = Math.floor(state.autoRemainingSec / 60);
        const s = state.autoRemainingSec % 60;
        if (dom.autoBtnMainTitle) dom.autoBtnMainTitle.textContent = `挂机中 ${m}:${s < 10 ? '0' : ''}${s}`;
        if (dom.autoAdCountLabel) dom.autoAdCountLabel.textContent = '切后台立即停止';
    } else {
        const remainingAuto = Math.max(0, CONFIG.DAILY_AUTO_AD_MAX - state.dailyAutoCount);
        if (dom.autoBtnMainTitle) dom.autoBtnMainTitle.textContent = '自动敲击 (10分钟)';
        if (dom.autoAdCountLabel) dom.autoAdCountLabel.textContent = `今日剩余 ${remainingAuto}/${CONFIG.DAILY_AUTO_AD_MAX} 次`;
    }
}

// 敲击动作执行
function hitWoodfish(isManual = true) {
    if (state.isResting) {
        showToast('🧘 您正在静心歇息中，请稍候恢复敲击');
        return;
    }

    initAudio();

    // 首次交互自动启动背景音乐 (防重入)
    if (state.bgmEnabled && !zenBGM.isPlaying) {
        playGenerativeBGM();
    }

    // 连续敲击时长累计 (达到 3600 秒即 1 小时触发 10 分钟休息)
    state.continuousTappingSec += 1;
    if (state.continuousTappingSec >= 3600) {
        startZenRest(600);
        return;
    }

    // 校验暴击是否过期
    if (state.critRate > 1 && state.critEndTime <= Date.now()) {
        state.critRate = 1;
        state.critEndTime = 0;
    }

    const currentRate = (state.critRate > 1 && state.critEndTime > Date.now()) ? state.critRate : 1;
    const addScore = currentRate;

    state.totalHit += addScore;
    saveData();
    updateUI();

    // 播放敲击声音
    playWoodHitSound(currentRate);

    // 飘字动画
    spawnFloatingText(addScore, currentRate);

    // 木槌挥击动效
    if (dom.woodMallet) {
        dom.woodMallet.classList.remove('mallet-striking');
        void dom.woodMallet.offsetWidth;
        dom.woodMallet.classList.add('mallet-striking');
    }

    // 木鱼受击下压回弹动效与闭眼微笑动效
    if (dom.woodfishBtn) {
        dom.woodfishBtn.classList.remove('active-press');
        void dom.woodfishBtn.offsetWidth;
        dom.woodfishBtn.classList.add('active-press');
        setTimeout(() => {
            if (dom.woodfishBtn) dom.woodfishBtn.classList.remove('active-press');
        }, 150);
    }
}

// 待机时木鱼自然呼吸眨眼动效 (每 4~7 秒眨眼一次)
function startIdleBlinkScheduler() {
    const doBlink = () => {
        if (dom.woodfishBtn && !dom.woodfishBtn.classList.contains('active-press')) {
            dom.woodfishBtn.classList.add('eye-blinking');
            setTimeout(() => {
                if (dom.woodfishBtn) dom.woodfishBtn.classList.remove('eye-blinking');
            }, 180);
        }
        setTimeout(doBlink, 4000 + Math.random() * 3000);
    };
    setTimeout(doBlink, 3000);
}

function spawnFloatingText(score, rate) {
    if (!dom.floatContainer) return;
    const textEl = document.createElement('div');
    textEl.className = `float-score ${rate > 1 ? 'crit' : ''}`;
    textEl.textContent = `+${score}`;

    const offset = (Math.random() - 0.5) * 50;
    textEl.style.left = `calc(50% + ${offset}px)`;

    dom.floatContainer.appendChild(textEl);
    setTimeout(() => {
        textEl.remove();
    }, 800);
}

// 自动敲击挂机控制 (时长叠加累加模式)
let autoHitInterval = null;
let autoSecondInterval = null;

function startAutoHit(addSeconds = CONFIG.AUTO_HIT_DURATION_SEC) {
    if (state.isAutoHiting) {
        // 如果当前已在挂机，时长直接叠加累加
        state.autoRemainingSec += addSeconds;
        updateUI();
        return;
    }

    state.isAutoHiting = true;
    state.autoRemainingSec = addSeconds;
    updateUI();

    if (autoHitInterval) clearInterval(autoHitInterval);
    if (autoSecondInterval) clearInterval(autoSecondInterval);

    autoHitInterval = setInterval(() => {
        if (!state.isAutoHiting) return;
        hitWoodfish(false);
    }, CONFIG.AUTO_HIT_INTERVAL_MS);

    autoSecondInterval = setInterval(() => {
        if (!state.isAutoHiting) return;
        state.autoRemainingSec--;
        if (state.autoRemainingSec <= 0) {
            stopAutoHit();
        } else {
            updateUI();
        }
    }, 1000);
}

function stopAutoHit() {
    if (state.isAutoHiting) {
        state.isAutoHiting = false;
        state.autoRemainingSec = 0;
        if (autoHitInterval) clearInterval(autoHitInterval);
        if (autoSecondInterval) clearInterval(autoSecondInterval);
        updateUI();
    }
}

// 暴击倒计时主轮询
setInterval(() => {
    if (state.critRate > 1 && state.critEndTime > 0) {
        if (Date.now() >= state.critEndTime) {
            state.critRate = 1;
            state.critEndTime = 0;
            saveData();
            showToast('暴击增益时间已结束，恢复 1 倍敲击');
        }
        updateUI();
    }
}, 1000);

// 切后台立刻停止挂机
// 上次插屏广告展示时间戳 (冷却 5 分钟，避免频繁打扰)
let lastInterstitialTime = 0;
const INTERSTITIAL_COOLDOWN_MS = 5 * 60 * 1000;

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // 切到后台：停止自动敲击
        if (state.isAutoHiting) {
            stopAutoHit();
            showToast('已切出游戏，自动敲击已停止');
        }
    } else {
        // 从后台返回：满足冷却时间则弹出插屏广告
        const now = Date.now();
        if (now - lastInterstitialTime >= INTERSTITIAL_COOLDOWN_MS) {
            lastInterstitialTime = now;
            if (dom.modalInterstitial) dom.modalInterstitial.classList.remove('hidden');
        }
    }
});

// Toast 提示
let toastTimeout = null;
function showToast(msg) {
    if (!dom.toastBox || !dom.toastText) return;
    dom.toastText.textContent = msg;
    dom.toastBox.classList.remove('hidden');
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        if (dom.toastBox) dom.toastBox.classList.add('hidden');
    }, 2500);
}

// 广告播放模拟器
let currentAdRewardType = null;
let adTimerInterval = null;

function triggerRewardedAd(type) {
    if (type === 'CRIT' && state.dailyCritCount >= CONFIG.DAILY_CRIT_AD_MAX) {
        showToast(`今日暴击广告已达上限(${CONFIG.DAILY_CRIT_AD_MAX}次)`);
        return;
    }
    if (type === 'AUTO' && state.dailyAutoCount >= CONFIG.DAILY_AUTO_AD_MAX) {
        showToast(`今日自动敲击广告已达上限(${CONFIG.DAILY_AUTO_AD_MAX}次)`);
        return;
    }

    currentAdRewardType = type;
    if (dom.modalAdPlayer) dom.modalAdPlayer.classList.remove('hidden');

    const countdownEl = document.getElementById('ad-countdown');
    const fillEl = document.getElementById('ad-progress-fill');
    const closeBtn = document.getElementById('btn-ad-close');
    const rewardBtn = document.getElementById('btn-ad-reward');

    if (closeBtn) {
        closeBtn.disabled = false;
        closeBtn.classList.remove('hidden');
    }
    if (rewardBtn) rewardBtn.classList.add('hidden');

    let seconds = 5;
    if (countdownEl) countdownEl.textContent = `${seconds} 秒后可获得奖励`;
    if (fillEl) fillEl.style.width = '0%';

    if (adTimerInterval) clearInterval(adTimerInterval);
    const startTime = Date.now();
    const duration = 5000;

    adTimerInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(100, (elapsed / duration) * 100);
        if (fillEl) fillEl.style.width = `${progress}%`;

        const left = Math.max(0, Math.ceil((duration - elapsed) / 1000));
        if (countdownEl) countdownEl.textContent = `${left} 秒后可获得奖励`;

        if (elapsed >= duration) {
            clearInterval(adTimerInterval);
            if (countdownEl) countdownEl.textContent = '广告播放完毕';
            if (closeBtn) closeBtn.classList.add('hidden');
            if (rewardBtn) rewardBtn.classList.remove('hidden');
        }
    }, 100);
}

function finishAdReward() {
    if (dom.modalAdPlayer) dom.modalAdPlayer.classList.add('hidden');

    if (currentAdRewardType === 'CRIT') {
        state.dailyCritCount++;
        const drawnRate = Math.floor(Math.random() * 5) + 1;
        state.critRate = drawnRate;
        state.critEndTime = Date.now() + CONFIG.CRIT_DURATION_MS;
        saveData();
        updateUI();
        showToast(`🎉 恭喜抽取到【×${drawnRate} 暴击倍率】！持续 1 小时`);
    } else if (currentAdRewardType === 'AUTO') {
        state.dailyAutoCount++;
        saveData();
        startAutoHit(CONFIG.AUTO_HIT_DURATION_SEC);
        const m = Math.floor(state.autoRemainingSec / 60);
        const s = state.autoRemainingSec % 60;
        showToast(`🔔 自动敲击时长已累计 +10 分钟！（当前剩余 ${m} 分 ${s < 10 ? '0' : ''}${s} 秒）`);
    } else if (currentAdRewardType === 'GH_SCORE') {
        state.gemHunt.dailyAdScoreCount++;
        state.totalHit += 2000;
        saveData();
        updateUI();
        renderGemHuntUI();
        showToast('🎉 恭喜获得 +2,000 敲击值！');
    } else if (currentAdRewardType === 'UNLOCK_BET') {
        state.gemHunt.unlockedBets[pendingUnlockBetAmount] = Date.now() + 24 * 3600 * 1000;
        saveData();
        renderGemHuntUI();
        renderGemRules('bets');
        if (dom.modalUnlockBet) dom.modalUnlockBet.classList.add('hidden');
        showToast(`🎉 成功解锁【${pendingUnlockBetAmount.toLocaleString()} 战力档位】24 小时！`);
    }
}

// 排行榜生成与动态排位渲染
function renderRankList(tab) {
    const container = document.getElementById('rank-list-container');
    const authBox = document.getElementById('province-auth-box');
    const footerRankLabel = document.getElementById('my-rank-status');
    if (!container) return;
    container.innerHTML = '';

    if (tab === 'province' && !state.userProvince) {
        if (authBox) authBox.classList.remove('hidden');
        if (footerRankLabel) footerRankLabel.textContent = '请先授权获取所在省份';
        return;
    }
    if (authBox) authBox.classList.add('hidden');

    // 预设高真实度榜单竞争基底
    let peerScores = [];
    if (tab === 'friend') {
        // 好友同玩榜
        peerScores = [
            { name: '云水禅心', score: 286500, location: '微信好友' },
            { name: '清风拂面', score: 194200, location: '微信好友' },
            { name: '闲庭听雨', score: 128000, location: '微信好友' },
            { name: '宁静致远', score: 68500,  location: '微信好友' },
            { name: '漫卷诗书', score: 42100,  location: '微信好友' },
            { name: '归去来兮', score: 24300,  location: '微信好友' },
            { name: '山间明月', score: 12500,  location: '微信好友' },
            { name: '松涛入耳', score: 5800,   location: '微信好友' },
            { name: '浮生半日', score: 2100,   location: '微信好友' },
            { name: '心若磐石', score: 600,    location: '微信好友' }
        ];
    } else if (tab === 'national') {
        // 全国总榜：精确展示每位玩家所属省份
        peerScores = [
            { name: '尘梦尽宁·孤客', score: 6842000, location: '浙江省' },
            { name: '云端抚琴客',    score: 4520000, location: '广东省' },
            { name: '虚境听禅师',    score: 2890000, location: '江苏省' },
            { name: '万音归寂子',    score: 1450000, location: '四川省' },
            { name: '静心渡己客',    score: 820000,  location: '山东省' },
            { name: '尘扰皆息翁',    score: 420000,  location: '北京市' },
            { name: '漫叩流年客',    score: 210000,  location: '福建省' },
            { name: '平心观意人',    score: 95000,   location: '湖北省' },
            { name: '清音渡绪客',    score: 48000,   location: '河南省' },
            { name: '静叩闲客',      score: 22000,   location: '陕西省' }
        ];
    } else if (tab === 'province') {
        // 省份榜：精确展示每位玩家所属市与区
        peerScores = [
            { name: '岭南听竹', score: 1980000, location: '广州·越秀区' },
            { name: '珠江夜月', score: 1120000, location: '深圳·南山区' },
            { name: '禅城归客', score: 650000,  location: '佛山·禅城区' },
            { name: '潮音入梦', score: 320000,  location: '珠海·香洲区' },
            { name: '莞邑漫叩', score: 154000,  location: '东莞·南城区' },
            { name: '鹏城静客', score: 78000,   location: '深圳·福田区' },
            { name: '越秀清客', score: 36000,   location: '广州·天河区' },
            { name: '白云闲人', score: 18500,   location: '广州·白云区' },
            { name: '香山叩者', score: 7200,    location: '中山·石岐区' },
            { name: '惠风和畅', score: 1800,    location: '惠州·惠城区' }
        ];
    }

    // 玩家自己真实档案与对应地区展示
    const currentTitle = getCurrentTitle(state.totalHit);
    const selfName = state.userProfile.nickname ? `${state.userProfile.nickname}` : '我 (静心客)';
    let selfLocation = '广东省';

    if (tab === 'national') {
        selfLocation = state.userProvince || '广东省';
    } else if (tab === 'province') {
        selfLocation = `${state.userCity || '广州'}·${state.userDistrict || '天河区'}`;
    } else {
        selfLocation = '微信好友';
    }

    const selfItem = {
        name: selfName,
        score: state.totalHit,
        location: selfLocation,
        isSelf: true
    };

    // 合并并按照真实敲击值从高到低绝对排序
    const allList = [...peerScores, selfItem].sort((a, b) => b.score - a.score);

    // 找出玩家在榜单中的真实位次 (1-indexed)
    const myRealRank = allList.findIndex(item => item.isSelf) + 1;

    // 渲染排行榜列表
    allList.slice(0, 15).forEach((item, index) => {
        const rankNum = index + 1;
        const itemTitle = getCurrentTitle(item.score);

        let locClass = 'province-tag';
        let locText = `📍 ${item.location}`;
        if (tab === 'province') {
            locClass = 'district-tag';
        } else if (tab === 'friend') {
            locClass = 'friend-tag';
            locText = `👥 ${item.location}`;
        }

        const rowEl = document.createElement('div');
        rowEl.className = `rank-item ${rankNum <= 3 ? 'top-' + rankNum : ''} ${item.isSelf ? 'is-me' : ''}`;
        rowEl.innerHTML = `
            <div class="rank-left">
                <span class="rank-num">${rankNum}</span>
                <div class="rank-user-info">
                    <div class="rank-name-row">
                        <span class="rank-user-name">${item.name}</span>
                        <span class="rank-loc-tag ${locClass}">${locText}</span>
                        ${item.isSelf ? '<span class="rank-self-badge">我</span>' : ''}
                    </div>
                    <span class="rank-title-tag">【${itemTitle.name}】</span>
                </div>
            </div>
            <div class="rank-score-wrap">
                <span class="rank-score">${item.score.toLocaleString()}</span>
                <span style="font-size:10px; color:var(--text-muted);">敲击值</span>
            </div>
        `;
        container.appendChild(rowEl);
    });

    // 动态刷新底部我的排位状态栏
    if (footerRankLabel) {
        if (state.totalHit === 0) {
            footerRankLabel.innerHTML = `我的排名：第 <strong>${myRealRank}</strong> 名 ｜ 地区：<strong>${selfLocation}</strong> ｜ 敲击值：<strong>0</strong>（点击木鱼提升排位）`;
        } else {
            footerRankLabel.innerHTML = `我的当前排位：第 <strong>${myRealRank}</strong> 名 ｜ 地区：<strong>${selfLocation}</strong> ｜ 称号：<strong>【${currentTitle.name}】</strong> ｜ 敲击值：<strong>${state.totalHit.toLocaleString()}</strong>`;
        }
    }
}

// 称号列表渲染 (14 档位)
function renderTitleList() {
    const container = document.getElementById('title-list-container');
    const summaryText = document.getElementById('title-summary-text');
    if (!container) return;

    const current = getCurrentTitle(state.totalHit);
    if (summaryText) {
        summaryText.textContent = `当前称号：【${current.name}】（累计敲击值：${state.totalHit.toLocaleString()}）`;
    }
    container.innerHTML = '';

    TITLE_CONFIGS.forEach(item => {
        const isUnlocked = state.totalHit >= item.minHit;
        const isCurrent = current.id === item.id;
        const progress = isUnlocked ? 100 : Math.min(99.9, (state.totalHit / item.minHit) * 100);

        const card = document.createElement('div');
        card.className = `title-card ${isCurrent ? 'current' : (isUnlocked ? 'unlocked' : 'locked')}`;
        card.innerHTML = `
            <div class="title-card-header">
                <span class="title-name-text">${item.name}</span>
                <span class="title-badge-tag">${isCurrent ? '佩戴中' : (isUnlocked ? '已解锁' : progress.toFixed(1) + '%')}</span>
            </div>
            <div class="title-desc-text">${item.desc}</div>
            <div class="title-condition-text">
                ${item.maxHit === Infinity ? `需 ≥ ${item.minHit.toLocaleString()} 敲击值` : `需 ${item.minHit.toLocaleString()} ~ ${item.maxHit.toLocaleString()} 敲击值`}
            </div>
            <div class="progress-track">
                <div class="progress-fill" style="width: ${progress}%"></div>
            </div>
        `;
        container.appendChild(card);
    });
}

// ==========================================================================
// 🧘 健康防疲劳休息系统 (连续敲击 1 小时休息 10 分钟)
// ==========================================================================
let restCountdownInterval = null;

function startZenRest(durationSec = 600) {
    state.isResting = true;
    state.restRemainingSec = durationSec;
    stopAutoHit();

    if (dom.zenRestOverlay) dom.zenRestOverlay.classList.remove('hidden');

    if (restCountdownInterval) clearInterval(restCountdownInterval);
    const updateTimerDisplay = () => {
        if (dom.restTimerVal) {
            const m = Math.floor(state.restRemainingSec / 60);
            const s = state.restRemainingSec % 60;
            dom.restTimerVal.textContent = `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
        }
    };
    updateTimerDisplay();

    restCountdownInterval = setInterval(() => {
        state.restRemainingSec--;
        updateTimerDisplay();
        if (state.restRemainingSec <= 0) {
            clearInterval(restCountdownInterval);
            restCountdownInterval = null;
            state.isResting = false;
            state.continuousTappingSec = 0;
            if (dom.zenRestOverlay) dom.zenRestOverlay.classList.add('hidden');
            showToast('🧘 10分钟静心歇息已毕，涵养心神，可继续敲击修行！');
        }
    }, 1000);
}

// 全局退出功德寻宝函数 (确保点击左上角 ‹ 立即响应)
function exitGemHunt() {
    stopAutoSpin();
    const modalGH = document.getElementById('modal-gem-hunt');
    const modalMG = document.getElementById('modal-minigames');
    if (modalGH) modalGH.classList.add('hidden');
    if (modalMG) modalMG.classList.remove('hidden');
    updateUI();
}
window.exitGemHunt = exitGemHunt;

// ==========================================================================
// 🎰 游艺坊 · 功德寻宝 (5x3 滚轴连线小游戏) 算法引擎 (100% 纯正寺庙法宝)
// ==========================================================================
const ZEN_SYMBOLS = [
    { id: 'wild',     name: '功德', icon: '🪷', isWild: true, weight: 6 },
    { id: 'scatter',  name: '方丈', icon: '🧘', isScatter: true, weight: 5 },
    { id: 'hat',      name: '五佛宝冠', icon: '👑', rates: [8, 12, 20], weight: 8 },
    { id: 'bowl',     name: '紫金佛钵', icon: '🥣', rates: [6, 10, 15], weight: 10 },
    { id: 'woodfish', name: '红木木鱼', icon: '🪵', rates: [5, 8, 12], weight: 12 },
    { id: 'incense',  name: '宣德香炉', icon: '🪔', rates: [4, 6, 10], weight: 14 },
    { id: 'monk',     name: '小沙弥', icon: '👶', rates: [4, 6, 9], weight: 15 },
    { id: 'lamp',     name: '琉璃供灯', icon: '🏮', rates: [3, 5, 8], weight: 18 },
    { id: 'chime',    name: '古刹铜磬', icon: '🔔', rates: [3, 4, 5], weight: 20 },
    { id: 'beads',    name: '菩提佛珠', icon: '📿', rates: [2, 3, 5], weight: 24 },
    { id: 'vase',     name: '白玉净瓶', icon: '🏺', rates: [1, 2, 3], weight: 28 },
    { id: 'ruyi',     name: '翡翠如意', icon: '🪄', rates: [1, 2, 3], weight: 32 }
];

const BET_TIERS = [200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000];
const FREE_BETS = [200, 500, 1000];

// 25 条标准连线坐标定义 (5列 x 3行，0:上行，1:中行，2:下行)
const PAYLINES = [
    [1, 1, 1, 1, 1], // 1: 中间横线
    [0, 0, 0, 0, 0], // 2: 顶部横线
    [2, 2, 2, 2, 2], // 3: 底部横线
    [0, 1, 2, 1, 0], // 4: V字形
    [2, 1, 0, 1, 2], // 5: 倒V字形
    [0, 0, 1, 2, 2], // 6
    [2, 2, 1, 0, 0], // 7
    [1, 2, 2, 2, 1], // 8
    [1, 0, 0, 0, 1], // 9
    [0, 1, 1, 1, 2], // 10
    [2, 1, 1, 1, 0], // 11
    [0, 1, 0, 1, 0], // 12
    [2, 1, 2, 1, 2], // 13
    [1, 0, 1, 0, 1], // 14
    [1, 2, 1, 2, 1], // 15
    [0, 0, 1, 0, 0], // 16
    [2, 2, 1, 2, 2], // 17
    [1, 1, 0, 1, 1], // 18
    [1, 1, 2, 1, 1], // 19
    [0, 1, 2, 2, 2], // 20
    [2, 1, 0, 0, 0], // 21
    [0, 0, 0, 1, 2], // 22
    [2, 2, 2, 1, 0], // 23
    [0, 1, 1, 2, 2], // 24
    [2, 1, 1, 0, 0]  // 25
];

// 权重随机抽取符号
function getRandomZenSymbol() {
    const totalWeight = ZEN_SYMBOLS.reduce((sum, s) => sum + s.weight, 0);
    let rand = Math.random() * totalWeight;
    for (const s of ZEN_SYMBOLS) {
        if (rand < s.weight) return s;
        rand -= s.weight;
    }
    return ZEN_SYMBOLS[ZEN_SYMBOLS.length - 1];
}

// 检查战力档位是否已解锁
function isBetTierUnlocked(bet) {
    if (FREE_BETS.includes(bet)) return true;
    const expireTime = state.gemHunt.unlockedBets[bet];
    return !!(expireTime && expireTime > Date.now());
}

function getCurrentBetAmount() {
    return BET_TIERS[state.gemHunt.currentBetIndex] || 200;
}

// 格式化大额数字
function formatScoreShort(num) {
    if (num >= 100000000) return (num / 100000000).toFixed(1) + '亿';
    if (num >= 10000) return (num / 10000).toFixed(1) + '万';
    return num.toLocaleString();
}

// 渲染功德寻宝主界面状态
function renderGemHuntUI() {
    if (dom.ghTotalHit) {
        dom.ghTotalHit.textContent = formatScoreShort(state.totalHit);
    }
    const currentBet = getCurrentBetAmount();
    if (dom.ghCurrentBet) {
        dom.ghCurrentBet.textContent = currentBet.toLocaleString();
    }
    const isUnlocked = isBetTierUnlocked(currentBet);
    if (dom.ghBetLockIcon) {
        if (isUnlocked) {
            dom.ghBetLockIcon.classList.add('hidden');
        } else {
            dom.ghBetLockIcon.classList.remove('hidden');
        }
    }
    if (dom.ghAdScoreLeftHint) {
        const left = Math.max(0, 5 - state.gemHunt.dailyAdScoreCount);
        dom.ghAdScoreLeftHint.textContent = `今日领敲击值剩余: ${left}/5次`;
    }
    // 渲染跳过结算按钮状态
    const btnSkip = document.getElementById('btn-toggle-skip-win');
    const skipText = document.getElementById('skip-toggle-text');
    if (btnSkip && skipText) {
        if (state.gemHunt.skipWinAnimation) {
            btnSkip.classList.add('active');
            skipText.textContent = '跳过结算: 开';
        } else {
            btnSkip.classList.remove('active');
            skipText.textContent = '跳过结算: 关';
        }
    }
    if (dom.ghFreeSpinsBar && dom.ghFreeSpinsCount) {
        if (state.gemHunt.freeSpinsRemaining > 0) {
            dom.ghFreeSpinsBar.classList.remove('hidden');
            dom.ghFreeSpinsCount.textContent = state.gemHunt.freeSpinsRemaining;
        } else {
            dom.ghFreeSpinsBar.classList.add('hidden');
        }
    }
}

// 图标与真实素材文件映射表
const SYMBOL_IMG_MAP = {
    wild: '功德.png',
    scatter: '方丈.png',
    hat: '五佛宝冠.png',
    bowl: '紫金佛钵.png',
    woodfish: '红木木鱼.png',
    incense: '宣德香炉.png',
    monk: '小沙弥.png',
    lamp: '琉璃供灯.png',
    chime: '古刹铜磬.png',
    beads: '菩提佛珠.png',
    vase: '白玉净瓶.png',
    ruyi: '翡翠如意.png'
};

// 渲染 12 款 100% 纯正寺庙法宝高清图案 (直接加载用户提供的专属素材)
function getSymbolRenderHtml(symbol) {
    const imgFile = SYMBOL_IMG_MAP[symbol.id] || `${symbol.name}.png`;
    const bannerHtml = symbol.isWild 
        ? '<div class="sym-banner banner-wild">万能</div>' 
        : (symbol.isScatter ? '<div class="sym-banner banner-scatter">方丈</div>' : '');
    
    return `
        <div class="sym-card sym-${symbol.id}">
            <img src="assets/images/${encodeURIComponent(imgFile)}" class="sym-img" alt="${symbol.name}" />
            ${bannerHtml}
            <span class="gh-cell-name">${symbol.name}</span>
        </div>
    `;
}

// 初始化 5x3 棋盘展示
function initGemHuntBoard() {
    for (let col = 0; col < 5; col++) {
        for (let row = 0; row < 3; row++) {
            if (!state.gemHunt.grid[col][row]) {
                state.gemHunt.grid[col][row] = getRandomZenSymbol();
            }
            renderGemCell(col, row, state.gemHunt.grid[col][row]);
        }
    }
    renderGemHuntUI();
}

function renderGemCell(col, row, symbol, isHighlight = false, isDropAnim = false) {
    const reelEl = document.querySelector(`.gh-reel[data-col="${col}"]`);
    if (!reelEl) return;
    const cellEl = reelEl.querySelector(`.gh-cell[data-row="${row}"]`);
    if (!cellEl) return;

    // 先移除动画类（避免上次残留），再设置内容
    cellEl.classList.remove('cascading-drop');

    cellEl.className = 'gh-cell';
    if (symbol.id) cellEl.classList.add(`${symbol.id}-cell`);
    if (symbol.isWild) cellEl.classList.add('wild-cell');
    if (symbol.isScatter) cellEl.classList.add('scatter-cell');
    if (isHighlight) cellEl.classList.add('win-highlight');

    // 先设置内容
    cellEl.innerHTML = getSymbolRenderHtml(symbol);

    // 强制浏览器回流，确保动画每次都从头开始触发
    if (isDropAnim) {
        void cellEl.offsetWidth;
        cellEl.classList.add('cascading-drop');
    }
}

// 开始祈福旋转 (3D 瀑布从天而降重力掉落)
let autoSpinTimer = null;

function spinGemHunt() {
    if (state.gemHunt.isSpinning) return;

    const currentBet = getCurrentBetAmount();
    const isFree = state.gemHunt.freeSpinsRemaining > 0;

    // 战力解锁校验
    if (!isFree && !isBetTierUnlocked(currentBet)) {
        openUnlockBetModal(currentBet);
        return;
    }

    // 敲击值余额校验 (不足时直接弹出专属看广告补充弹窗)
    if (!isFree && state.totalHit < currentBet) {
        if (state.gemHunt.isAutoSpinning) stopAutoSpin();
        openNotEnoughScoreModal(currentBet);
        return;
    }

    // 扣除敲击值或消耗免费次数
    if (isFree) {
        state.gemHunt.freeSpinsRemaining--;
    } else {
        state.totalHit -= currentBet;
    }

    saveData();
    updateUI();
    renderGemHuntUI();

    state.gemHunt.isSpinning = true;
    if (dom.btnGhSpin) dom.btnGhSpin.disabled = true;

    playSpinStartSound();

    // 清空高亮线条与收集车
    clearPaylineHighlights();
    updateScatterCarts(0);

    // 生成新 5x3 矩阵
    const newGrid = [];
    let scatterCount = 0;
    for (let col = 0; col < 5; col++) {
        newGrid[col] = [];
        for (let row = 0; row < 3; row++) {
            const sym = getRandomZenSymbol();
            newGrid[col][row] = sym;
            if (sym.isScatter) scatterCount++;
        }
    }

    // 瀑布一排排从天而降逐列掉落动效 (第 0~4 列依次砸落停靠)
    const colDelays = [0, 140, 280, 420, 560];
    colDelays.forEach((delay, colIdx) => {
        setTimeout(() => {
            const reelEl = document.querySelector(`.gh-reel[data-col="${colIdx}"]`);
            if (reelEl) {
                reelEl.querySelectorAll('.gh-cell').forEach((cell, rowIdx) => {
                    state.gemHunt.grid[colIdx][rowIdx] = newGrid[colIdx][rowIdx];
                    renderGemCell(colIdx, rowIdx, newGrid[colIdx][rowIdx], false, true);
                });
            }

            playReelStopSound(colIdx);

            // 更新方丈收集车
            let currentColScatters = 0;
            for (let c = 0; c <= colIdx; c++) {
                for (let r = 0; r < 3; r++) {
                    if (newGrid[c][r].isScatter) currentColScatters++;
                }
            }
            if (currentColScatters > 0) {
                playScatterCollectSound();
            }
            updateScatterCarts(Math.min(3, currentColScatters));

            // 全列停转后结算
            if (colIdx === 4) {
                setTimeout(() => {
                    finishSpinSettlement(newGrid, currentBet, scatterCount);
                }, 380);
            }
        }, delay);
    });
}

// 更新方丈收集小车状态
function updateScatterCarts(count) {
    for (let i = 1; i <= 3; i++) {
        const cart = document.getElementById(`scatter-cart-${i}`);
        if (cart) {
            if (i <= count) {
                cart.classList.add('active');
            } else {
                cart.classList.remove('active');
            }
        }
    }
}

// 清除连线高亮
function clearPaylineHighlights() {
    const overlay = document.getElementById('gh-lines-overlay');
    if (overlay) overlay.innerHTML = '';
    document.querySelectorAll('.gh-cell.win-highlight').forEach(cell => {
        cell.classList.remove('win-highlight');
    });
}

// 旋转结束结算连线与奖励
function finishSpinSettlement(grid, currentBet, scatterCount) {
    state.gemHunt.isSpinning = false;
    if (dom.btnGhSpin) dom.btnGhSpin.disabled = false;

    // 1. 判定是否触发 3 个及以上方丈 (获得 10 次免费祈福)
    let triggeredFreeSpins = false;
    if (scatterCount >= 3) {
        state.gemHunt.freeSpinsRemaining += 10;
        triggeredFreeSpins = true;
        playScatterCollectSound();
        showToast('🎉 恭喜转出 3 位方丈！触发 10 次免费祈福！');
    }

    // 2. 评估 25 条连线
    const lineResults = [];
    let totalWinScore = 0;

    PAYLINES.forEach((lineCoord, lineIndex) => {
        // 提取该线 5 个位置的符号
        const symbolsOnLine = [];
        for (let col = 0; col < 5; col++) {
            const row = lineCoord[col];
            symbolsOnLine.push(grid[col][row]);
        }

        // 判定从左到右连续匹配
        // 寻找基准符号 (首个非 wild、非 scatter 符号)
        let baseSymbol = null;
        for (let s of symbolsOnLine) {
            if (!s.isWild && !s.isScatter) {
                baseSymbol = s;
                break;
            }
        }

        if (baseSymbol && baseSymbol.rates) {
            let matchCount = 0;
            for (let i = 0; i < 5; i++) {
                const s = symbolsOnLine[i];
                if (s.id === baseSymbol.id || s.isWild) {
                    matchCount++;
                } else {
                    break;
                }
            }

            if (matchCount >= 3) {
                const rate = baseSymbol.rates[matchCount - 3];
                const lineBet = currentBet / 25;
                const winAmount = Math.round(lineBet * rate);
                totalWinScore += winAmount;

                lineResults.push({
                    lineIndex: lineIndex + 1,
                    lineCoord,
                    matchCount,
                    baseSymbol,
                    winAmount
                });
            }
        }
    });

    // 3. 高亮连线格子与中奖处理
    if (lineResults.length > 0) {
        lineResults.forEach(res => {
            for (let col = 0; col < res.matchCount; col++) {
                const row = res.lineCoord[col];
                renderGemCell(col, row, grid[col][row], true);
            }
        });

        // 绘制高亮中奖连线
        drawPaylineSVG(lineResults);

        // 派发赢取的敲击值
        state.totalHit += totalWinScore;
        saveData();
        updateUI();
        renderGemHuntUI();

        // 激活游戏上方 3D 寺庙大佛显圣赐福佛光动效
        const buddhaEl = document.getElementById('gh-top-temple-stage');
        if (buddhaEl) {
            buddhaEl.classList.add('buddha-blessing-active');
            setTimeout(() => buddhaEl.classList.remove('buddha-blessing-active'), 1800);
        }

        // 播放中奖音效
        playWinFanfareSound(totalWinScore);

        // 结算画面呈现
        if (state.gemHunt.skipWinAnimation) {
            showToast(`✨ 命中 ${lineResults.length} 条连线，获得 +${totalWinScore.toLocaleString()} 敲击值！`);
            checkAutoSpinNext(triggeredFreeSpins);
        } else {
            showWinCelebrationModal(totalWinScore, () => {
                checkAutoSpinNext(triggeredFreeSpins);
            });
        }
    } else {
        renderGemHuntUI();
        checkAutoSpinNext(triggeredFreeSpins);
    }
}

// 战力快捷选择抽屉面板渲染
function renderBetPickerModal() {
    const grid = document.getElementById('bet-picker-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const currentBet = getCurrentBetAmount();

    BET_TIERS.forEach((bet, idx) => {
        const isFree = FREE_BETS.includes(bet);
        const isUnlocked = isBetTierUnlocked(bet);
        const isSelected = bet === currentBet;
        const expireTime = state.gemHunt.unlockedBets[bet] || 0;

        const card = document.createElement('div');
        card.className = `bet-picker-card ${isSelected ? 'active' : ''} ${!isUnlocked ? 'locked' : ''}`;

        let statusHtml = '';
        if (isFree) {
            statusHtml = '<span class="bet-picker-status-tag free">🟢 免费</span>';
        } else if (isUnlocked) {
            const hoursLeft = Math.ceil((expireTime - Date.now()) / (3600 * 1000));
            statusHtml = `<span class="bet-picker-status-tag unlocked">✨ 剩余 ${hoursLeft}h</span>`;
        } else {
            statusHtml = '<span class="bet-picker-status-tag locked">🎬 广告解锁</span>';
        }

        card.innerHTML = `
            <span class="bet-picker-amount number-font">${bet.toLocaleString()}</span>
            ${statusHtml}
        `;

        card.addEventListener('click', () => {
            if (isUnlocked) {
                state.gemHunt.currentBetIndex = idx;
                saveData();
                renderGemHuntUI();
                if (dom.modalBetPicker) dom.modalBetPicker.classList.add('hidden');
                showToast(`已切换祈福战力为【${bet.toLocaleString()}】`);
            } else {
                if (dom.modalBetPicker) dom.modalBetPicker.classList.add('hidden');
                openUnlockBetModal(bet);
            }
        });

        grid.appendChild(card);
    });

    if (dom.modalBetPicker) dom.modalBetPicker.classList.remove('hidden');
}

// 自动旋转下一轮流转
function checkAutoSpinNext(triggeredFreeSpins) {
    if (state.gemHunt.isAutoSpinning) {
        const nextDelay = triggeredFreeSpins ? 1500 : 700;
        if (autoSpinTimer) clearTimeout(autoSpinTimer);
        autoSpinTimer = setTimeout(() => {
            if (state.gemHunt.isAutoSpinning) {
                spinGemHunt();
            }
        }, nextDelay);
    }
}

function stopAutoSpin() {
    state.gemHunt.isAutoSpinning = false;
    if (autoSpinTimer) clearTimeout(autoSpinTimer);
    if (dom.btnGhSpin) {
        dom.btnGhSpin.classList.remove('auto-active');
        if (dom.ghSpinText) dom.ghSpinText.textContent = '开始';
    }
    showToast('已停止自动祈福');
}

// 绘制连线 SVG
function drawPaylineSVG(lineResults) {
    const svgEl = document.getElementById('gh-lines-overlay');
    if (!svgEl) return;
    svgEl.innerHTML = '';

    const colors = ['#FFD700', '#60A5FA', '#34D399', '#F472B6', '#F59E0B', '#A78BFA'];
    lineResults.slice(0, 3).forEach((res, idx) => {
        const color = colors[idx % colors.length];
        const points = [];
        for (let col = 0; col < res.matchCount; col++) {
            const row = res.lineCoord[col];
            const x = 50 + col * 100;
            const y = 50 + row * 100;
            points.push(`${x},${y}`);
        }
        const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        polyline.setAttribute('points', points.join(' '));
        polyline.setAttribute('stroke', color);
        polyline.setAttribute('stroke-width', '4');
        polyline.setAttribute('stroke-linecap', 'round');
        polyline.setAttribute('stroke-linejoin', 'round');
        polyline.setAttribute('fill', 'none');
        polyline.setAttribute('filter', 'drop-shadow(0 0 6px ' + color + ')');
        svgEl.appendChild(polyline);
    });
}

// 中奖弹窗结算
let winModalDismissCallback = null;

function showWinCelebrationModal(winAmount, onDismiss) {
    winModalDismissCallback = onDismiss;
    if (dom.winScoreNum) dom.winScoreNum.textContent = winAmount.toLocaleString();
    const tagEl = document.getElementById('win-level-tag');
    const titleEl = document.getElementById('win-title');

    if (winAmount >= 50000) {
        if (tagEl) tagEl.textContent = '功德无量 · 旷世大捷';
        if (titleEl) titleEl.textContent = '👑 极品福报';
    } else if (winAmount >= 10000) {
        if (tagEl) tagEl.textContent = '福光普照 · 财源广进';
        if (titleEl) titleEl.textContent = '🌟 大获丰收';
    } else {
        if (tagEl) tagEl.textContent = '清心吉照 · 功德圆满';
        if (titleEl) titleEl.textContent = '🎉 福德降临';
    }

    if (dom.modalGemWin) dom.modalGemWin.classList.remove('hidden');
}

function dismissWinCelebrationModal() {
    if (dom.modalGemWin) dom.modalGemWin.classList.add('hidden');
    if (winModalDismissCallback) {
        const cb = winModalDismissCallback;
        winModalDismissCallback = null;
        cb();
    }
}

// 战力解锁弹窗
let pendingUnlockBetAmount = 2000;

function openUnlockBetModal(bet) {
    pendingUnlockBetAmount = bet;
    if (dom.unlockBetTitle) {
        dom.unlockBetTitle.textContent = `解锁【${bet.toLocaleString()} 战力档位】`;
    }
    if (dom.modalUnlockBet) dom.modalUnlockBet.classList.remove('hidden');
}

// 敲击值不足提示弹窗
function openNotEnoughScoreModal(betAmount) {
    const modal = document.getElementById('modal-not-enough-score');
    const title = document.getElementById('not-enough-title');
    const hint = document.getElementById('not-enough-ad-left-hint');
    if (title) {
        title.textContent = `当前祈福需要 ${betAmount.toLocaleString()} 敲击值 (现有: ${state.totalHit.toLocaleString()})`;
    }
    if (hint) {
        const left = Math.max(0, 5 - state.gemHunt.dailyAdScoreCount);
        hint.textContent = `今日看广告领取剩余: ${left}/5次`;
    }
    if (modal) modal.classList.remove('hidden');
}
window.openNotEnoughScoreModal = openNotEnoughScoreModal;

function watchAdForScore() {
    if (state.gemHunt.dailyAdScoreCount >= 5) {
        showToast('今日看广告领敲击值已达上限 (5/5次)，明日再来吧！');
        return;
    }
    const modal = document.getElementById('modal-not-enough-score');
    if (modal) modal.classList.add('hidden');
    triggerRewardedAd('GH_SCORE');
}
window.watchAdForScore = watchAdForScore;

// 规则与战力说明面板渲染
function renderGemRules(activeTab = 'icons') {
    document.querySelectorAll('.gem-tab-btn').forEach(btn => {
        if (btn.getAttribute('data-tab') === activeTab) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    ['icons', 'lines', 'bets', 'info'].forEach(tab => {
        const pane = document.getElementById(`pane-rules-${tab}`);
        if (pane) {
            if (tab === activeTab) {
                pane.classList.remove('hidden');
            } else {
                pane.classList.add('hidden');
            }
        }
    });

    // 渲染 Tab 1: 图标赔率表
    if (activeTab === 'icons') {
        const list = document.getElementById('rule-paytable-list');
        if (list) {
            list.innerHTML = '';
            ZEN_SYMBOLS.filter(s => s.rates).forEach(sym => {
                const imgFile = SYMBOL_IMG_MAP[sym.id] || `${sym.name}.png`;
                const card = document.createElement('div');
                card.className = 'pay-item-card';
                card.innerHTML = `
                    <div class="pay-item-icon">
                        <img src="assets/images/${encodeURIComponent(imgFile)}" class="pay-sym-img" alt="${sym.name}" />
                    </div>
                    <div class="pay-item-rates">
                        <strong>${sym.name}</strong>
                        <span>3连: ${sym.rates[0]}x ｜ 4连: ${sym.rates[1]}x ｜ 5连: ${sym.rates[2]}x</span>
                    </div>
                `;
                list.appendChild(card);
            });
        }
    }

    // 渲染 Tab 2: 25 条连线小图
    if (activeTab === 'lines') {
        const grid = document.getElementById('paylines-grid');
        if (grid) {
            grid.innerHTML = '';
            PAYLINES.forEach((lineCoord, idx) => {
                const item = document.createElement('div');
                item.className = 'payline-item';
                let cellsHtml = '';
                for (let r = 0; r < 3; r++) {
                    for (let c = 0; c < 5; c++) {
                        const isHit = lineCoord[c] === r;
                        cellsHtml += `<div class="mini-cell ${isHit ? 'hit' : ''}"></div>`;
                    }
                }
                item.innerHTML = `
                    <span class="payline-item-num">${idx + 1}</span>
                    <div class="payline-mini-grid">${cellsHtml}</div>
                `;
                grid.appendChild(item);
            });
        }
    }

    // 渲染 Tab 3: 战力与 24 小时解锁状态
    if (activeTab === 'bets') {
        const list = document.getElementById('bet-tier-list');
        if (list) {
            list.innerHTML = '';
            BET_TIERS.forEach(bet => {
                const isFree = FREE_BETS.includes(bet);
                const isUnlocked = isBetTierUnlocked(bet);
                const expireTime = state.gemHunt.unlockedBets[bet] || 0;
                let statusText = '';
                let statusClass = '';

                if (isFree) {
                    statusText = '永久免费';
                    statusClass = 'free';
                } else if (isUnlocked) {
                    const hoursLeft = Math.ceil((expireTime - Date.now()) / (3600 * 1000));
                    statusText = `已解锁 (剩余 ${hoursLeft} 小时)`;
                    statusClass = 'active';
                } else {
                    statusText = '未解锁 (需看广告)';
                    statusClass = 'locked';
                }

                const row = document.createElement('div');
                row.className = `bet-tier-row ${isUnlocked ? 'unlocked' : ''}`;
                row.innerHTML = `
                    <div class="bet-tier-left">
                        <span class="bet-tier-val number-font">${bet.toLocaleString()}</span>
                        <span class="bet-tier-status ${statusClass}">${statusText}</span>
                    </div>
                    ${(!isFree && !isUnlocked) ? `<button class="btn-unlock-tier" data-bet="${bet}">🎬 看广告解锁</button>` : ''}
                `;
                list.appendChild(row);
            });

            list.querySelectorAll('.btn-unlock-tier').forEach(btn => {
                btn.addEventListener('click', () => {
                    const bet = parseInt(btn.getAttribute('data-bet'), 10);
                    openUnlockBetModal(bet);
                });
            });
        }
    }
}

// 事件初始化
function initEvents() {
    // 敲击木鱼
    if (dom.woodfishBtn) {
        dom.woodfishBtn.addEventListener('click', (e) => {
            e.preventDefault();
            hitWoodfish(true);
        });
        dom.woodfishBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            hitWoodfish(true);
        }, { passive: false });
    }

    // 广告按钮
    if (dom.btnCritAd) {
        dom.btnCritAd.addEventListener('click', () => triggerRewardedAd('CRIT'));
    }
    if (dom.btnAutoAd) {
        dom.btnAutoAd.addEventListener('click', () => triggerRewardedAd('AUTO'));
    }

    // 打开弹窗
    const btnOpenRank = document.getElementById('btn-open-rank');
    if (btnOpenRank) {
        btnOpenRank.addEventListener('click', () => {
            if (dom.modalRank) dom.modalRank.classList.remove('hidden');
            renderRankList('friend');
        });
    }

    const btnOpenTitles = document.getElementById('btn-open-titles');
    if (btnOpenTitles) {
        btnOpenTitles.addEventListener('click', () => {
            if (dom.modalTitle) dom.modalTitle.classList.remove('hidden');
            renderTitleList();
        });
    }

    const btnOpenTitlesHeader = document.getElementById('btn-open-titles-header');
    if (btnOpenTitlesHeader) {
        btnOpenTitlesHeader.addEventListener('click', () => {
            if (dom.modalTitle) dom.modalTitle.classList.remove('hidden');
            renderTitleList();
        });
    }

    const btnOpenSettings = document.getElementById('btn-open-settings');
    if (btnOpenSettings) {
        btnOpenSettings.addEventListener('click', () => {
            if (dom.modalSettings) dom.modalSettings.classList.remove('hidden');
        });
    }

    // 关闭弹窗
    const btnCloseRank = document.getElementById('btn-close-rank');
    if (btnCloseRank) {
        btnCloseRank.addEventListener('click', () => {
            if (dom.modalRank) dom.modalRank.classList.add('hidden');
            // 插屏广告已移至「后台返回」时触发，此处不再弹出
        });
    }

    const btnCloseTitle = document.getElementById('btn-close-title');
    if (btnCloseTitle) {
        btnCloseTitle.addEventListener('click', () => {
            if (dom.modalTitle) dom.modalTitle.classList.add('hidden');
        });
    }

    const btnCloseSettings = document.getElementById('btn-close-settings');
    if (btnCloseSettings) {
        btnCloseSettings.addEventListener('click', () => {
            if (dom.modalSettings) dom.modalSettings.classList.add('hidden');
        });
    }

    const btnOpenPrivacy = document.getElementById('btn-open-privacy');
    if (btnOpenPrivacy) {
        btnOpenPrivacy.addEventListener('click', () => {
            if (dom.modalPrivacy) dom.modalPrivacy.classList.remove('hidden');
        });
    }

    const btnClosePrivacy = document.getElementById('btn-close-privacy');
    if (btnClosePrivacy) {
        btnClosePrivacy.addEventListener('click', () => {
            if (dom.modalPrivacy) dom.modalPrivacy.classList.add('hidden');
        });
    }

    const btnCloseInterstitial = document.getElementById('btn-close-interstitial');
    if (btnCloseInterstitial) {
        btnCloseInterstitial.addEventListener('click', () => {
            if (dom.modalInterstitial) dom.modalInterstitial.classList.add('hidden');
        });
    }

    // 广告弹窗提前关闭与完成领取按钮
    const handleCloseAdEarly = () => {
        if (adTimerInterval) {
            clearInterval(adTimerInterval);
            adTimerInterval = null;
        }
        if (dom.modalAdPlayer) dom.modalAdPlayer.classList.add('hidden');
        showToast('已提前放弃观看广告，未获得增益奖励');
    };

    const btnAdClose = document.getElementById('btn-ad-close');
    if (btnAdClose) {
        btnAdClose.addEventListener('click', handleCloseAdEarly);
    }

    const btnAdTopClose = document.getElementById('btn-ad-top-close');
    if (btnAdTopClose) {
        btnAdTopClose.addEventListener('click', handleCloseAdEarly);
    }

    const btnAdReward = document.getElementById('btn-ad-reward');
    if (btnAdReward) {
        btnAdReward.addEventListener('click', finishAdReward);
    }

    // 排行榜 Tab 切换
    document.querySelectorAll('.rank-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.rank-tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const tab = btn.getAttribute('data-tab');
            renderRankList(tab);
        });
    });

    // 授权位置
    const btnAuthLocation = document.getElementById('btn-auth-location');
    if (btnAuthLocation) {
        btnAuthLocation.addEventListener('click', () => {
            state.userProvince = '广东省';
            saveData();
            const tabProvinceBtn = document.getElementById('tab-province-btn');
            if (tabProvinceBtn) tabProvinceBtn.textContent = '广东省榜';
            renderRankList('province');
            showToast('已授权获取省份信息');
        });
    }

    // 静心曲目点击选择切换
    document.querySelectorAll('.track-item-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const trackId = parseInt(btn.getAttribute('data-track'), 10);
            if (trackId === 0 && (!zenBGM.customAudioBuffer || !zenBGM.customAudioName)) {
                // 点击自定义曲目但未上传时，触发上传文件选择器
                const inputEl = document.getElementById('input-custom-audio');
                if (inputEl) inputEl.click();
                return;
            }
            zenBGM.setTrack(trackId);
            const trackName = trackId === 0 ? `《${zenBGM.customAudioName}》` : (BGM_TRACK_CONFIGS.find(t => t.id === trackId) || BGM_TRACK_CONFIGS[0]).name;
            showToast(`🎵 背景音乐已切换为：${trackName}`);
        });
    });

    // 触发自定义音频本地上传与解码
    const btnTriggerUpload = document.getElementById('btn-trigger-upload');
    const inputCustomAudio = document.getElementById('input-custom-audio');
    const btnClearCustom = document.getElementById('btn-clear-custom');

    if (btnTriggerUpload && inputCustomAudio) {
        btnTriggerUpload.addEventListener('click', () => {
            inputCustomAudio.click();
        });

        inputCustomAudio.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (file.size > 50 * 1024 * 1024) {
                showToast('音频文件过大，请选择 50MB 以内的音频');
                return;
            }

            initAudio();
            showToast('正在解析并导入专属音频...');

            try {
                const arrayBuffer = await file.arrayBuffer();
                // 存入 IndexedDB
                await AudioDB.save(file.name, arrayBuffer);

                // 解码音频数据
                const decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
                zenBGM.setCustomAudio(file.name, decodedBuffer);
                zenBGM.setTrack(0); // 自动切换至自定义曲目并开始播放
                showToast(`🎉 成功导入并播放专属曲目：《${file.name}》`);
            } catch (err) {
                console.error('[Audio] Decode custom audio failed:', err);
                showToast('音频格式解析失败，请尝试标准 MP3/WAV/M4A 格式');
            }

            inputCustomAudio.value = '';
        });
    }

    if (btnClearCustom) {
        btnClearCustom.addEventListener('click', async (e) => {
            e.stopPropagation();
            await AudioDB.delete();
            zenBGM.customAudioBuffer = null;
            zenBGM.customAudioName = '';
            if (zenBGM.currentTrackId === 0) {
                zenBGM.setTrack(1);
            }
            updateCustomTrackUI();
            showToast('已清除自定义音乐，恢复默认禅音');
        });
    }

    // 顶部禅音背景音乐快捷切换按钮
    const bgmIndicatorBtn = document.getElementById('bgm-indicator-btn');
    if (bgmIndicatorBtn) {
        bgmIndicatorBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            initAudio();
            if (audioCtx && audioCtx.state === 'suspended') {
                audioCtx.resume();
            }

            state.bgmEnabled = !state.bgmEnabled;
            localStorage.setItem('qmy_bgm', state.bgmEnabled.toString());
            if (dom.toggleBgm) dom.toggleBgm.checked = state.bgmEnabled;

            if (state.bgmEnabled) {
                playGenerativeBGM();
                showToast('🎵 已开启静心禅音背景音乐');
            } else {
                stopGenerativeBGM();
                showToast('🔇 已暂停背景音乐');
            }
        });
    }

    // 个人中心弹窗开关
    if (dom.btnOpenUserModal) {
        dom.btnOpenUserModal.addEventListener('click', () => {
            renderUserProfile();
            if (dom.modalUser) dom.modalUser.classList.remove('hidden');
        });
    }

    if (dom.btnCloseUser) {
        dom.btnCloseUser.addEventListener('click', () => {
            if (dom.modalUser) dom.modalUser.classList.add('hidden');
        });
    }

    // 预设国风头像选择
    document.querySelectorAll('.preset-avatar-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const icon = btn.getAttribute('data-icon');
            state.userProfile.avatarIcon = icon;
            state.userProfile.customAvatarImg = ''; // 清除自定义大图
            saveData();
            renderUserProfile();
            showToast(`已更换头像为【${btn.title || icon}】`);
        });
    });

    // 自定义头像本地上传
    if (dom.btnTriggerAvatarUpload && dom.inputCustomAvatar) {
        dom.btnTriggerAvatarUpload.addEventListener('click', () => {
            dom.inputCustomAvatar.click();
        });

        dom.inputCustomAvatar.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (file.size > 8 * 1024 * 1024) {
                showToast('头像文件过大，请选择 8MB 以内图片');
                return;
            }

            const reader = new FileReader();
            reader.onload = (event) => {
                state.userProfile.customAvatarImg = event.target.result;
                saveData();
                renderUserProfile();
                showToast('🎉 自定义头像上传成功！');
            };
            reader.readAsDataURL(file);
            dom.inputCustomAvatar.value = '';
        });
    }

    // 保存静心昵称
    if (dom.btnSaveNickname && dom.inputNickname) {
        dom.btnSaveNickname.addEventListener('click', () => {
            const name = dom.inputNickname.value.trim();
            if (!name) {
                showToast('请输入有效的道号/昵称');
                return;
            }
            state.userProfile.nickname = name;
            saveData();
            renderUserProfile();
            renderRankList('friend');
            showToast(`✨ 已成功修改道号为：${name}`);
        });
    }

    // 账号密码云端绑定与登录
    if (dom.btnAccBind) {
        dom.btnAccBind.addEventListener('click', () => {
            const acc = dom.inputAccName ? dom.inputAccName.value.trim() : '';
            const pwd = dom.inputAccPwd ? dom.inputAccPwd.value.trim() : '';
            if (!acc || !pwd) {
                showToast('请输入要绑定的账号和密码');
                return;
            }
            state.userProfile.account = acc;
            saveData();
            showToast(`🔐 当前敲击进度 (${state.totalHit}) 已成功绑定至账号：${acc}`);
        });
    }

    if (dom.btnAccLogin) {
        dom.btnAccLogin.addEventListener('click', () => {
            const acc = dom.inputAccName ? dom.inputAccName.value.trim() : '';
            const pwd = dom.inputAccPwd ? dom.inputAccPwd.value.trim() : '';
            if (!acc || !pwd) {
                showToast('请输入登录账号和密码');
                return;
            }
            state.userProfile.account = acc;
            saveData();
            showToast(`✅ 登录成功！已载入账号【${acc}】的专属进度`);
        });
    }

    // 游艺坊小游戏中心事件
    if (dom.btnOpenMinigames) {
        dom.btnOpenMinigames.addEventListener('click', () => {
            if (dom.modalMinigames) dom.modalMinigames.classList.remove('hidden');
        });
    }

    if (dom.btnCloseMinigames) {
        dom.btnCloseMinigames.addEventListener('click', () => {
            if (dom.modalMinigames) dom.modalMinigames.classList.add('hidden');
        });
    }

    // 进入功德寻宝
    if (dom.btnEnterGemHunt) {
        dom.btnEnterGemHunt.addEventListener('click', () => {
            if (dom.modalMinigames) dom.modalMinigames.classList.add('hidden');
            if (dom.modalGemHunt) dom.modalGemHunt.classList.remove('hidden');
            initGemHuntBoard();
        });
    }

    // 退出功德寻宝
    if (dom.btnExitGemHunt) {
        dom.btnExitGemHunt.addEventListener('click', (e) => {
            e.stopPropagation();
            exitGemHunt();
        });
        dom.btnExitGemHunt.addEventListener('touchend', (e) => {
            e.stopPropagation();
            exitGemHunt();
        });
    }

    // 功德寻宝看广告领敲击值 (每日5次，每次 +2000)
    if (dom.btnGhAdScore) {
        dom.btnGhAdScore.addEventListener('click', () => {
            if (state.gemHunt.dailyAdScoreCount >= 5) {
                showToast('今日看广告领敲击值已达上限 (5/5次)，明日再来吧！');
                return;
            }
            triggerRewardedAd('GH_SCORE');
        });
    }

    // 功德寻宝直接打开排行榜
    if (dom.btnGhOpenRank) {
        dom.btnGhOpenRank.addEventListener('click', () => {
            if (dom.modalRank) dom.modalRank.classList.remove('hidden');
            renderRankList('friend');
        });
    }

    // 跳过中奖结算画面切换 (柜台右上角快捷按钮)
    const btnToggleSkipWin = document.getElementById('btn-toggle-skip-win');
    if (btnToggleSkipWin) {
        btnToggleSkipWin.addEventListener('click', () => {
            state.gemHunt.skipWinAnimation = !state.gemHunt.skipWinAnimation;
            saveData();
            renderGemHuntUI();
            showToast(state.gemHunt.skipWinAnimation ? '⚡ 已开启跳过结算画面' : '⚡ 已关闭跳过结算画面');
        });
    }

    // 规则说明与 Tab 切换
    if (dom.btnGhRules) {
        dom.btnGhRules.addEventListener('click', () => {
            if (dom.modalGemRules) dom.modalGemRules.classList.remove('hidden');
            renderGemRules('icons');
        });
    }

    if (dom.btnCloseGemRules) {
        dom.btnCloseGemRules.addEventListener('click', () => {
            if (dom.modalGemRules) dom.modalGemRules.classList.add('hidden');
        });
    }

    document.querySelectorAll('.gem-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.getAttribute('data-tab');
            renderGemRules(tab);
        });
    });

    // 战力档位调节 (- / +)
    if (dom.btnBetMinus) {
        dom.btnBetMinus.addEventListener('click', () => {
            if (state.gemHunt.isSpinning) return;
            if (state.gemHunt.currentBetIndex > 0) {
                state.gemHunt.currentBetIndex--;
                saveData();
                renderGemHuntUI();
            }
        });
    }

    if (dom.btnBetPlus) {
        dom.btnBetPlus.addEventListener('click', () => {
            if (state.gemHunt.isSpinning) return;
            if (state.gemHunt.currentBetIndex < BET_TIERS.length - 1) {
                state.gemHunt.currentBetIndex++;
                saveData();
                renderGemHuntUI();
                const nextBet = BET_TIERS[state.gemHunt.currentBetIndex];
                if (!isBetTierUnlocked(nextBet)) {
                    openUnlockBetModal(nextBet);
                }
            }
        });
    }

    // 点击战力显示区域直接弹出 3D 战力选择抽屉面板
    if (dom.ghCurrentBet) {
        dom.ghCurrentBet.addEventListener('click', () => {
            renderBetPickerModal();
        });
    }

    if (dom.btnOpenBetModal) {
        dom.btnOpenBetModal.addEventListener('click', () => {
            renderBetPickerModal();
        });
    }

    if (dom.btnCloseBetPicker) {
        dom.btnCloseBetPicker.addEventListener('click', () => {
            if (dom.modalBetPicker) dom.modalBetPicker.classList.add('hidden');
        });
    }

    // 祈福旋转按钮 (点击单次旋转 / 长按触发自动连转)
    if (dom.btnGhSpin) {
        let pressTimer = null;
        let isLongPress = false;

        const startPress = () => {
            isLongPress = false;
            pressTimer = setTimeout(() => {
                isLongPress = true;
                if (!state.gemHunt.isAutoSpinning) {
                    state.gemHunt.isAutoSpinning = true;
                    dom.btnGhSpin.classList.add('auto-active');
                    if (dom.ghSpinText) dom.ghSpinText.textContent = '停止';
                    showToast('🔄 已开启长按自动祈福');
                    spinGemHunt();
                }
            }, 600);
        };

        const endPress = () => {
            if (pressTimer) {
                clearTimeout(pressTimer);
                pressTimer = null;
            }
        };

        dom.btnGhSpin.addEventListener('mousedown', startPress);
        dom.btnGhSpin.addEventListener('mouseup', endPress);
        dom.btnGhSpin.addEventListener('mouseleave', endPress);

        dom.btnGhSpin.addEventListener('touchstart', (e) => {
            e.preventDefault();
            startPress();
        }, { passive: false });

        dom.btnGhSpin.addEventListener('touchend', (e) => {
            e.preventDefault();
            endPress();
            if (!isLongPress) {
                if (state.gemHunt.isAutoSpinning) {
                    stopAutoSpin();
                } else {
                    spinGemHunt();
                }
            }
        }, { passive: false });

        dom.btnGhSpin.addEventListener('click', (e) => {
            e.preventDefault();
            if (!isLongPress) {
                if (state.gemHunt.isAutoSpinning) {
                    stopAutoSpin();
                } else {
                    spinGemHunt();
                }
            }
        });
    }

    // 中奖结算弹窗快速点击任意处跳过收下
    if (dom.modalGemWin) {
        dom.modalGemWin.addEventListener('click', () => {
            dismissWinCelebrationModal();
        });
    }

    // 战力解锁确认与关闭
    if (dom.btnCloseUnlockBet) {
        dom.btnCloseUnlockBet.addEventListener('click', () => {
            if (dom.modalUnlockBet) dom.modalUnlockBet.classList.add('hidden');
        });
    }

    if (dom.btnConfirmWatchAdBet) {
        dom.btnConfirmWatchAdBet.addEventListener('click', () => {
            triggerRewardedAd('UNLOCK_BET');
        });
    }

    // 敲击值不足弹窗按键事件
    if (dom.btnCloseNotEnoughScore) {
        dom.btnCloseNotEnoughScore.addEventListener('click', () => {
            if (dom.modalNotEnoughScore) dom.modalNotEnoughScore.classList.add('hidden');
        });
    }

    if (dom.btnCancelNotEnough) {
        dom.btnCancelNotEnough.addEventListener('click', () => {
            if (dom.modalNotEnoughScore) dom.modalNotEnoughScore.classList.add('hidden');
            exitGemHunt();
        });
    }

    if (dom.btnConfirmWatchAdForScore) {
        dom.btnConfirmWatchAdForScore.addEventListener('click', () => {
            watchAdForScore();
        });
    }

    // 设置开关
    if (dom.toggleSfx) {
        dom.toggleSfx.addEventListener('change', (e) => {
            state.sfxEnabled = e.target.checked;
            localStorage.setItem('qmy_sfx', state.sfxEnabled.toString());
        });
    }

    if (dom.toggleBgm) {
        dom.toggleBgm.addEventListener('change', (e) => {
            state.bgmEnabled = e.target.checked;
            localStorage.setItem('qmy_bgm', state.bgmEnabled.toString());
            if (state.bgmEnabled) {
                playGenerativeBGM();
                showToast('已开启静心背景音乐');
            } else {
                stopGenerativeBGM();
                showToast('已关闭背景音乐');
            }
        });
    }

    // 页面首次任意触摸/点击激活音频上下文与背景音乐
    const startAudioOnFirstGesture = () => {
        initAudio();
        if (state.bgmEnabled) {
            playGenerativeBGM();
        }
        document.removeEventListener('click', startAudioOnFirstGesture);
        document.removeEventListener('touchstart', startAudioOnFirstGesture);
    };
    document.addEventListener('click', startAudioOnFirstGesture, { once: true });
    document.addEventListener('touchstart', startAudioOnFirstGesture, { once: true });
}

// 页面加载启动
window.addEventListener('DOMContentLoaded', () => {
    initDomReferences();
    loadData();
    initEvents();
    startIdleBlinkScheduler();
});
