import {
    App,
    Editor,
    EditorPosition,
    EditorSuggest,
    EditorSuggestContext,
    EditorSuggestTriggerInfo,
    MarkdownView,
    Plugin,
    TFile
} from 'obsidian';

class ZettelSuggest extends EditorSuggest<TFile> {
    vaultFiles: TFile[];
    latestTrigger: EditorSuggestTriggerInfo | null = null;

    constructor(app: App) {
        super(app);
        this.vaultFiles = app.vault.getMarkdownFiles();
    }

    onTrigger(cursor: EditorPosition, editor: Editor, file: TFile): EditorSuggestTriggerInfo | null {
        console.log('onTrigger called', cursor);

        // If a suggestion session is already active, update its query and end position
        if (this.latestTrigger) {
            console.log('Updating existing trigger');
            // Compute new query between the trigger start and current cursor
            const newQuery = editor.getRange(this.latestTrigger.start, cursor);
            this.latestTrigger.end = cursor;
            this.latestTrigger.query = newQuery;
            console.log('Updated query:', newQuery);
            return this.latestTrigger;
        }

        const line = editor.getLine(cursor.line);
        const sub = line.substring(0, cursor.ch);
        console.log('Checking line:', sub);
        if (sub.endsWith("{{")) {
            console.log('{{ trigger detected!');
            const triggerInfo: EditorSuggestTriggerInfo = {
                start: { line: cursor.line, ch: cursor.ch - 2 },
                end: cursor,
                query: ""
            };
            this.latestTrigger = triggerInfo;
            return triggerInfo;
        }
        this.latestTrigger = null;
        return null;
    }

    getSuggestions(context: EditorSuggestContext): TFile[] {
        const query = context.query.toLowerCase();
        console.log('getSuggestions called with query:', query);
        const results = this.vaultFiles.filter(file =>
            file.name.toLowerCase().includes(query)
        );
        console.log('Found', results.length, 'suggestions');
        return results;
    }

    renderSuggestion(file: TFile, el: HTMLElement): void {
        el.setText(file.path);
    }

    selectSuggestion(file: TFile, _evt: MouseEvent | KeyboardEvent): void {
        console.log('selectSuggestion called for:', file.basename);
        const context = this.context;
        if (!context) return;

        const editor = context.editor;
        const fileName = file.basename;
        const timestampMatch = fileName.match(/^(\d{12})(.*)$/);
        let insertionText: string;
        if (timestampMatch) {
            const timestamp = timestampMatch[1];
            const restName = timestampMatch[2].trim();
            insertionText = `[[${timestamp}]]${restName ? ' ' + restName : ''}`;
        } else {
            insertionText = `[[${fileName}]]`;
        }

        // Remove the "{{" trigger sequence and any typed query
        const trigger = this.latestTrigger;
        if (trigger) {
            editor.replaceRange("", trigger.start, trigger.end);

            // After removing "{{", check for trailing "}}"
            const currentCursor = editor.getCursor();
            const nextTwo = editor.getRange(currentCursor, { line: currentCursor.line, ch: currentCursor.ch + 2 });
            if (nextTwo === "}}") {
                editor.replaceRange("", currentCursor, { line: currentCursor.line, ch: currentCursor.ch + 2 });
            }
        }

        editor.replaceRange(insertionText, editor.getCursor());

        // Optionally reset trigger after insertion
        this.latestTrigger = null;
    }
}

export default class ZettelLinkPlugin extends Plugin {
    zettelSuggest: ZettelSuggest;

    async onload() {
        console.log('Loading Zettel Link Plugin');
        console.log('App vault has', this.app.vault.getMarkdownFiles().length, 'files');

        this.zettelSuggest = new ZettelSuggest(this.app);
        this.registerEditorSuggest(this.zettelSuggest);
        console.log('EditorSuggest registered');

        this.addCommand({
            id: 'insert-zettel-link',
            name: 'Insert Zettel Link',
            hotkeys: [{ modifiers: ["Mod", "Shift"], key: "L" }],
            editorCallback: (editor: Editor, view: MarkdownView) => {
                // Manual invocation not implemented in this snippet.
            }
        });
    }

    onunload() {
        console.log('Unloading Zettel Link Plugin');
    }
}
