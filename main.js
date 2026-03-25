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
        settingsLanguage: '语言 / Language',
        settingsLanguageDesc: '选择插件界面语言，或自动跟随 Obsidian',
        settingsLanguageAuto: '跟随 Obsidian (自动)',
        settingsLanguageZh: '中文',
        settingsLanguageEn: 'English',
        settingsDefaultPath: '默认打开路径',
        settingsDefaultPathDesc: '文件浏览器打开时默认显示的目录（留空则使用笔记库根目录）',
        settingsDefaultPathPlaceholder: '例如: C:\\Users\\YourName\\Documents'
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
        settingsDefaultPathPlaceholder: 'e.g., C:\\Users\\YourName\\Documents'
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
            const htmlLang = document.documentElement.lang;
            if (htmlLang === 'zh' || htmlLang === 'zh-CN') return 'zh';
            return 'en';
        }
        return lang;
    }

    t(key, params = {}) {
        const locale = this.getLocale();
        const dict = LOCALES[locale] || LOCALES.en;
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

        const type = this.selectedItem.isDir ? 'Folder' : 'File';
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
                } catch (e) {  }
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
        headerRow.createEl('th', { text: '名称' });
        headerRow.createEl('th', { text: '修改时间' });
        headerRow.createEl('th', { text: '类型' });
        headerRow.createEl('th', { text: '大小' });
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
        const lang = this.plugin.getLocale();
        let helpText;
        if (lang === 'zh') {
            helpText = `
# 搜索外部文件插件帮助

## 功能介绍
本插件允许您在 Obsidian 中浏览本地文件系统，并快速在 Obsidian 中搜索选中的文件或文件夹路径。

**⚠️ 重要说明：本插件仅读取文件系统，绝不会修改任何笔记库中的文件！所有运行数据均为临时数据，不会影响您的笔记内容。**

## 使用方法
1. **打开插件**：点击左侧功能区文件夹搜索图标，或使用命令“打开外部文件浏览器”。
2. **文件浏览**：使用顶部的导航按钮（向上、刷新）和路径栏跳转目录。
3. **选择文件**：单击文件或文件夹即可选中。选中后可在预览侧边栏（点击“预览”按钮开启）查看图片预览和信息。
4. **搜索**：
   - 双击文件（或选中后点击“搜索”按钮）会在 Obsidian 中搜索该文件名。
   - 双击文件夹（或选中后点击“搜索”按钮）会搜索其路径，使用**正则表达式**格式（例如 \`/D:.*Folder1.*Folder2/\`）。
5. **自动搜索**：勾选“自动搜索”后，每次单击选中文件或文件夹都会自动触发搜索。
6. **排序与视图**：可切换排序方式和视图模式（列表/网格）。
7. **打开文件夹**：选中文件夹后点击“打开”按钮可进入该文件夹。
8. **资源管理器**：点击“资源管理器”按钮可在系统资源管理器中打开当前目录；若选中了文件，则会定位到该文件。

## 注意事项
- 本插件**只读**，不修改任何笔记数据。
- 设置中的“默认路径”可指定插件启动时的默认目录，留空则使用笔记库根目录。
            `;
        } else {
            helpText = `
# Search External Files Plugin Help

## Features
This plugin allows you to browse the local file system within Obsidian and quickly search for selected files or folder paths.

**⚠️ Important: This plugin is read-only and will never modify any files in your vault! All runtime data is temporary and will not affect your notes.**

## Usage
1. **Open the plugin**: Click the folder-search icon in the left ribbon, or use the command "Open External File Browser".
2. **File navigation**: Use the top navigation buttons (Up, Refresh) and the path bar to jump to directories.
3. **Select items**: Click on a file or folder to select it. After selection, you can open the preview sidebar (click the "Preview" button) to view image preview and information.
4. **Search**:
   - Double-click a file (or select it and click the "Search" button) to search for its filename.
   - Double-click a folder (or select it and click the "Search" button) to search for its path using **regex format** (e.g., \`/D:.*Folder1.*Folder2/\`).
5. **Auto search**: Check "Auto Search" to automatically trigger a search whenever you click on a file or folder.
6. **Sorting and view**: Switch sorting options and view modes (List / Grid).
7. **Open folder**: Select a folder and click the "Open" button to enter it.
8. **Explorer**: Click the "Open in Explorer" button to open the current directory in the system file explorer; if a file is selected, it will be highlighted.

## Notes
- The plugin is **read-only** and never modifies any vault data.
- The "Default Path" in settings specifies the initial directory (leave empty to use the vault root).
            `;
        }
        const content = container.createDiv({ cls: 'help-content' });
        await MarkdownRenderer.renderMarkdown(helpText, content, '', this.plugin);
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
                dropdown.addOption('zh', this.t('settingsLanguageZh'));
                dropdown.addOption('en', this.t('settingsLanguageEn'));
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