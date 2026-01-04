import { App, Editor, MarkdownView, Plugin, PluginSettingTab, Setting, SuggestModal, TFile } from 'obsidian';

/**
 * Plugin settings interface.
 */
interface ZettelLinkSettings {
    /** Whether to extract timestamps from filenames */
    extractTimestamps: boolean;
    /** Number of digits in timestamp (default: 12 for YYYYMMDDHHMM) */
    timestampLength: number;
    /** Whether to show file paths or just filenames in suggestions */
    showFullPath: boolean;
    /** Whether to append filename text after timestamp link */
    appendFileName: boolean;
}

/**
 * Default plugin settings.
 */
const DEFAULT_SETTINGS: ZettelLinkSettings = {
    extractTimestamps: true,
    timestampLength: 12,
    showFullPath: true,
    appendFileName: true
};

/**
 * Modal dialog for selecting files from the vault to create Zettelkasten-style links.
 *
 * This modal provides file search functionality and automatically formats links based on
 * the filename pattern. For files starting with a 12-digit timestamp (YYYYMMDDHHMM),
 * it creates compact timestamp-only links.
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
     * - If filename starts with 12-digit timestamp (YYYYMMDDHHMM): Extract timestamp,
     *   create [[timestamp]] link, append rest of filename as plain text
     * - Otherwise: Create standard [[filename]] link
     *
     * Also cleans up trailing "}" or "}}" characters that may have been typed
     * as part of a "{{...}}" sequence.
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
 * Zettel Link Creator Plugin
 *
 * Creates Zettelkasten-style links with timestamp extraction for files following
 * the pattern: "YYYYMMDDHHMM Title.md"
 *
 * Features:
 * - Type "{{" to trigger file selection modal
 * - Use Cmd+Shift+L (Mac) / Ctrl+Shift+L (Windows/Linux) to open modal
 * - Automatically formats timestamp-based filenames as [[timestamp]] Title
 * - Cleans up trailing braces from "{{...}}" sequences
 *
 * Workflow:
 * 1. User types "{{" or presses hotkey
 * 2. Modal opens with searchable file list
 * 3. User selects file (via arrow keys + Enter or mouse click)
 * 4. Plugin inserts formatted link at cursor position
 */
export default class ZettelLinkPlugin extends Plugin {
    settings: ZettelLinkSettings;

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

        // Add settings tab
        this.addSettingTab(new ZettelLinkSettingTab(this.app, this));
    }

    onunload() {
        // Cleanup handled automatically by Obsidian
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    /**
     * Opens the file selection modal for the given editor context.
     */
    openFileSearchModal(editor: Editor) {
        const modal = new FileSelectModal(this.app, editor, this.settings);
        modal.open();
    }
}

/**
 * Settings tab for configuring the Zettel Link Creator plugin.
 */
class ZettelLinkSettingTab extends PluginSettingTab {
    plugin: ZettelLinkPlugin;

    constructor(app: App, plugin: ZettelLinkPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'Zettel Link Creator Settings' });

        new Setting(containerEl)
            .setName('Extract timestamps')
            .setDesc('Enable timestamp extraction from filenames')
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
    }
}
