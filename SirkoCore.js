(function () {
    'use strict';

    if (window.sirko_ready) return;
    window.sirko_ready = true;

    console.log('SirkoCore loaded');

    function addButton() {

        if ($('.button--sirko').length) return;

        // Ищем РЕАЛЬНЫЙ контейнер кнопок
        let container = $('.full-start__buttons');

        // fallback
        if (!container.length) {
            container = $('.items-line');
        }

        if (!container.length) {
            console.log('Sirko: buttons container not found');
            return;
        }

        console.log('Sirko: container found');

        container.append(`
            <div class="full-start__button selector button--sirko">
                <svg width="24" height="24" viewBox="0 0 24 24">
                    <path fill="currentColor"
                        d="M12 2L2 7V17L12 22L22 17V7L12 2Z"/>
                </svg>
                <span>Sirko</span>
            </div>
        `);

        console.log('Sirko button added');

        $('.button--sirko').on('hover:enter', function () {

            Lampa.Noty.show('Sirko работает 🚀');

        });

    }

    function init() {

        console.log('Sirko init');

        Lampa.Listener.follow('full', function (e) {

            console.log('Sirko event:', e);

            if (
                e.type === 'complite' ||
                e.type === 'complete'
            ) {

                setTimeout(addButton, 500);

            }

        });

    }

    if (window.appready) {
        init();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') init();
        });
    }

})();
