// ==UserScript==
// @name         C2: AGGREGATOR
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Агрегатор мероприятий и фестивалей для Cosplay2
// @author       Egarchik
// @license      MIT
// @match        https://cosplay2.ru/*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @connect      cosplay2.ru
// @connect      nominatim.openstreetmap.org
// ==/UserScript==

(function() {
    'use strict';

    const fetchGM = (url, options = {}) => {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: options.method || 'GET',
                url: url,
                headers: options.headers || {},
                data: options.body || null,
                withCredentials: true,
                onload: (res) => {
                    resolve({
                        ok: res.status >= 200 && res.status < 300,
                        text: () => Promise.resolve(res.responseText),
                        json: () => Promise.resolve(JSON.parse(res.responseText))
                    });
                },
                onerror: reject
            });
        });
    };

    const defaultCoords = {
        "абакан": [53.7156, 91.4292], "астрахань": [46.3497, 48.0326], "барнаул": [53.3468, 83.7769],
        "бийск": [52.5363, 85.1539], "волгоград": [48.7080, 44.5133], "воронеж": [51.6717, 39.2106],
        "дзержинск": [56.2389, 43.4631], "димитровград": [54.2274, 49.6190], "дубна": [56.7320, 37.1669],
        "екатеринбург": [56.8389, 60.6057], "иваново": [56.9924, 40.9688], "ижевск": [56.8527, 53.2115],
        "иркутск": [52.2870, 104.3050], "казань": [55.7963, 49.1088], "калининград": [54.7104, 20.4522],
        "кемерово": [55.3333, 86.0833], "киселевск": [53.9933, 86.6439], "красноярск": [56.0153, 92.8932],
        "мариуполь": [47.0971, 37.5433], "москва": [55.7558, 37.6173], "набережные челны": [55.7437, 52.3958],
        "нижнекамск": [55.6309, 51.8159], "нижний новгород": [56.3269, 44.0059], "новокузнецк": [53.7596, 87.1216],
        "новороссийск": [44.7154, 37.7690], "новосибирск": [55.0084, 82.9357], "омск": [54.9885, 73.3242],
        "оренбург": [51.7666, 55.1998], "пенза": [53.1959, 45.0183], "пермь": [58.0105, 56.2502],
        "рязань": [54.6269, 39.7145], "самара": [53.2415, 50.2212], "санкт-петербург": [59.9343, 30.3351],
        "село аргамач-пальна": [52.6685, 38.5833], "смоленск": [54.7826, 31.0450], "сочи": [43.5853, 39.7203],
        "тамбов": [52.7317, 41.4433], "тверь": [56.8587, 35.9176], "тольятти": [53.5086, 49.4198],
        "томск": [56.4977, 84.9744], "тюмень": [57.1522, 65.5272], "улан-удэ": [51.8349, 107.5841],
        "ульяновск": [54.3142, 48.4031], "уфа": [54.7388, 55.9721], "хабаровск": [48.4814, 135.0721],
        "чебоксары": [56.1322, 47.2519], "челябинск": [55.1644, 61.4368], "чита": [52.0336, 113.5009]
    };

    const baseSimsPhrases = [
        "Гладим парики", "Грунтуем ЕВУ", "Срочно ищем булавки", "Отпариваем косплей",
        "Считаем бюджет на билеты", "Пытаемся успеть до дедлайна", "Заплетаем косы",
        "Завязываем корсет", "Репетируем дефиле перед зеркалом", "Ищем фотографа на фест",
        "Пьем энергетик в ночь перед фестом", "Крафтим меч из ПВХ", "Укладываем чемодан",
        "Оцениваем масштаб катастрофы", "Ждем согласования заявки"
    ];
    let unusedSimsPhrases = [...baseSimsPhrases];

    const simsGrammar = {
        v: ["Укладываем", "Красим", "Грунтуем", "Шьем", "Клеим", "Ищем", "Полируем", "Переделываем"],
        a: ["залаченный", "огромный", "дешевый", "эпичный", "хрупкий", "тяжелый", "светящийся", "сложный"],
        n: ["парик", "крафт", "доспех", "посох", "корсет", "кринолин", "меч", "лук"],
        p: ["в чемодане", "на балконе", "за 5 минут до выхода", "в коворкинге", "в антикафе", "скотчем", "термоклеем"]
    };

    function getNextSimsText() {
        if (unusedSimsPhrases.length > 0) {
            let idx = Math.floor(Math.random() * unusedSimsPhrases.length);
            return unusedSimsPhrases.splice(idx, 1)[0] + "...";
        }
        let rV = simsGrammar.v[Math.floor(Math.random() * simsGrammar.v.length)];
        let rA = simsGrammar.a[Math.floor(Math.random() * simsGrammar.a.length)];
        let rN = simsGrammar.n[Math.floor(Math.random() * simsGrammar.n.length)];
        let rP = simsGrammar.p[Math.floor(Math.random() * simsGrammar.p.length)];
        return `${rV} ${rA} ${rN} ${rP}...`;
    }

    const globalStyle = document.createElement('style');
    globalStyle.textContent = `
        #page-content.c2-agg-active #maincontainer { display: none !important; }
        #page-content.c2-agg-active .ad { display: none !important; }
        #page-content.c2-agg-active #yandex_rtb_R-A-16355720-7 { display: none !important; }
        #c2-aggregator-root { opacity: 0; transform: translateY(-20px); transition: opacity 0.4s ease-out, transform 0.4s ease-out; }
        #c2-aggregator-root.open { opacity: 1; transform: translateY(0); }
        #slide-nav .nav li a#nav-c2-agg-btn { transition: background-color 0.2s; }
        #slide-nav .nav li a#nav-c2-agg-btn.active, #slide-nav .nav li a#nav-c2-agg-btn:hover { background-color: #1b59bd !important; color: #ffffff !important; }
    `;
    document.head.appendChild(globalStyle);

    let host = document.getElementById('c2-aggregator-root');
    let shadow;
    let cachedEvents = [], allCities = [], isDataLoaded = false, cityCoordsCache = {};
    let isTravelMode = false, baseCity = '', targetCities = [], simsInterval = null;

    function toggleAggregator(e) {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        const pageContent = document.getElementById('page-content');
        const navBtn = document.getElementById('nav-c2-agg-btn');
        if (!host || !document.body.contains(host)) initHost();

        if (host.classList.contains('open')) {
            host.classList.remove('open');
            if (navBtn) navBtn.classList.remove('active');
            setTimeout(() => { host.style.display = 'none'; pageContent.classList.remove('c2-agg-active'); }, 400);
        } else {
            host.style.display = 'block';
            pageContent.classList.add('c2-agg-active');
            if (navBtn) navBtn.classList.add('active');
            if (!isDataLoaded) preloadData();
            requestAnimationFrame(() => host.classList.add('open'));
        }
    }

    function initHost() {
        const pageContent = document.getElementById('page-content');
        if (!pageContent) return;

        host = document.createElement('div');
        host.id = 'c2-aggregator-root';
        host.style.display = 'none';
        pageContent.insertBefore(host, pageContent.firstChild);
        shadow = host.attachShadow({ mode: 'open' });

        const style = document.createElement('style');
        style.textContent = `
            @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');
            :host { display: block; font-family: 'Roboto', Arial, sans-serif; color: #2c2c2c; background: #fdfafb; background-image: radial-gradient(#f7eef1 1px, transparent 1px); background-size: 20px 20px; min-height: calc(100vh - 100px); box-sizing: border-box; border-bottom: 2px solid #eab3c2; }
            * { box-sizing: border-box; margin: 0; padding: 0; }
            .inner-wrap { max-width: 1200px; margin: 0 auto; padding: 30px 20px; }

            .toolbar { background: #ffffff; padding: 20px; border: 1px solid #eab3c2; margin-bottom: 30px; box-shadow: 4px 4px 0px rgba(234, 179, 194, 0.2); position: relative; z-index: 50; }
            .tb-top-row { display: flex; flex-wrap: wrap; align-items: center; gap: 15px; margin-bottom: 15px; }
            .tb-title { font-size: 22px; font-weight: 700; color: #d16b8a; text-transform: uppercase; letter-spacing: 1px; margin-right: auto; display: flex; align-items: center; gap: 10px; }
            .tb-title::before { content: ""; display: block; width: 12px; height: 12px; background-color: #eab3c2; }

            .city-input-wrap { position: relative; width: 260px; }
            .tb-input { background: #ffffff; border: 1px solid #d1d1d1; padding: 10px 15px; font-size: 14px; width: 100%; outline: none; transition: 0.2s; border-radius: 0; }
            .tb-input:focus { border-color: #d16b8a; box-shadow: 2px 2px 0px rgba(209, 107, 138, 0.2); }

            .city-dropdown { position: absolute; top: 100%; left: 0; width: 100%; background: #ffffff; border: 1px solid #d16b8a; border-top: none; max-height: 250px; overflow-y: auto; display: none; box-shadow: 4px 4px 0px rgba(234, 179, 194, 0.2); z-index: 100; }
            .city-dropdown.show { display: block; }
            .city-dropdown-item { padding: 10px 15px; font-size: 14px; cursor: pointer; border-bottom: 1px solid #f2e1e5; transition: 0.1s; }
            .city-dropdown-item:hover { background: #fdfafb; color: #d16b8a; font-weight: 500; }
            .city-dropdown-empty { padding: 10px 15px; font-size: 14px; color: #999; text-align: center; font-style: italic; }
            .city-dropdown::-webkit-scrollbar { width: 6px; } .city-dropdown::-webkit-scrollbar-track { background: #fdfafb; } .city-dropdown::-webkit-scrollbar-thumb { background: #eab3c2; }

            .tb-btn, .tb-btn-close { padding: 10px 20px; font-size: 14px; font-weight: 500; text-transform: uppercase; cursor: pointer; transition: 0.2s; border-radius: 0; }
            .tb-btn { background-color: #d16b8a; color: #ffffff; border: 1px solid #d16b8a; }
            .tb-btn:hover:not(:disabled) { background-color: #ffffff; color: #d16b8a; }
            .tb-btn:disabled { background-color: #d1d1d1; border-color: #d1d1d1; cursor: not-allowed; }
            .tb-btn-close { background-color: #ffffff; color: #2c2c2c; border: 1px solid #2c2c2c; margin-left: auto; }
            .tb-btn-close:hover { background-color: #2c2c2c; color: #ffffff; }

            .c2-checkbox-label { display: flex; align-items: center; gap: 8px; cursor: pointer; user-select: none; font-size: 14px; font-weight: 700; color: #2c2c2c; text-transform: uppercase; letter-spacing: 0.5px; }
            .c2-checkbox { appearance: none; width: 18px; height: 18px; border: 2px solid #d1d1d1; background: #fff; cursor: pointer; position: relative; transition: 0.2s; border-radius: 0; outline: none; margin: 0; }
            .c2-checkbox:checked { background: #d16b8a; border-color: #d16b8a; }
            .c2-checkbox:checked::after { content: '✔'; color: white; position: absolute; font-size: 12px; top: -1px; left: 2px; }

            .travel-tools { display: none; flex-direction: column; gap: 15px; padding-top: 15px; border-top: 1px dashed #eab3c2; }
            .travel-tools.show { display: flex; }
            .tt-row { display: flex; align-items: center; gap: 15px; flex-wrap: wrap; font-size: 14px; color: #2c2c2c; font-weight: 500; }

            input[type=range] { -webkit-appearance: none; width: 220px; background: transparent; outline: none; }
            input[type=range]::-webkit-slider-runnable-track { width: 100%; height: 6px; background: #f2e1e5; cursor: pointer; border-radius: 0; border: 1px solid #eab3c2; }
            input[type=range]::-webkit-slider-thumb { height: 16px; width: 16px; border-radius: 0; background: #d16b8a; cursor: pointer; -webkit-appearance: none; margin-top: -6px; border: 1px solid #fff; box-shadow: 2px 2px 0px rgba(209,107,138,0.2); transition: 0.2s; }
            input[type=range]::-webkit-slider-thumb:hover { transform: scale(1.1); background: #b85573; }
            input[type=range]:disabled::-webkit-slider-runnable-track { background: #eee; border-color: #ddd; }
            input[type=range]:disabled::-webkit-slider-thumb { background: #999; box-shadow: none; cursor: not-allowed; }

            .radius-val { font-weight: 700; color: #d16b8a; min-width: 65px; display: inline-block; }

            .chips-container { display: flex; flex-wrap: wrap; gap: 8px; }
            .chip { padding: 4px 10px; font-size: 12px; font-weight: 700; border-radius: 0; cursor: pointer; user-select: none; transition: 0.2s; border: 1px solid; text-transform: uppercase; letter-spacing: 0.5px; }
            .chip.active { background: #fff; color: #d16b8a; border-color: #d16b8a; }
            .chip.inactive { background: #f9f9f9; color: #999; border-color: #e0e0e0; text-decoration: line-through; }
            .chip:hover { transform: translateY(-2px); box-shadow: 2px 2px 0px rgba(209, 107, 138, 0.2); }
            .chip.inactive:hover { box-shadow: none; color: #666; }

            .progress-area { display: none; flex-direction: column; gap: 8px; width: 100%; margin-top: 15px; padding-top: 15px; border-top: 1px solid #f2e1e5; }
            .pb-track { width: 100%; background: #f0f0f0; height: 12px; overflow: hidden; }
            .pb-fill { height: 100%; background-color: #eab3c2; width: 0%; transition: width 0.3s ease; }
            .pb-text { display: flex; justify-content: space-between; font-size: 12px; text-transform: uppercase; color: #666; font-weight: 500; }

            .sims-text { font-size: 12px; font-style: italic; font-weight: 500; color: #d16b8a; text-align: center; margin-top: 5px; height: 16px; transition: opacity 0.4s ease; text-transform: uppercase; letter-spacing: 0.5px; }

            .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 25px; align-items: stretch; }
            @keyframes fadeUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
            .anim-fade { opacity: 0; animation: fadeUp 0.4s ease-out forwards; }

            .month-header { grid-column: 1 / -1; font-size: 24px; font-weight: 700; color: #2c2c2c; border-bottom: 2px solid #2c2c2c; padding-bottom: 5px; margin-top: 20px; margin-bottom: 10px; text-transform: uppercase; display: flex; align-items: baseline; gap: 10px; transition: opacity 0.3s; }
            .month-header::before { content: ""; display: inline-block; width: 8px; height: 24px; background-color: #eab3c2; transform: translateY(3px); }

            .card { display: flex; flex-direction: column; background: #ffffff; border: 1px solid #eaeaea; overflow: hidden; transition: box-shadow 0.2s, border-color 0.2s, transform 0.2s; height: 100%; position: relative; }
            .card:hover { border-color: #eab3c2; transform: translateY(-4px); box-shadow: 4px 4px 0px rgba(234, 179, 194, 0.4); }
            .card-past { opacity: 0.8; filter: grayscale(80%); background: #fdfdfd; border-color: #e0e0e0; }
            .card-past:hover { opacity: 1; filter: grayscale(0%); }

            .card-img-wrap { height: 160px; background: #f9f9f9; position: relative; display: flex; align-items: center; justify-content: center; border-bottom: 1px solid #eaeaea; overflow: hidden; }
            .card-img-bg { position: absolute; inset: 0; background-size: cover; background-position: center; opacity: 0.15; filter: blur(8px); }
            .card-img-wrap img { position: relative; z-index: 10; max-width: 90%; max-height: 140px; object-fit: contain; }
            .card-badge { position: absolute; top: 0; right: 0; z-index: 20; color: #ffffff; padding: 6px 10px; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; }
            .badge-type-1 { background: #e89bb2; } .badge-type-2 { background: #a391d1; } .badge-type-3 { background: #e3aa7f; }
            .badge-type-4 { background: #84b8a0; } .badge-type-5 { background: #84b3db; } .badge-type-6 { background: #b3a79d; }
            .badge-type-8 { background: #c77395; } .card-badge-past { background: #999999 !important; }

            .card-body { padding: 20px; display: flex; flex-direction: column; flex-grow: 1; }
            .card-title { font-size: 16px; font-weight: 700; line-height: 1.4; margin-bottom: 15px; height: 44px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-transform: uppercase; }
            .card-title a { color: #2c2c2c; text-decoration: none; transition: 0.2s; } .card-title a:hover { color: #d16b8a; }

            .card-meta-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; height: 36px; gap: 10px; border-bottom: 1px solid #f9f9f9; padding-bottom: 10px; }
            .card-date-col { display: flex; flex-direction: column; overflow: hidden; }
            .card-date-date { font-size: 12px; font-weight: 700; color: #2c2c2c; text-transform: uppercase; }
            .card-date-city { font-size: 12px; color: #888; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px;}

            .dist-badge { padding: 3px 6px; font-weight: 700; font-size: 10px; white-space: nowrap; flex-shrink: 0; background: #eab3c2; color: #fff; }
            .dist-badge.base { background: #f0f0f0; color: #888; border: 1px solid #e0e0e0; }

            .stats-container { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }
            .stat-row { display: flex; justify-content: space-between; align-items: center; font-size: 12px; border-bottom: 1px dotted #d1d1d1; padding-bottom: 4px; }
            .stat-label { color: #2c2c2c; font-weight: 700; text-transform: uppercase; }
            .stat-val-group { display: flex; align-items: center; gap: 8px; }
            .val-open { color: #1b59bd; font-weight: 700; } .val-closed { color: #888888; font-weight: 700; } .val-soon { color: #eab3c2; font-weight: 700; } .val-none { color: #aaaaaa; }
            .time-left { background: #f4f4f4; border: 1px solid #d1d1d1; padding: 2px 6px; font-size: 10px; font-weight: 700; }

            .socials { display: flex; flex-wrap: wrap; gap: 8px; margin-top: auto; border-top: 1px solid #eaeaea; padding-top: 15px; }
            .soc-link { display: inline-flex; align-items: center; justify-content: center; padding: 6px 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; text-decoration: none; color: #ffffff; transition: 0.2s; flex-grow: 1; text-align: center; }
            .soc-vk { background: #5a7fa6; } .soc-vk:hover { background: #4a6a8a; }
            .soc-tg { background: #37a1d1; } .soc-tg:hover { background: #2b84ad; }
            .soc-yt { background: #d46363; } .soc-yt:hover { background: #b05050; }
            .soc-web { background: #666666; } .soc-web:hover { background: #444444; }

            @media (max-width: 768px) {
                .tb-top-row { flex-direction: column; align-items: stretch; }
                .tb-btn-close { margin-left: 0; }
                .city-input-wrap { width: 100%; }
            }
        `;
        shadow.appendChild(style);

        const container = document.createElement('div');
        container.className = 'inner-wrap';
        container.innerHTML = `
            <div class="toolbar">
                <div class="tb-top-row">
                    <div class="tb-title">Агрегатор Cosplay2</div>
                    <div class="city-input-wrap" id="wrap-city">
                        <input type="text" id="input-city" class="tb-input" placeholder="Загрузка списка городов..." autocomplete="off" disabled>
                        <div id="city-dropdown" class="city-dropdown"></div>
                    </div>
                    <label class="c2-checkbox-label">
                        <input type="checkbox" class="c2-checkbox" id="chk-travel"> Режим путешествия
                    </label>
                    <button id="btn-start" class="tb-btn" disabled>Найти мероприятия</button>
                    <button id="btn-close" class="tb-btn-close">Скрыть</button>
                </div>

                <div class="travel-tools" id="travel-tools">
                    <div class="tt-row">
                        <span>Радиус поиска:</span>
                        <input type="range" id="rng-radius" min="100" max="15000" step="100" value="1000">
                        <span class="radius-val" id="lbl-radius">1000 км</span>
                        <label class="c2-checkbox-label" style="margin-left:15px;">
                            <input type="checkbox" class="c2-checkbox" id="chk-all-russia"> Все локации
                        </label>
                    </div>
                    <div class="chips-container" id="chips-container"></div>
                </div>

                <div id="progress-area" class="progress-area">
                    <div class="pb-text"><span id="pb-status">Сбор данных...</span><span id="pb-eta"></span></div>
                    <div class="pb-track"><div id="pb-fill" class="pb-fill"></div></div>
                    <div class="sims-text" id="sims-text">Готовимся к фесту...</div>
                </div>
            </div>
            <div id="grid-events" class="grid">
                <div class="anim-fade" style="grid-column: 1/-1; text-align: center; color: #999; padding: 60px 0; font-size: 16px; text-transform: uppercase; letter-spacing: 1px;">
                    Укажите город и нажмите «Найти мероприятия»
                </div>
            </div>
        `;
        shadow.appendChild(container);

        shadow.getElementById('btn-close').addEventListener('click', toggleAggregator);
        shadow.getElementById('btn-start').addEventListener('click', startScan);

        setupAutocomplete();
        setupTravelMode();
        loadCache();
    }

    function deg2rad(deg) { return deg * (Math.PI/180); }
    function getDistance(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = deg2rad(lat2-lat1);
        const dLon = deg2rad(lon2-lon1);
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2);
        return Math.round(R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))));
    }

    function loadCache() {
        let saved = GM_getValue('c2_city_coords', '{}');
        try { cityCoordsCache = JSON.parse(saved); } catch(e) { cityCoordsCache = {}; }
        cityCoordsCache = { ...defaultCoords, ...cityCoordsCache };
    }

    function saveCache() { GM_setValue('c2_city_coords', JSON.stringify(cityCoordsCache)); }

    async function getCoordsForCity(city) {
        let c = city.toLowerCase().trim();
        if (cityCoordsCache[c]) return cityCoordsCache[c];
        try {
            const res = await fetchGM(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(c)}`, { headers: { 'User-Agent': 'Cosplay2-Travel-Aggregator/1.0' } });
            const data = await res.json();
            if (data && data.length > 0) {
                let coords = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
                cityCoordsCache[c] = coords; saveCache(); return coords;
            }
        } catch(e) {}
        return null;
    }

    function applyRealtimeFilter() {
        const grid = shadow.getElementById('grid-events');
        if (!grid || grid.innerHTML === '') return;

        const activeNames = targetCities.map(c => c.name.toLowerCase());
        const cards = grid.querySelectorAll('.card');

        cards.forEach(card => {
            const cCity = card.getAttribute('data-city');
            if (cCity) { card.style.display = activeNames.includes(cCity) ? 'flex' : 'none'; }
        });

        const headers = grid.querySelectorAll('.month-header');
        headers.forEach(h => {
            let next = h.nextElementSibling;
            let hasVisible = false;
            while (next && next.classList.contains('card')) {
                if (next.style.display !== 'none') { hasVisible = true; break; }
                next = next.nextElementSibling;
            }
            h.style.display = hasVisible ? 'flex' : 'none';
        });
    }

    async function calculateRadius() {
        if (!isTravelMode || !baseCity) return;
        const chipsCont = shadow.getElementById('chips-container');
        const chkAll = shadow.getElementById('chk-all-russia').checked;
        const rad = parseInt(shadow.getElementById('rng-radius').value);

        chipsCont.innerHTML = '<span style="color:#999; font-size:12px;">Вычисляем расстояния...</span>';
        let baseCoords = await getCoordsForCity(baseCity);

        const currentlyInactive = Array.from(chipsCont.querySelectorAll('.chip.inactive')).map(el => el.getAttribute('data-name'));
        targetCities = [];

        if (!baseCoords && !chkAll) {
            chipsCont.innerHTML = `<span style="color:red; font-size:12px;">Не удалось найти координаты для: ${baseCity}</span>`;
            return;
        }

        let allCalculated = [];
        for (let city of allCities) {
            let d = null;
            if (city.toLowerCase() === baseCity.toLowerCase()) {
                d = 0;
            } else {
                let coords = await getCoordsForCity(city);
                if (coords && baseCoords) {
                    d = getDistance(baseCoords[0], baseCoords[1], coords[0], coords[1]);
                }
            }
            allCalculated.push({ name: city, dist: d });
        }

        if (chkAll) {
            targetCities = allCalculated;
            chipsCont.innerHTML = `
                <div style="background:#fdfafb; border: 1px dashed #d16b8a; padding: 10px; font-size: 13px;">
                    <strong style="color:#d16b8a;">🌍 БУДУТ ЗАГРУЖЕНЫ ВСЕ МЕРОПРИЯТИЯ.</strong><br>
                    <span style="color:#666;">После завершения поиска снимите эту галочку, чтобы моментально отфильтровать список ползунком без повторной загрузки.</span>
                </div>
            `;
            applyRealtimeFilter();
            return;
        }

        let withinRadius = allCalculated.filter(c => c.dist !== null && c.dist <= rad);
        withinRadius.sort((a, b) => a.dist - b.dist);
        chipsCont.innerHTML = '';

        if (withinRadius.length === 0) {
            chipsCont.innerHTML = '<span style="color:#999; font-size:12px;">В этом радиусе фестивалей не найдено.</span>';
            applyRealtimeFilter();
            return;
        }

        withinRadius.forEach(item => {
            const chip = document.createElement('div');
            const isInactive = currentlyInactive.includes(item.name);
            chip.className = `chip ${isInactive ? 'inactive' : 'active'}`;
            chip.setAttribute('data-name', item.name);

            let txt = item.dist === 0 ? ' (База)' : ` (${item.dist} км)`;
            chip.innerText = `${item.name}${txt} ✖`;

            if (!isInactive) targetCities.push(item);

            chip.addEventListener('click', () => {
                if (chip.classList.contains('active')) {
                    chip.classList.replace('active', 'inactive');
                    targetCities = targetCities.filter(c => c.name !== item.name);
                } else {
                    chip.classList.replace('inactive', 'active');
                    targetCities.push(item);
                }
                applyRealtimeFilter();
            });
            chipsCont.appendChild(chip);
        });

        applyRealtimeFilter();
    }

    function setupTravelMode() {
        const chkTravel = shadow.getElementById('chk-travel');
        const tools = shadow.getElementById('travel-tools');
        const rng = shadow.getElementById('rng-radius');
        const lbl = shadow.getElementById('lbl-radius');
        const chkAll = shadow.getElementById('chk-all-russia');
        const input = shadow.getElementById('input-city');

        chkTravel.addEventListener('change', () => {
            isTravelMode = chkTravel.checked;
            if (isTravelMode) {
                tools.classList.add('show');
                input.placeholder = "Базовый город (откуда едем)...";
                if(baseCity) calculateRadius();
            } else {
                tools.classList.remove('show');
                input.placeholder = "Введите или выберите город";
            }
        });

        rng.addEventListener('input', () => { lbl.innerText = `${rng.value} км`; });
        rng.addEventListener('change', () => { if(!chkAll.checked) calculateRadius(); });
        chkAll.addEventListener('change', () => { rng.disabled = chkAll.checked; calculateRadius(); });
    }

    async function preloadData() {
        try {
            const res = await fetchGM('https://cosplay2.ru/api/events/filter_list', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ wid: "sakura-miner" }) });
            const data = await res.json();
            cachedEvents = data.events;

            let citySet = new Set();
            cachedEvents.forEach(e => { if(e.city && e.city.trim()) citySet.add(e.city.trim().charAt(0).toUpperCase() + e.city.trim().slice(1).toLowerCase()); });
            allCities = Array.from(citySet).sort();
            isDataLoaded = true;

            const inputCity = shadow.getElementById('input-city');
            shadow.getElementById('btn-start').disabled = false;
            inputCity.placeholder = "Введите или выберите город";
            inputCity.disabled = false;
        } catch (e) { shadow.getElementById('input-city').placeholder = "Ошибка API"; }
    }

    function setupAutocomplete() {
        const input = shadow.getElementById('input-city');
        const dropdown = shadow.getElementById('city-dropdown');
        const wrap = shadow.getElementById('wrap-city');

        function renderDropdown(filterText = '') {
            dropdown.innerHTML = '';
            let filtered = allCities.filter(c => c.toLowerCase().includes(filterText.toLowerCase()));
            if (filtered.length === 0) { dropdown.innerHTML = `<div class="city-dropdown-empty">Город не найден</div>`; return; }

            filtered.forEach(city => {
                const div = document.createElement('div');
                div.className = 'city-dropdown-item';
                div.innerText = city;
                div.addEventListener('click', () => {
                    input.value = city; baseCity = city; dropdown.classList.remove('show');
                    if(isTravelMode) calculateRadius();
                });
                dropdown.appendChild(div);
            });
        }
        input.addEventListener('focus', () => { if(isDataLoaded) { renderDropdown(input.value); dropdown.classList.add('show'); } });
        input.addEventListener('input', () => { baseCity = input.value; if(isDataLoaded) { renderDropdown(input.value); dropdown.classList.add('show'); } });
        input.addEventListener('change', () => { if(isTravelMode && baseCity) calculateRadius(); });
        shadow.addEventListener('click', (e) => { if (!e.composedPath().includes(wrap)) dropdown.classList.remove('show'); });
    }

    setInterval(() => {
        const nav = document.querySelector('#slidemenu ul.navbar-nav');
        if (nav && !document.getElementById('nav-c2-agg-btn-li')) {
            const li = document.createElement('li'); li.id = 'nav-c2-agg-btn-li'; li.className = 'menu-item menu-level-0';
            li.innerHTML = `<a href="#" id="nav-c2-agg-btn" style="color: #ffffff; font-weight: bold; padding: 15px 15px; display: block; text-decoration: none;">Агрегатор</a>`;
            nav.appendChild(li); document.getElementById('nav-c2-agg-btn').addEventListener('click', toggleAggregator);
        }
    }, 1000);

    const eventTypes = { 1: "ФЕСТИВАЛЬ", 2: "ВЕЧЕРИНКА", 3: "ЯРМАРКА", 4: "ВЫСТАВКА", 5: "ТАНЦЫ", 6: "СОБРАНИЕ", 8: "КОНВЕНТ" };
    function fmtTime(sec) {
        if (!sec || sec <= 0) return "";
        const d = Math.floor(sec / 86400); const h = Math.floor((sec % 86400) / 3600);
        return `<span class="time-left">${d}д ${h}ч</span>`;
    }
    function buildStat(obj, label, pluralize) {
        if (!obj || obj.state === 0) return '';
        const openStr = pluralize ? 'ОТКРЫТЫ' : 'ОТКРЫТО';
        let val = obj.state === 1 ? `<span class="val-soon">СКОРО</span> ${fmtTime(obj.timer)}` : `<span class="val-open">${openStr}</span> ${fmtTime(obj.timer)}`;
        return `<div class="stat-row"><span class="stat-label">${label}</span><div class="stat-val-group">${val}</div></div>`;
    }
    function buildReq(obj) {
        if (!obj) return '<span class="val-none">НЕТ ДАННЫХ</span>';
        if (obj.state === 0) return '<span class="val-closed">ЗАКРЫТЫ</span>';
        if (obj.state === 1) return `<span class="val-soon">СКОРО</span> ${fmtTime(obj.timer)}`;
        if (obj.state === 2) return `<span class="val-open">ОТКРЫТЫ</span> ${fmtTime(obj.timer)}`;
    }
    function fmtDate(dStr) { return new Date(dStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }); }
    function fmtMonth(dStr) { let m = new Date(dStr).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }); return m.charAt(0).toUpperCase() + m.slice(1); }

    function getSocials(htmlStr) {
        const doc = new DOMParser().parseFromString(htmlStr, 'text/html');
        const nav = doc.querySelector('#slidemenu ul.navbar-nav');
        let soc = { vk: null, tg: null, yt: null, web: null };
        if (!nav) return soc;
        Array.from(nav.querySelectorAll('a[href]')).map(a => a.href).forEach(url => {
            let u = url.toLowerCase();
            if (u.includes('vk.cc') || u.includes('cosplay2.ru') || u.includes('disk.yandex') || u.includes('forms.gle') || u.includes('docs.google')) return;
            if (u.includes('vk.com') || u.includes('vk.ru')) { if (!soc.vk) soc.vk = url; }
            else if (u.includes('t.me') || u.includes('telegram.me')) { if (!soc.tg) soc.tg = url; }
            else if (u.includes('youtube.com') || u.includes('youtu.be')) { if (!soc.yt) soc.yt = url; }
            else if (u.startsWith('http')) { if (!soc.web) soc.web = url; }
        });
        return soc;
    }

    function startSimsText() {
        const el = shadow.getElementById('sims-text');
        el.innerText = getNextSimsText();
        el.style.opacity = 1;
        simsInterval = setInterval(() => {
            el.style.opacity = 0;
            setTimeout(() => { el.innerText = getNextSimsText(); el.style.opacity = 1; }, 400);
        }, 4000);
    }
    function stopSimsText() { clearInterval(simsInterval); shadow.getElementById('sims-text').innerText = ''; }

    async function startScan() {
        baseCity = shadow.getElementById('input-city').value.trim();
        if (!baseCity || !isDataLoaded) return;
        shadow.getElementById('city-dropdown').classList.remove('show');

        const pArea = shadow.getElementById('progress-area'), pFill = shadow.getElementById('pb-fill'), pStatus = shadow.getElementById('pb-status'), pEta = shadow.getElementById('pb-eta');
        const grid = shadow.getElementById('grid-events'), btnStart = shadow.getElementById('btn-start');

        pArea.style.display = 'flex'; pFill.style.width = '0%'; pStatus.innerText = 'Подготовка...'; pEta.innerText = ''; grid.innerHTML = ''; btnStart.disabled = true;
        startSimsText();

        try {
            let evs = [];
            if (isTravelMode) {
                let names = targetCities.map(c => c.name.toLowerCase());
                evs = cachedEvents.filter(e => e.city && names.includes(e.city.trim().toLowerCase()));
                evs.forEach(e => {
                    let match = targetCities.find(t => t.name.toLowerCase() === e.city.trim().toLowerCase());
                    e.travelDist = match ? match.dist : null;
                });
            } else {
                evs = cachedEvents.filter(e => e.city && e.city.trim().toLowerCase() === baseCity.toLowerCase());
                evs.forEach(e => e.travelDist = 0);
            }

            if (evs.length > 0) {
                let done = 0;
                const startT = Date.now();
                const tot = evs.length;
                const chunkSize = 4;

                for (let i = 0; i < tot; i += chunkSize) {
                    const chunk = evs.slice(i, i + chunkSize);

                    await Promise.all(chunk.map(async (ev) => {
                        let sub = ev.domain || `${ev.subdomain}.cosplay2.ru`;
                        ev.socials = {};

                        pStatus.innerText = `Сбор: ${done}/${tot} (${ev.title})`;

                        try { const dRes = await fetchGM(`https://${sub}/api/events/get_buttons_state_1`); if (dRes.ok) ev.deep = await dRes.json(); } catch (e) { ev.deep = null; }
                        try { const rRes = await fetchGM(`https://${sub}/`); if (rRes.ok) ev.socials = getSocials(await rRes.text()); } catch(e) {}

                        done++;
                        pFill.style.width = Math.round((done / tot) * 100) + '%';
                        pStatus.innerText = `Сбор: ${done}/${tot} (${ev.title})`;

                        let el = (Date.now() - startT) / 1000;
                        let secLeft = Math.max(0, Math.round((el / done) * (tot - done)));
                        pEta.innerText = `ОСТАЛОСЬ: ${Math.floor(secLeft / 60).toString().padStart(2, '0')}:${(secLeft % 60).toString().padStart(2, '0')}`;
                    }));
                }
            }
            pArea.style.display = 'none'; stopSimsText();

            const now = new Date();
            let past = evs.filter(e => new Date(e.start_time) < now || e.timestatus === 'past').sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
            let fut = evs.filter(e => !(new Date(e.start_time) < now || e.timestatus === 'past')).sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
            renderGrid(fut, past, grid);
        } catch (e) {
            pStatus.innerText = 'ОШИБКА СОЕДИНЕНИЯ'; pEta.innerText = ''; stopSimsText();
        } finally { btnStart.disabled = false; }
    }

    function createCard(ev, isPast) {
        const logo = `https://cosplay2.ru/files/${ev.id}/logo.png`;
        const type = eventTypes[ev.event_type_id] || "ИВЕНТ";
        const bCls = `badge-type-${ev.event_type_id} ${isPast ? 'card-badge-past' : ''}`.trim();
        const req = ev.deep ? buildReq(ev.deep.new_request) : buildReq(null);
        const tix = ev.deep ? buildStat(ev.deep.etickets, "БИЛЕТЫ", true) : '';
        const vot = ev.deep ? buildStat(ev.deep.voting, "ГОЛОСОВАНИЕ", false) : '';

        let distBadgeCls = 'dist-badge';
        let distText = '';

        if (ev.travelDist === 0) {
            distBadgeCls += ' base';
            distText = '📍 0 КМ';
        } else if (ev.travelDist > 0) {
            distText = `📍 ${ev.travelDist} КМ`;
        } else if (ev.travelDist === null && isTravelMode) {
            distBadgeCls += ' base';
            distText = '📍 ? КМ';
        }

        let distHtml = distText ? `<div class="${distBadgeCls}">${distText}</div>` : '';

        return `
            <div class="card-badge ${bCls}">${type}</div>
            <div class="card-img-wrap">
                <div class="card-img-bg" style="background-image: url('${logo}')"></div>
                <img src="${logo}" onerror="this.style.display='none'">
            </div>
            <div class="card-body">
                <div class="card-title"><a href="${ev.href}" target="_blank">${ev.title}</a></div>

                <div class="card-meta-row">
                    <div class="card-date-col">
                        <span class="card-date-date">${fmtDate(ev.start_time)}</span>
                        <span class="card-date-city">${ev.city}</span>
                    </div>
                    ${distHtml}
                </div>

                <div class="stats-container">
                    <div class="stat-row"><span class="stat-label">ЗАЯВКИ</span><div class="stat-val-group">${req}</div></div>
                    ${tix}${vot}
                </div>
                <div class="socials">
                    ${ev.socials.vk ? `<a href="${ev.socials.vk}" target="_blank" class="soc-link soc-vk">VK</a>` : ''}
                    ${ev.socials.tg ? `<a href="${ev.socials.tg}" target="_blank" class="soc-link soc-tg">TG</a>` : ''}
                    ${ev.socials.yt ? `<a href="${ev.socials.yt}" target="_blank" class="soc-link soc-yt">YT</a>` : ''}
                    ${ev.socials.web ? `<a href="${ev.socials.web}" target="_blank" class="soc-link soc-web">САЙТ</a>` : ''}
                </div>
            </div>
        `;
    }

    function renderGrid(fut, past, gridEl) {
        if (fut.length === 0 && past.length === 0) {
            gridEl.innerHTML = `<div class="month-header anim-fade" style="text-align: center; color: #999; border: none; padding-top: 60px; display: block;">МЕРОПРИЯТИЯ НЕ НАЙДЕНЫ</div>`;
            return;
        }

        let curMo = ''; let delay = 0;
        fut.forEach(ev => {
            let mo = fmtMonth(ev.start_time);
            if (mo !== curMo) {
                curMo = mo;
                const h = document.createElement('div'); h.className = 'month-header anim-fade'; h.style.animationDelay = `${delay * 0.05}s`; h.innerText = curMo;
                gridEl.appendChild(h); delay++;
            }
            const c = document.createElement('div'); c.className = 'card anim-fade'; c.setAttribute('data-city', (ev.city || '').toLowerCase().trim());
            c.style.animationDelay = `${delay * 0.05}s`; c.innerHTML = createCard(ev, false);
            gridEl.appendChild(c); delay++;
        });

        if (past.length > 0) {
            const h = document.createElement('div'); h.className = 'month-header anim-fade'; h.style.color = '#888'; h.innerText = 'ПРОШЕДШИЕ МЕРОПРИЯТИЯ'; h.style.animationDelay = `${delay * 0.05}s`;
            gridEl.appendChild(h); delay++;
            past.forEach(ev => {
                const c = document.createElement('div'); c.className = 'card card-past anim-fade'; c.setAttribute('data-city', (ev.city || '').toLowerCase().trim());
                c.style.animationDelay = `${delay * 0.05}s`; c.innerHTML = createCard(ev, true);
                gridEl.appendChild(c); delay++;
            });
        }
    }
})();
