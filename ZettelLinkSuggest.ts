import { Editor, EditorPosition, EditorSuggest, EditorSuggestContext, EditorSuggestTriggerInfo, App, TFile } from "obsidian";

export class ZettelLinkSuggest extends EditorSuggest<TFile> {
  constructor(app: App) {
    super(app);
  }

  // Only trigger on "[["
  onTrigger(cursor: EditorPosition, editor: Editor, file: TFile): EditorSuggestTriggerInfo | null {
    const line = editor.getLine(cursor.line);
    const sub = line.substring(0, cursor.ch);

    console.log("OnTrigger");

    // If user just typed "[[", trigger our custom suggestions
    if (sub.endsWith("[[")) {
      console.log("Triggered [[");
      return {
        start: { line: cursor.line, ch: cursor.ch },
        end: { line: cursor.line, ch: cursor.ch },
        query: ""
      };
    } else {
      console.log(sub);
      return null;
    }
    return null;
  }

  // Return the list of files as suggestions
  getSuggestions(context: EditorSuggestContext): TFile[] | Promise<TFile[]> {
    const files = this.app.vault.getMarkdownFiles();
    console.log('getSuggestions called!');
    return files;
  }

  // Control how each suggestion is rendered in the suggestion box
  renderSuggestion(file: TFile, el: HTMLElement): void {
    el.createEl("div", { text: file.basename });
  }

  // Override insertion logic
  selectSuggestion(file: TFile, evt: MouseEvent | KeyboardEvent): void {
    // Ensure context is non-null
    console.log('selectSuggestion', file.basename);
    if (!this.context) return;
  
    const editor = this.context.editor;
    if (!editor) return;
  
    const filename = file.basename;
    const match = filename.match(/^(\d{12})([\s\S]*)/);
  
    if (match) {
      editor.replaceRange(
        `[[${match[1]}]] ${match[2].trim()}`,
        this.context.start,
        this.context.end
      );
    } else {
      editor.replaceRange(
        `[[${filename}]]`,
        this.context.start,
        this.context.end
      );
    }
  }
}