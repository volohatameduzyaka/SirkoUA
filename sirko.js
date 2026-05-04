(function () {
    'use strict';

    const LAMPAC = 'http://lampaua.mooo.com';

    function getSources(title, callback) {
        let url = `${LAMPAC}/lite/events?title=${encodeURIComponent(title)}`;

        fetch(url)
            .then(r => r.json())
            .then(data => {
                if (!data || !data.length) return callback([]);
                callback(data);
            })
            .catch(() => callback([]));
    }

    function showSources(list, title) {
        if (!list.length) {
            Lampa.Noty.show('Sirko: источники не найдены');
            return;
        }

        let items = list.map((item, index) => {
            let voice = item.voice || 'Без описания';
            let name = item.name || 'Источник';

            return {
                title: `${name} • ${voice}`,
                index: index
            };
        });

        Lampa.Select.show({
            title: 'Sirko: выбери источник',
            items: items,
            onSelect: function (item) {
                let source = list[item.index];

                if (!source || !source.url) {
                    Lampa.Noty.show('Ошибка источника');
                    return;
                }

                Lampa.Player.play({
                    url: source.url,
                    title: title
                });
            }
        });
    }

    function openSirko() {
        let card = Lampa.Activity.active().card;
        let title = card.title;

        Lampa.Noty.show('Sirko: загрузка источников...');

        getSources(title, function (sources) {
            showSources(sources, title);
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
