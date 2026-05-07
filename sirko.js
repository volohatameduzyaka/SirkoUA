(function () {
    'use strict';

    function startPlugin() {

        console.log('Sirko: plugin loaded');

        // Подписка на открытие карточки
        Lampa.Listener.follow('full', function (e) {

            console.log('Sirko: event', e);

            if (e.type === 'complete') {

                console.log('Sirko: adding button');

                // защита от дублей
                if (document.querySelector('.button--sirko')) return;

                Lampa.Button.add({
                    title: 'Sirko',
                    class: 'button--sirko',
                    onClick: function () {
                        Lampa.Noty.show('Sirko работает 🚀');
                    }
                });
            }
        });
    }

    // Ждём загрузки Lampa
    if (window.Lampa) {
        startPlugin();
    } else {
        window.addEventListener('load', startPlugin);
    }

})();
