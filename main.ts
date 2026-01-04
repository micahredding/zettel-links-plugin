import { App, Editor, MarkdownView, Modal, Plugin, PluginSettingTab, Setting, SuggestModal, TFile } from 'obsidian';

/**
 * Plugin settings interface.
 */
interface ZettelLinkSettings {
    /** Whether to extract timestamps from filenames when creating links */
    extractTimestamps: boolean;
    /** Number of digits in timestamp (default: 12 for YYYYMMDDHHMM) */
    timestampLength: number;
    /** Whether to show file paths or just filenames in suggestions */
    showFullPath: boolean;
    /** Whether to append filename text after timestamp link */
    appendFileName: boolean;
    /** Whether to enable link resolution (timestamp links resolve to matching notes) */
    enableLinkResolution: boolean;
    /** Whether to enable partial filename matching when resolving links */
    enablePartialMatching: boolean;
}

/**
 * Default plugin settings.
 */
const DEFAULT_SETTINGS: ZettelLinkSettings = {
    extractTimestamps: true,
    timestampLength: 12,
    showFullPath: true,
    appendFileName: true,
    enableLinkResolution: true,
    enablePartialMatching: true
};

/**
 * Modal for choosing between multiple matching files when resolving a link.
 */
class LinkChooserModal extends Modal {
    private resolve: (value: TFile | null) => void;
    private matches: TFile[];
    private linktext: string;

    constructor(app: App, linktext: string, matches: TFile[], resolve: (value: TFile | null) => void) {
        super(app);
        this.matches = matches;
        this.resolve = resolve;
        this.linktext = linktext;
    }

    onOpen() {
        const {contentEl} = this;
        contentEl.empty();

        contentEl.createEl('h2', {text: 'Multiple matches found'});
        contentEl.createEl('p', {text: `Choose the correct note for "${this.linktext}":`});

        const list = contentEl.createEl('div', {
            cls: 'link-chooser-list'
        });

        this.matches.forEach((file) => {
            const item = list.createEl('div', {
                cls: 'link-chooser-item',
                text: file.basename
            });

            item.onClickEvent(() => {
                this.resolve(file);
                this.close();
            });
        });

        const cancelButton = contentEl.createEl('button', {
            text: 'Cancel',
            cls: 'link-chooser-cancel'
        });

        cancelButton.onClickEvent(() => {
            this.resolve(null);
            this.close();
        });
    }

    onClose() {
        const {contentEl} = this;
        contentEl.empty();
    }
}

/**
 * Modal dialog for selecting files from the vault to create Zettelkasten-style links.
 *
 * This modal provides file search functionality and automatically formats links based on
 * the filename pattern. For files starting with a timestamp, it creates compact timestamp-only links.
 *
 * @example
 * File: "202512270824 Christmas Traditions.md"
 * Output: "[[202512270824]] Christmas Traditions"
 *
 * @example
 * File: "Regular Note.md"
 * Output: "[[Regular Note]]"
 */
class FileSelectModal extends SuggestModal<TFile> {
    vaultFiles: TFile[];
    editor: Editor;
    settings: ZettelLinkSettings;

    constructor(app: App, editor: Editor, settings: ZettelLinkSettings) {
        super(app);
        this.editor = editor;
        this.settings = settings;
        this.vaultFiles = app.vault.getMarkdownFiles();
    }

    /**
     * Handle suggestion selection (delegates to onChooseItem for compatibility).
     */
    onChooseSuggestion(item: TFile, evt: MouseEvent | KeyboardEvent): void {
        this.onChooseItem(item, evt);
    }

    /**
     * Filter vault files based on user's search query.
     * Uses case-insensitive substring matching on file names.
     */
    getSuggestions(query: string): TFile[] {
        return this.vaultFiles.filter(file =>
            file.name.toLowerCase().includes(query.toLowerCase())
        );
    }

    /**
     * Render each suggestion showing either the full file path or just the filename.
     */
    renderSuggestion(file: TFile, el: HTMLElement): void {
        el.setText(this.settings.showFullPath ? file.path : file.basename);
    }

    /**
     * Process the selected file and insert the formatted link.
     *
     * Link formatting rules:
     * - If filename starts with timestamp: Extract timestamp, create [[timestamp]] link,
     *   append rest of filename as plain text
     * - Otherwise: Create standard [[filename]] link
     */
    onChooseItem(file: TFile, _evt: MouseEvent | KeyboardEvent): void {
        const fileName = file.basename;
        let insertionText: string;

        // Check if timestamp extraction is enabled and filename matches pattern
        if (this.settings.extractTimestamps) {
            const timestampPattern = new RegExp(`^(\\d{${this.settings.timestampLength}})(.*)$`);
            const timestampMatch = fileName.match(timestampPattern);

            if (timestampMatch) {
                // Zettelkasten timestamp format: [[202512270824]] Rest of Name
                const timestamp = timestampMatch[1];
                const restName = timestampMatch[2].trim();

                if (this.settings.appendFileName && restName) {
                    insertionText = `[[${timestamp}]] ${restName}`;
                } else {
                    insertionText = `[[${timestamp}]]`;
                }
            } else {
                // Standard Obsidian link: [[Regular Note]]
                insertionText = `[[${fileName}]]`;
            }
        } else {
            // Timestamp extraction disabled: always use full filename
            insertionText = `[[${fileName}]]`;
        }

        // Insert the link at cursor position
        this.editor.replaceRange(insertionText, this.editor.getCursor());
    }
}

/**
 * Zettel Links Plugin
 *
 * Complete Zettelkasten workflow for Obsidian:
 * 1. Create timestamp-based links with automatic formatting
 * 2. Resolve timestamp links to matching notes
 *
 * Features:
 * - Ribbon icon and keyboard shortcut (Cmd+Shift+L) to insert links
 * - Automatically formats timestamp-based filenames as [[timestamp]] Title
 * - Resolves [[timestamp]] links to files starting with that timestamp
 * - Partial filename matching for greater interoperability
 * - Works seamlessly on mobile
 */
export default class ZettelLinksPlugin extends Plugin {
    settings: ZettelLinkSettings;
    private chooserOpen = false;
    private lastChosenFile: TFile | null = null;
    private originalGetFirstLinkpathDest: ((linktext: string, sourcePath: string) => TFile | null) | null = null;

    async onload() {
        await this.loadSettings();

        // Add ribbon icon for mobile and easy access
        this.addRibbonIcon('links-coming-in', 'Insert Zettel Link', (_evt: MouseEvent) => {
            const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
            if (activeView) {
                this.openFileSearchModal(activeView.editor);
            }
        });

        // Register command for manual invocation via command palette or hotkey
        // This is what appears in the mobile toolbar
        this.addCommand({
            id: 'insert-zettel-link',
            name: 'Insert Zettel Link',
            icon: 'links-coming-in',
            hotkeys: [{ modifiers: ["Mod", "Shift"], key: "L" }],
            editorCallback: (editor: Editor, _view: MarkdownView) => {
                this.openFileSearchModal(editor);
            }
        });

        // Setup link resolution if enabled
        this.setupLinkResolution();

        // Add settings tab
        this.addSettingTab(new ZettelLinksSettingTab(this.app, this));
    }

    onunload() {
        // Restore original getFirstLinkpathDest if we modified it
        if (this.originalGetFirstLinkpathDest) {
            this.app.metadataCache.getFirstLinkpathDest = this.originalGetFirstLinkpathDest;
        }
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);

        // Update link resolution when settings change
        this.setupLinkResolution();
    }

    /**
     * Opens the file selection modal for the given editor context.
     */
    openFileSearchModal(editor: Editor) {
        const modal = new FileSelectModal(this.app, editor, this.settings);
        modal.open();
    }

    /**
     * Setup or teardown link resolution based on settings.
     */
    setupLinkResolution() {
        // Restore original method if we previously overrode it
        if (this.originalGetFirstLinkpathDest) {
            this.app.metadataCache.getFirstLinkpathDest = this.originalGetFirstLinkpathDest;
            this.originalGetFirstLinkpathDest = null;
        }

        // Only override if link resolution is enabled
        if (!this.settings.enableLinkResolution) {
            return;
        }

        // Store the original method
        this.originalGetFirstLinkpathDest = this.app.metadataCache.getFirstLinkpathDest;

        // Override the method with our custom logic
        this.app.metadataCache.getFirstLinkpathDest = (linktext: string, sourcePath: string): TFile | null => {
            // 1. Try the default resolution
            let file = this.originalGetFirstLinkpathDest!.call(this.app.metadataCache, linktext, sourcePath);
            if (file) {
                return file;
            }

            // 2. If partial matching disabled, return null (no match)
            if (!this.settings.enablePartialMatching) {
                return null;
            }

            // 3. Do a partial match search
            const allFiles = this.app.vault.getMarkdownFiles();
            const linktextLower = linktext.toLowerCase();

            // Filter files whose filename includes the link text
            const matches = allFiles.filter((f) =>
                f.basename.toLowerCase().includes(linktextLower)
            );

            // 4. If multiple matches and not already choosing, show modal
            if (matches.length > 1 && !this.chooserOpen) {
                this.chooserOpen = true;
                new Promise<TFile | null>((resolve) => {
                    new LinkChooserModal(this.app, linktext, matches, (file) => {
                        this.lastChosenFile = file;
                        this.chooserOpen = false;
                        resolve(file);
                    }).open();
                });
                return this.lastChosenFile;
            } else if (matches.length === 1) {
                return matches[0];
            }

            return null;
        };

        // Store the modified method for cleanup
        this.register(() => {
            if (this.originalGetFirstLinkpathDest) {
                this.app.metadataCache.getFirstLinkpathDest = this.originalGetFirstLinkpathDest;
            }
        });
    }
}

/**
 * Settings tab for configuring the Zettel Links plugin.
 */
class ZettelLinksSettingTab extends PluginSettingTab {
    plugin: ZettelLinksPlugin;

    constructor(app: App, plugin: ZettelLinksPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'Zettel Links Settings' });

        // Link Creation Settings
        containerEl.createEl('h3', { text: 'Link Creation' });

        new Setting(containerEl)
            .setName('Extract timestamps')
            .setDesc('Enable timestamp extraction from filenames when creating links')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.extractTimestamps)
                .onChange(async (value) => {
                    this.plugin.settings.extractTimestamps = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Timestamp length')
            .setDesc('Number of digits in timestamp (default: 12 for YYYYMMDDHHMM)')
            .addText(text => text
                .setPlaceholder('12')
                .setValue(String(this.plugin.settings.timestampLength))
                .onChange(async (value) => {
                    const num = parseInt(value);
                    if (!isNaN(num) && num > 0) {
                        this.plugin.settings.timestampLength = num;
                        await this.plugin.saveSettings();
                    }
                }));

        new Setting(containerEl)
            .setName('Show full path')
            .setDesc('Display full file paths in suggestions instead of just filenames')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showFullPath)
                .onChange(async (value) => {
                    this.plugin.settings.showFullPath = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Append filename after timestamp')
            .setDesc('Include the rest of the filename as text after the timestamp link')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.appendFileName)
                .onChange(async (value) => {
                    this.plugin.settings.appendFileName = value;
                    await this.plugin.saveSettings();
                }));

        // Link Resolution Settings
        containerEl.createEl('h3', { text: 'Link Resolution' });

        new Setting(containerEl)
            .setName('Enable link resolution')
            .setDesc('Resolve timestamp links (e.g., [[202512270824]]) to files starting with that timestamp. Also enables interoperability with other Zettelkasten tools like The Archive.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableLinkResolution)
                .onChange(async (value) => {
                    this.plugin.settings.enableLinkResolution = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Enable partial matching')
            .setDesc('When resolving links, match partial filenames. WARNING: This makes ALL links look for partial matches before creating new notes. Disable if you want standard Obsidian link behavior.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enablePartialMatching)
                .setDisabled(!this.plugin.settings.enableLinkResolution)
                .onChange(async (value) => {
                    this.plugin.settings.enablePartialMatching = value;
                    await this.plugin.saveSettings();
                }));
    }
}
