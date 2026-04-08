const { Plugin, PluginSettingTab, Setting, ItemView, MarkdownRenderer, setIcon } = require('obsidian');
const fs = require('fs');
const path = require('path');
const { shell } = require('electron');

const VIEW_TYPE_EXTERNAL_BROWSER = 'external-file-browser';
const VIEW_TYPE_HELP = 'external-file-help';

const DEFAULT_SETTINGS = {
    defaultPath: '',
    language: 'auto'
};

const SUPPORTED_LOCALES = [
    'zh', 'en', 'zh-TW', 'sq', 'cs', 'da', 'de', 'es', 'fa', 'fr', 'id', 'it', 'ja',
    'ko', 'nl', 'no', 'pl', 'pt', 'pt-BR', 'ro', 'ru', 'th', 'tr'
];

const LOCALE_DISPLAY = {
    zh: '中文',
    en: 'English',
    'zh-TW': '繁體中文',
    sq: 'Shqip',
    cs: 'Čeština',
    da: 'Dansk',
    de: 'Deutsch',
    es: 'Español',
    fa: 'فارسی',
    fr: 'Français',
    id: 'Bahasa Indonesia',
    it: 'Italiano',
    ja: '日本語',
    ko: '한국어',
    nl: 'Nederlands',
    no: 'Norsk',
    pl: 'Polski',
    pt: 'Português',
    'pt-BR': 'Português (Brasil)',
    ro: 'Română',
    ru: 'Русский',
    th: 'ไทย',
    tr: 'Türkçe'
};

const LOCALES = {
    zh: {
        pluginName: '搜索外部文件',
        up: '向上',
        refresh: '刷新',
        go: '跳转',
        openFolder: '打开文件夹',
        openExplorer: '在资源管理器中打开',
        help: '帮助与说明',
        search: '搜索',
        autoSearch: '自动搜索',
        preview: '预览',
        sortNameAsc: '名称 (升序)',
        sortNameDesc: '名称 (降序)',
        sortTypeAsc: '类型 (升序)',
        sortTypeDesc: '类型 (降序)',
        sortSizeAsc: '大小 (升序)',
        sortSizeDesc: '大小 (降序)',
        sortMtimeAsc: '修改时间 (升序)',
        sortMtimeDesc: '修改时间 (降序)',
        viewList: '列表',
        viewGrid: '网格',
        previewTitle: '预览',
        previewNoSelection: '未选中任何项目',
        previewLoading: '加载中...',
        previewNotImage: '无法预览此文件',
        previewImageInfo: '类型: {type}\n大小: {size}\n修改时间: {mtime}',
        errorNotDir: '不是目录',
        errorPathNotExist: '路径不存在',
        errorOpenDir: '无法打开目录: {msg}',
        errorReadDir: '读取目录失败: {msg}',
        errorNoItem: '未选中任何项目',
        errorOpenFolderOnly: '仅支持打开文件夹',
        errorOpenExplorer: '无法打开资源管理器: {msg}',
        errorSearchFailed: '搜索失败: {msg}',
        settingsTitle: '搜索外部文件设置',
        settingsLanguage: '语言',
        settingsLanguageDesc: '选择插件界面语言，或自动跟随 Obsidian',
        settingsLanguageAuto: '跟随 Obsidian (自动)',
        settingsLanguageZh: '中文',
        settingsLanguageEn: 'English',
        settingsDefaultPath: '默认打开路径',
        settingsDefaultPathDesc: '文件浏览器打开时默认显示的目录（留空则使用笔记库根目录）',
        settingsDefaultPathPlaceholder: '例如: C:\\Users\\YourName\\Documents',
        columnName: '名称',
        columnModified: '修改时间',
        columnType: '类型',
        columnSize: '大小',
        folder: '文件夹',
        file: '文件',
        helpText: `
# 搜索外部文件插件帮助

## 功能介绍
本插件允许您在 Obsidian 中浏览本地文件系统，并快速在 Obsidian 中搜索选中的文件或文件夹路径。

本插件仅读取文件系统，绝不会修改任何笔记库中的文件！所有运行数据均为临时数据，不会影响您的笔记内容。

## 使用方法
1. **打开插件**：点击左侧功能区文件夹搜索图标，或使用命令“打开外部文件浏览器”。
2. **文件浏览**：使用顶部的导航按钮（向上、刷新）和路径栏跳转目录。
3. **选择文件**：单击文件或文件夹即可选中。选中后可在预览侧边栏（点击“预览”按钮开启）查看图片预览和信息。
4. **搜索**：
   - 双击文件（或选中后点击“搜索”按钮）会在 Obsidian 中搜索该文件名。
   - 选中文件夹后点击“搜索”按钮会搜索其路径，使用**正则表达式**格式（例如 \`/D:.*Folder1.*Folder2/\`）。
5. **自动搜索**：勾选“自动搜索”后，每次单击选中文件或文件夹都会自动触发搜索。
6. **排序与视图**：可切换排序方式和视图模式（列表/网格）。
7. **打开文件夹**：选中文件夹后点击“打开”按钮可进入该文件夹。
8. **资源管理器**：点击“资源管理器”按钮可在系统资源管理器中打开当前目录；若选中了文件，则会定位到该文件。

## 注意事项
- 本插件**只读**，不修改任何笔记数据。
- 设置中的“默认路径”可指定插件启动时的默认目录，留空则使用笔记库根目录。
        `,
    },
    en: {
        pluginName: 'Search External Files',
        up: 'Up',
        refresh: 'Refresh',
        go: 'Go',
        openFolder: 'Open Folder',
        openExplorer: 'Open in Explorer',
        help: 'Help',
        search: 'Search',
        autoSearch: 'Auto Search',
        preview: 'Preview',
        sortNameAsc: 'Name (Asc)',
        sortNameDesc: 'Name (Desc)',
        sortTypeAsc: 'Type (Asc)',
        sortTypeDesc: 'Type (Desc)',
        sortSizeAsc: 'Size (Asc)',
        sortSizeDesc: 'Size (Desc)',
        sortMtimeAsc: 'Modified (Asc)',
        sortMtimeDesc: 'Modified (Desc)',
        viewList: 'List',
        viewGrid: 'Grid',
        previewTitle: 'Preview',
        previewNoSelection: 'No item selected',
        previewLoading: 'Loading...',
        previewNotImage: 'Cannot preview this file',
        previewImageInfo: 'Type: {type}\nSize: {size}\nModified: {mtime}',
        errorNotDir: 'Not a directory',
        errorPathNotExist: 'Path does not exist',
        errorOpenDir: 'Cannot open directory: {msg}',
        errorReadDir: 'Failed to read directory: {msg}',
        errorNoItem: 'No item selected',
        errorOpenFolderOnly: 'Only folders can be opened',
        errorOpenExplorer: 'Cannot open explorer: {msg}',
        errorSearchFailed: 'Search failed: {msg}',
        settingsTitle: 'Search External Files Settings',
        settingsLanguage: 'Language',
        settingsLanguageDesc: 'Choose plugin interface language, or auto follow Obsidian',
        settingsLanguageAuto: 'Auto (Follow Obsidian)',
        settingsLanguageZh: '中文',
        settingsLanguageEn: 'English',
        settingsDefaultPath: 'Default Path',
        settingsDefaultPathDesc: 'Initial directory for the file browser (leave empty to use vault root)',
        settingsDefaultPathPlaceholder: 'e.g., C:\\Users\\YourName\\Documents',
        columnName: 'Name',
        columnModified: 'Modified',
        columnType: 'Type',
        columnSize: 'Size',
        folder: 'Folder',
        file: 'File',
        helpText: `
# Search External Files Plugin Help

## Features
This plugin allows you to browse the local file system within Obsidian and quickly search for selected files or folder paths.

This plugin is read-only and will never modify any files in your vault! All runtime data is temporary and will not affect your notes.

## Usage
1. **Open the plugin**: Click the folder-search icon in the left ribbon, or use the command "Open External File Browser".
2. **File navigation**: Use the top navigation buttons (Up, Refresh) and the path bar to jump to directories.
3. **Select items**: Click on a file or folder to select it. After selection, you can open the preview sidebar (click the "Preview" button) to view image preview and information.
4. **Search**:
   - Double-click a file (or select it and click the "Search" button) to search for its filename.
   - select a folder and click the "Search" button to search for its path using **regex format** (e.g., \`/D:.*Folder1.*Folder2/\`).
5. **Auto search**: Check "Auto Search" to automatically trigger a search whenever you click on a file or folder.
6. **Sorting and view**: Switch sorting options and view modes (List / Grid).
7. **Open folder**: Select a folder and click the "Open" button to enter it.
8. **Explorer**: Click the "Open in Explorer" button to open the current directory in the system file explorer; if a file is selected, it will be highlighted.

## Notes
- The plugin is **read-only** and never modifies any vault data.
- The "Default Path" in settings specifies the initial directory (leave empty to use the vault root).
        `,
    },
    'zh-TW': {
        pluginName: '搜尋外部檔案',
        up: '上一層',
        refresh: '重新整理',
        go: '前往',
        openFolder: '開啟資料夾',
        openExplorer: '在檔案總管中開啟',
        help: '說明',
        search: '搜尋',
        autoSearch: '自動搜尋',
        preview: '預覽',
        sortNameAsc: '名稱 (升冪)',
        sortNameDesc: '名稱 (降冪)',
        sortTypeAsc: '類型 (升冪)',
        sortTypeDesc: '類型 (降冪)',
        sortSizeAsc: '大小 (升冪)',
        sortSizeDesc: '大小 (降冪)',
        sortMtimeAsc: '修改時間 (升冪)',
        sortMtimeDesc: '修改時間 (降冪)',
        viewList: '列表',
        viewGrid: '網格',
        previewTitle: '預覽',
        previewNoSelection: '未選取任何項目',
        previewLoading: '載入中...',
        previewNotImage: '無法預覽此檔案',
        previewImageInfo: '類型: {type}<br>大小: {size}<br>修改時間: {mtime}',
        errorNotDir: '不是目錄',
        errorPathNotExist: '路徑不存在',
        errorOpenDir: '無法開啟目錄: {msg}',
        errorReadDir: '讀取目錄失敗: {msg}',
        errorNoItem: '未選取任何項目',
        errorOpenFolderOnly: '僅支援開啟資料夾',
        errorOpenExplorer: '無法開啟檔案總管: {msg}',
        errorSearchFailed: '搜尋失敗: {msg}',
        settingsTitle: '搜尋外部檔案設定',
        settingsLanguage: '語言',
        settingsLanguageDesc: '選擇外掛介面語言，或自動跟隨 Obsidian',
        settingsLanguageAuto: '自動 (跟隨 Obsidian)',
        settingsLanguageZh: '中文',
        settingsLanguageEn: 'English',
        settingsDefaultPath: '預設路徑',
        settingsDefaultPathDesc: '檔案瀏覽器開啟時預設顯示的目錄（留空則使用筆記庫根目錄）',
        settingsDefaultPathPlaceholder: '例如: C:\\Users\\YourName\\Documents',
        columnName: '名稱',
        columnModified: '修改時間',
        columnType: '類型',
        columnSize: '大小',
        folder: '資料夾',
        file: '檔案',
        helpText: `
# 搜尋外部檔案外掛說明

## 功能介紹
本外掛允許您在 Obsidian 中瀏覽本機檔案系統，並快速在 Obsidian 中搜尋選中的檔案或資料夾路徑。

本外掛僅讀取檔案系統，絕不會修改任何筆記庫中的檔案！所有執行資料均為臨時資料，不會影響您的筆記內容。

## 使用方法
1. **開啟外掛**：點擊左側功能區資料夾搜尋圖示，或使用指令「開啟外部檔案瀏覽器」。
2. **檔案瀏覽**：使用頂部的導航按鈕（上一層、重新整理）和路徑列跳轉目錄。
3. **選擇項目**：點擊檔案或資料夾即可選中。選中後可在預覽側邊欄（點擊「預覽」按鈕開啟）檢視圖片預覽和資訊。
4. **搜尋**：
   - 雙擊檔案（或選中後點擊「搜尋」按鈕）會在 Obsidian 中搜尋該檔案名稱。
   - 選中資料夾後點擊「搜尋」按鈕會搜尋其路徑，使用**正規表示式**格式（例如 \`/D:.*Folder1.*Folder2/\`）。
5. **自動搜尋**：勾選「自動搜尋」後，每次點擊選中檔案或資料夾都會自動觸發搜尋。
6. **排序與檢視**：可切換排序方式和檢視模式（列表/網格）。
7. **開啟資料夾**：選中資料夾後點擊「開啟」按鈕可進入該資料夾。
8. **檔案總管**：點擊「在檔案總管中開啟」按鈕可在系統檔案總管中開啟目前目錄；若選中了檔案，則會定位到該檔案。

## 注意事項
- 本外掛**唯讀**，不修改任何筆記資料。
- 設定中的「預設路徑」可指定外掛啟動時的預設目錄，留空則使用筆記庫根目錄。
    `,
    },
    es: {
        pluginName: 'Buscar Archivos Externos',
        up: 'Subir',
        refresh: 'Actualizar',
        go: 'Ir',
        openFolder: 'Abrir Carpeta',
        openExplorer: 'Abrir en Explorador',
        help: 'Ayuda',
        search: 'Buscar',
        autoSearch: 'Búsqueda Automática',
        preview: 'Vista Previa',
        sortNameAsc: 'Nombre (Asc)',
        sortNameDesc: 'Nombre (Desc)',
        sortTypeAsc: 'Tipo (Asc)',
        sortTypeDesc: 'Tipo (Desc)',
        sortSizeAsc: 'Tamaño (Asc)',
        sortSizeDesc: 'Tamaño (Desc)',
        sortMtimeAsc: 'Modificado (Asc)',
        sortMtimeDesc: 'Modificado (Desc)',
        viewList: 'Lista',
        viewGrid: 'Cuadrícula',
        previewTitle: 'Vista Previa',
        previewNoSelection: 'Ningún elemento seleccionado',
        previewLoading: 'Cargando...',
        previewNotImage: 'No se puede previsualizar este archivo',
        previewImageInfo: 'Tipo: {type}<br>Tamaño: {size}<br>Modificado: {mtime}',
        errorNotDir: 'No es un directorio',
        errorPathNotExist: 'La ruta no existe',
        errorOpenDir: 'No se puede abrir el directorio: {msg}',
        errorReadDir: 'Error al leer el directorio: {msg}',
        errorNoItem: 'Ningún elemento seleccionado',
        errorOpenFolderOnly: 'Solo se pueden abrir carpetas',
        errorOpenExplorer: 'No se puede abrir el explorador: {msg}',
        errorSearchFailed: 'Error en la búsqueda: {msg}',
        settingsTitle: 'Configuración de Buscar Archivos Externos',
        settingsLanguage: 'Idioma',
        settingsLanguageDesc: 'Elige el idioma de la interfaz del plugin, o sigue automáticamente a Obsidian',
        settingsLanguageAuto: 'Automático (Seguir a Obsidian)',
        settingsLanguageZh: '中文',
        settingsLanguageEn: 'English',
        settingsDefaultPath: 'Ruta Predeterminada',
        settingsDefaultPathDesc: 'Directorio inicial para el navegador de archivos (dejar vacío para usar la raíz de la bóveda)',
        settingsDefaultPathPlaceholder: 'p.ej., C:\\Users\\YourName\\Documents',
        columnName: 'Nombre',
        columnModified: 'Modificado',
        columnType: 'Tipo',
        columnSize: 'Tamaño',
        folder: 'Carpeta',
        file: 'Archivo',
        helpText: `
# Ayuda del Plugin Buscar Archivos Externos

## Funciones
Este plugin te permite explorar el sistema de archivos local dentro de Obsidian y buscar rápidamente rutas de archivos o carpetas seleccionadas en Obsidian.

Este plugin es de **solo lectura** y nunca modificará ningún archivo en tu bóveda. Todos los datos en tiempo de ejecución son temporales y no afectarán tus notas.

## Uso
1. **Abrir el plugin**: Haz clic en el icono de búsqueda de carpetas en la cinta lateral izquierda, o usa el comando "Abrir Navegador de Archivos Externos".
2. **Navegación**: Usa los botones de navegación (Subir, Actualizar) y la barra de ruta para saltar a directorios.
3. **Seleccionar elementos**: Haz clic en un archivo o carpeta para seleccionarlo. Después de la selección, puedes abrir la barra lateral de vista previa (haciendo clic en el botón "Vista Previa") para ver la previsualización de imágenes e información.
4. **Buscar**:
   - Haz doble clic en un archivo (o selecciona y haz clic en el botón "Buscar") para buscar su nombre en Obsidian.
   - Selecciona una carpeta y haz clic en el botón "Buscar" para buscar su ruta usando **formato regex** (p.ej., \`/D:.*Folder1.*Folder2/\`).
5. **Búsqueda automática**: Marca "Búsqueda Automática" para que se realice una búsqueda automáticamente cada vez que hagas clic en un archivo o carpeta.
6. **Orden y vista**: Cambia las opciones de orden y el modo de vista (Lista / Cuadrícula).
7. **Abrir carpeta**: Selecciona una carpeta y haz clic en el botón "Abrir" para entrar en ella.
8. **Explorador**: Haz clic en el botón "Abrir en Explorador" para abrir el directorio actual en el explorador de archivos del sistema; si hay un archivo seleccionado, se resaltará.

## Notas
- El plugin es de **solo lectura** y nunca modifica datos de la bóveda.
- La "Ruta Predeterminada" en la configuración especifica el directorio inicial (dejar vacío para usar la raíz de la bóveda).
    `,
    },
    fr: {
        pluginName: 'Rechercher des Fichiers Externes',
        up: 'Remonter',
        refresh: 'Actualiser',
        go: 'Aller',
        openFolder: 'Ouvrir le Dossier',
        openExplorer: 'Ouvrir dans l\'Explorateur',
        help: 'Aide',
        search: 'Rechercher',
        autoSearch: 'Recherche Automatique',
        preview: 'Aperçu',
        sortNameAsc: 'Nom (Croissant)',
        sortNameDesc: 'Nom (Décroissant)',
        sortTypeAsc: 'Type (Croissant)',
        sortTypeDesc: 'Type (Décroissant)',
        sortSizeAsc: 'Taille (Croissant)',
        sortSizeDesc: 'Taille (Décroissant)',
        sortMtimeAsc: 'Modifié (Croissant)',
        sortMtimeDesc: 'Modifié (Décroissant)',
        viewList: 'Liste',
        viewGrid: 'Grille',
        previewTitle: 'Aperçu',
        previewNoSelection: 'Aucun élément sélectionné',
        previewLoading: 'Chargement...',
        previewNotImage: 'Impossible de prévisualiser ce fichier',
        previewImageInfo: 'Type : {type}<br>Taille : {size}<br>Modifié : {mtime}',
        errorNotDir: 'N\'est pas un répertoire',
        errorPathNotExist: 'Le chemin n\'existe pas',
        errorOpenDir: 'Impossible d\'ouvrir le répertoire : {msg}',
        errorReadDir: 'Échec de la lecture du répertoire : {msg}',
        errorNoItem: 'Aucun élément sélectionné',
        errorOpenFolderOnly: 'Seuls les dossiers peuvent être ouverts',
        errorOpenExplorer: 'Impossible d\'ouvrir l\'explorateur : {msg}',
        errorSearchFailed: 'Échec de la recherche : {msg}',
        settingsTitle: 'Paramètres de Rechercher des Fichiers Externes',
        settingsLanguage: 'Langue',
        settingsLanguageDesc: 'Choisissez la langue de l\'interface du plugin, ou suivez automatiquement Obsidian',
        settingsLanguageAuto: 'Automatique (Suivre Obsidian)',
        settingsLanguageZh: '中文',
        settingsLanguageEn: 'English',
        settingsDefaultPath: 'Chemin par Défaut',
        settingsDefaultPathDesc: 'Répertoire initial pour le navigateur de fichiers (laisser vide pour utiliser la racine du coffre)',
        settingsDefaultPathPlaceholder: 'ex. : C:\\Users\\YourName\\Documents',
        columnName: 'Nom',
        columnModified: 'Modifié',
        columnType: 'Type',
        columnSize: 'Taille',
        folder: 'Dossier',
        file: 'Fichier',
        helpText: `
# Aide du Plugin Rechercher des Fichiers Externes

## Fonctionnalités
Ce plugin vous permet de parcourir le système de fichiers local dans Obsidian et de rechercher rapidement les chemins des fichiers ou dossiers sélectionnés dans Obsidian.

Ce plugin est en **lecture seule** et ne modifiera jamais aucun fichier de votre coffre. Toutes les données d'exécution sont temporaires et n'affecteront pas vos notes.

## Utilisation
1. **Ouvrir le plugin** : Cliquez sur l'icône de recherche de dossier dans le ruban latéral gauche, ou utilisez la commande "Ouvrir le navigateur de fichiers externes".
2. **Navigation** : Utilisez les boutons de navigation (Remonter, Actualiser) et la barre de chemin pour sauter vers des répertoires.
3. **Sélectionner des éléments** : Cliquez sur un fichier ou un dossier pour le sélectionner. Après la sélection, vous pouvez ouvrir la barre latérale d'aperçu (en cliquant sur le bouton "Aperçu") pour voir l'aperçu de l'image et les informations.
4. **Recherche** :
   - Double-cliquez sur un fichier (ou sélectionnez-le et cliquez sur le bouton "Rechercher") pour rechercher son nom dans Obsidian.
   - Sélectionnez un dossier et cliquez sur le bouton "Rechercher" pour rechercher son chemin en utilisant le **format regex** (par ex., \`/D:.*Folder1.*Folder2/\`).
5. **Recherche automatique** : Cochez "Recherche Automatique" pour déclencher automatiquement une recherche à chaque fois que vous cliquez sur un fichier ou un dossier.
6. **Tri et affichage** : Changez les options de tri et le mode d'affichage (Liste / Grille).
7. **Ouvrir un dossier** : Sélectionnez un dossier et cliquez sur le bouton "Ouvrir" pour y accéder.
8. **Explorateur** : Cliquez sur le bouton "Ouvrir dans l'Explorateur" pour ouvrir le répertoire actuel dans l'explorateur de fichiers du système ; si un fichier est sélectionné, il sera mis en surbrillance.

## Remarques
- Le plugin est en **lecture seule** et ne modifie jamais les données du coffre.
- Le "Chemin par Défaut" dans les paramètres spécifie le répertoire initial (laisser vide pour utiliser la racine du coffre).
    `,
    },
    de: {
        pluginName: 'Externe Dateien durchsuchen',
        up: 'Hoch',
        refresh: 'Aktualisieren',
        go: 'Gehe zu',
        openFolder: 'Ordner öffnen',
        openExplorer: 'Im Explorer öffnen',
        help: 'Hilfe',
        search: 'Suchen',
        autoSearch: 'Automatische Suche',
        preview: 'Vorschau',
        sortNameAsc: 'Name (Aufst.)',
        sortNameDesc: 'Name (Abst.)',
        sortTypeAsc: 'Typ (Aufst.)',
        sortTypeDesc: 'Typ (Abst.)',
        sortSizeAsc: 'Größe (Aufst.)',
        sortSizeDesc: 'Größe (Abst.)',
        sortMtimeAsc: 'Geändert (Aufst.)',
        sortMtimeDesc: 'Geändert (Abst.)',
        viewList: 'Liste',
        viewGrid: 'Raster',
        previewTitle: 'Vorschau',
        previewNoSelection: 'Kein Element ausgewählt',
        previewLoading: 'Laden...',
        previewNotImage: 'Vorschau dieser Datei nicht möglich',
        previewImageInfo: 'Typ: {type}<br>Größe: {size}<br>Geändert: {mtime}',
        errorNotDir: 'Kein Verzeichnis',
        errorPathNotExist: 'Pfad existiert nicht',
        errorOpenDir: 'Verzeichnis kann nicht geöffnet werden: {msg}',
        errorReadDir: 'Lesen des Verzeichnisses fehlgeschlagen: {msg}',
        errorNoItem: 'Kein Element ausgewählt',
        errorOpenFolderOnly: 'Nur Ordner können geöffnet werden',
        errorOpenExplorer: 'Explorer kann nicht geöffnet werden: {msg}',
        errorSearchFailed: 'Suche fehlgeschlagen: {msg}',
        settingsTitle: 'Einstellungen für Externe Dateien durchsuchen',
        settingsLanguage: 'Sprache',
        settingsLanguageDesc: 'Wählen Sie die Plugin-Oberflächensprache oder folgen Sie automatisch Obsidian',
        settingsLanguageAuto: 'Automatisch (Obsidian folgen)',
        settingsLanguageZh: '中文',
        settingsLanguageEn: 'English',
        settingsDefaultPath: 'Standardpfad',
        settingsDefaultPathDesc: 'Anfangsverzeichnis für den Dateibrowser (leer lassen, um den Vault-Root zu verwenden)',
        settingsDefaultPathPlaceholder: 'z.B. C:\\Users\\YourName\\Documents',
        columnName: 'Name',
        columnModified: 'Geändert',
        columnType: 'Typ',
        columnSize: 'Größe',
        folder: 'Ordner',
        file: 'Datei',
        helpText: `
# Hilfe für das Plugin "Externe Dateien durchsuchen"

## Funktionen
Dieses Plugin ermöglicht es Ihnen, das lokale Dateisystem in Obsidian zu durchsuchen und schnell nach ausgewählten Datei- oder Ordnerpfaden in Obsidian zu suchen.

Dieses Plugin ist **schreibgeschützt** und wird niemals Dateien in Ihrem Vault ändern. Alle Laufzeitdaten sind temporär und beeinflussen Ihre Notizen nicht.

## Verwendung
1. **Plugin öffnen**: Klicken Sie auf das Ordnersuch-Symbol im linken Menüband oder verwenden Sie den Befehl "Externen Dateibrowser öffnen".
2. **Navigation**: Verwenden Sie die Navigationsbuttons (Hoch, Aktualisieren) und die Pfadleiste, um zu Verzeichnissen zu springen.
3. **Elemente auswählen**: Klicken Sie auf eine Datei oder einen Ordner, um sie auszuwählen. Nach der Auswahl können Sie die Vorschau-Seitenleiste (über den Button "Vorschau") öffnen, um Bildvorschau und Informationen zu sehen.
4. **Suchen**:
   - Doppelklicken Sie auf eine Datei (oder wählen Sie sie aus und klicken Sie auf "Suchen"), um nach ihrem Namen in Obsidian zu suchen.
   - Wählen Sie einen Ordner und klicken Sie auf "Suchen", um nach seinem Pfad im **Regex-Format** zu suchen (z.B. \`/D:.*Folder1.*Folder2/\`).
5. **Automatische Suche**: Aktivieren Sie "Automatische Suche", um bei jedem Klick auf eine Datei oder einen Ordner automatisch eine Suche auszulösen.
6. **Sortierung und Ansicht**: Wechseln Sie die Sortieroptionen und den Ansichtsmodus (Liste / Raster).
7. **Ordner öffnen**: Wählen Sie einen Ordner und klicken Sie auf "Öffnen", um in diesen Ordner zu wechseln.
8. **Explorer**: Klicken Sie auf "Im Explorer öffnen", um das aktuelle Verzeichnis im System-Explorer zu öffnen; wenn eine Datei ausgewählt ist, wird sie hervorgehoben.

## Hinweise
- Das Plugin ist **schreibgeschützt** und ändert niemals Vault-Daten.
- Der "Standardpfad" in den Einstellungen legt das Anfangsverzeichnis fest (leer lassen, um den Vault-Root zu verwenden).
    `,
    },
    ja: {
        pluginName: '外部ファイル検索',
        up: '上へ',
        refresh: '更新',
        go: '移動',
        openFolder: 'フォルダを開く',
        openExplorer: 'エクスプローラーで開く',
        help: 'ヘルプ',
        search: '検索',
        autoSearch: '自動検索',
        preview: 'プレビュー',
        sortNameAsc: '名前 (昇順)',
        sortNameDesc: '名前 (降順)',
        sortTypeAsc: '種類 (昇順)',
        sortTypeDesc: '種類 (降順)',
        sortSizeAsc: 'サイズ (昇順)',
        sortSizeDesc: 'サイズ (降順)',
        sortMtimeAsc: '更新日時 (昇順)',
        sortMtimeDesc: '更新日時 (降順)',
        viewList: 'リスト',
        viewGrid: 'グリッド',
        previewTitle: 'プレビュー',
        previewNoSelection: '項目が選択されていません',
        previewLoading: '読み込み中...',
        previewNotImage: 'このファイルはプレビューできません',
        previewImageInfo: '種類: {type}<br>サイズ: {size}<br>更新日: {mtime}',
        errorNotDir: 'ディレクトリではありません',
        errorPathNotExist: 'パスが存在しません',
        errorOpenDir: 'ディレクトリを開けません: {msg}',
        errorReadDir: 'ディレクトリの読み取りに失敗しました: {msg}',
        errorNoItem: '項目が選択されていません',
        errorOpenFolderOnly: 'フォルダのみ開けます',
        errorOpenExplorer: 'エクスプローラーを開けません: {msg}',
        errorSearchFailed: '検索に失敗しました: {msg}',
        settingsTitle: '外部ファイル検索 設定',
        settingsLanguage: '言語',
        settingsLanguageDesc: 'プラグインの表示言語を選択します（自動の場合はObsidianに従います）',
        settingsLanguageAuto: '自動 (Obsidianに従う)',
        settingsLanguageZh: '中文',
        settingsLanguageEn: 'English',
        settingsDefaultPath: 'デフォルトパス',
        settingsDefaultPathDesc: 'ファイルブラウザ起動時の初期ディレクトリ（空の場合はボールトルートを使用）',
        settingsDefaultPathPlaceholder: '例: C:\\Users\\YourName\\Documents',
        columnName: '名前',
        columnModified: '更新日時',
        columnType: '種類',
        columnSize: 'サイズ',
        folder: 'フォルダ',
        file: 'ファイル',
        helpText: `
# 外部ファイル検索プラグイン ヘルプ

## 機能説明
このプラグインを使用すると、Obsidian内でローカルファイルシステムを参照し、選択したファイルやフォルダのパスをObsidianで素早く検索できます。

このプラグインは**読み取り専用**であり、ボールト内のファイルを一切変更しません。すべての実行データは一時的なものであり、ノートの内容に影響を与えることはありません。

## 使用方法
1. **プラグインを開く**：左側のリボンにあるフォルダ検索アイコンをクリックするか、「外部ファイルブラウザを開く」コマンドを使用します。
2. **ファイル操作**：上部のナビゲーションボタン（上へ、更新）とパスバーでディレクトリを移動します。
3. **項目を選択**：ファイルやフォルダをクリックすると選択されます。選択後、プレビューボタン（目玉アイコン）でプレビューサイドバーを開き、画像プレビューや情報を確認できます。
4. **検索**：
   - ファイルをダブルクリック（または選択後に「検索」ボタンをクリック）すると、Obsidian内でそのファイル名を検索します。
   - フォルダを選択して「検索」ボタンをクリックすると、そのパスを**正規表現形式**（例: \`/D:.*Folder1.*Folder2/\`）で検索します。
5. **自動検索**：「自動検索」にチェックを入れると、ファイルやフォルダをクリックするたびに自動的に検索が実行されます。
6. **ソートと表示**：ソート順や表示モード（リスト/グリッド）を切り替えられます。
7. **フォルダを開く**：フォルダを選択し「開く」ボタンをクリックすると、そのフォルダに入ります。
8. **エクスプローラーで開く**：「エクスプローラーで開く」ボタンをクリックすると、現在のディレクトリをシステムのファイルエクスプローラーで開きます。ファイルが選択されている場合は、そのファイルがハイライトされます。

## 注意事項
- このプラグインは**読み取り専用**であり、ボールトのデータを一切変更しません。
- 設定の「デフォルトパス」で、プラグイン起動時の初期ディレクトリを指定できます（空の場合はボールトルートを使用します）。
    `,
    },
    sq: {
        pluginName: 'Kërko Skedarë të Jashtëm',
        up: 'Lart',
        refresh: 'Rifresko',
        go: 'Shko',
        openFolder: 'Hap Dossier',
        openExplorer: 'Hap në Explorer',
        help: 'Ndihmë',
        search: 'Kërko',
        autoSearch: 'Kërkim Automatik',
        preview: 'Parapamje',
        sortNameAsc: 'Emri (Rritës)',
        sortNameDesc: 'Emri (Zbritës)',
        sortTypeAsc: 'Lloji (Rritës)',
        sortTypeDesc: 'Lloji (Zbritës)',
        sortSizeAsc: 'Madhësia (Rritës)',
        sortSizeDesc: 'Madhësia (Zbritës)',
        sortMtimeAsc: 'Modifikuar (Rritës)',
        sortMtimeDesc: 'Modifikuar (Zbritës)',
        viewList: 'Listë',
        viewGrid: 'Rrjetë',
        previewTitle: 'Parapamje',
        previewNoSelection: 'Asnjë element i zgjedhur',
        previewLoading: 'Duke u ngarkuar...',
        previewNotImage: 'Nuk mund të parapamet këtë skedar',
        previewImageInfo: 'Lloji: {type}<br>Madhësia: {size}<br>Modifikuar: {mtime}',
        errorNotDir: 'Nuk është drejtori',
        errorPathNotExist: 'Rruga nuk ekziston',
        errorOpenDir: 'Nuk mund të hapet drejtoria: {msg}',
        errorReadDir: 'Dështoi leximi i drejtorisë: {msg}',
        errorNoItem: 'Asnjë element i zgjedhur',
        errorOpenFolderOnly: 'Mund të hapen vetëm dosje',
        errorOpenExplorer: 'Nuk mund të hapet eksploruesi: {msg}',
        errorSearchFailed: 'Kërkimi dështoi: {msg}',
        settingsTitle: 'Cilësimet e Kërko Skedarë të Jashtëm',
        settingsLanguage: 'Gjuha',
        settingsLanguageDesc: 'Zgjidhni gjuhën e ndërfaqes së plugin-it, ose ndiqni automatikisht Obsidian',
        settingsLanguageAuto: 'Automatike (Ndiq Obsidian)',
        settingsLanguageZh: '中文',
        settingsLanguageEn: 'English',
        settingsDefaultPath: 'Rruga e Parazgjedhur',
        settingsDefaultPathDesc: 'Drejtoria fillestare për shfletuesin e skedarëve (lëreni bosh për të përdorur rrënjën e vault-it)',
        settingsDefaultPathPlaceholder: 'p.sh., C:\\Users\\YourName\\Documents',
        columnName: 'Emri',
        columnModified: 'Modifikuar',
        columnType: 'Lloji',
        columnSize: 'Madhësia',
        folder: 'Dosje',
        file: 'Skedar',
        helpText: `
# Ndihmë për Plugin-in Kërko Skedarë të Jashtëm

## Veçoritë
Ky plugin ju lejon të shfletoni sistemin lokal të skedarëve brenda Obsidian dhe të kërkoni shpejt rrugët e skedarëve ose dosjeve të zgjedhura në Obsidian.

Ky plugin është **vetëm për lexim** dhe nuk do të modifikojë kurrë asnjë skedar në vault-in tuaj. Të gjitha të dhënat e ekzekutimit janë të përkohshme dhe nuk do të ndikojnë në shënimet tuaja.

## Përdorimi
1. **Hapni plugin-in**: Klikoni ikonën e kërkimit të dosjeve në shiritin e majtë, ose përdorni komandën "Hap Shfletuesin e Skedarëve të Jashtëm".
2. **Navigimi**: Përdorni butonat e navigimit (Lart, Rifresko) dhe shiritin e rrugës për të kaluar në drejtori.
3. **Zgjidhni elemente**: Klikoni në një skedar ose dosje për ta zgjedhur. Pas zgjedhjes, mund të hapni shiritin anësor të parapamjes (duke klikuar butonin "Parapamje") për të parë parapamjen e figurës dhe informacionin.
4. **Kërkimi**:
   - Klikoni dy herë mbi një skedar (ose zgjidhni atë dhe klikoni butonin "Kërko") për të kërkuar emrin e tij në Obsidian.
   - Zgjidhni një dosje dhe klikoni butonin "Kërko" për të kërkuar rrugën e saj duke përdorur **formatin regex** (p.sh., \`/D:.*Folder1.*Folder2/\`).
5. **Kërkim automatik**: Kontrolloni "Kërkim Automatik" për të nisur automatikisht një kërkim sa herë që klikoni mbi një skedar ose dosje.
6. **Renditja dhe pamja**: Ndryshoni opsionet e renditjes dhe mënyrën e pamjes (Listë / Rrjetë).
7. **Hap dosje**: Zgjidhni një dosje dhe klikoni butonin "Hap" për të hyrë në të.
8. **Eksploruesi**: Klikoni butonin "Hap në Explorer" për të hapur drejtorinë aktuale në eksploruesin e sistemit; nëse është zgjedhur një skedar, ai do të theksohet.

## Shënime
- Plugin-i është **vetëm për lexim** dhe nuk modifikon kurrë të dhënat e vault-it.
- "Rruga e Parazgjedhur" në cilësimet specifikon drejtorinë fillestare (lëreni bosh për të përdorur rrënjën e vault-it).
    `,
    },

    cs: {
        pluginName: 'Hledat externí soubory',
        up: 'Nahoru',
        refresh: 'Obnovit',
        go: 'Přejít',
        openFolder: 'Otevřít složku',
        openExplorer: 'Otevřít v Průzkumníku',
        help: 'Nápověda',
        search: 'Hledat',
        autoSearch: 'Automatické hledání',
        preview: 'Náhled',
        sortNameAsc: 'Název (vzestupně)',
        sortNameDesc: 'Název (sestupně)',
        sortTypeAsc: 'Typ (vzestupně)',
        sortTypeDesc: 'Typ (sestupně)',
        sortSizeAsc: 'Velikost (vzestupně)',
        sortSizeDesc: 'Velikost (sestupně)',
        sortMtimeAsc: 'Změněno (vzestupně)',
        sortMtimeDesc: 'Změněno (sestupně)',
        viewList: 'Seznam',
        viewGrid: 'Mřížka',
        previewTitle: 'Náhled',
        previewNoSelection: 'Není vybrána žádná položka',
        previewLoading: 'Načítání...',
        previewNotImage: 'Nelze zobrazit náhled tohoto souboru',
        previewImageInfo: 'Typ: {type}<br>Velikost: {size}<br>Změněno: {mtime}',
        errorNotDir: 'Není adresář',
        errorPathNotExist: 'Cesta neexistuje',
        errorOpenDir: 'Nelze otevřít adresář: {msg}',
        errorReadDir: 'Selhalo čtení adresáře: {msg}',
        errorNoItem: 'Není vybrána žádná položka',
        errorOpenFolderOnly: 'Lze otevřít pouze složky',
        errorOpenExplorer: 'Nelze otevřít Průzkumníka: {msg}',
        errorSearchFailed: 'Hledání selhalo: {msg}',
        settingsTitle: 'Nastavení Hledat externí soubory',
        settingsLanguage: 'Jazyk',
        settingsLanguageDesc: 'Vyberte jazyk rozhraní pluginu nebo automaticky sledujte Obsidian',
        settingsLanguageAuto: 'Automaticky (sledovat Obsidian)',
        settingsLanguageZh: '中文',
        settingsLanguageEn: 'English',
        settingsDefaultPath: 'Výchozí cesta',
        settingsDefaultPathDesc: 'Počáteční adresář pro prohlížeč souborů (prázdné = použít kořen vaultu)',
        settingsDefaultPathPlaceholder: 'např. C:\\Users\\YourName\\Documents',
        columnName: 'Název',
        columnModified: 'Změněno',
        columnType: 'Typ',
        columnSize: 'Velikost',
        folder: 'Složka',
        file: 'Soubor',
        helpText: `
# Nápověda k pluginu Hledat externí soubory

## Funkce
Tento plugin vám umožňuje procházet lokální souborový systém v Obsidian a rychle vyhledávat cesty vybraných souborů nebo složek v Obsidian.

Plugin je **pouze pro čtení** a nikdy nezmění žádný soubor ve vašem vaultu. Všechna běhová data jsou dočasná a neovlivní vaše poznámky.

## Použití
1. **Otevřete plugin**: Klikněte na ikonu hledání složky v levém pruhu nebo použijte příkaz "Otevřít prohlížeč externích souborů".
2. **Procházení**: Použijte navigační tlačítka (Nahoru, Obnovit) a řádek cesty pro přechod mezi adresáři.
3. **Výběr položek**: Kliknutím na soubor nebo složku ji vyberete. Po výběru můžete otevřít postranní panel náhledu (tlačítkem "Náhled") a zobrazit náhled obrázku a informace.
4. **Hledání**:
   - Dvojklikem na soubor (nebo výběrem a kliknutím na "Hledat") vyhledáte jeho název v Obsidian.
   - Vyberte složku a klikněte na "Hledat" pro vyhledání její cesty ve **formátu regex** (např. \`/D:.*Folder1.*Folder2/\`).
5. **Automatické hledání**: Zaškrtněte "Automatické hledání" pro automatické spuštění hledání při každém kliknutí na soubor nebo složku.
6. **Řazení a zobrazení**: Přepínejte možnosti řazení a režim zobrazení (Seznam / Mřížka).
7. **Otevřít složku**: Vyberte složku a klikněte na "Otevřít" pro vstup do ní.
8. **Průzkumník**: Klikněte na "Otevřít v Průzkumníku" pro otevření aktuálního adresáře v systémovém Průzkumníku; pokud je vybrán soubor, bude zvýrazněn.

## Poznámky
- Plugin je **pouze pro čtení** a nikdy nemění data vaultu.
- "Výchozí cesta" v nastavení určuje počáteční adresář (prázdné = použít kořen vaultu).
    `,
    },

    da: {
        pluginName: 'Søg Eksterne Filer',
        up: 'Op',
        refresh: 'Genopfrisk',
        go: 'Gå',
        openFolder: 'Åbn Mappe',
        openExplorer: 'Åbn i Stifinder',
        help: 'Hjælp',
        search: 'Søg',
        autoSearch: 'Automatisk Søgning',
        preview: 'Forhåndsvisning',
        sortNameAsc: 'Navn (Stigende)',
        sortNameDesc: 'Navn (Faldende)',
        sortTypeAsc: 'Type (Stigende)',
        sortTypeDesc: 'Type (Faldende)',
        sortSizeAsc: 'Størrelse (Stigende)',
        sortSizeDesc: 'Størrelse (Faldende)',
        sortMtimeAsc: 'Ændret (Stigende)',
        sortMtimeDesc: 'Ændret (Faldende)',
        viewList: 'Liste',
        viewGrid: 'Gitter',
        previewTitle: 'Forhåndsvisning',
        previewNoSelection: 'Intet element valgt',
        previewLoading: 'Indlæser...',
        previewNotImage: 'Kan ikke forhåndsvise denne fil',
        previewImageInfo: 'Type: {type}<br>Størrelse: {size}<br>Ændret: {mtime}',
        errorNotDir: 'Ikke en mappe',
        errorPathNotExist: 'Stien findes ikke',
        errorOpenDir: 'Kan ikke åbne mappe: {msg}',
        errorReadDir: 'Kunne ikke læse mappe: {msg}',
        errorNoItem: 'Intet element valgt',
        errorOpenFolderOnly: 'Kun mapper kan åbnes',
        errorOpenExplorer: 'Kan ikke åbne Stifinder: {msg}',
        errorSearchFailed: 'Søgning mislykkedes: {msg}',
        settingsTitle: 'Indstillinger for Søg Eksterne Filer',
        settingsLanguage: 'Sprog',
        settingsLanguageDesc: 'Vælg plugin-grænsefladesprog, eller følg automatisk Obsidian',
        settingsLanguageAuto: 'Automatisk (Følg Obsidian)',
        settingsLanguageZh: '中文',
        settingsLanguageEn: 'English',
        settingsDefaultPath: 'Standardsti',
        settingsDefaultPathDesc: 'Startmappe for filbrowseren (lad være tom for at bruge vault-rod)',
        settingsDefaultPathPlaceholder: 'f.eks., C:\\Users\\YourName\\Documents',
        columnName: 'Navn',
        columnModified: 'Ændret',
        columnType: 'Type',
        columnSize: 'Størrelse',
        folder: 'Mappe',
        file: 'Fil',
        helpText: `
# Hjælp til plugin Søg Eksterne Filer

## Funktioner
Dette plugin giver dig mulighed for at gennemse det lokale filsystem i Obsidian og hurtigt søge efter stier til valgte filer eller mapper i Obsidian.

Dette plugin er **skrivebeskyttet** og vil aldrig ændre nogen filer i dit vault. Alle runtime-data er midlertidige og vil ikke påvirke dine noter.

## Brug
1. **Åbn plugin**: Klik på mappesøgningsikonet i venstre bånd, eller brug kommandoen "Åbn ekstern filbrowser".
2. **Navigation**: Brug navigationsknapperne (Op, Genopfrisk) og stilinjen til at hoppe til mapper.
3. **Vælg elementer**: Klik på en fil eller mappe for at vælge den. Efter valg kan du åbne forhåndsvisningssidepanelet (ved at klikke på "Forhåndsvisning") for at se billedforhåndsvisning og information.
4. **Søg**:
   - Dobbeltklik på en fil (eller vælg den og klik på "Søg") for at søge efter dens navn i Obsidian.
   - Vælg en mappe og klik på "Søg" for at søge efter dens sti ved hjælp af **regex-format** (f.eks., \`/D:.*Folder1.*Folder2/\`).
5. **Automatisk søgning**: Afkryds "Automatisk Søgning" for automatisk at udløse en søgning, hver gang du klikker på en fil eller mappe.
6. **Sortering og visning**: Skift sorteringsmuligheder og visningstilstand (Liste / Gitter).
7. **Åbn mappe**: Vælg en mappe og klik på "Åbn" for at gå ind i den.
8. **Stifinder**: Klik på "Åbn i Stifinder" for at åbne den aktuelle mappe i systemets Stifinder; hvis en fil er valgt, vil den blive fremhævet.

## Bemærkninger
- Pluginet er **skrivebeskyttet** og ændrer aldrig vault-data.
- "Standardsti" i indstillinger angiver startmappen (lad være tom for at bruge vault-rod).
    `,
    },

    fa: {
        pluginName: 'جستجوی فایل‌های خارجی',
        up: 'بالا',
        refresh: 'تازه‌سازی',
        go: 'برو',
        openFolder: 'باز کردن پوشه',
        openExplorer: 'باز کردن در اکسپلورر',
        help: 'راهنما',
        search: 'جستجو',
        autoSearch: 'جستجوی خودکار',
        preview: 'پیش‌نمایش',
        sortNameAsc: 'نام (صعودی)',
        sortNameDesc: 'نام (نزولی)',
        sortTypeAsc: 'نوع (صعودی)',
        sortTypeDesc: 'نوع (نزولی)',
        sortSizeAsc: 'اندازه (صعودی)',
        sortSizeDesc: 'اندازه (نزولی)',
        sortMtimeAsc: 'تاریخ تغییر (صعودی)',
        sortMtimeDesc: 'تاریخ تغییر (نزولی)',
        viewList: 'لیست',
        viewGrid: 'شبکه‌ای',
        previewTitle: 'پیش‌نمایش',
        previewNoSelection: 'هیچ آیتمی انتخاب نشده',
        previewLoading: 'در حال بارگذاری...',
        previewNotImage: 'پیش‌نمایش این فایل امکان‌پذیر نیست',
        previewImageInfo: 'نوع: {type}<br>اندازه: {size}<br>تاریخ تغییر: {mtime}',
        errorNotDir: 'دایرکتوری نیست',
        errorPathNotExist: 'مسیر وجود ندارد',
        errorOpenDir: 'باز کردن دایرکتوری امکان‌پذیر نیست: {msg}',
        errorReadDir: 'خواندن دایرکتوری با شکست مواجه شد: {msg}',
        errorNoItem: 'هیچ آیتمی انتخاب نشده',
        errorOpenFolderOnly: 'فقط پوشه‌ها قابل باز شدن هستند',
        errorOpenExplorer: 'باز کردن اکسپلورر امکان‌پذیر نیست: {msg}',
        errorSearchFailed: 'جستجو با شکست مواجه شد: {msg}',
        settingsTitle: 'تنظیمات جستجوی فایل‌های خارجی',
        settingsLanguage: 'زبان',
        settingsLanguageDesc: 'زبان رابط پلاگین را انتخاب کنید یا به طور خودکار از Obsidian پیروی کنید',
        settingsLanguageAuto: 'خودکار (پیروی از Obsidian)',
        settingsLanguageZh: '中文',
        settingsLanguageEn: 'English',
        settingsDefaultPath: 'مسیر پیش‌فرض',
        settingsDefaultPathDesc: 'دایرکتوری اولیه برای مرورگر فایل (خالی گذاشتن = استفاده از ریشه صندوق)',
        settingsDefaultPathPlaceholder: 'مثلاً C:\\Users\\YourName\\Documents',
        columnName: 'نام',
        columnModified: 'تاریخ تغییر',
        columnType: 'نوع',
        columnSize: 'اندازه',
        folder: 'پوشه',
        file: 'فایل',
        helpText: `
# راهنمای پلاگین جستجوی فایل‌های خارجی

## قابلیت‌ها
این پلاگین به شما امکان می‌دهد در Obsidian سیستم فایل محلی را مرور کرده و به سرعت مسیرهای فایل یا پوشه‌های انتخاب شده را در Obsidian جستجو کنید.

این پلاگین **فقط خواندنی** است و هرگز هیچ فایلی را در صندوق شما تغییر نمی‌دهد. تمام داده‌های اجرایی موقتی هستند و بر یادداشت‌های شما تأثیری نخواهند داشت.

## نحوه استفاده
1. **باز کردن پلاگین**: روی آیکون جستجوی پوشه در نوار سمت چپ کلیک کنید یا از دستور "باز کردن مرورگر فایل خارجی" استفاده کنید.
2. **مرور فایل**: از دکمه‌های ناوبری (بالا، تازه‌سازی) و نوار مسیر برای جابجایی بین دایرکتوری‌ها استفاده کنید.
3. **انتخاب آیتم**: روی فایل یا پوشه کلیک کنید تا انتخاب شود. پس از انتخاب، می‌توانید پنل کناری پیش‌نمایش را (با کلیک روی دکمه "پیش‌نمایش") باز کنید تا پیش‌نمایش تصویر و اطلاعات را مشاهده کنید.
4. **جستجو**:
   - برای جستجوی نام فایل در Obsidian، روی فایل دوبار کلیک کنید (یا آن را انتخاب کرده و روی دکمه "جستجو" کلیک کنید).
   - یک پوشه را انتخاب کرده و روی "جستجو" کلیک کنید تا مسیر آن را با **فرمت regex** جستجو کنید (مثلاً \`/D:.*Folder1.*Folder2/\`).
5. **جستجوی خودکار**: تیک "جستجوی خودکار" را بزنید تا با هر کلیک روی فایل یا پوشه، جستجو به طور خودکار انجام شود.
6. **مرتب‌سازی و نمایش**: گزینه‌های مرتب‌سازی و حالت نمایش (لیست / شبکه‌ای) را تغییر دهید.
7. **باز کردن پوشه**: یک پوشه را انتخاب کرده و روی دکمه "باز کردن" کلیک کنید تا وارد آن شوید.
8. **اکسپلورر**: روی دکمه "باز کردن در اکسپلورر" کلیک کنید تا دایرکتوری فعلی در اکسپلورر سیستم باز شود؛ اگر فایلی انتخاب شده باشد، برجسته خواهد شد.

## نکات
- پلاگین **فقط خواندنی** است و هرگز داده‌های صندوق را تغییر نمی‌دهد.
- "مسیر پیش‌فرض" در تنظیمات، دایرکتوری اولیه را مشخص می‌کند (خالی بگذارید تا از ریشه صندوق استفاده شود).
    `,
    },

    id: {
        pluginName: 'Cari File Eksternal',
        up: 'Naik',
        refresh: 'Segarkan',
        go: 'Pergi',
        openFolder: 'Buka Folder',
        openExplorer: 'Buka di Explorer',
        help: 'Bantuan',
        search: 'Cari',
        autoSearch: 'Cari Otomatis',
        preview: 'Pratinjau',
        sortNameAsc: 'Nama (A-Z)',
        sortNameDesc: 'Nama (Z-A)',
        sortTypeAsc: 'Tipe (A-Z)',
        sortTypeDesc: 'Tipe (Z-A)',
        sortSizeAsc: 'Ukuran (Kecil-Besar)',
        sortSizeDesc: 'Ukuran (Besar-Kecil)',
        sortMtimeAsc: 'Diubah (Lama-Baru)',
        sortMtimeDesc: 'Diubah (Baru-Lama)',
        viewList: 'Daftar',
        viewGrid: 'Grid',
        previewTitle: 'Pratinjau',
        previewNoSelection: 'Tidak ada item yang dipilih',
        previewLoading: 'Memuat...',
        previewNotImage: 'Tidak dapat mempratinjau file ini',
        previewImageInfo: 'Tipe: {type}<br>Ukuran: {size}<br>Diubah: {mtime}',
        errorNotDir: 'Bukan direktori',
        errorPathNotExist: 'Path tidak ada',
        errorOpenDir: 'Tidak dapat membuka direktori: {msg}',
        errorReadDir: 'Gagal membaca direktori: {msg}',
        errorNoItem: 'Tidak ada item yang dipilih',
        errorOpenFolderOnly: 'Hanya folder yang dapat dibuka',
        errorOpenExplorer: 'Tidak dapat membuka explorer: {msg}',
        errorSearchFailed: 'Pencarian gagal: {msg}',
        settingsTitle: 'Pengaturan Cari File Eksternal',
        settingsLanguage: 'Bahasa',
        settingsLanguageDesc: 'Pilih bahasa antarmuka plugin, atau ikuti Obsidian secara otomatis',
        settingsLanguageAuto: 'Otomatis (Ikuti Obsidian)',
        settingsLanguageZh: '中文',
        settingsLanguageEn: 'English',
        settingsDefaultPath: 'Path Default',
        settingsDefaultPathDesc: 'Direktori awal untuk penjelajah file (kosongkan untuk menggunakan root vault)',
        settingsDefaultPathPlaceholder: 'mis., C:\\Users\\YourName\\Documents',
        columnName: 'Nama',
        columnModified: 'Diubah',
        columnType: 'Tipe',
        columnSize: 'Ukuran',
        folder: 'Folder',
        file: 'File',
        helpText: `
# Bantuan Plugin Cari File Eksternal

## Fitur
Plugin ini memungkinkan Anda untuk menjelajahi sistem file lokal di dalam Obsidian dan mencari dengan cepat path file atau folder yang dipilih di Obsidian.

Plugin ini **hanya baca** dan tidak akan pernah mengubah file apa pun di vault Anda. Semua data runtime bersifat sementara dan tidak akan memengaruhi catatan Anda.

## Penggunaan
1. **Buka plugin**: Klik ikon pencarian folder di pita sisi kiri, atau gunakan perintah "Buka Penjelajah File Eksternal".
2. **Navigasi**: Gunakan tombol navigasi (Naik, Segarkan) dan bilah path untuk melompat ke direktori.
3. **Pilih item**: Klik file atau folder untuk memilihnya. Setelah dipilih, Anda dapat membuka sidebar pratinjau (dengan mengklik tombol "Pratinjau") untuk melihat pratinjau gambar dan informasi.
4. **Cari**:
   - Klik dua kali file (atau pilih dan klik tombol "Cari") untuk mencari nama file tersebut di Obsidian.
   - Pilih folder dan klik tombol "Cari" untuk mencari path-nya menggunakan **format regex** (mis., \`/D:.*Folder1.*Folder2/\`).
5. **Cari otomatis**: Centang "Cari Otomatis" untuk memicu pencarian secara otomatis setiap kali Anda mengklik file atau folder.
6. **Urutkan dan tampilan**: Ubah opsi pengurutan dan mode tampilan (Daftar / Grid).
7. **Buka folder**: Pilih folder dan klik tombol "Buka" untuk masuk ke folder tersebut.
8. **Explorer**: Klik tombol "Buka di Explorer" untuk membuka direktori saat ini di penjelajah file sistem; jika file dipilih, file tersebut akan disorot.

## Catatan
- Plugin ini **hanya baca** dan tidak pernah mengubah data vault.
- "Path Default" dalam pengaturan menentukan direktori awal (kosongkan untuk menggunakan root vault).
    `,
    },

    it: {
        pluginName: 'Cerca File Esterni',
        up: 'Su',
        refresh: 'Aggiorna',
        go: 'Vai',
        openFolder: 'Apri Cartella',
        openExplorer: 'Apri in Esplora file',
        help: 'Aiuto',
        search: 'Cerca',
        autoSearch: 'Ricerca Automatica',
        preview: 'Anteprima',
        sortNameAsc: 'Nome (Crescente)',
        sortNameDesc: 'Nome (Decrescente)',
        sortTypeAsc: 'Tipo (Crescente)',
        sortTypeDesc: 'Tipo (Decrescente)',
        sortSizeAsc: 'Dimensione (Crescente)',
        sortSizeDesc: 'Dimensione (Decrescente)',
        sortMtimeAsc: 'Modificato (Crescente)',
        sortMtimeDesc: 'Modificato (Decrescente)',
        viewList: 'Elenco',
        viewGrid: 'Griglia',
        previewTitle: 'Anteprima',
        previewNoSelection: 'Nessun elemento selezionato',
        previewLoading: 'Caricamento in corso...',
        previewNotImage: 'Impossibile visualizzare l\'anteprima di questo file',
        previewImageInfo: 'Tipo: {type}<br>Dimensione: {size}<br>Modificato: {mtime}',
        errorNotDir: 'Non è una directory',
        errorPathNotExist: 'Il percorso non esiste',
        errorOpenDir: 'Impossibile aprire la directory: {msg}',
        errorReadDir: 'Lettura della directory fallita: {msg}',
        errorNoItem: 'Nessun elemento selezionato',
        errorOpenFolderOnly: 'È possibile aprire solo cartelle',
        errorOpenExplorer: 'Impossibile aprire Esplora file: {msg}',
        errorSearchFailed: 'Ricerca fallita: {msg}',
        settingsTitle: 'Impostazioni Cerca File Esterni',
        settingsLanguage: 'Lingua',
        settingsLanguageDesc: 'Scegli la lingua dell\'interfaccia del plugin o segui automaticamente Obsidian',
        settingsLanguageAuto: 'Automatico (Segui Obsidian)',
        settingsLanguageZh: '中文',
        settingsLanguageEn: 'English',
        settingsDefaultPath: 'Percorso Predefinito',
        settingsDefaultPathDesc: 'Directory iniziale per il browser dei file (lasciare vuoto per usare la radice del vault)',
        settingsDefaultPathPlaceholder: 'es., C:\\Users\\YourName\\Documents',
        columnName: 'Nome',
        columnModified: 'Modificato',
        columnType: 'Tipo',
        columnSize: 'Dimensione',
        folder: 'Cartella',
        file: 'File',
        helpText: `
# Aiuto del Plugin Cerca File Esterni

## Funzionalità
Questo plugin ti consente di esplorare il file system locale all'interno di Obsidian e cercare rapidamente i percorsi dei file o delle cartelle selezionati in Obsidian.

Questo plugin è **sola lettura** e non modificherà mai alcun file nel tuo vault. Tutti i dati in esecuzione sono temporanei e non influenzeranno le tue note.

## Utilizzo
1. **Apri il plugin**: Fai clic sull'icona di ricerca cartelle nel nastro laterale sinistro o usa il comando "Apri browser file esterni".
2. **Navigazione**: Usa i pulsanti di navigazione (Su, Aggiorna) e la barra del percorso per saltare alle directory.
3. **Seleziona elementi**: Fai clic su un file o una cartella per selezionarlo. Dopo la selezione, puoi aprire la barra laterale di anteprima (facendo clic sul pulsante "Anteprima") per visualizzare l'anteprima dell'immagine e le informazioni.
4. **Cerca**:
   - Fai doppio clic su un file (o selezionalo e fai clic sul pulsante "Cerca") per cercarne il nome in Obsidian.
   - Seleziona una cartella e fai clic sul pulsante "Cerca" per cercarne il percorso utilizzando il **formato regex** (es., \`/D:.*Folder1.*Folder2/\`).
5. **Ricerca automatica**: Seleziona "Ricerca Automatica" per attivare automaticamente una ricerca ogni volta che fai clic su un file o una cartella.
6. **Ordinamento e visualizzazione**: Modifica le opzioni di ordinamento e la modalità di visualizzazione (Elenco / Griglia).
7. **Apri cartella**: Seleziona una cartella e fai clic sul pulsante "Apri" per accedervi.
8. **Esplora file**: Fai clic sul pulsante "Apri in Esplora file" per aprire la directory corrente in Esplora file di sistema; se è selezionato un file, verrà evidenziato.

## Note
- Il plugin è **sola lettura** e non modifica mai i dati del vault.
- Il "Percorso Predefinito" nelle impostazioni specifica la directory iniziale (lasciare vuoto per usare la radice del vault).
    `,
    },

    ja: {
        pluginName: '外部ファイル検索',
        up: '上へ',
        refresh: '更新',
        go: '移動',
        openFolder: 'フォルダを開く',
        openExplorer: 'エクスプローラーで開く',
        help: 'ヘルプ',
        search: '検索',
        autoSearch: '自動検索',
        preview: 'プレビュー',
        sortNameAsc: '名前 (昇順)',
        sortNameDesc: '名前 (降順)',
        sortTypeAsc: '種類 (昇順)',
        sortTypeDesc: '種類 (降順)',
        sortSizeAsc: 'サイズ (昇順)',
        sortSizeDesc: 'サイズ (降順)',
        sortMtimeAsc: '更新日時 (昇順)',
        sortMtimeDesc: '更新日時 (降順)',
        viewList: 'リスト',
        viewGrid: 'グリッド',
        previewTitle: 'プレビュー',
        previewNoSelection: '項目が選択されていません',
        previewLoading: '読み込み中...',
        previewNotImage: 'このファイルはプレビューできません',
        previewImageInfo: '種類: {type}<br>サイズ: {size}<br>更新日: {mtime}',
        errorNotDir: 'ディレクトリではありません',
        errorPathNotExist: 'パスが存在しません',
        errorOpenDir: 'ディレクトリを開けません: {msg}',
        errorReadDir: 'ディレクトリの読み取りに失敗しました: {msg}',
        errorNoItem: '項目が選択されていません',
        errorOpenFolderOnly: 'フォルダのみ開けます',
        errorOpenExplorer: 'エクスプローラーを開けません: {msg}',
        errorSearchFailed: '検索に失敗しました: {msg}',
        settingsTitle: '外部ファイル検索 設定',
        settingsLanguage: '言語',
        settingsLanguageDesc: 'プラグインの表示言語を選択します（自動の場合はObsidianに従います）',
        settingsLanguageAuto: '自動 (Obsidianに従う)',
        settingsLanguageZh: '中文',
        settingsLanguageEn: 'English',
        settingsDefaultPath: 'デフォルトパス',
        settingsDefaultPathDesc: 'ファイルブラウザ起動時の初期ディレクトリ（空の場合はボールトルートを使用）',
        settingsDefaultPathPlaceholder: '例: C:\\Users\\YourName\\Documents',
        columnName: '名前',
        columnModified: '更新日時',
        columnType: '種類',
        columnSize: 'サイズ',
        folder: 'フォルダ',
        file: 'ファイル',
        helpText: `
# 外部ファイル検索プラグイン ヘルプ

## 機能説明
このプラグインを使用すると、Obsidian内でローカルファイルシステムを参照し、選択したファイルやフォルダのパスをObsidianで素早く検索できます。

このプラグインは**読み取り専用**であり、ボールト内のファイルを一切変更しません。すべての実行データは一時的なものであり、ノートの内容に影響を与えることはありません。

## 使用方法
1. **プラグインを開く**：左側のリボンにあるフォルダ検索アイコンをクリックするか、「外部ファイルブラウザを開く」コマンドを使用します。
2. **ファイル操作**：上部のナビゲーションボタン（上へ、更新）とパスバーでディレクトリを移動します。
3. **項目を選択**：ファイルやフォルダをクリックすると選択されます。選択後、プレビューボタン（目玉アイコン）でプレビューサイドバーを開き、画像プレビューや情報を確認できます。
4. **検索**：
   - ファイルをダブルクリック（または選択後に「検索」ボタンをクリック）すると、Obsidian内でそのファイル名を検索します。
   - フォルダを選択して「検索」ボタンをクリックすると、そのパスを**正規表現形式**（例: \`/D:.*Folder1.*Folder2/\`）で検索します。
5. **自動検索**：「自動検索」にチェックを入れると、ファイルやフォルダをクリックするたびに自動的に検索が実行されます。
6. **ソートと表示**：ソート順や表示モード（リスト/グリッド）を切り替えられます。
7. **フォルダを開く**：フォルダを選択し「開く」ボタンをクリックすると、そのフォルダに入ります。
8. **エクスプローラーで開く**：「エクスプローラーで開く」ボタンをクリックすると、現在のディレクトリをシステムのファイルエクスプローラーで開きます。ファイルが選択されている場合は、そのファイルがハイライトされます。

## 注意事項
- このプラグインは**読み取り専用**であり、ボールトのデータを一切変更しません。
- 設定の「デフォルトパス」で、プラグイン起動時の初期ディレクトリを指定できます（空の場合はボールトルートを使用します）。
    `,
    },

    ko: {
        pluginName: '외부 파일 검색',
        up: '위로',
        refresh: '새로고침',
        go: '이동',
        openFolder: '폴더 열기',
        openExplorer: '탐색기에서 열기',
        help: '도움말',
        search: '검색',
        autoSearch: '자동 검색',
        preview: '미리보기',
        sortNameAsc: '이름 (오름차순)',
        sortNameDesc: '이름 (내림차순)',
        sortTypeAsc: '유형 (오름차순)',
        sortTypeDesc: '유형 (내림차순)',
        sortSizeAsc: '크기 (오름차순)',
        sortSizeDesc: '크기 (내림차순)',
        sortMtimeAsc: '수정일 (오름차순)',
        sortMtimeDesc: '수정일 (내림차순)',
        viewList: '목록',
        viewGrid: '격자',
        previewTitle: '미리보기',
        previewNoSelection: '선택한 항목 없음',
        previewLoading: '로딩 중...',
        previewNotImage: '이 파일을 미리볼 수 없습니다',
        previewImageInfo: '유형: {type}<br>크기: {size}<br>수정일: {mtime}',
        errorNotDir: '디렉터리가 아님',
        errorPathNotExist: '경로가 존재하지 않음',
        errorOpenDir: '디렉터리를 열 수 없음: {msg}',
        errorReadDir: '디렉터리 읽기 실패: {msg}',
        errorNoItem: '선택한 항목 없음',
        errorOpenFolderOnly: '폴더만 열 수 있습니다',
        errorOpenExplorer: '탐색기를 열 수 없음: {msg}',
        errorSearchFailed: '검색 실패: {msg}',
        settingsTitle: '외부 파일 검색 설정',
        settingsLanguage: '언어',
        settingsLanguageDesc: '플러그인 인터페이스 언어를 선택하거나 Obsidian을 자동으로 따릅니다',
        settingsLanguageAuto: '자동 (Obsidian 따르기)',
        settingsLanguageZh: '中文',
        settingsLanguageEn: 'English',
        settingsDefaultPath: '기본 경로',
        settingsDefaultPathDesc: '파일 브라우저 시작 시 기본 디렉터리 (비워두면 볼트 루트 사용)',
        settingsDefaultPathPlaceholder: '예: C:\\Users\\YourName\\Documents',
        columnName: '이름',
        columnModified: '수정일',
        columnType: '유형',
        columnSize: '크기',
        folder: '폴더',
        file: '파일',
        helpText: `
# 외부 파일 검색 플러그인 도움말

## 기능
이 플러그인을 사용하면 Obsidian 내에서 로컬 파일 시스템을 탐색하고 선택한 파일이나 폴더 경로를 Obsidian에서 빠르게 검색할 수 있습니다.

이 플러그인은 **읽기 전용**이며 볼트 내 파일을 절대 수정하지 않습니다. 모든 런타임 데이터는 임시적이며 노트에 영향을 미치지 않습니다.

## 사용 방법
1. **플러그인 열기**: 왼쪽 리본의 폴더 검색 아이콘을 클릭하거나 "외부 파일 브라우저 열기" 명령을 사용합니다.
2. **파일 탐색**: 상단 탐색 버튼(위로, 새로고침)과 경로 표시줄을 사용하여 디렉터리로 이동합니다.
3. **항목 선택**: 파일이나 폴더를 클릭하여 선택합니다. 선택 후 미리보기 버튼(눈 아이콘)을 눌러 미리보기 사이드바를 열고 이미지 미리보기와 정보를 확인할 수 있습니다.
4. **검색**:
   - 파일을 더블 클릭(또는 선택 후 "검색" 버튼 클릭)하면 Obsidian에서 해당 파일 이름을 검색합니다.
   - 폴더를 선택하고 "검색" 버튼을 클릭하면 해당 경로를 **정규식 형식**(예: \`/D:.*Folder1.*Folder2/\`)으로 검색합니다.
5. **자동 검색**: "자동 검색"을 체크하면 파일이나 폴더를 클릭할 때마다 자동으로 검색이 실행됩니다.
6. **정렬 및 보기**: 정렬 옵션과 보기 모드(목록/격자)를 전환할 수 있습니다.
7. **폴더 열기**: 폴더를 선택하고 "열기" 버튼을 클릭하면 해당 폴더로 들어갑니다.
8. **탐색기**: "탐색기에서 열기" 버튼을 클릭하면 현재 디렉터리를 시스템 파일 탐색기에서 엽니다. 파일이 선택된 경우 해당 파일이 강조 표시됩니다.

## 참고 사항
- 이 플러그인은 **읽기 전용**이며 볼트 데이터를 수정하지 않습니다.
- 설정의 "기본 경로"는 플러그인 시작 시 기본 디렉터리를 지정합니다(비워두면 볼트 루트 사용).
    `,
    },

    nl: {
        pluginName: 'Externe Bestanden Zoeken',
        up: 'Omhoog',
        refresh: 'Vernieuwen',
        go: 'Ga',
        openFolder: 'Map Openen',
        openExplorer: 'Open in Verkenner',
        help: 'Help',
        search: 'Zoeken',
        autoSearch: 'Automatisch Zoeken',
        preview: 'Voorbeeld',
        sortNameAsc: 'Naam (Oplopend)',
        sortNameDesc: 'Naam (Aflopend)',
        sortTypeAsc: 'Type (Oplopend)',
        sortTypeDesc: 'Type (Aflopend)',
        sortSizeAsc: 'Grootte (Oplopend)',
        sortSizeDesc: 'Grootte (Aflopend)',
        sortMtimeAsc: 'Gewijzigd (Oplopend)',
        sortMtimeDesc: 'Gewijzigd (Aflopend)',
        viewList: 'Lijst',
        viewGrid: 'Raster',
        previewTitle: 'Voorbeeld',
        previewNoSelection: 'Geen item geselecteerd',
        previewLoading: 'Laden...',
        previewNotImage: 'Kan geen voorbeeld van dit bestand tonen',
        previewImageInfo: 'Type: {type}<br>Grootte: {size}<br>Gewijzigd: {mtime}',
        errorNotDir: 'Geen map',
        errorPathNotExist: 'Pad bestaat niet',
        errorOpenDir: 'Kan map niet openen: {msg}',
        errorReadDir: 'Map lezen mislukt: {msg}',
        errorNoItem: 'Geen item geselecteerd',
        errorOpenFolderOnly: 'Alleen mappen kunnen worden geopend',
        errorOpenExplorer: 'Kan Verkenner niet openen: {msg}',
        errorSearchFailed: 'Zoeken mislukt: {msg}',
        settingsTitle: 'Instellingen Externe Bestanden Zoeken',
        settingsLanguage: 'Taal',
        settingsLanguageDesc: 'Kies de plugin-interface-taal of volg automatisch Obsidian',
        settingsLanguageAuto: 'Automatisch (Obsidian volgen)',
        settingsLanguageZh: '中文',
        settingsLanguageEn: 'English',
        settingsDefaultPath: 'Standaardpad',
        settingsDefaultPathDesc: 'Startermap voor de bestandsbrowser (leeg laten om de vault-hoofdmap te gebruiken)',
        settingsDefaultPathPlaceholder: 'bijv., C:\\Users\\YourName\\Documents',
        columnName: 'Naam',
        columnModified: 'Gewijzigd',
        columnType: 'Type',
        columnSize: 'Grootte',
        folder: 'Map',
        file: 'Bestand',
        helpText: `
# Help voor Externe Bestanden Zoeken Plugin

## Functionaliteiten
Met deze plugin kunt u het lokale bestandssysteem binnen Obsidian doorbladeren en snel zoeken naar paden van geselecteerde bestanden of mappen in Obsidian.

Deze plugin is **alleen-lezen** en zal nooit bestanden in uw vault wijzigen. Alle runtime-gegevens zijn tijdelijk en hebben geen invloed op uw notities.

## Gebruik
1. **Open de plugin**: Klik op het mappenzoekpictogram in de linker lintbalk of gebruik de opdracht "Open externe bestandsbrowser".
2. **Bestandsnavigatie**: Gebruik de navigatieknoppen (Omhoog, Vernieuwen) en de padbalk om naar mappen te springen.
3. **Selecteer items**: Klik op een bestand of map om het te selecteren. Na selectie kunt u het zijpaneel voorbeeld (klik op de knop "Voorbeeld") openen om een voorbeeld van de afbeelding en informatie te bekijken.
4. **Zoeken**:
   - Dubbelklik op een bestand (of selecteer het en klik op "Zoeken") om naar de bestandsnaam in Obsidian te zoeken.
   - Selecteer een map en klik op "Zoeken" om naar het pad te zoeken met behulp van **regex-formaat** (bijv., \`/D:.*Folder1.*Folder2/\`).
5. **Automatisch zoeken**: Vink "Automatisch Zoeken" aan om automatisch een zoekopdracht te starten telkens wanneer u op een bestand of map klikt.
6. **Sorteren en weergave**: Wissel van sorteeropties en weergavemodus (Lijst / Raster).
7. **Map openen**: Selecteer een map en klik op "Openen" om die map te betreden.
8. **Verkenner**: Klik op de knop "Open in Verkenner" om de huidige map in de systeemverkenner te openen; als een bestand is geselecteerd, wordt dit gemarkeerd.

## Opmerkingen
- De plugin is **alleen-lezen** en wijzigt nooit vault-gegevens.
- Het "Standaardpad" in de instellingen specificeert de startmap (leeg laten om de vault-hoofdmap te gebruiken).
    `,
    },

    no: {
        pluginName: 'Søk Eksterne Filer',
        up: 'Opp',
        refresh: 'Oppdater',
        go: 'Gå',
        openFolder: 'Åpne Mappe',
        openExplorer: 'Åpne i Utforsker',
        help: 'Hjelp',
        search: 'Søk',
        autoSearch: 'Automatisk Søk',
        preview: 'Forhåndsvisning',
        sortNameAsc: 'Navn (Stigende)',
        sortNameDesc: 'Navn (Synkende)',
        sortTypeAsc: 'Type (Stigende)',
        sortTypeDesc: 'Type (Synkende)',
        sortSizeAsc: 'Størrelse (Stigende)',
        sortSizeDesc: 'Størrelse (Synkende)',
        sortMtimeAsc: 'Endret (Stigende)',
        sortMtimeDesc: 'Endret (Synkende)',
        viewList: 'Liste',
        viewGrid: 'Rutenett',
        previewTitle: 'Forhåndsvisning',
        previewNoSelection: 'Ingen elementer valgt',
        previewLoading: 'Laster...',
        previewNotImage: 'Kan ikke forhåndsvise denne filen',
        previewImageInfo: 'Type: {type}<br>Størrelse: {size}<br>Endret: {mtime}',
        errorNotDir: 'Ikke en katalog',
        errorPathNotExist: 'Stien finnes ikke',
        errorOpenDir: 'Kan ikke åpne katalogen: {msg}',
        errorReadDir: 'Kunne ikke lese katalogen: {msg}',
        errorNoItem: 'Ingen elementer valgt',
        errorOpenFolderOnly: 'Kun mapper kan åpnes',
        errorOpenExplorer: 'Kan ikke åpne utforsker: {msg}',
        errorSearchFailed: 'Søket mislyktes: {msg}',
        settingsTitle: 'Innstillinger for Søk Eksterne Filer',
        settingsLanguage: 'Språk',
        settingsLanguageDesc: 'Velg plugin-grensesnittspråk, eller følg Obsidian automatisk',
        settingsLanguageAuto: 'Automatisk (Følg Obsidian)',
        settingsLanguageZh: '中文',
        settingsLanguageEn: 'English',
        settingsDefaultPath: 'Standardbane',
        settingsDefaultPathDesc: 'Startkatalog for filutforskeren (la stå tom for å bruke vault-roten)',
        settingsDefaultPathPlaceholder: 'f.eks., C:\\Users\\YourName\\Documents',
        columnName: 'Navn',
        columnModified: 'Endret',
        columnType: 'Type',
        columnSize: 'Størrelse',
        folder: 'Mappe',
        file: 'Fil',
        helpText: `
# Hjelp for Søk Eksterne Filer-plugin

## Funksjoner
Dette plugin lar deg bla gjennom det lokale filsystemet i Obsidian og raskt søke etter stier til valgte filer eller mapper i Obsidian.

Dette plugin er **skrivebeskyttet** og vil aldri endre noen filer i vaultet ditt. Alle kjøretidsdata er midlertidige og vil ikke påvirke notatene dine.

## Bruk
1. **Åpne plugin**: Klikk på mappesøk-ikonet i venstre bånd, eller bruk kommandoen "Åpne ekstern filutforsker".
2. **Filnavigering**: Bruk navigasjonsknappene (Opp, Oppdater) og banelinjen for å hoppe til kataloger.
3. **Velg elementer**: Klikk på en fil eller mappe for å velge den. Etter valg kan du åpne forhåndsvisningssidepanelet (ved å klikke på "Forhåndsvisning") for å se bildeforhåndsvisning og informasjon.
4. **Søk**:
   - Dobbeltklikk på en fil (eller velg den og klikk på "Søk") for å søke etter filnavnet i Obsidian.
   - Velg en mappe og klikk på "Søk" for å søke etter banen ved hjelp av **regex-format** (f.eks., \`/D:.*Folder1.*Folder2/\`).
5. **Automatisk søk**: Huk av "Automatisk Søk" for automatisk å utløse et søk hver gang du klikker på en fil eller mappe.
6. **Sortering og visning**: Bytt sorteringsalternativer og visningsmodus (Liste / Rutenett).
7. **Åpne mappe**: Velg en mappe og klikk på "Åpne" for å gå inn i den.
8. **Utforsker**: Klikk på "Åpne i Utforsker" for å åpne gjeldende katalog i systemets utforsker; hvis en fil er valgt, vil den bli uthevet.

## Merknader
- Plugin er **skrivebeskyttet** og endrer aldri vault-data.
- "Standardbane" i innstillingene spesifiserer startkatalogen (la stå tom for å bruke vault-roten).
    `,
    },

    pl: {
        pluginName: 'Wyszukaj Pliki Zewnętrzne',
        up: 'W górę',
        refresh: 'Odśwież',
        go: 'Idź',
        openFolder: 'Otwórz Folder',
        openExplorer: 'Otwórz w Eksploratorze',
        help: 'Pomoc',
        search: 'Szukaj',
        autoSearch: 'Automatyczne Wyszukiwanie',
        preview: 'Podgląd',
        sortNameAsc: 'Nazwa (Rosnąco)',
        sortNameDesc: 'Nazwa (Malejąco)',
        sortTypeAsc: 'Typ (Rosnąco)',
        sortTypeDesc: 'Typ (Malejąco)',
        sortSizeAsc: 'Rozmiar (Rosnąco)',
        sortSizeDesc: 'Rozmiar (Malejąco)',
        sortMtimeAsc: 'Zmodyfikowano (Rosnąco)',
        sortMtimeDesc: 'Zmodyfikowano (Malejąco)',
        viewList: 'Lista',
        viewGrid: 'Siatka',
        previewTitle: 'Podgląd',
        previewNoSelection: 'Nie wybrano żadnego elementu',
        previewLoading: 'Ładowanie...',
        previewNotImage: 'Nie można wyświetlić podglądu tego pliku',
        previewImageInfo: 'Typ: {type}<br>Rozmiar: {size}<br>Zmodyfikowano: {mtime}',
        errorNotDir: 'To nie jest katalog',
        errorPathNotExist: 'Ścieżka nie istnieje',
        errorOpenDir: 'Nie można otworzyć katalogu: {msg}',
        errorReadDir: 'Nie udało się odczytać katalogu: {msg}',
        errorNoItem: 'Nie wybrano żadnego elementu',
        errorOpenFolderOnly: 'Można otwierać tylko foldery',
        errorOpenExplorer: 'Nie można otworzyć Eksploratora: {msg}',
        errorSearchFailed: 'Wyszukiwanie nie powiodło się: {msg}',
        settingsTitle: 'Ustawienia Wyszukaj Pliki Zewnętrzne',
        settingsLanguage: 'Język',
        settingsLanguageDesc: 'Wybierz język interfejsu wtyczki lub automatycznie dostosuj do Obsidian',
        settingsLanguageAuto: 'Automatyczny (Obserwuj Obsidian)',
        settingsLanguageZh: '中文',
        settingsLanguageEn: 'English',
        settingsDefaultPath: 'Domyślna Ścieżka',
        settingsDefaultPathDesc: 'Początkowy katalog dla przeglądarki plików (pozostaw puste, aby użyć katalogu głównego vault)',
        settingsDefaultPathPlaceholder: 'np., C:\\Users\\YourName\\Documents',
        columnName: 'Nazwa',
        columnModified: 'Zmodyfikowano',
        columnType: 'Typ',
        columnSize: 'Rozmiar',
        folder: 'Folder',
        file: 'Plik',
        helpText: `
# Pomoc dla wtyczki Wyszukaj Pliki Zewnętrzne

## Funkcje
Ta wtyczka pozwala przeglądać lokalny system plików wewnątrz Obsidian i szybko wyszukiwać ścieżki wybranych plików lub folderów w Obsidian.

Wtyczka jest **tylko do odczytu** i nigdy nie zmodyfikuje żadnych plików w twoim vault. Wszystkie dane uruchomieniowe są tymczasowe i nie wpłyną na twoje notatki.

## Użycie
1. **Otwórz wtyczkę**: Kliknij ikonę wyszukiwania folderu na lewym pasku lub użyj polecenia "Otwórz przeglądarkę plików zewnętrznych".
2. **Nawigacja**: Użyj przycisków nawigacji (W górę, Odśwież) i paska ścieżki, aby przechodzić między katalogami.
3. **Wybierz elementy**: Kliknij plik lub folder, aby go zaznaczyć. Po zaznaczeniu możesz otworzyć panel boczny podglądu (klikając przycisk "Podgląd"), aby zobaczyć podgląd obrazu i informacje.
4. **Wyszukiwanie**:
   - Kliknij dwukrotnie plik (lub zaznacz go i kliknij przycisk "Szukaj"), aby wyszukać jego nazwę w Obsidian.
   - Zaznacz folder i kliknij przycisk "Szukaj", aby wyszukać jego ścieżkę przy użyciu **formatu regex** (np., \`/D:.*Folder1.*Folder2/\`).
5. **Automatyczne wyszukiwanie**: Zaznacz "Automatyczne Wyszukiwanie", aby automatycznie uruchamiać wyszukiwanie za każdym razem, gdy klikniesz plik lub folder.
6. **Sortowanie i widok**: Zmień opcje sortowania i tryb widoku (Lista / Siatka).
7. **Otwórz folder**: Zaznacz folder i kliknij przycisk "Otwórz", aby wejść do niego.
8. **Eksplorator**: Kliknij przycisk "Otwórz w Eksploratorze", aby otworzyć bieżący katalog w eksploratorze systemowym; jeśli plik jest zaznaczony, zostanie podświetlony.

## Uwagi
- Wtyczka jest **tylko do odczytu** i nigdy nie modyfikuje danych vault.
- "Domyślna Ścieżka" w ustawieniach określa początkowy katalog (pozostaw puste, aby użyć katalogu głównego vault).
    `,
    },

    pt: {
        pluginName: 'Pesquisar Ficheiros Externos',
        up: 'Subir',
        refresh: 'Atualizar',
        go: 'Ir',
        openFolder: 'Abrir Pasta',
        openExplorer: 'Abrir no Explorador',
        help: 'Ajuda',
        search: 'Pesquisar',
        autoSearch: 'Pesquisa Automática',
        preview: 'Pré-visualizar',
        sortNameAsc: 'Nome (Crescente)',
        sortNameDesc: 'Nome (Decrescente)',
        sortTypeAsc: 'Tipo (Crescente)',
        sortTypeDesc: 'Tipo (Decrescente)',
        sortSizeAsc: 'Tamanho (Crescente)',
        sortSizeDesc: 'Tamanho (Decrescente)',
        sortMtimeAsc: 'Modificado (Crescente)',
        sortMtimeDesc: 'Modificado (Decrescente)',
        viewList: 'Lista',
        viewGrid: 'Grelha',
        previewTitle: 'Pré-visualização',
        previewNoSelection: 'Nenhum item selecionado',
        previewLoading: 'A carregar...',
        previewNotImage: 'Não é possível pré-visualizar este ficheiro',
        previewImageInfo: 'Tipo: {type}<br>Tamanho: {size}<br>Modificado: {mtime}',
        errorNotDir: 'Não é um diretório',
        errorPathNotExist: 'O caminho não existe',
        errorOpenDir: 'Não é possível abrir o diretório: {msg}',
        errorReadDir: 'Falha ao ler o diretório: {msg}',
        errorNoItem: 'Nenhum item selecionado',
        errorOpenFolderOnly: 'Apenas pastas podem ser abertas',
        errorOpenExplorer: 'Não é possível abrir o explorador: {msg}',
        errorSearchFailed: 'A pesquisa falhou: {msg}',
        settingsTitle: 'Configurações do Pesquisar Ficheiros Externos',
        settingsLanguage: 'Idioma',
        settingsLanguageDesc: 'Escolha o idioma da interface do plugin ou siga automaticamente o Obsidian',
        settingsLanguageAuto: 'Automático (Seguir Obsidian)',
        settingsLanguageZh: '中文',
        settingsLanguageEn: 'English',
        settingsDefaultPath: 'Caminho Predefinido',
        settingsDefaultPathDesc: 'Diretório inicial para o navegador de ficheiros (deixe vazio para usar a raiz do cofre)',
        settingsDefaultPathPlaceholder: 'ex., C:\\Users\\YourName\\Documents',
        columnName: 'Nome',
        columnModified: 'Modificado',
        columnType: 'Tipo',
        columnSize: 'Tamanho',
        folder: 'Pasta',
        file: 'Ficheiro',
        helpText: `
# Ajuda do Plugin Pesquisar Ficheiros Externos

## Funcionalidades
Este plugin permite-lhe navegar pelo sistema de ficheiros local dentro do Obsidian e pesquisar rapidamente os caminhos dos ficheiros ou pastas selecionados no Obsidian.

Este plugin é **apenas de leitura** e nunca modificará quaisquer ficheiros no seu cofre. Todos os dados em execução são temporários e não afetarão as suas notas.

## Utilização
1. **Abrir o plugin**: Clique no ícone de pesquisa de pastas na faixa lateral esquerda ou utilize o comando "Abrir Navegador de Ficheiros Externos".
2. **Navegação**: Utilize os botões de navegação (Subir, Atualizar) e a barra de caminho para saltar para diretórios.
3. **Selecionar itens**: Clique num ficheiro ou pasta para o selecionar. Após a seleção, pode abrir a barra lateral de pré-visualização (clicando no botão "Pré-visualizar") para ver a pré-visualização da imagem e informações.
4. **Pesquisar**:
   - Faça duplo clique num ficheiro (ou selecione-o e clique no botão "Pesquisar") para pesquisar o seu nome no Obsidian.
   - Selecione uma pasta e clique no botão "Pesquisar" para pesquisar o seu caminho utilizando **formato regex** (ex., \`/D:.*Folder1.*Folder2/\`).
5. **Pesquisa automática**: Marque "Pesquisa Automática" para acionar automaticamente uma pesquisa sempre que clicar num ficheiro ou pasta.
6. **Ordenação e visualização**: Altere as opções de ordenação e o modo de visualização (Lista / Grelha).
7. **Abrir pasta**: Selecione uma pasta e clique no botão "Abrir" para entrar nela.
8. **Explorador**: Clique no botão "Abrir no Explorador" para abrir o diretório atual no explorador de ficheiros do sistema; se um ficheiro estiver selecionado, será destacado.

## Notas
- O plugin é **apenas de leitura** e nunca modifica dados do cofre.
- O "Caminho Predefinido" nas definições especifica o diretório inicial (deixe vazio para usar a raiz do cofre).
    `,
    },

    'pt-BR': {
        pluginName: 'Pesquisar Arquivos Externos',
        up: 'Subir',
        refresh: 'Atualizar',
        go: 'Ir',
        openFolder: 'Abrir Pasta',
        openExplorer: 'Abrir no Explorador',
        help: 'Ajuda',
        search: 'Pesquisar',
        autoSearch: 'Pesquisa Automática',
        preview: 'Visualizar',
        sortNameAsc: 'Nome (Crescente)',
        sortNameDesc: 'Nome (Decrescente)',
        sortTypeAsc: 'Tipo (Crescente)',
        sortTypeDesc: 'Tipo (Decrescente)',
        sortSizeAsc: 'Tamanho (Crescente)',
        sortSizeDesc: 'Tamanho (Decrescente)',
        sortMtimeAsc: 'Modificado (Crescente)',
        sortMtimeDesc: 'Modificado (Decrescente)',
        viewList: 'Lista',
        viewGrid: 'Grade',
        previewTitle: 'Visualização',
        previewNoSelection: 'Nenhum item selecionado',
        previewLoading: 'Carregando...',
        previewNotImage: 'Não é possível visualizar este arquivo',
        previewImageInfo: 'Tipo: {type}<br>Tamanho: {size}<br>Modificado: {mtime}',
        errorNotDir: 'Não é um diretório',
        errorPathNotExist: 'O caminho não existe',
        errorOpenDir: 'Não é possível abrir o diretório: {msg}',
        errorReadDir: 'Falha ao ler o diretório: {msg}',
        errorNoItem: 'Nenhum item selecionado',
        errorOpenFolderOnly: 'Apenas pastas podem ser abertas',
        errorOpenExplorer: 'Não é possível abrir o explorador: {msg}',
        errorSearchFailed: 'A pesquisa falhou: {msg}',
        settingsTitle: 'Configurações do Pesquisar Arquivos Externos',
        settingsLanguage: 'Idioma',
        settingsLanguageDesc: 'Escolha o idioma da interface do plugin ou siga automaticamente o Obsidian',
        settingsLanguageAuto: 'Automático (Seguir Obsidian)',
        settingsLanguageZh: '中文',
        settingsLanguageEn: 'English',
        settingsDefaultPath: 'Caminho Padrão',
        settingsDefaultPathDesc: 'Diretório inicial para o navegador de arquivos (deixe vazio para usar a raiz do cofre)',
        settingsDefaultPathPlaceholder: 'ex., C:\\Users\\YourName\\Documents',
        columnName: 'Nome',
        columnModified: 'Modificado',
        columnType: 'Tipo',
        columnSize: 'Tamanho',
        folder: 'Pasta',
        file: 'Arquivo',
        helpText: `
# Ajuda do Plugin Pesquisar Arquivos Externos

## Funcionalidades
Este plugin permite que você navegue pelo sistema de arquivos local dentro do Obsidian e pesquise rapidamente os caminhos dos arquivos ou pastas selecionados no Obsidian.

Este plugin é **somente leitura** e nunca modificará nenhum arquivo no seu cofre. Todos os dados em execução são temporários e não afetarão suas notas.

## Uso
1. **Abrir o plugin**: Clique no ícone de pesquisa de pastas na faixa lateral esquerda ou use o comando "Abrir Navegador de Arquivos Externos".
2. **Navegação**: Use os botões de navegação (Subir, Atualizar) e a barra de caminho para saltar para diretórios.
3. **Selecionar itens**: Clique em um arquivo ou pasta para selecioná-lo. Após a seleção, você pode abrir a barra lateral de visualização (clicando no botão "Visualizar") para ver a visualização da imagem e informações.
4. **Pesquisar**:
   - Dê um duplo clique em um arquivo (ou selecione-o e clique no botão "Pesquisar") para pesquisar seu nome no Obsidian.
   - Selecione uma pasta e clique no botão "Pesquisar" para pesquisar seu caminho usando **formato regex** (ex., \`/D:.*Folder1.*Folder2/\`).
5. **Pesquisa automática**: Marque "Pesquisa Automática" para acionar automaticamente uma pesquisa sempre que você clicar em um arquivo ou pasta.
6. **Ordenação e visualização**: Altere as opções de ordenação e o modo de visualização (Lista / Grade).
7. **Abrir pasta**: Selecione uma pasta e clique no botão "Abrir" para entrar nela.
8. **Explorador**: Clique no botão "Abrir no Explorador" para abrir o diretório atual no explorador de arquivos do sistema; se um arquivo estiver selecionado, ele será destacado.

## Notas
- O plugin é **somente leitura** e nunca modifica dados do cofre.
- O "Caminho Padrão" nas configurações especifica o diretório inicial (deixe vazio para usar a raiz do cofre).
    `,
    },

    ro: {
        pluginName: 'Caută Fișiere Externe',
        up: 'Sus',
        refresh: 'Reîmprospătează',
        go: 'Mergi',
        openFolder: 'Deschide Dosar',
        openExplorer: 'Deschide în Explorer',
        help: 'Ajutor',
        search: 'Caută',
        autoSearch: 'Căutare Automată',
        preview: 'Previzualizare',
        sortNameAsc: 'Nume (Crescător)',
        sortNameDesc: 'Nume (Descrescător)',
        sortTypeAsc: 'Tip (Crescător)',
        sortTypeDesc: 'Tip (Descrescător)',
        sortSizeAsc: 'Dimensiune (Crescător)',
        sortSizeDesc: 'Dimensiune (Descrescător)',
        sortMtimeAsc: 'Modificat (Crescător)',
        sortMtimeDesc: 'Modificat (Descrescător)',
        viewList: 'Listă',
        viewGrid: 'Grilă',
        previewTitle: 'Previzualizare',
        previewNoSelection: 'Niciun element selectat',
        previewLoading: 'Se încarcă...',
        previewNotImage: 'Nu se poate previzualiza acest fișier',
        previewImageInfo: 'Tip: {type}<br>Dimensiune: {size}<br>Modificat: {mtime}',
        errorNotDir: 'Nu este un director',
        errorPathNotExist: 'Calea nu există',
        errorOpenDir: 'Nu se poate deschide directorul: {msg}',
        errorReadDir: 'Citirea directorului a eșuat: {msg}',
        errorNoItem: 'Niciun element selectat',
        errorOpenFolderOnly: 'Doar dosarele pot fi deschise',
        errorOpenExplorer: 'Nu se poate deschide Explorer: {msg}',
        errorSearchFailed: 'Căutarea a eșuat: {msg}',
        settingsTitle: 'Setări pentru Caută Fișiere Externe',
        settingsLanguage: 'Limbă',
        settingsLanguageDesc: 'Alegeți limba interfeței pluginului sau urmăriți automat Obsidian',
        settingsLanguageAuto: 'Automat (Urmărește Obsidian)',
        settingsLanguageZh: '中文',
        settingsLanguageEn: 'English',
        settingsDefaultPath: 'Cale Implicită',
        settingsDefaultPathDesc: 'Directorul inițial pentru navigatorul de fișiere (lăsați gol pentru a folosi rădăcina seifului)',
        settingsDefaultPathPlaceholder: 'ex., C:\\Users\\YourName\\Documents',
        columnName: 'Nume',
        columnModified: 'Modificat',
        columnType: 'Tip',
        columnSize: 'Dimensiune',
        folder: 'Dosar',
        file: 'Fișier',
        helpText: `
# Ajutor pentru pluginul Caută Fișiere Externe

## Funcționalități
Acest plugin vă permite să navigați în sistemul local de fișiere în interiorul Obsidian și să căutați rapid căile fișierelor sau dosarelor selectate în Obsidian.

Acest plugin este **doar pentru citire** și nu va modifica niciodată niciun fișier din seiful dvs. Toate datele de rulare sunt temporare și nu vă vor afecta notițele.

## Utilizare
1. **Deschideți pluginul**: Faceți clic pe pictograma de căutare a dosarelor din panglica din stânga sau folosiți comanda "Deschide navigatorul de fișiere externe".
2. **Navigare**: Folosiți butoanele de navigare (Sus, Reîmprospătează) și bara de cale pentru a sări la directoare.
3. **Selectați elemente**: Faceți clic pe un fișier sau dosar pentru a-l selecta. După selectare, puteți deschide bara laterală de previzualizare (făcând clic pe butonul "Previzualizare") pentru a vedea previzualizarea imaginii și informațiile.
4. **Căutare**:
   - Faceți dublu clic pe un fișier (sau selectați-l și faceți clic pe butonul "Caută") pentru a căuta numele acestuia în Obsidian.
   - Selectați un dosar și faceți clic pe butonul "Caută" pentru a căuta calea acestuia folosind **formatul regex** (de ex., \`/D:.*Folder1.*Folder2/\`).
5. **Căutare automată**: Bifați "Căutare Automată" pentru a declanșa automat o căutare de fiecare dată când faceți clic pe un fișier sau dosar.
6. **Sortare și vizualizare**: Schimbați opțiunile de sortare și modul de vizualizare (Listă / Grilă).
7. **Deschide dosar**: Selectați un dosar și faceți clic pe butonul "Deschide" pentru a intra în el.
8. **Explorer**: Faceți clic pe butonul "Deschide în Explorer" pentru a deschide directorul curent în explorerul sistemului; dacă un fișier este selectat, acesta va fi evidențiat.

## Note
- Pluginul este **doar pentru citire** și nu modifică niciodată datele seifului.
- "Calea Implicită" în setări specifică directorul inițial (lăsați gol pentru a folosi rădăcina seifului).
    `,
    },

    ru: {
        pluginName: 'Поиск внешних файлов',
        up: 'Вверх',
        refresh: 'Обновить',
        go: 'Перейти',
        openFolder: 'Открыть папку',
        openExplorer: 'Открыть в Проводнике',
        help: 'Справка',
        search: 'Найти',
        autoSearch: 'Автопоиск',
        preview: 'Предпросмотр',
        sortNameAsc: 'Имя (возр.)',
        sortNameDesc: 'Имя (убыв.)',
        sortTypeAsc: 'Тип (возр.)',
        sortTypeDesc: 'Тип (убыв.)',
        sortSizeAsc: 'Размер (возр.)',
        sortSizeDesc: 'Размер (убыв.)',
        sortMtimeAsc: 'Изменён (возр.)',
        sortMtimeDesc: 'Изменён (убыв.)',
        viewList: 'Список',
        viewGrid: 'Сетка',
        previewTitle: 'Предпросмотр',
        previewNoSelection: 'Ничего не выбрано',
        previewLoading: 'Загрузка...',
        previewNotImage: 'Невозможно предварительно просмотреть этот файл',
        previewImageInfo: 'Тип: {type}<br>Размер: {size}<br>Изменён: {mtime}',
        errorNotDir: 'Не является каталогом',
        errorPathNotExist: 'Путь не существует',
        errorOpenDir: 'Не удалось открыть каталог: {msg}',
        errorReadDir: 'Не удалось прочитать каталог: {msg}',
        errorNoItem: 'Ничего не выбрано',
        errorOpenFolderOnly: 'Можно открывать только папки',
        errorOpenExplorer: 'Не удалось открыть Проводник: {msg}',
        errorSearchFailed: 'Поиск не удался: {msg}',
        settingsTitle: 'Настройки Поиск внешних файлов',
        settingsLanguage: 'Язык',
        settingsLanguageDesc: 'Выберите язык интерфейса плагина или автоматически следуйте за Obsidian',
        settingsLanguageAuto: 'Автоматически (следовать Obsidian)',
        settingsLanguageZh: '中文',
        settingsLanguageEn: 'English',
        settingsDefaultPath: 'Путь по умолчанию',
        settingsDefaultPathDesc: 'Начальный каталог для файлового браузера (оставьте пустым, чтобы использовать корень хранилища)',
        settingsDefaultPathPlaceholder: 'напр., C:\\Users\\YourName\\Documents',
        columnName: 'Имя',
        columnModified: 'Изменён',
        columnType: 'Тип',
        columnSize: 'Размер',
        folder: 'Папка',
        file: 'Файл',
        helpText: `
# Справка по плагину "Поиск внешних файлов"

## Возможности
Этот плагин позволяет просматривать локальную файловую систему внутри Obsidian и быстро искать пути к выбранным файлам или папкам в Obsidian.

Плагин **только для чтения** и никогда не изменяет файлы в вашем хранилище. Все данные во время работы являются временными и не влияют на ваши заметки.

## Использование
1. **Откройте плагин**: Нажмите на значок поиска папки на левой ленте или используйте команду "Открыть браузер внешних файлов".
2. **Навигация**: Используйте кнопки навигации (Вверх, Обновить) и строку пути для перехода между каталогами.
3. **Выбор элементов**: Нажмите на файл или папку, чтобы выбрать его. После выбора можно открыть боковую панель предпросмотра (нажав кнопку "Предпросмотр") для просмотра изображения и информации.
4. **Поиск**:
   - Дважды щёлкните файл (или выберите его и нажмите кнопку "Найти"), чтобы найти его имя в Obsidian.
   - Выберите папку и нажмите кнопку "Найти", чтобы найти её путь, используя **формат регулярного выражения** (например, \`/D:.*Folder1.*Folder2/\`).
5. **Автопоиск**: Установите флажок "Автопоиск", чтобы автоматически запускать поиск каждый раз, когда вы щёлкаете по файлу или папке.
6. **Сортировка и вид**: Измените параметры сортировки и режим просмотра (Список / Сетка).
7. **Открыть папку**: Выберите папку и нажмите кнопку "Открыть", чтобы войти в неё.
8. **Проводник**: Нажмите кнопку "Открыть в Проводнике", чтобы открыть текущий каталог в системном Проводнике; если выбран файл, он будет выделен.

## Примечания
- Плагин **только для чтения** и никогда не изменяет данные хранилища.
- "Путь по умолчанию" в настройках задаёт начальный каталог (оставьте пустым, чтобы использовать корень хранилища).
    `,
    },

    th: {
        pluginName: 'ค้นหาไฟล์ภายนอก',
        up: 'ขึ้น',
        refresh: 'รีเฟรช',
        go: 'ไป',
        openFolder: 'เปิดโฟลเดอร์',
        openExplorer: 'เปิดใน Explorer',
        help: 'ช่วยเหลือ',
        search: 'ค้นหา',
        autoSearch: 'ค้นหาอัตโนมัติ',
        preview: 'แสดงตัวอย่าง',
        sortNameAsc: 'ชื่อ (น้อยไปมาก)',
        sortNameDesc: 'ชื่อ (มากไปน้อย)',
        sortTypeAsc: 'ประเภท (น้อยไปมาก)',
        sortTypeDesc: 'ประเภท (มากไปน้อย)',
        sortSizeAsc: 'ขนาด (น้อยไปมาก)',
        sortSizeDesc: 'ขนาด (มากไปน้อย)',
        sortMtimeAsc: 'แก้ไขล่าสุด (น้อยไปมาก)',
        sortMtimeDesc: 'แก้ไขล่าสุด (มากไปน้อย)',
        viewList: 'รายการ',
        viewGrid: 'ตาราง',
        previewTitle: 'แสดงตัวอย่าง',
        previewNoSelection: 'ไม่ได้เลือกรายการ',
        previewLoading: 'กำลังโหลด...',
        previewNotImage: 'ไม่สามารถแสดงตัวอย่างไฟล์นี้',
        previewImageInfo: 'ประเภท: {type}<br>ขนาด: {size}<br>แก้ไขล่าสุด: {mtime}',
        errorNotDir: 'ไม่ใช่ไดเรกทอรี',
        errorPathNotExist: 'พาธไม่มีอยู่',
        errorOpenDir: 'ไม่สามารถเปิดไดเรกทอรี: {msg}',
        errorReadDir: 'อ่านไดเรกทอรีล้มเหลว: {msg}',
        errorNoItem: 'ไม่ได้เลือกรายการ',
        errorOpenFolderOnly: 'สามารถเปิดได้เฉพาะโฟลเดอร์',
        errorOpenExplorer: 'ไม่สามารถเปิด Explorer: {msg}',
        errorSearchFailed: 'ค้นหาล้มเหลว: {msg}',
        settingsTitle: 'การตั้งค่าค้นหาไฟล์ภายนอก',
        settingsLanguage: 'ภาษา',
        settingsLanguageDesc: 'เลือกภาษาส่วนต่อประสานของปลั๊กอิน หรือให้ตาม Obsidian อัตโนมัติ',
        settingsLanguageAuto: 'อัตโนมัติ (ตาม Obsidian)',
        settingsLanguageZh: '中文',
        settingsLanguageEn: 'English',
        settingsDefaultPath: 'พาธเริ่มต้น',
        settingsDefaultPathDesc: 'ไดเรกทอรีเริ่มต้นสำหรับตัวเรียกดูไฟล์ (เว้นว่างเพื่อใช้รูทของคลัง)',
        settingsDefaultPathPlaceholder: 'เช่น C:\\Users\\YourName\\Documents',
        columnName: 'ชื่อ',
        columnModified: 'แก้ไขล่าสุด',
        columnType: 'ประเภท',
        columnSize: 'ขนาด',
        folder: 'โฟลเดอร์',
        file: 'ไฟล์',
        helpText: `
# ความช่วยเหลือสำหรับปลั๊กอินค้นหาไฟล์ภายนอก

## คุณสมบัติ
ปลั๊กอินนี้ช่วยให้คุณเรียกดูระบบไฟล์ภายในเครื่องภายใน Obsidian และค้นหาพาธของไฟล์หรือโฟลเดอร์ที่เลือกใน Obsidian ได้อย่างรวดเร็ว

ปลั๊กอินนี้ **อ่านอย่างเดียว** และจะไม่แก้ไขไฟล์ใดๆ ในคลังของคุณ ข้อมูลรันไทม์ทั้งหมดเป็นข้อมูลชั่วคราวและจะไม่มีผลต่อโน้ตของคุณ

## การใช้งาน
1. **เปิดปลั๊กอิน**: คลิกไอคอนค้นหาโฟลเดอร์ในริบบอนด้านซ้าย หรือใช้คำสั่ง "เปิดตัวเรียกดูไฟล์ภายนอก"
2. **การเรียกดูไฟล์**: ใช้ปุ่มนำทาง (ขึ้น, รีเฟรช) และแถบพาธเพื่อกระโดดไปยังไดเรกทอรี
3. **เลือกรายการ**: คลิกไฟล์หรือโฟลเดอร์เพื่อเลือก หลังจากเลือกแล้ว คุณสามารถเปิดแถบด้านข้างแสดงตัวอย่าง (คลิกปุ่ม "แสดงตัวอย่าง") เพื่อดูตัวอย่างรูปภาพและข้อมูล
4. **ค้นหา**:
   - ดับเบิลคลิกไฟล์ (หรือเลือกแล้วคลิกปุ่ม "ค้นหา") เพื่อค้นหาชื่อไฟล์ใน Obsidian
   - เลือกโฟลเดอร์และคลิกปุ่ม "ค้นหา" เพื่อค้นหาพาธโดยใช้ **รูปแบบ regex** (เช่น \`/D:.*Folder1.*Folder2/\`)
5. **ค้นหาอัตโนมัติ**: ทำเครื่องหมาย "ค้นหาอัตโนมัติ" เพื่อให้ค้นหาโดยอัตโนมัติทุกครั้งที่คลิกไฟล์หรือโฟลเดอร์
6. **การจัดเรียงและมุมมอง**: เปลี่ยนตัวเลือกการจัดเรียงและโหมดมุมมอง (รายการ / ตาราง)
7. **เปิดโฟลเดอร์**: เลือกโฟลเดอร์และคลิกปุ่ม "เปิด" เพื่อเข้าไปในโฟลเดอร์นั้น
8. **Explorer**: คลิกปุ่ม "เปิดใน Explorer" เพื่อเปิดไดเรกทอรีปัจจุบันในตัวจัดการไฟล์ของระบบ หากเลือกไฟล์ไว้ ไฟล์นั้นจะถูกไฮไลต์

## หมายเหตุ
- ปลั๊กอิน **อ่านอย่างเดียว** และไม่เคยแก้ไขข้อมูลคลัง
- "พาธเริ่มต้น" ในการตั้งค่าจะกำหนดไดเรกทอรีเริ่มต้น (เว้นว่างเพื่อใช้รูทของคลัง)
    `,
    },

    tr: {
        pluginName: 'Harici Dosyaları Ara',
        up: 'Yukarı',
        refresh: 'Yenile',
        go: 'Git',
        openFolder: 'Klasörü Aç',
        openExplorer: 'Gezgin\'de Aç',
        help: 'Yardım',
        search: 'Ara',
        autoSearch: 'Otomatik Ara',
        preview: 'Önizleme',
        sortNameAsc: 'Ad (Artan)',
        sortNameDesc: 'Ad (Azalan)',
        sortTypeAsc: 'Tür (Artan)',
        sortTypeDesc: 'Tür (Azalan)',
        sortSizeAsc: 'Boyut (Artan)',
        sortSizeDesc: 'Boyut (Azalan)',
        sortMtimeAsc: 'Değiştirilme (Artan)',
        sortMtimeDesc: 'Değiştirilme (Azalan)',
        viewList: 'Liste',
        viewGrid: 'Izgara',
        previewTitle: 'Önizleme',
        previewNoSelection: 'Hiçbir öğe seçilmedi',
        previewLoading: 'Yükleniyor...',
        previewNotImage: 'Bu dosya önizlenemiyor',
        previewImageInfo: 'Tür: {type}<br>Boyut: {size}<br>Değiştirilme: {mtime}',
        errorNotDir: 'Bir dizin değil',
        errorPathNotExist: 'Yol mevcut değil',
        errorOpenDir: 'Dizin açılamıyor: {msg}',
        errorReadDir: 'Dizin okunamadı: {msg}',
        errorNoItem: 'Hiçbir öğe seçilmedi',
        errorOpenFolderOnly: 'Yalnızca klasörler açılabilir',
        errorOpenExplorer: 'Gezgin açılamıyor: {msg}',
        errorSearchFailed: 'Arama başarısız oldu: {msg}',
        settingsTitle: 'Harici Dosyaları Ara Ayarları',
        settingsLanguage: 'Dil',
        settingsLanguageDesc: 'Eklenti arayüz dilini seçin veya Obsidian\'ı otomatik takip edin',
        settingsLanguageAuto: 'Otomatik (Obsidian\'ı Takip Et)',
        settingsLanguageZh: '中文',
        settingsLanguageEn: 'English',
        settingsDefaultPath: 'Varsayılan Yol',
        settingsDefaultPathDesc: 'Dosya tarayıcı için başlangıç dizini (boş bırakılırsa kasnak kökü kullanılır)',
        settingsDefaultPathPlaceholder: 'örn., C:\\Users\\YourName\\Documents',
        columnName: 'Ad',
        columnModified: 'Değiştirilme',
        columnType: 'Tür',
        columnSize: 'Boyut',
        folder: 'Klasör',
        file: 'Dosya',
        helpText: `
# Harici Dosyaları Ara Eklentisi Yardım

## Özellikler
Bu eklenti, Obsidian içinde yerel dosya sistemine göz atmanıza ve seçilen dosya veya klasör yollarını Obsidian'da hızlıca aramanıza olanak tanır.

Bu eklenti **salt okunurdur** ve kasnağınızdaki hiçbir dosyayı asla değiştirmez. Tüm çalışma zamanı verileri geçicidir ve notlarınızı etkilemez.

## Kullanım
1. **Eklentiyi açın**: Sol şeritteki klasör arama simgesine tıklayın veya "Harici Dosya Tarayıcısını Aç" komutunu kullanın.
2. **Dosya gezintisi**: Üstteki gezinme düğmelerini (Yukarı, Yenile) ve yol çubuğunu kullanarak dizinler arasında geçiş yapın.
3. **Öğe seçin**: Bir dosya veya klasöre tıklayarak seçin. Seçimden sonra, önizleme yan çubuğunu ("Önizleme" düğmesine tıklayarak) açarak resim önizlemesini ve bilgileri görebilirsiniz.
4. **Arama**:
   - Bir dosyaya çift tıklayın (veya seçip "Ara" düğmesine tıklayın) ve Obsidian'da bu dosya adını arayın.
   - Bir klasör seçip "Ara" düğmesine tıklayın ve yolunu **regex formatında** arayın (ör., \`/D:.*Folder1.*Folder2/\`).
5. **Otomatik arama**: "Otomatik Ara" seçeneğini işaretleyerek her dosya veya klasöre tıkladığınızda otomatik olarak arama yapılmasını sağlayın.
6. **Sıralama ve görünüm**: Sıralama seçeneklerini ve görünüm modunu (Liste / Izgara) değiştirin.
7. **Klasör açma**: Bir klasör seçip "Aç" düğmesine tıklayarak o klasöre girin.
8. **Gezgin**: "Gezgin'de Aç" düğmesine tıklayarak geçerli dizini sistem dosya gezgininde açın; bir dosya seçiliyse vurgulanır.

## Notlar
- Eklenti **salt okunurdur** ve asla kasnak verilerini değiştirmez.
- Ayarlardaki "Varsayılan Yol", başlangıç dizinini belirtir (boş bırakılırsa kasnak kökü kullanılır).
    `,
    }
};

const SORT_FIELDS = [
    { field: 'name', order: 'asc' },
    { field: 'name', order: 'desc' },
    { field: 'type', order: 'asc' },
    { field: 'type', order: 'desc' },
    { field: 'size', order: 'asc' },
    { field: 'size', order: 'desc' },
    { field: 'mtime', order: 'asc' },
    { field: 'mtime', order: 'desc' }
];

const VIEW_MODES = { LIST: 'list', GRID: 'grid' };

class SearchExternalFilesPlugin extends Plugin {
    async onload() {
        await this.loadSettings();
        this.registerView(VIEW_TYPE_EXTERNAL_BROWSER, (leaf) => new ExternalFileBrowserView(leaf, this));
        this.registerView(VIEW_TYPE_HELP, (leaf) => new HelpView(leaf, this));
        this.addRibbonIcon('folder-search', this.t('pluginName'), () => this.activateMainView());
        this.addCommand({ id: 'open-external-file-browser', name: this.t('pluginName'), callback: () => this.activateMainView() });
        this.addSettingTab(new SearchExternalFilesSettingTab(this.app, this));
    }

    async activateMainView() {
        const leaf = this.app.workspace.getLeaf(true);
        await leaf.setViewState({ type: VIEW_TYPE_EXTERNAL_BROWSER, active: true });
        this.app.workspace.revealLeaf(leaf);
    }

    async activateHelpView() {
        const leaf = this.app.workspace.getLeaf(true);
        await leaf.setViewState({ type: VIEW_TYPE_HELP, active: true });
        this.app.workspace.revealLeaf(leaf);
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    getLocale() {
        let lang = this.settings.language;
        if (lang === 'auto') {
            const htmlLang = document.documentElement.lang || '';
            const baseLang = htmlLang.split('-')[0].toLowerCase();
            if (SUPPORTED_LOCALES.includes(baseLang)) {
                return baseLang;
            }
            return 'en';
        }
        if (SUPPORTED_LOCALES.includes(lang)) {
            return lang;
        }
        return 'en';
    }

    t(key, params = {}) {
        const locale = this.getLocale();
        let dict = LOCALES[locale];
        if (!dict) dict = LOCALES.en;
        let text = dict[key] || key;
        for (const [k, v] of Object.entries(params)) {
            text = text.replace(`{${k}}`, v);
        }
        if (key === 'previewImageInfo') {
            return text.split('\n').join('<br>');
        }
        return text;
    }
}

class ExternalFileBrowserView extends ItemView {
    constructor(leaf, plugin) {
        super(leaf);
        this.plugin = plugin;
        this.currentPath = '';
        this.currentItems = [];
        this.selectedItem = null;
        this.historyBack = [];
        this.sortOption = SORT_FIELDS[0];
        this.viewMode = VIEW_MODES.LIST;
        this.autoSearch = false;
        this.previewVisible = true;
        this.currentImageLoadController = null;
        this.containerElMain = null;
        this.fileListContainer = null;
        this.previewSidebar = null;
        this.previewImageEl = null;
        this.previewInfoEl = null;
        this.pathInput = null;
        this.sortSelect = null;
        this.viewSelect = null;
        this.autoSearchCheckbox = null;
        this.searchBtn = null;
        this.refreshBtn = null;
        this.upBtn = null;
        this.goBtn = null;
        this.openBtn = null;
        this.explorerBtn = null;
        this.helpBtn = null;
        this.previewBtn = null;
    }

    getViewType() { return VIEW_TYPE_EXTERNAL_BROWSER; }
    getDisplayText() { return this.plugin.t('pluginName'); }
    getIcon() { return 'folder-search'; }

    t(key, params) { return this.plugin.t(key, params); }

    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();
        container.addClass('external-file-browser');
        this.containerElMain = container;

        this.createToolbarRow1();
        this.createToolbarRow2();

        const contentArea = container.createDiv({ cls: 'browser-content-area' });
        this.fileListContainer = contentArea.createDiv({ cls: 'file-list-container' });
        this.previewSidebar = contentArea.createDiv({ cls: 'preview-sidebar' });

        if (this.previewVisible) {
            this.previewSidebar.show();
        } else {
            this.previewSidebar.hide();
        }

        const previewHeader = this.previewSidebar.createDiv({ cls: 'preview-header' });
        previewHeader.createSpan({ text: this.t('previewTitle'), cls: 'preview-title' });
        this.previewImageEl = this.previewSidebar.createDiv({ cls: 'preview-image' });
        this.previewInfoEl = this.previewSidebar.createDiv({ cls: 'preview-info' });

        this.bindEvents();

        let startPath = this.plugin.settings.defaultPath;
        if (!startPath || !fs.existsSync(startPath)) startPath = this.plugin.app.vault.adapter.getBasePath();
        await this.navigateTo(startPath);

        if (this.selectedItem) this.updatePreview();
    }

    createToolbarRow1() {
        const row1 = this.containerElMain.createDiv({ cls: 'browser-toolbar-row' });
        const navGroup = row1.createDiv({ cls: 'nav-buttons' });
        this.upBtn = navGroup.createEl('button', { cls: 'nav-btn', title: this.t('up') });
        setIcon(this.upBtn, 'arrow-up');
        this.refreshBtn = navGroup.createEl('button', { cls: 'nav-btn', title: this.t('refresh') });
        setIcon(this.refreshBtn, 'rotate-cw');

        const pathGroup = row1.createDiv({ cls: 'path-group' });
        this.pathInput = pathGroup.createEl('input', { type: 'text', cls: 'path-input' });
        this.goBtn = pathGroup.createEl('button', { cls: 'go-btn', title: this.t('go') });
        setIcon(this.goBtn, 'play');

        const actionGroup = row1.createDiv({ cls: 'action-buttons' });
        this.openBtn = actionGroup.createEl('button', { cls: 'action-btn', title: this.t('openFolder') });
        this.explorerBtn = actionGroup.createEl('button', { cls: 'action-btn', title: this.t('openExplorer') });
        this.helpBtn = actionGroup.createEl('button', { cls: 'action-btn', title: this.t('help') });
        setIcon(this.openBtn, 'folder-open');
        setIcon(this.explorerBtn, 'external-link');
        setIcon(this.helpBtn, 'circle-question-mark');
    }

    createToolbarRow2() {
        const row2 = this.containerElMain.createDiv({ cls: 'browser-toolbar-row search-row' });
        this.searchBtn = row2.createEl('button', { text: this.t('search'), cls: 'search-btn' });
        this.autoSearchCheckbox = row2.createEl('input', { type: 'checkbox', cls: 'auto-search-checkbox' });
        const autoLabel = row2.createEl('label', { text: this.t('autoSearch'), cls: 'auto-search-label' });
        autoLabel.prepend(this.autoSearchCheckbox);

        const optionsGroup = row2.createDiv({ cls: 'options-group' });
        this.sortSelect = optionsGroup.createEl('select', { cls: 'sort-select' });
        this.updateSortOptions();
        this.viewSelect = optionsGroup.createEl('select', { cls: 'view-select' });
        this.updateViewOptions();
        this.previewBtn = optionsGroup.createEl('button', { cls: 'preview-btn', title: this.t('preview') });
        setIcon(this.previewBtn, 'eye');
        this.previewBtn.addEventListener('click', () => this.togglePreview());
    }

    updateSortOptions() {
        this.sortSelect.empty();
        SORT_FIELDS.forEach(({ field, order }) => {
            let key;
            if (field === 'name') key = order === 'asc' ? 'sortNameAsc' : 'sortNameDesc';
            else if (field === 'type') key = order === 'asc' ? 'sortTypeAsc' : 'sortTypeDesc';
            else if (field === 'size') key = order === 'asc' ? 'sortSizeAsc' : 'sortSizeDesc';
            else key = order === 'asc' ? 'sortMtimeAsc' : 'sortMtimeDesc';
            const label = this.t(key);
            const option = this.sortSelect.createEl('option', { text: label });
            option.value = JSON.stringify({ field, order });
        });
    }

    updateViewOptions() {
        this.viewSelect.empty();
        this.viewSelect.createEl('option', { text: this.t('viewList'), value: VIEW_MODES.LIST });
        this.viewSelect.createEl('option', { text: this.t('viewGrid'), value: VIEW_MODES.GRID });
    }

    bindEvents() {
        this.upBtn.addEventListener('click', () => this.navigateUp());
        this.refreshBtn.addEventListener('click', () => this.refresh());
        this.goBtn.addEventListener('click', () => this.navigateTo(this.pathInput.value));
        this.openBtn.addEventListener('click', () => this.openSelectedItem());
        this.explorerBtn.addEventListener('click', () => this.openInExplorer());
        this.helpBtn.addEventListener('click', () => this.plugin.activateHelpView());
        this.searchBtn.addEventListener('click', () => this.searchCurrentSelection());
        this.autoSearchCheckbox.addEventListener('change', (e) => this.autoSearch = e.target.checked);
        this.sortSelect.addEventListener('change', () => {
            const val = this.sortSelect.value;
            const parsed = JSON.parse(val);
            this.sortOption = { field: parsed.field, order: parsed.order };
            this.renderFileList();
        });
        this.viewSelect.addEventListener('change', () => {
            this.viewMode = this.viewSelect.value;
            this.renderFileList();
        });
        this.pathInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') this.navigateTo(this.pathInput.value); });
    }

    togglePreview() {
        this.previewVisible = !this.previewVisible;
        if (this.previewVisible) {
            this.previewSidebar.show();
            this.updatePreview();
        } else {
            this.previewSidebar.hide();
            if (this.currentImageLoadController) {
                this.currentImageLoadController.abort();
                this.currentImageLoadController = null;
            }
        }
    }

    async updatePreview() {
        if (!this.previewVisible) return;
        if (!this.selectedItem) {
            this.previewImageEl.empty();
            this.previewInfoEl.innerHTML = this.t('previewNoSelection');
            return;
        }

        const type = this.selectedItem.isDir ? this.t('folder') : this.t('file');
        const size = this.selectedItem.isDir ? '—' : this.selectedItem.sizeFormatted;
        const mtime = this.selectedItem.mtimeFormatted;
        this.previewInfoEl.innerHTML = this.t('previewImageInfo', { type, size, mtime });

        if (!this.selectedItem.isDir && this.isImageFile(this.selectedItem.name)) {
            if (this.currentImageLoadController) {
                this.currentImageLoadController.abort();
                this.currentImageLoadController = null;
            }

            this.previewImageEl.empty();
            const loadingDiv = this.previewImageEl.createDiv({ text: this.t('previewLoading'), cls: 'preview-loading' });

            const controller = new AbortController();
            this.currentImageLoadController = controller;

            try {
                const buffer = await fs.promises.readFile(this.selectedItem.fullPath, { signal: controller.signal });
                const base64 = buffer.toString('base64');
                const mimeType = this.getMimeType(this.selectedItem.name);
                const dataUrl = `data:${mimeType};base64,${base64}`;

                this.previewImageEl.empty();
                const img = this.previewImageEl.createEl('img', { cls: 'preview-img' });
                img.src = dataUrl;
                img.onerror = () => {
                    this.previewImageEl.empty();
                    this.previewImageEl.createDiv({ text: this.t('previewNotImage'), cls: 'preview-not-image' });
                };
            } catch (err) {
                if (err.name === 'AbortError') {
                    return;
                }
                console.error('Failed to load image:', err);
                this.previewImageEl.empty();
                this.previewImageEl.createDiv({ text: this.t('previewNotImage'), cls: 'preview-not-image' });
            } finally {
                if (this.currentImageLoadController === controller) {
                    this.currentImageLoadController = null;
                }
            }
        } else {
            this.previewImageEl.empty();
            if (!this.selectedItem.isDir) {
                this.previewImageEl.createDiv({ text: this.t('previewNotImage'), cls: 'preview-not-image' });
            } else {
                this.previewImageEl.createDiv({ text: '📁', cls: 'preview-folder-icon' });
            }
        }
    }

    getMimeType(filename) {
        const ext = path.extname(filename).toLowerCase();
        const mimeTypes = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.bmp': 'image/bmp',
            '.webp': 'image/webp',
            '.svg': 'image/svg+xml',
            '.ico': 'image/x-icon'
        };
        return mimeTypes[ext] || 'image/jpeg';
    }

    isImageFile(filename) {
        const ext = path.extname(filename).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.ico'].includes(ext);
    }

    async navigateTo(targetPath) {
        try {
            const resolved = path.resolve(targetPath);
            if (!fs.existsSync(resolved)) throw new Error(this.t('errorPathNotExist'));
            const stat = await fs.promises.stat(resolved);
            if (!stat.isDirectory()) throw new Error(this.t('errorNotDir'));
            if (this.currentPath) this.historyBack.push(this.currentPath);
            this.currentPath = resolved;
            this.pathInput.value = this.currentPath;
            await this.loadDirectory(this.currentPath);
        } catch (err) {
            this.showError(this.t('errorOpenDir', { msg: err.message }));
        }
    }

    async navigateUp() {
        const parent = path.dirname(this.currentPath);
        if (parent !== this.currentPath) await this.navigateTo(parent);
    }

    async refresh() { await this.loadDirectory(this.currentPath); }

    async loadDirectory(dirPath) {
        try {
            const entries = await fs.promises.readdir(dirPath);
            const items = [];
            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry);
                try {
                    const stat = await fs.promises.stat(fullPath);
                    const isDir = stat.isDirectory();
                    const ext = isDir ? 'folder' : path.extname(entry).toLowerCase().slice(1) || 'file';
                    items.push({
                        name: entry,
                        fullPath,
                        isDir,
                        size: stat.size,
                        mtime: stat.mtime,
                        type: isDir ? '文件夹' : ext,
                        sizeFormatted: isDir ? '—' : this.formatFileSize(stat.size),
                        mtimeFormatted: stat.mtime.toLocaleString()
                    });
                } catch (e) { }
            }
            this.currentItems = items;
            this.selectedItem = null;
            this.renderFileList();
            if (this.previewVisible) this.updatePreview();
        } catch (err) {
            this.showError(this.t('errorReadDir', { msg: err.message }));
        }
    }

    renderFileList() {
        this.fileListContainer.empty();
        const sorted = this.sortItems([...this.currentItems]);
        if (this.viewMode === VIEW_MODES.LIST) {
            this.renderListView(sorted);
        } else {
            this.renderGridView(sorted);
        }
    }

    sortItems(items) {
        const { field, order } = this.sortOption;
        const multiplier = order === 'asc' ? 1 : -1;
        return items.sort((a, b) => {
            let aVal, bVal;
            if (field === 'name') {
                aVal = a.name;
                bVal = b.name;
                return multiplier * aVal.localeCompare(bVal);
            } else if (field === 'type') {
                aVal = a.type;
                bVal = b.type;
                return multiplier * aVal.localeCompare(bVal);
            } else if (field === 'size') {
                aVal = a.isDir ? -1 : a.size;
                bVal = b.isDir ? -1 : b.size;
                return multiplier * (aVal - bVal);
            } else if (field === 'mtime') {
                aVal = a.mtime.getTime();
                bVal = b.mtime.getTime();
                return multiplier * (aVal - bVal);
            }
            return 0;
        });
    }

    renderListView(items) {
        const table = this.fileListContainer.createEl('table', { cls: 'details-table' });
        const thead = table.createEl('thead');
        const headerRow = thead.createEl('tr');
        headerRow.createEl('th', { text: this.t('columnName') });
        headerRow.createEl('th', { text: this.t('columnModified') });
        headerRow.createEl('th', { text: this.t('columnType') });
        headerRow.createEl('th', { text: this.t('columnSize') });
        const tbody = table.createEl('tbody');
        for (const item of items) {
            const row = tbody.createEl('tr', { cls: 'file-row' });
            if (this.selectedItem?.fullPath === item.fullPath) row.addClass('selected');
            const nameCell = row.createEl('td', { cls: 'file-name-cell' });
            const iconSpan = nameCell.createSpan({ cls: 'file-icon' });
            iconSpan.setText(item.isDir ? '📁' : '📄');
            const nameSpan = nameCell.createSpan({ text: item.name, cls: 'file-name-text' });
            nameCell.addEventListener('click', (e) => { e.stopPropagation(); this.setSelectedItem(item); });
            nameCell.addEventListener('dblclick', (e) => { e.stopPropagation(); this.handleDoubleClick(item); });
            row.createEl('td', { text: item.mtimeFormatted, cls: 'file-mtime' });
            row.createEl('td', { text: item.type, cls: 'file-type' });
            row.createEl('td', { text: item.sizeFormatted, cls: 'file-size' });
            row.addEventListener('click', (e) => { e.stopPropagation(); this.setSelectedItem(item); });
            row.addEventListener('dblclick', (e) => { e.stopPropagation(); this.handleDoubleClick(item); });
        }
    }

    renderGridView(items) {
        const grid = this.fileListContainer.createDiv({ cls: 'grid-view' });
        for (const item of items) {
            const card = grid.createDiv({ cls: 'grid-card' });
            if (this.selectedItem?.fullPath === item.fullPath) card.addClass('selected');
            const iconDiv = card.createDiv({ cls: 'grid-icon' });
            iconDiv.setText(item.isDir ? '📁' : '📄');
            const nameDiv = card.createDiv({ text: item.name, cls: 'grid-name' });
            card.addEventListener('click', (e) => { e.stopPropagation(); this.setSelectedItem(item); });
            card.addEventListener('dblclick', (e) => { e.stopPropagation(); this.handleDoubleClick(item); });
        }
    }

    setSelectedItem(item) {
        this.selectedItem = item;
        this.renderFileList();
        if (this.previewVisible) this.updatePreview();
        if (this.autoSearch) this.searchItem(item);
    }

    handleDoubleClick(item) {
        if (item.isDir) this.navigateTo(item.fullPath);
        else this.searchItem(item);
    }

    searchItem(item) {
        let query;
        if (item.isDir) {
            const parts = item.fullPath.split(path.sep);
            const escapedParts = parts.map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
            const regexPattern = escapedParts.join('.*');
            query = `/${regexPattern}/`;
        } else {
            query = `${item.name}`;
        }
        const vaultName = this.plugin.app.vault.getName();
        const encodedVault = encodeURIComponent(vaultName);
        const encodedQuery = encodeURIComponent(query);
        const uri = `obsidian://search?vault=${encodedVault}&query=${encodedQuery}`;
        shell.openExternal(uri);
    }

    searchCurrentSelection() {
        if (this.selectedItem) this.searchItem(this.selectedItem);
        else this.showError(this.t('errorNoItem'));
    }

    openSelectedItem() {
        if (this.selectedItem && this.selectedItem.isDir) this.navigateTo(this.selectedItem.fullPath);
        else this.showError(this.t('errorOpenFolderOnly'));
    }

    openInExplorer() {
        if (this.selectedItem && !this.selectedItem.isDir) {
            shell.showItemInFolder(this.selectedItem.fullPath);
        } else if (this.selectedItem && this.selectedItem.isDir) {
            shell.openPath(this.selectedItem.fullPath);
        } else {
            shell.openPath(this.currentPath);
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    showError(msg) {
        const errorDiv = this.fileListContainer.createDiv({ cls: 'error-message' });
        errorDiv.setText(msg);
        setTimeout(() => errorDiv.remove(), 3000);
    }
}

class HelpView extends ItemView {
    constructor(leaf, plugin) {
        super(leaf);
        this.plugin = plugin;
    }
    getViewType() { return VIEW_TYPE_HELP; }
    getDisplayText() { return `${this.plugin.t('help')} - ${this.plugin.t('pluginName')}`; }
    getIcon() { return 'circle-question-mark'; }

    t(key, params) { return this.plugin.t(key, params); }

    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();
        container.addClass('help-view');
        const content = container.createDiv({ cls: 'help-content' });
        await MarkdownRenderer.renderMarkdown(this.t('helpText'), content, '', this.plugin);
    }
}

class SearchExternalFilesSettingTab extends PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    t(key, params) { return this.plugin.t(key, params); }

    display() {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.createEl('h2', { text: this.t('settingsTitle') });

        new Setting(containerEl)
            .setName(this.t('settingsLanguage'))
            .setDesc(this.t('settingsLanguageDesc'))
            .addDropdown(dropdown => {
                dropdown.addOption('auto', this.t('settingsLanguageAuto'));
                for (const lang of SUPPORTED_LOCALES) {
                    const displayName = LOCALE_DISPLAY[lang] || lang;
                    dropdown.addOption(lang, displayName);
                }
                dropdown.setValue(this.plugin.settings.language);
                dropdown.onChange(async (value) => {
                    this.plugin.settings.language = value;
                    await this.plugin.saveSettings();
                    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_EXTERNAL_BROWSER);
                    leaves.forEach(leaf => {
                        if (leaf.view instanceof ExternalFileBrowserView) {
                            leaf.view.updateSortOptions();
                            leaf.view.updateViewOptions();
                            leaf.view.upBtn.title = leaf.view.t('up');
                            leaf.view.refreshBtn.title = leaf.view.t('refresh');
                            leaf.view.goBtn.title = leaf.view.t('go');
                            leaf.view.openBtn.title = leaf.view.t('openFolder');
                            leaf.view.explorerBtn.title = leaf.view.t('openExplorer');
                            leaf.view.helpBtn.title = leaf.view.t('help');
                            leaf.view.searchBtn.setText(leaf.view.t('search'));
                            leaf.view.autoSearchCheckbox.nextSibling.textContent = leaf.view.t('autoSearch');
                            leaf.view.previewBtn.title = leaf.view.t('preview');
                            leaf.view.renderFileList();
                            if (leaf.view.previewVisible) leaf.view.updatePreview();
                        }
                    });
                    const helpLeaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_HELP);
                    helpLeaves.forEach(leaf => {
                        if (leaf.view instanceof HelpView) {
                            leaf.view.onOpen();
                        }
                    });
                    this.display();
                });
            });

        new Setting(containerEl)
            .setName(this.t('settingsDefaultPath'))
            .setDesc(this.t('settingsDefaultPathDesc'))
            .addText(text => text
                .setPlaceholder(this.t('settingsDefaultPathPlaceholder'))
                .setValue(this.plugin.settings.defaultPath)
                .onChange(async (value) => {
                    this.plugin.settings.defaultPath = value;
                    await this.plugin.saveSettings();
                }));
    }
}

module.exports = SearchExternalFilesPlugin;