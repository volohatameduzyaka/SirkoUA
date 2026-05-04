(function () {
    'use strict';

    function searchOnUafix(title, callback) {
        let url = `https://uafix.net/?s=${encodeURIComponent(title)}`;

        fetch(url)
            .then(r => r.text())
            .then(html => {
                let doc = new DOMParser().parseFromString(html, 'text/html');
                let links = [...doc.querySelectorAll('a')];

                for (let a of links) {
                    if (a.href.includes('/films/') || a.href.includes('/serials/')) {
                        callback(a.href);
                        return;
                    }
                }

                callback(null);
            })
            .catch(() => callback(null));
    }

    function extractIframe(html) {
        // ищем iframe разными способами
        let match =
            html.match(/<iframe[^>]+src="([^"]+)"/i) ||
            html.match(/src:\s*['"]([^'"]+)['"]/i);

        return match ? match[1] : null;
    }

    function getPlayer(pageUrl, callback) {
        fetch(pageUrl)
            .then(r => r.text())
            .then(html => {
                let iframe = extractIframe(html);
                callback(iframe);
            })
            .catch(() => callback(null));
    }

    function openSirko() {
        let card = Lampa.Activity.active().card;
        let title = card.title;

        Lampa.Noty.show('Sirko: ищу...');

        searchOnUafix(title, function (pageUrl) {
            if (!pageUrl) {
                Lampa.Noty.show('Не найдено');
                return;
            }

            getPlayer(pageUrl, function (iframe) {
                if (!iframe) {
                    Lampa.Noty.show('Плеер не найден');
                    return;
                }

                // фикс для //domain.com
                if (iframe.startsWith('//')) {
                    iframe = 'https:' + iframe;
                }

                Lampa.Player.play({
                    url: iframe,
                    title: title
                });
            });
        });
    }

    function addButton() {
        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'complite') {
                Lampa.Button.add({
                    title: 'Sirko',
                    onClick: openSirko
                });
            }
        });
    }

    addButton();
})();
