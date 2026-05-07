(function () {
‘use strict’;

```
// ====================================================
//  НАСТРОЙКИ ПЛАГИНА
// ====================================================
var PLUGIN_NAME    = 'Sirko';
var PLUGIN_VERSION = '1.0.0';
var API_URL        = 'https://api.delivembd.ws';  // основной эндпоинт Sirko (via Collaps)

// ====================================================
//  ПЕРЕВОДЫ
// ====================================================
Lampa.Lang.add({
    sirko_name:        { ru: 'Sirko',              en: 'Sirko'            },
    sirko_loading:     { ru: 'Загрузка…',          en: 'Loading…'         },
    sirko_empty:       { ru: 'Ничего не найдено',  en: 'Nothing found'    },
    sirko_error:       { ru: 'Ошибка запроса',     en: 'Request error'    },
    sirko_season:      { ru: 'Сезон',              en: 'Season'           },
    sirko_episode:     { ru: 'Эпизод',             en: 'Episode'          },
    sirko_voice:       { ru: 'Озвучка',            en: 'Voice'            },
    sirko_quality:     { ru: 'Качество',           en: 'Quality'          },
    sirko_settings:    { ru: 'Sirko — настройки',  en: 'Sirko settings'   },
    sirko_proxy:       { ru: 'Прокси-адрес',       en: 'Proxy URL'        },
});

// ====================================================
//  ШАБЛОНЫ HTML
// ====================================================
Lampa.Template.add('sirko_item', '\
    <div class="online-item selector">\
        <div class="online-item__title">{title}</div>\
        <div class="online-item__info">{info}</div>\
    </div>');

Lampa.Template.add('sirko_empty', '\
    <div class="online-empty">\
        <div class="online-empty__text">{text}</div>\
    </div>');

// ====================================================
//  ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ====================================================

/**
 * Возвращает активный адрес API (с прокси или без).
 */
function baseUrl() {
    var proxy = Lampa.Storage.get('sirko_proxy', '');
    return proxy ? proxy.replace(/\/$/, '') + '/' + API_URL.replace(/^https?:\/\//, '') : API_URL;
}

/**
 * Универсальный GET-запрос через Lampa.Reguest (поддерживает таймаут/отмену).
 */
function apiGet(path, params, onSuccess, onError) {
    var qs = Object.keys(params || {})
        .filter(function (k) { return params[k] !== undefined && params[k] !== ''; })
        .map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); })
        .join('&');

    var url = baseUrl() + path + (qs ? '?' + qs : '');

    Lampa.Reguest.get(url, function (data) {
        onSuccess(data);
    }, function (e) {
        if (onError) onError(e);
    });
}

/**
 * Парсим «рубленые» строки типа «1080p» → 1080, «720p» → 720
 */
function qualityOrder(q) {
    var m = (q || '').match(/(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
}

/**
 * Сортируем массив источников по убыванию качества.
 */
function sortByQuality(files) {
    return files.slice().sort(function (a, b) {
        return qualityOrder(b.quality) - qualityOrder(a.quality);
    });
}

// ====================================================
//  БАЛАНСЕР — ОСНОВНАЯ ЛОГИКА
// ====================================================
function SirkoBalancer(object) {
    var self    = this;
    var comp    = object.component;   // ссылка на component.js
    var card    = object.card;        // данные фильма/сериала из TMDB/КП
    var network = new Lampa.Reguest();

    // Внутреннее состояние
    var _data       = null;   // ответ от API
    var _seasons    = [];
    var _voices     = [];
    var _curSeason  = 1;
    var _curVoice   = null;

    // ------------------------------------------------
    //  ПУБЛИЧНЫЙ ИНТЕРФЕЙС (обязателен для балансера)
    // ------------------------------------------------

    /** Запускается при открытии карточки — ищем контент */
    this.find = function () {
        comp.loading(true);

        var kpId   = card.kinopoisk_id || (card.external_ids && card.external_ids.kinopoisk_id) || '';
        var imdbId = card.imdb_id       || (card.external_ids && card.external_ids.imdb_id)      || '';
        var tmdbId = card.id            || '';

        // Предпочитаем kinopoisk_id, иначе imdb, иначе tmdb
        var params = {};
        if (kpId)        { params.kinopoisk_id = kpId; }
        else if (imdbId) { params.imdb_id      = imdbId; }
        else             { params.tmdb_id      = tmdbId; }

        // Тип контента
        params.type = (card.name || card.original_name) ? 'tv' : 'movie';

        apiGet('/embeds', params, function (resp) {
            comp.loading(false);

            if (!resp || !resp.results || !resp.results.length) {
                self.empty();
                return;
            }

            _data = resp.results;
            self._buildVoices();
            self._render();

        }, function () {
            comp.loading(false);
            comp.error(Lampa.Lang.translate('sirko_error'));
        });
    };

    /** Фильтр: вызывается при смене сезона/озвучки */
    this.filter = function (type, val) {
        if (type === 'season') { _curSeason = parseInt(val, 10); }
        if (type === 'voice')  { _curVoice  = val; }
        self._render();
    };

    /** Очистка при уничтожении компонента */
    this.destroy = function () {
        network.clear();
    };

    // ------------------------------------------------
    //  ПРИВАТНЫЕ МЕТОДЫ
    // ------------------------------------------------

    /** Собираем список озвучек из данных */
    this._buildVoices = function () {
        var seen = {};
        _voices = [];
        _data.forEach(function (item) {
            var v = item.translation || item.voice || 'Оригинал';
            if (!seen[v]) { seen[v] = true; _voices.push(v); }
        });
        _curVoice = _voices[0] || null;

        // Собираем список сезонов (для сериалов)
        var seenS = {};
        _seasons = [];
        _data.forEach(function (item) {
            if (item.season && !seenS[item.season]) {
                seenS[item.season] = true;
                _seasons.push(item.season);
            }
        });
        _seasons.sort(function (a, b) { return a - b; });
        if (_seasons.length) { _curSeason = _seasons[0]; }
    };

    /** Рисуем список эпизодов / файлов */
    this._render = function () {
        comp.clear();

        // Передаём фильтры в компонент
        if (_voices.length > 1) {
            comp.filter_set('voice', _voices.map(function (v) {
                return { title: v, id: v };
            }), _curVoice);
        }
        if (_seasons.length > 1) {
            comp.filter_set('season', _seasons.map(function (s) {
                return { title: Lampa.Lang.translate('sirko_season') + ' ' + s, id: s };
            }), _curSeason);
        }

        // Фильтруем по текущей озвучке
        var filtered = _data.filter(function (item) {
            var v = item.translation || item.voice || 'Оригинал';
            return !_curVoice || v === _curVoice;
        });

        // Для сериалов — только нужный сезон
        if (_seasons.length) {
            filtered = filtered.filter(function (item) {
                return parseInt(item.season, 10) === _curSeason;
            });
        }

        if (!filtered.length) {
            self.empty();
            return;
        }

        filtered.forEach(function (item) {
            self._addItem(item);
        });
    };

    /** Добавляем один элемент (файл / эпизод) */
    this._addItem = function (item) {
        var isSeries = !!item.episode;

        var title = isSeries
            ? Lampa.Lang.translate('sirko_episode') + ' ' + item.episode
            : (item.title || card.title || card.name || '');

        var info = [
            item.quality  ? item.quality  : '',
            item.translation || item.voice || '',
        ].filter(Boolean).join(' · ');

        var elem = Lampa.Template.get('sirko_item', { title: title, info: info });

        // Отмечаем просмотренные
        var watchedKey = 'sirko_watched_' + (card.id || '') + '_' + (item.season || 0) + '_' + (item.episode || 0);
        if (Lampa.Storage.get(watchedKey)) {
            elem.addClass('online-item--watched');
        }

        // Клик — выбор качества и запуск плеера
        elem.on('selected', function () {
            self._play(item, watchedKey);
        });

        comp.append(elem);
    };

    /** Запрашиваем прямую ссылку и запускаем плеер */
    this._play = function (item, watchedKey) {
        // Если уже есть прямая ссылка в объекте — используем её
        if (item.file) {
            self._startPlayer(item, item.file, watchedKey);
            return;
        }

        // Иначе запрашиваем embed URL
        if (!item.iframe) {
            Lampa.Noty.show(Lampa.Lang.translate('sirko_error'));
            return;
        }

        comp.loading(true);

        Lampa.Reguest.get(item.iframe, function (html) {
            comp.loading(false);

            // Пытаемся вытащить .m3u8 / .mp4 из HTML embed-страницы
            var match = (html || '').match(/["'](https?[^"']+\.(?:m3u8|mp4)[^"']*)['"]/i);
            if (match) {
                self._startPlayer(item, match[1], watchedKey);
            } else {
                // Fallback — открываем iframe напрямую
                self._startPlayer(item, item.iframe, watchedKey);
            }
        }, function () {
            comp.loading(false);
            Lampa.Noty.show(Lampa.Lang.translate('sirko_error'));
        });
    };

    /** Передаём URL в плеер Lampa */
    this._startPlayer = function (item, url, watchedKey) {
        // Помечаем как просмотренное
        Lampa.Storage.set(watchedKey, true);

        var playerData = {
            title:    card.title || card.name || '',
            url:      url,
            timeline: Lampa.Timeline,
        };

        if (item.episode) { playerData.episode = item.episode; }
        if (item.season)  { playerData.season  = item.season;  }

        Lampa.Player.play(playerData);
        Lampa.Player.callback(function () {
            // После завершения просмотра — перерисовываем список
            self._render();
        });
    };

    /** Показ заглушки «пусто» */
    this.empty = function () {
        var elem = Lampa.Template.get('sirko_empty', {
            text: Lampa.Lang.translate('sirko_empty')
        });
        comp.append(elem);
    };
}

// ====================================================
//  НАСТРОЙКИ ПЛАГИНА (страница в меню Lampa)
// ====================================================
function addSettings() {
    Lampa.Settings.listener.follow('open', function (e) {
        if (e.name !== 'plugins_player') return;

        // Поле «Прокси»
        var proxyField = $('<div class="settings-param selector">\
            <div class="settings-param__name">' + Lampa.Lang.translate('sirko_proxy') + '</div>\
            <div class="settings-param__value">' + (Lampa.Storage.get('sirko_proxy', '') || '—') + '</div>\
        </div>');

        proxyField.on('selected', function () {
            Lampa.Input.edit({
                title:   Lampa.Lang.translate('sirko_proxy'),
                value:   Lampa.Storage.get('sirko_proxy', ''),
                callback: function (val) {
                    Lampa.Storage.set('sirko_proxy', val.trim());
                    proxyField.find('.settings-param__value').text(val.trim() || '—');
                }
            });
        });

        e.body.append(proxyField);
    });
}

// ====================================================
//  РЕГИСТРАЦИЯ БАЛАНСЕРА В ONLINE-КОМПОНЕНТЕ
// ====================================================
function register() {
    // Ждём инициализации online-компонента
    Lampa.Listener.follow('online', function (e) {
        if (e.type !== 'start') return;

        e.object.register({
            title:   Lampa.Lang.translate('sirko_name'),
            name:    'sirko',
            create:  function (obj) { return new SirkoBalancer(obj); }
        });
    });
}

// ====================================================
//  ТОЧКА ВХОДА
// ====================================================
function init() {
    // Проверяем, что online-плагин уже загружен
    if (window.Lampa && Lampa.Listener) {
        register();
        addSettings();
        console.log('[Sirko] плагин v' + PLUGIN_VERSION + ' загружен');
    } else {
        // Если Lampa ещё не готова — ждём
        var timer = setInterval(function () {
            if (window.Lampa && Lampa.Listener) {
                clearInterval(timer);
                register();
                addSettings();
                console.log('[Sirko] плагин v' + PLUGIN_VERSION + ' загружен (delayed)');
            }
        }, 200);
    }
}

init();
```

})();