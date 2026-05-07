(function () {
    'use strict';

    if (window.sirko_ready) return;
    window.sirko_ready = true;

    console.log('SirkoCore loaded');

    function addButton() {

        if ($('.button--sirko').length) return;

        let container = $('.full-start-new__buttons');

        if (!container.length) {
            console.log('Sirko: buttons container not found');
            return;
        }

        container.append(`
            <div class="full-start__button selector button--sirko">
                <svg width="24" height="24" viewBox="0 0 24 24">
                    <path fill="currentColor"
                        d="M12 2L2 7V17L12 22L22 17V7L12 2Z"/>
                </svg>
                <span>Sirko</span>
            </div>
        `);

        $('.button--sirko').on('hover:enter', function () {
            Lampa.Noty.show('Sirko работает 🚀');
        });

        console.log('Sirko button added');
    }

    function init() {

        console.log('Sirko init');

        Lampa.Listener.follow('full', function (e) {

            console.log('Sirko event:', e);

            if (e.type === 'complite' || e.type === 'complete') {

                setTimeout(addButton, 300);

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
