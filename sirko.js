(function () {
    'use strict';

    function debug(message) {

        console.log('SIRKO DEBUG:', message);

        // экранный debug
        let box = document.getElementById('sirko-debug');

        if (!box) {
            box = document.createElement('div');

            box.id = 'sirko-debug';

            box.style.position = 'fixed';
            box.style.top = '20px';
            box.style.right = '20px';
            box.style.zIndex = '999999';
            box.style.background = 'rgba(0,0,0,0.9)';
            box.style.color = '#fff';
            box.style.padding = '15px';
            box.style.fontSize = '18px';
            box.style.borderRadius = '10px';
            box.style.maxWidth = '400px';

            document.body.appendChild(box);
        }

        box.innerHTML += '<div>' + message + '</div>';
    }

    function startPlugin() {

        debug('PLUGIN STARTED');

        if (!window.Lampa) {
            debug('LAMPA NOT FOUND');
            return;
        }

        debug('LAMPA FOUND');

        // тестовая кнопка прямо в DOM
        let btn = document.createElement('button');

        btn.innerText = 'SIRKO TEST';

        btn.style.position = 'fixed';
        btn.style.bottom = '50px';
        btn.style.right = '50px';
        btn.style.zIndex = '999999';
        btn.style.padding = '20px';
        btn.style.fontSize = '20px';
        btn.style.background = 'red';
        btn.style.color = 'white';
        btn.style.border = 'none';
        btn.style.borderRadius = '10px';

        btn.onclick = function () {
            alert('Sirko работает');
        };

        document.body.appendChild(btn);

        debug('TEST BUTTON ADDED');

        // слушаем события
        if (Lampa.Listener) {

            debug('LISTENER FOUND');

            Lampa.Listener.follow('full', function (e) {
                debug('FULL EVENT: ' + JSON.stringify(e));
            });

        } else {
            debug('LISTENER NOT FOUND');
        }
    }

    // старт
    setTimeout(startPlugin, 3000);

})();
