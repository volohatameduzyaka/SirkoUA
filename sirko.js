// Sirko Plugin - MVP v0.1-fix
(function () {
    'use strict';

    const PLUGIN_NAME = "Sirko";
    const PLUGIN_VERSION = "0.1";

    function initPlugin() {
        console.log(`[${PLUGIN_NAME}] Плагин инициализирован v${PLUGIN_VERSION}`);

        // Добавление кнопки "Sirko"
        function addSirkoButton(cardData, element) {
            if (!element) return;

            if (element.querySelector('.sirko-button')) return;

            const btn = document.createElement('div');
            btn.className = 'sirko-button button';
            btn.innerHTML = '▶ Sirko';
            btn.style.cssText = 'background: linear-gradient(45deg, #0066cc, #00aaff); color: white; margin: 8px 4px; padding: 8px 16px; border-radius: 6px; cursor: pointer;';

            btn.onclick = function(e) {
                e.stopImmediatePropagation();
                Lampa.Noty.show(`Sirko: ищем контент для "${cardData.title || cardData.name || 'фильма'}"...`);
                console.log(`[${PLUGIN_NAME}] Нажата кнопка для:`, cardData);
                // Пока просто уведомление
            };

            element.appendChild(btn);
        }

        // Подписка на открытие карточки
        Lampa.Listener.follow('card', function(e) {
            if (e.type === 'opened') {
                setTimeout(() => {
                    const cardElement = document.querySelector('.card-detail__info, .activity__content, .content__info');
                    if (cardElement && e.data) {
                        addSirkoButton(e.data, cardElement);
                    }
                }, 1200);
            }
        });

        console.log(`[${PLUGIN_NAME}] Готов к работе`);
    }

    // Безопасная инициализация
    if (window.Lampa && window.Lampa.Listener) {
        initPlugin();
    } else {
        Lampa.Listener.follow('app', function(event) {
            if (event.type === 'ready' || event.type === 'init') {
                initPlugin();
            }
        });
    }
})();