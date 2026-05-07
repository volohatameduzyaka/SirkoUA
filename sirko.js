(function () {
    'use strict';

    if (!window.Lampa) return;

    function plugin() {

        Lampa.Listener.follow('full', function (e) {

            if (e.type === 'complite') {

                Lampa.Controller.listener.follow('toggle', function () {});

                if ($('.button--sirko').length) return;

                $('.full-start-new__buttons').append(`
                    <div class="full-start__button selector button--sirko">
                        <svg height="22" viewBox="0 0 24 24" width="22">
                            <path fill="currentColor"
                                d="M12 2L2 7V17L12 22L22 17V7L12 2Z"/>
                        </svg>
                        <span>Sirko</span>
                    </div>
                `);

                $('.button--sirko').on('hover:enter', function () {
                    Lampa.Noty.show('Sirko работает 🚀');
                });

            }

        });

    }

    if (window.appready) {
        plugin();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') plugin();
        });
    }

})();
