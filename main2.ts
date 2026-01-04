import { App, Editor, MarkdownView, Plugin, SuggestModal, TFile } from 'obsidian';

class FileSelectModal extends SuggestModal<TFile> {
    vaultFiles: TFile[];
    editor: Editor;

    constructor(app: App, editor: Editor) {
        super(app);
        this.editor = editor;
        // Retrieve all markdown files in the vault
        this.vaultFiles = app.vault.getMarkdownFiles();
    }

    // Redirect newer selection handler to our existing logic
    onChooseSuggestion(item: TFile, evt: MouseEvent | KeyboardEvent): void {
        this.onChooseItem(item, evt);
    }

    // Filter suggestions based on user input
    getSuggestions(query: string): TFile[] {
        return this.vaultFiles.filter(file =>
            file.name.toLowerCase().includes(query.toLowerCase())
        );
    }

    // How each suggestion is displayed
    renderSuggestion(file: TFile, el: HTMLElement): void {
        el.setText(file.path);
    }

    // Called when a file is selected
    onChooseItem(file: TFile, evt: MouseEvent | KeyboardEvent): void {
        const fileName = file.basename; // Filename without extension
        // Check if filename starts with a 12-digit timestamp
        const timestampMatch = fileName.match(/^(\d{12})(.*)$/);
        let insertionText: string;
        if (timestampMatch) {
            // Format: [[timestamp]] rest of filename
            const timestamp = timestampMatch[1];
            const restName = timestampMatch[2].trim();
            insertionText = `[[${timestamp}]]${restName ? ' ' + restName : ''}`;
        } else {
            // Default behavior: [[filename]]
            insertionText = `[[${fileName}]]`;
        }

        // Insert the formatted link at the current cursor position
        this.editor.replaceRange(insertionText, this.editor.getCursor());
    }
}

export default class ZettelLinkPlugin extends Plugin {
    async onload() {
        console.log('Loading Zettel Link Plugin');

        // Command to manually trigger via hotkey (optional)
        this.addCommand({
            id: 'insert-zettel-link',
            name: 'Insert Zettel Link',
            hotkeys: [{ modifiers: ["Mod", "Shift"], key: "L" }],
            editorCallback: (editor: Editor, view: MarkdownView) => {
                this.openFileSearchModal(editor);
            }
        });

        // Listen for keydown events to catch the `{{` sequence
        this.registerDomEvent(document, 'keydown', (evt: KeyboardEvent) => {
            // Check if the pressed key is '{'
            if (evt.key === '{') {
                const activeLeaf = this.app.workspace.getActiveViewOfType(MarkdownView);
                if (!activeLeaf) return;
                const editor = activeLeaf.editor;
                const cursor = editor.getCursor();
                // Ensure we have at least 2 characters before the cursor
                if (cursor.ch < 2) return;

                const line = editor.getLine(cursor.line);
                // Check if the two characters before the cursor are '{{'
                if (line.substring(cursor.ch - 2, cursor.ch) === '{{') {
                    // Remove the '{{' from the editor
                    editor.replaceRange("", 
                        { line: cursor.line, ch: cursor.ch - 2 }, 
                        { line: cursor.line, ch: cursor.ch }
                    );
                    evt.preventDefault();
                    // Open the file search modal with current editor context
                    this.openFileSearchModal(editor);
                }
            }
        });
    }

    onunload() {
        console.log('Unloading Zettel Link Plugin');
    }

    openFileSearchModal(editor: Editor) {
        const modal = new FileSelectModal(this.app, editor);
        modal.open();
    }
}
