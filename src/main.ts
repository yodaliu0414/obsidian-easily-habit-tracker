import { Plugin, MarkdownView, Editor, Menu, FrontMatterCache } from 'obsidian';
import { HabitSettingTab, HabitTrackerSettings, DEFAULT_SETTINGS } from './settings';
import { cssVarToHex } from './colorUtils';
import { buildHabitCache, HabitCache } from './fileUtils';
import { ChecksModal, RatingModal, NumberModal, ProgressModal, BlockSettingsModal } from './modals';
import { renderChecks, renderRating, renderNumber, renderProgress, attachHandlers } from './inlineRenderer';
import { registerHabitTrackerBlock } from './blockRenderer';

export default class HabitTrackerPlugin extends Plugin {
	settings: HabitTrackerSettings;
	habitCache: HabitCache = new Map();

	async onload() {
		console.log('Loading Habit Tracker Plugin');
		await this.loadSettings();

		this.app.workspace.onLayoutReady(async () => {
			if (!this.settings.globalHabitColor) {
				this.settings.globalHabitColor = cssVarToHex('--interactive-accent') || '#4a88c7';
				await this.saveSettings();
			}
			this.refreshHabitCache();
		});

		this.addSettingTab(new HabitSettingTab(this.app, this));

		this.addRibbonIcon('calendar-check', 'Insert Habit Tracker Block', () => this.insertTrackerCodeblock());
		this.addCommand({ id: 'insert-habit-tracker-block', name: 'Insert Habit Tracker Block', callback: () => this.insertTrackerCodeblock() });
		this.addCommand({ id: 'insert-habit-checks', name: 'Insert Habit: Checks', editorCallback: (editor: Editor) => this.showChecksModal(editor) });
		this.addCommand({ id: 'insert-habit-rating', name: 'Insert Habit: Rating', editorCallback: (editor: Editor) => this.showRatingModal(editor) });
		this.addCommand({ id: 'insert-habit-number', name: 'Insert Habit: Number', editorCallback: (editor: Editor) => this.showNumberModal(editor) });
		this.addCommand({ id: 'insert-habit-progress', name: 'Insert Habit: Progress', editorCallback: (editor: Editor) => this.showProgressModal(editor) });

		this.registerEvent(
			this.app.workspace.on("editor-menu", (menu: Menu, editor: Editor) => {
				menu.addSeparator();
				menu.addItem((item) => item.setTitle("Insert Habit: Checks").setIcon("check-circle").onClick(() => this.showChecksModal(editor)));
				menu.addItem((item) => item.setTitle("Insert Habit: Rating").setIcon("star").onClick(() => this.showRatingModal(editor)));
				menu.addItem((item) => item.setTitle("Insert Habit: Number").setIcon("hash").onClick(() => this.showNumberModal(editor)));
				menu.addItem((item) => item.setTitle("Insert Habit: Progress").setIcon("bar-chart-2").onClick(() => this.showProgressModal(editor)));
			})
		);

		this.registerMarkdownPostProcessor(async (el, ctx) => {
			await this.refreshHabitCache();
			const elements = el.querySelectorAll("p, li");
			if (elements.length === 0) return;

			const regex = /(?:\[\[([^\]]+)\]\]|<a [^>]*>([^<]+)<\/a>)?\s*:?\s*\{\{([a-z]+):(.+?):(id\d+)\}\}/g;

			for (const p of Array.from(elements)) {
				if (!p.innerHTML.includes("{{")) continue;

				const newHtml = p.innerHTML.replace(regex, (
					fullMatch, rawHabitName, renderedHabitName, type, valStr, id
				) => {
					const habitName = rawHabitName || renderedHabitName;
					const habitProperties = habitName ? this.habitCache.get(habitName) : undefined;
					const parts = valStr.split(',');
					const warnFlag = (parts[parts.length - 1] || 'T').toUpperCase() === 'T';

					let renderedHtml = "";
					// CORRECTED: Function calls now match their definitions
					switch (type) {
						case "checks": renderedHtml = renderChecks(valStr, id, this); break;
						case "rating": renderedHtml = renderRating(valStr, id, this); break;
						case "number": renderedHtml = renderNumber(valStr, id); break;
						case "progress": renderedHtml = renderProgress(valStr, id); break;
						default: return fullMatch;
					}

					let finalReplacement = fullMatch.replace(/\{\{.*\}\}/, renderedHtml);

					if (habitName && warnFlag && !this.habitCache.has(habitName)) {
						finalReplacement += ` <em class="habit-warning">❗Warning, <strong>${habitName}</strong> is not in Habit Folder.</em>`;
					}

					return finalReplacement;
				});

				if (newHtml !== p.innerHTML) {
					p.innerHTML = newHtml;
					// CORRECTED: Cast 'p' to HTMLElement
					attachHandlers(p as HTMLElement, this);
				}
			}
		});

		registerHabitTrackerBlock(this);
	}

	insertTrackerCodeblock() {
		const editor = this.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
		if (editor) {
			new BlockSettingsModal(this.app, (result) => {
				const codeblock = "```habit-tracker\n" + result + "\n```";
				const cursor = editor.getCursor();
				const currentLine = editor.getLine(cursor.line);
	
				if (currentLine.trim().length > 0) {
					editor.replaceRange("\n" + codeblock, { line: cursor.line, ch: currentLine.length });
				} else {
					editor.replaceRange(codeblock, cursor);
				}
			}).open();
		}
	}

	insertMarker(editor: Editor, type: string, val: string) {
		const id = `id${Date.now()}${Math.floor(Math.random() * 100)}`;
		editor.replaceSelection(`{{${type}:${val}:${id}}}`);
	}
	
	showChecksModal(editor: Editor) {
        const line = editor.getLine(editor.getCursor().line);
        const match = line.match(/\[\[([^\]]+)\]\]/);
        const habitName = match ? match[1] : null;
        const props = habitName ? this.habitCache.get(habitName) : null;
        const initialChecked = (props && props[this.settings.prop_Checked_Icon]) || this.settings.inline_DefaultCheckedIcon;
        const initialUnchecked = (props && props[this.settings.prop_Unchecked_Icon]) || this.settings.inline_DefaultUncheckedIcon;
		new ChecksModal(this.app, initialChecked, initialUnchecked, (count, checkedIcon, uncheckedIcon, warn) => {
			const warnFlag = warn ? 'T' : 'F';
			this.insertMarker(editor, "checks", `0,${count},${"0".repeat(count)},${checkedIcon},${uncheckedIcon},${warnFlag}`);
		}).open();
	}

	showRatingModal(editor: Editor) {
        const line = editor.getLine(editor.getCursor().line);
        const match = line.match(/\[\[([^\]]+)\]\]/);
        const habitName = match ? match[1] : null;
        const props = habitName ? this.habitCache.get(habitName) : null;
        const initialRated = (props && props[this.settings.prop_Rated_Icon]) || this.settings.inline_DefaultRatedIcon;
        const initialUnrated = (props && props[this.settings.prop_Unrated_Icon]) || this.settings.inline_DefaultUnratedIcon;
		new RatingModal(this.app, initialRated, initialUnrated, (max, rated, unrated, warn) => {
			const warnFlag = warn ? 'T' : 'F';
			this.insertMarker(editor, "rating", `0,${max},${rated},${unrated},${warnFlag}`);
		}).open();
	}

	showNumberModal(editor: Editor) {
		new NumberModal(this.app, (val, max, unit, warn) => {
			const warnFlag = warn ? 'T' : 'F';
			this.insertMarker(editor, "number", `${val},${max},${unit},${warnFlag}`);
		}).open();
	}

	showProgressModal(editor: Editor) {
		new ProgressModal(this.app, (val, total, warn) => {
			const warnFlag = warn ? 'T' : 'F';
			this.insertMarker(editor, "progress", `${val},${total},${warnFlag}`);
		}).open();
	}

	async refreshHabitCache() {
		this.habitCache = await buildHabitCache(this.app, this);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.refreshHabitCache();
	}

	onunload() {
		console.log('Unloading Habit Tracker Plugin');
	}
}
