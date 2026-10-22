# Кузница героя — Daggerheart

Пошаговый конструктор и интерактивный лист персонажа Daggerheart на русском языке.

- **Создание:** класс, подкласс, родословная, сообщество, характеристики, снаряжение, опыт, карты домена, образ — с пояснениями, как каждый выбор влияет на игру.
- **Лист:** Кости Дуальности, урон, получение урона по порогам с бронёй и свойствами, ресурсы с ценой и лимитами, механики классов, отдых, повышение уровня, состояния.
- **Справочник:** поиск по правилам, картам и снаряжению.

Персонаж хранится в браузере игрока (localStorage); для переноса есть «Скопировать код персонажа».

## Структура

| Файл | Что внутри |
|---|---|
| `index.html` | разметка и стили |
| `app.js` | состояние, расчёт персонажа, шаги создания, лист, справочник |
| `rules.js` | игровые правила: урон, ресурсы, классовые механики, броски, отдых, уровни, состояния |
| `boot.js` | первый рендер |
| `data.js` | данные SRD (генерируется `tools/scrape.py`) |
| `icons.js` | иконки game-icons.net (генерируется `tools/icons.py`) |
| `bronk.js` | портрет примера персонажа |

## Сборка

```bash
python3 build.py   # → dist/index.html и daggerheart-forge.html (один файл, работает офлайн)
```

Пуш в `main` автоматически публикует `dist/` на GitHub Pages (`.github/workflows/pages.yml`).

## Лицензии

Неофициальный фанатский некоммерческий проект.

This product includes materials from the Daggerheart System Reference Document 1.0 and 2.0 (класс «Ассасин» из Hope & Fear), © Critical Role, LLC, under the terms of the Darrington Press Community Gaming (DPCGL) License. More information can be found at https://www.daggerheart.com. Русский перевод SRD: ru.daggerheart.su.

Иконки: [game-icons.net](https://game-icons.net), CC BY 3.0 (авторы: Lorc, Delapouite, Carl Olsen, John Colburn, Skoll, Willdabeast, DarkZaitzev).
