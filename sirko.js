(function () {
    'use strict';

    // -----------------------------
    // ⚙️ CONFIG
    // -----------------------------
    const CONFIG = {
        LAMPACS: [
            'http://lampaua.mooo.com'
        ],
        CACHE_TIME: 10 * 60 * 1000,
        HISTORY_LIMIT: 30
    };

    // -----------------------------
    // 🧠 STORAGE
    // -----------------------------
    function getStore(key, fallback) {
        try {
            return Lampa.Storage.get(key) || fallback;
        } catch (e) {
            return fallback;
        }
    }

    function setStore(key, value) {
        try {
            Lampa.Storage.set(key, value);
        } catch (e) {}
    }

    // -----------------------------
    // ⚡ CACHE
    // -----------------------------
    const CACHE = {};

    function getCache(key) {
        let item = CACHE[key];
        if (!item) return null;

        if (Date.now() - item.time > CONFIG.CACHE_TIME) {
            delete CACHE[key];
            return null;
        }

        return item.data;
    }

    function setCache(key, data) {
        CACHE[key] = {
            data,
            time: Date.now()
        };
    }

    // -----------------------------
    // 🧹 NORMALIZE + CLEAN
    // -----------------------------
    function normalize(item) {
        if (!item) return null;

        let url = item.url || item.link || item.stream;
        let name = item.name || item.title || item.label || 'Источник';
        let voice = item.voice || item.lang || item.translation || '';

        if (!url) return null;

        return {
            url: url.trim(),
            name: name.trim(),
            voice: voice.trim()
        };
    }

    function clean(list) {
        let seen = new Set();

        return list
            .map(normalize)
            .filter(i => {
                if (!i) return false;
                if (seen.has(i.url)) return false;
                seen.add(i.url);
                return true;
            });
    }

    // -----------------------------
    // 🔁 FETCH SAFE + RETRY
    // -----------------------------
    async function safeFetch(url, timeout = 8000) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout);

        try {
            let res = await fetch(url, { signal: controller.signal });
            clearTimeout(timer);
            return res;
        } catch (e) {
            clearTimeout(timer);
            throw e;
        }
    }

    async function fetchWithRetry(url, attempt = 0) {
        try {
            let res = await safeFetch(url);

            if (!res.ok) throw new Error('http');

            let data = await res.json();

            if (!data || !data.length) throw new Error('empty');

            return clean(data);
        } catch (e) {
            if (attempt < 1) {
                return fetchWithRetry(url, attempt + 1);
            }
            throw e;
        }
    }

    // -----------------------------
    // 🔁 FALLBACK LAMPAC
    // -----------------------------
    async function getSources(title) {
        let cached = getCache(title);
        if (cached) return cached;

        for (let base of CONFIG.LAMPACS) {
            let url = `${base}/lite/events?title=${encodeURIComponent(title)}`;

            try {
                let data = await fetchWithRetry(url);

                if (data && data.length) {
                    setCache(title, data);
                    return data;
                }
            } catch (e) {}
        }

        return [];
    }

    // -----------------------------
    // 🧠 QUALITY SORT
    // -----------------------------
    function getQualityScore(item) {
        let score = 0;

        let v = (item.voice || '').toLowerCase();
        let n = (item.name || '').toLowerCase();

        if (v.includes('ukr') || v.includes('ua') || v.includes('україн')) score += 50;

        if (v.includes('4k')) score += 40;
        else if (v.includes('fhd') || v.includes('1080')) score += 30;
        else if (v.includes('hd') || v.includes('720')) score += 20;

        if (n.includes('hd')) score += 10;

        return score;
    }

    function sortByQuality(list) {
        return list.sort((a, b) => getQualityScore(b) - getQualityScore(a));
    }

    // -----------------------------
    // 🧠 HISTORY
    // -----------------------------
    function getHistory() {
        return getStore('sirko_history', []);
    }

    function saveHistory(item, title) {
        let history = getHistory();

        history.unshift({
            title,
            url: item.url,
            voice: item.voice,
            time: Date.now()
        });

        history = history.slice(0, CONFIG.HISTORY_LIMIT);

        setStore('sirko_history', history);
    }

    function cleanHistory() {
        let history = getHistory();
        let now = Date.now();

        history = history.filter(h => (now - h.time) < 14 * 24 * 60 * 60 * 1000);

        setStore('sirko_history', history);
    }

    // -----------------------------
    // 🧠 LANGUAGE GROUP
    // -----------------------------
    function detectLang(v) {
        if (!v) return 'other';

        v = v.toLowerCase();

        if (v.includes('укр') || v.includes('ua') || v.includes('україн')) return 'ua';
        if (v.includes('рус') || v.includes('ru')) return 'ru';

        return 'other';
    }

    function group(list) {
        return {
            ua: list.filter(i => detectLang(i.voice) === 'ua'),
            ru: list.filter(i => detectLang(i.voice) === 'ru'),
            other: list.filter(i => detectLang(i.voice) === 'other')
        };
    }

    // -----------------------------
    // 🎨 UI
    // -----------------------------
    function buildUI(groups) {
        let items = [];
        let map = [];

        function addHeader(t) {
            items.push({ title: `━━━ ${t} ━━━`, separator: true });
        }

        function addGroup(title, list, icon) {
            if (!list.length) return;

            addHeader(`${icon} ${title}`);

            list.forEach(i => {
                let tag = '';

                if ((i.voice || '').toLowerCase().includes('ua')) tag += ' 🇺🇦';

                items.push({
                    title: `   ${i.name} • ${i.voice}${tag}`,
                    index: map.length
                });

                map.push(i);
            });
        }

        addGroup('Український', groups.ua, '🇺🇦');
        addGroup('Русский', groups.ru, '🇷🇺');
        addGroup('Інше', groups.other, '🌍');

        return { items, map };
    }

    // -----------------------------
    // 🎬 MAIN
    // -----------------------------
    async function openSirko() {
        let card = Lampa.Activity.active().card;
        let title = card.title;

        Lampa.Noty.show('Sirko: завантаження...');

        let sources = await getSources(title);

        if (!sources.length) {
            Lampa.Noty.show('Sirko: нічого не знайдено');
            return;
        }

        sources = sortByQuality(sources);

        let groups = group(sources);
        let ui = buildUI(groups);

        Lampa.Select.show({
            title: 'Sirko',
            items: ui.items,
            onSelect: function (item) {
                if (item.separator) return;

                let source = ui.map[item.index];

                if (!source) return;

                Lampa.Player.play({
                    url: source.url,
                    title: title
                });

                saveHistory(source, title);
            }
        });
    }

    // -----------------------------
    // 📜 HISTORY UI
    // -----------------------------
    function openHistory() {
        let history = getHistory();

        if (!history.length) {
            Lampa.Noty.show('История пуста');
            return;
        }

        let items = history.map((h, i) => ({
            title: `${h.title} • ${h.voice || ''}`,
            subtitle: new Date(h.time).toLocaleString(),
            index: i
        }));

        Lampa.Select.show({
            title: 'Sirko: история',
            items,
            onSelect: function (item) {
                let h = history[item.index];

                Lampa.Player.play({
                    url: h.url,
                    title: h.title
                });
            }
        });
    }

    // -----------------------------
    // 🔘 FIXED INIT (ВАЖНО!)
    // -----------------------------
    function init() {

        cleanHistory();

        Lampa.Listener.follow('activity', function (e) {

            if (e.type === 'start' && e.component === 'full') {

                Lampa.Button.add({
                    title: 'Sirko',
                    onClick: function () {

                        Lampa.Select.show({
                            title: 'Sirko',
                            items: [
                                { title: '▶ Смотреть', action: 'watch' },
                                { title: '🕘 История', action: 'history' }
                            ],
                            onSelect: function (i) {
                                if (i.action === 'history') openHistory();
                                else openSirko();
                            }
                        });

                    }
                });

            }

        });
    }

    init();

})();