# Zettel Link Creator Plugin

An Obsidian plugin for creating Zettelkasten-style links with automatic timestamp extraction.

## Features

- **Quick Trigger**: Type `{{` to open a file selection modal
- **Keyboard Shortcut**: Press `Cmd+Shift+L` (Mac) or `Ctrl+Shift+L` (Windows/Linux)
- **Smart Link Formatting**:
  - Files starting with 12-digit timestamps (YYYYMMDDHHMM) become `[[timestamp]] Title`
  - Regular files become standard `[[filename]]` links
- **Clean Insertion**: Automatically removes trailing `}` or `}}` characters

## Usage

### Basic Workflow

1. Position cursor where you want to insert a link
2. Type `{{` or press the hotkey
3. Search for the file you want to link to
4. Select the file (Enter or click)
5. Link is inserted at cursor position

### Examples

**Zettelkasten timestamp file:**
```
File: "202512270824 Christmas Traditions.md"
Output: [[202512270824]] Christmas Traditions
```

**Regular note:**
```
File: "Project Ideas.md"
Output: [[Project Ideas]]
```

## How It Works

The plugin detects files following the Zettelkasten timestamp naming convention (12-digit YYYYMMDDHHMM prefix) and automatically:
- Extracts the timestamp as the link target
- Appends the rest of the filename as readable text outside the link
- This allows concise links while maintaining readability

For files without timestamp prefixes, it creates standard Obsidian wiki-style links.

## Settings

Access settings via **Settings → Zettel Link Creator** in Obsidian.

### Available Options

- **Trigger sequence** (default: `{{`)
  - Customize the character sequence that opens the modal
  - Examples: `{{`, `@@`, `<<`, etc.
  - Must be 2+ characters

- **Extract timestamps** (default: enabled)
  - Toggle timestamp extraction on/off
  - When disabled, all links use standard `[[filename]]` format

- **Timestamp length** (default: 12)
  - Number of digits in your timestamp format
  - 12 = YYYYMMDDHHMM (e.g., 202512270824)
  - 8 = YYYYMMDD (e.g., 20251227)

- **Show full path** (default: enabled)
  - Show complete file paths in suggestion list
  - When disabled, shows only filenames

- **Append filename after timestamp** (default: enabled)
  - Include filename text after timestamp link
  - When enabled: `[[202512270824]] Christmas Traditions`
  - When disabled: `[[202512270824]]`

## Development

## First time developing plugins?

Quick starting guide for new plugin devs:

- Check if [someone already developed a plugin for what you want](https://obsidian.md/plugins)! There might be an existing plugin similar enough that you can partner up with.
- Make a copy of this repo as a template with the "Use this template" button (login to GitHub if you don't see it).
- Clone your repo to a local development folder. For convenience, you can place this folder in your `.obsidian/plugins/your-plugin-name` folder.
- Install NodeJS, then run `npm i` in the command line under your repo folder.
- Run `npm run dev` to compile your plugin from `main.ts` to `main.js`.
- Make changes to `main.ts` (or create new `.ts` files). Those changes should be automatically compiled into `main.js`.
- Reload Obsidian to load the new version of your plugin.
- Enable plugin in settings window.
- For updates to the Obsidian API run `npm update` in the command line under your repo folder.

## Releasing new releases

- Update your `manifest.json` with your new version number, such as `1.0.1`, and the minimum Obsidian version required for your latest release.
- Update your `versions.json` file with `"new-plugin-version": "minimum-obsidian-version"` so older versions of Obsidian can download an older version of your plugin that's compatible.
- Create new GitHub release using your new version number as the "Tag version". Use the exact version number, don't include a prefix `v`. See here for an example: https://github.com/obsidianmd/obsidian-sample-plugin/releases
- Upload the files `manifest.json`, `main.js`, `styles.css` as binary attachments. Note: The manifest.json file must be in two places, first the root path of your repository and also in the release.
- Publish the release.

> You can simplify the version bump process by running `npm version patch`, `npm version minor` or `npm version major` after updating `minAppVersion` manually in `manifest.json`.
> The command will bump version in `manifest.json` and `package.json`, and add the entry for the new version to `versions.json`

## Adding your plugin to the community plugin list

- Check the [plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines).
- Publish an initial version.
- Make sure you have a `README.md` file in the root of your repo.
- Make a pull request at https://github.com/obsidianmd/obsidian-releases to add your plugin.

## How to use

- Clone this repo.
- Make sure your NodeJS is at least v16 (`node --version`).
- `npm i` or `yarn` to install dependencies.
- `npm run dev` to start compilation in watch mode.

## Manually installing the plugin

- Copy over `main.js`, `styles.css`, `manifest.json` to your vault `VaultFolder/.obsidian/plugins/your-plugin-id/`.

## Improve code quality with eslint (optional)
- [ESLint](https://eslint.org/) is a tool that analyzes your code to quickly find problems. You can run ESLint against your plugin to find common bugs and ways to improve your code. 
- To use eslint with this project, make sure to install eslint from terminal:
  - `npm install -g eslint`
- To use eslint to analyze this project use this command:
  - `eslint main.ts`
  - eslint will then create a report with suggestions for code improvement by file and line number.
- If your source code is in a folder, such as `src`, you can use eslint with this command to analyze all files in that folder:
  - `eslint .\src\`

## Funding URL

You can include funding URLs where people who use your plugin can financially support it.

The simple way is to set the `fundingUrl` field to your link in your `manifest.json` file:

```json
{
    "fundingUrl": "https://buymeacoffee.com"
}
```

If you have multiple URLs, you can also do:

```json
{
    "fundingUrl": {
        "Buy Me a Coffee": "https://buymeacoffee.com",
        "GitHub Sponsor": "https://github.com/sponsors",
        "Patreon": "https://www.patreon.com/"
    }
}
```

## API Documentation

See https://github.com/obsidianmd/obsidian-api
