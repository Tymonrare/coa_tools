# coa_tools_ui_examples

# Editors

## Именования слоев

В каждом редакторе одни правила именования:

1. Первое слово - id слоя, должно быть уникальным для своей группы, разрешаются нижние подчеркивания. Альтернативно можно указать параметр `id=name`
2. Параметры задаются через `param=value` или `--param`, в первом случае параметру присваивается следующее после знака равно значение, во втором булевое значение

## Группы слоев

1. По умолчанию все слои, находящиеся в группе (Папке), будут объединены до одного слоя
2. Для того чтобы работать с папкой как с группой, ей надо добавить флаг `--group`
3. Для экспорта группы как кадры анимации надо указать флаг `--frames`
4. Для экспорта группы как батча спрайтов указать `--batch`

## Вложенные группы

Для некоторых параметров, например `target_tab` необходимо указывать полный путь через все группы, например:

    - (folder) group1 --group
    --- (folder) group2 --group
    --- --- (folder) group3 --group

    - (button) btn1 target_tab=group1.group2.group3

## Объекты UI

**Кнопки**

Для создания кнопки в названия слоя вписать `type=btn`

Для создания кнопки с состояниями (ожидание, наведение, клик) добавляется группа слоев:

    - (folder) your_btn type=btn --frames
    --- (layer) idle
    --- (layer) hover
    --- (layer) click

Можно выборочно не указывать hover и click

**Шкала прогресса**

Для создания шкалы прогресса добавляется группа слоев:

    - (folder) your_progress type=progress --frames
    --- (layer) bar
    --- (layer) body

Где:

- bar - сама шкала
- body - статичная оболочка

**Вкладки**

Для создания вкладок требуется описать несколько групп и кнопок ими управляющих:

    - (folder) tab1 node_group=example_tabs --group
    --- ...content
    - (folder) tab2 node_group=example_tabs --group
    --- ...content

    - (button) btn1 target_tab=tab1
    - (button) btn2 target_tab=tab2

Т.е.:

- Для каждой вкладки указывается своя кнопка, с параметром `target_tab=имя_вкладки`
- В одно время будет показываться только одна вкладка из `node_group`

## Photoshop

**Установка**

Скачать скрипт в C:\Program Files\Adobe\Adobe Photoshop CC (2015)\Presets\Scripts (Правой кнопкой по странице→сохранить как)

[BlenderExporter.jsx](https://raw.githubusercontent.com/Tymonrare/coa_tools/master/tools/Photoshop/BlenderExporter.jsx)

**Экспорт**

1. Выделить все необходимые слои, ненужные скрыть
2. Открыть File → Scripts → BlenderExporter.jsx
3. Указать путь экспорта, понятное название
4. Нажать export, ждать пока закончатся операции

**Пример проекта**:

[test-coa-ui.psd](../test/sample/test-ui.psd)

# Code

## PIXI

После загрузки конфига по [примеру](https://github.com/Tymonrare/coa_tools/blob/master/engines/PIXI/coa_importer/README.md#usage) нам будут доступны все экспортированные объекты по имени их экспорта

    let ui = new coa.ui(conf);
    ui.nodes.layer_name; //Для слоя экспортированного под именем layer_name
    ui.nodes.group_name.nodes.layer_name; //Для вложенных слоев
