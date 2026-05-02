// Sirko Plugin - MVP v0.1
(function () {
    'use strict';

    const PLUGIN_NAME = "Sirko";
    const PLUGIN_VERSION = "0.1";

    console.log(`[${PLUGIN_NAME}] Плагин инициализирован v${PLUGIN_VERSION}`);

    // Регистрация кнопки в карточке
    function addSirkoButton(cardData, element) {
        if (!element) return;

        const existing = element.querySelector('.sirko-button');
        if (existing) return;

        const btn = document.createElement('div');
        btn.className = 'sirko-button button';
        btn.innerHTML = '▶ Sirko';
        btn.style.cssText = 'background: #0066cc; color: white; margin: 8px 4px;';

        btn.onclick = function(e) {
            e.stopImmediatePropagation();
            console.log(`[${PLUGIN_NAME}] Запуск для:`, cardData.title || cardData.name);
            // Здесь будет вызов парсера и плеера
            Lampa.Noty.show(`Sirko: ищем ссылки для ${cardData.title || 'контента'}...`);
            // TODO: запуск парсинга
        };

        element.appendChild(btn);
    }

    // Подписка на события Lampa (открытие карточки)
    Lampa.Listener.follow('card', function(e) {
        if (e.type === 'opened') {
            setTimeout(() => {
                const cardElement = document.querySelector('.card-detail__info') || 
                                  document.querySelector('.activity__content');
                if (cardElement) {
                    addSirkoButton(e.data, cardElement);
                }
            }, 800);
        }
    });

    // Регистрация источника
    if (typeof Lampa.Sources !== 'undefined') {
        Lampa.Sources.register({
            name: PLUGIN_NAME,
            version: PLUGIN_VERSION,
            search: function(query, onComplite) {
                // TODO: реализация поиска
                onComplite([]);
            }
        });
    }

    // Автозапуск
    if (window.appready) {
        console.log(`[${PLUGIN_NAME}] Готов к работе`);
    } else {
        Lampa.Listener.follow('app', function(event) {
            if (event.type === 'ready') {
                console.log(`[${PLUGIN_NAME}] Готов к работе`);
            }
        });
    }
})();