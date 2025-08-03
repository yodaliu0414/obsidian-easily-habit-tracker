import { App, PluginSettingTab, Setting, Notice, moment, TFolder } from "obsidian";
import HabitTrackerPlugin from "./main"; // Import the main plugin class
import { FolderSuggestModal } from './modals';
import { PeriodicNotesSettings, getPeriodicNotesSettings } from './periodicNotesUtils';
import { cssVarToHex } from './colorUtils';

// This interface defines all the settings for our plugin.
export interface HabitTrackerSettings {
	habitFolder: string;
	exclusionList: string[]; // Changed from exclusionFilters to exclusionList
	prop_Habit_Color: string;
	prop_Habit_Short_Name: string;
	prop_Checked_Icon: string;
	prop_Unchecked_Icon: string;
	prop_Rated_Icon: string;
	prop_Unrated_Icon: string;
	prop_Completed_Icon_In_Calendar: string;
	prop_Uncompleted_Icon_In_Calendar: string;
	prop_if_Archived: string;
	prop_if_use_customized_color: string;
	habitHeading: string;
	inline_DefaultCheckedIcon: string;
	inline_DefaultUncheckedIcon: string;
	inline_DefaultRatedIcon: string;
	inline_DefaultUnratedIcon: string;
	render_DefaultCompletedIcon: string;
	render_DefaultUncompletedIcon: string;
	globalHabitColor: string; // Added global color setting
}

// This constant holds the default values for our settings.
export const DEFAULT_SETTINGS: HabitTrackerSettings = {
	habitFolder: "Habits",
	exclusionList: [], // Default to an empty array
	prop_Habit_Color: "Habit_Color",
	prop_Habit_Short_Name: "Habit_Short_Name",
	prop_Checked_Icon: "Checked_Icon",
	prop_Unchecked_Icon: "Unchecked_Icon",
	prop_Rated_Icon: "Rated_Icon",
	prop_Unrated_Icon: "Unrated_Icon",
	prop_Completed_Icon_In_Calendar: "Completed_Icon_In_Calendar",
	prop_Uncompleted_Icon_In_Calendar: "Uncompleted_Icon_In_Calendar",
	prop_if_Archived: "if_Archived",
	prop_if_use_customized_color: "if_use_customized_color",
	habitHeading: "Habits",
	inline_DefaultCheckedIcon: "✅",
	inline_DefaultUncheckedIcon: "❌",
	inline_DefaultRatedIcon: "⭐",
	inline_DefaultUnratedIcon: "☆",
	render_DefaultCompletedIcon: "🟢",
	render_DefaultUncompletedIcon: "🔴",
	globalHabitColor: "#483699", // A default color
};

// This is the class that creates the UI in the settings tab.
export class HabitSettingTab extends PluginSettingTab {
	plugin: HabitTrackerPlugin;

	constructor(app: App, plugin: HabitTrackerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	// The display method is now async to handle await for periodic notes settings
	async display(): Promise<void> {
		const { containerEl } = this;
		containerEl.empty(); // Clear old settings

		// ### Habits Page Settings ###
		containerEl.createEl("h3", { text: "Habits Page" });

		new Setting(containerEl)
			.setName("Habit folder")
			.setDesc("Choose the folder where your habit notes are stored.")
			.addButton(btn => btn
				.setButtonText(this.plugin.settings.habitFolder || "Select Folder")
				.onClick(() => {
					new FolderSuggestModal(this.app, (folderPath) => {
						if (folderPath) {
							this.plugin.settings.habitFolder = folderPath;
							this.plugin.saveSettings();
							this.display(); // Refresh the settings tab to show the new folder
						}
					}).open();
				})
			);

		new Setting(containerEl)
			.setName("Add exclusion filter")
			.setDesc("Type a word and press Enter to add it to the exclusion list.")
			.addText(text => {
				text.setPlaceholder("Exclude files containing...");
				text.inputEl.addEventListener('keydown', async (e: KeyboardEvent) => {
					if (e.key === 'Enter') {
						e.preventDefault();
						const newFilter = text.getValue().trim();
						if (newFilter && !this.plugin.settings.exclusionList.includes(newFilter)) {
							this.plugin.settings.exclusionList.push(newFilter);
							await this.plugin.saveSettings();
							this.display(); // Refresh to show the new tag
						}
						text.setValue(""); 
					}
				});
			});

		// Display the list of filters as tags
		const filterListEl = containerEl.createDiv({ cls: 'filter-list' });
		this.plugin.settings.exclusionList.forEach(filter => {
			const filterTagEl = filterListEl.createSpan({ cls: 'filter-tag' });
			filterTagEl.setText(filter);
			const removeBtn = filterTagEl.createEl('button', { text: 'x', cls: 'remove-filter-btn' });
			// CORRECTED: Use addEventListener for standard HTML elements
			removeBtn.addEventListener('click', async () => {
				const index = this.plugin.settings.exclusionList.indexOf(filter);
				if (index > -1) {
					this.plugin.settings.exclusionList.splice(index, 1);
					await this.plugin.saveSettings();
					this.display(); // Refresh to remove the tag
				}
			});
		});

		// This heading acts as a sub-section under "Habits Page Settings"
		containerEl.createEl("h4", { text: "Customized Properties Name" });
		
        // A helper function to create property name settings to avoid repeating code
		const createPropertySetting = (name: string, desc: string, key: keyof HabitTrackerSettings) => {
			new Setting(containerEl)
				.setName(name)
				.setDesc(desc)
				.addText((text) =>
					text
						.setValue(this.plugin.settings[key] as string)
						.onChange(async (value) => {
							(this.plugin.settings[key] as string) = value;
							await this.plugin.saveSettings();
						})
				);
		};
		
		createPropertySetting("Habit Color", "Property name for habit color.", "prop_Habit_Color");
		createPropertySetting("Habit Short Name", "Property name for habit short name.", "prop_Habit_Short_Name");
		createPropertySetting("Checked Icon", "Property name for checked icon inline.", "prop_Checked_Icon");
		createPropertySetting("Unchecked Icon", "Property name for unchecked icon inline.", "prop_Unchecked_Icon");
		createPropertySetting("Rated Icon", "Property name for rated icon.", "prop_Rated_Icon");
		createPropertySetting("Unrated Icon", "Property name for unrated icon.", "prop_Unrated_Icon");
		createPropertySetting("Completed Icon in Calendar", "Property name for calendar completed icon.", "prop_Completed_Icon_In_Calendar");
		createPropertySetting("Uncompleted Icon in Calendar", "Property name for calendar uncompleted icon.", "prop_Uncompleted_Icon_In_Calendar");
		createPropertySetting("Is Archived", "Property name for archived status.", "prop_if_Archived");
		createPropertySetting("Use Customized Color", "Property name for using custom color.", "prop_if_use_customized_color");


		// ### Periodic Habits Settings ###
		containerEl.createEl("h3", { text: "Periodic Habits" });
		
		// CORRECTED: This variable will hold the results container.
		let periodicSettingsContainer: HTMLDivElement;

		new Setting(containerEl)
			.setName("Periodic Notes Integration")
			.setDesc("Click to refresh settings from the Periodic Notes plugin and test today's note path.")
			.addButton(btn => btn
				.setButtonText("Refresh & Test")
				.onClick(() => {
					// The container is defined below, but accessible here through closure.
					// Pass `true` to indicate the test should run.
					this.renderPeriodicSettings(periodicSettingsContainer, true);
				})
			);

		// CORRECTED: Create the container *after* the setting to ensure it appears below.
		periodicSettingsContainer = containerEl.createDiv();
		
		// Initial render on load, without running the test.
		this.renderPeriodicSettings(periodicSettingsContainer, false); 

		new Setting(containerEl)
			.setName("Habit heading")
			.setDesc("The heading in your periodic notes where habits are located.")
			.addText((text) =>
				text
					.setValue(this.plugin.settings.habitHeading)
					.onChange(async (value) => {
						this.plugin.settings.habitHeading = value;
						await this.plugin.saveSettings();
					})
			);

		// ### Inline Habit Settings ###
		containerEl.createEl("h3", { text: "Inline Habits" });

        const createIconSetting = (name: string, key: keyof HabitTrackerSettings) => {
			new Setting(containerEl)
				.setName(name)
				.addText((text) =>
					text
						.setValue(this.plugin.settings[key] as string)
						.onChange(async (value) => {
							(this.plugin.settings[key] as string) = value;
							await this.plugin.saveSettings();
						})
				);
		};

        createIconSetting("Default checked icon", "inline_DefaultCheckedIcon");
        createIconSetting("Default unchecked icon", "inline_DefaultUncheckedIcon");
        createIconSetting("Default rated icon", "inline_DefaultRatedIcon");
        createIconSetting("Default unrated icon", "inline_DefaultUnratedIcon");

		// ### Render Settings ###
		containerEl.createEl("h3", { text: "Rendering Habits" });
		
		new Setting(containerEl)
			.setName("Global Color")
			.setDesc("The default color for all habit visualizations.")
			.addColorPicker(color => color
				.setValue(this.plugin.settings.globalHabitColor || DEFAULT_SETTINGS.globalHabitColor)
				.onChange(async (value) => {
					this.plugin.settings.globalHabitColor = value;
					await this.plugin.saveSettings();
				}))
			.addButton(btn => btn
				.setIcon("reset")
				.setTooltip("Use theme accent color")
				.onClick(async () => {
					const accentColor = cssVarToHex('--interactive-accent') || DEFAULT_SETTINGS.globalHabitColor;
					this.plugin.settings.globalHabitColor = accentColor;
					await this.plugin.saveSettings();
					this.display(); // Refresh to show the new color
				}));


        createIconSetting("Default completed icon", "render_DefaultCompletedIcon");
        createIconSetting("Default uncompleted icon", "render_DefaultUncompletedIcon");
	}

	/**
	 * Renders the status of the Periodic Notes plugin settings.
	 * @param containerEl The HTML element to render the settings into.
	 * @param testPath If true, will run a test to find today's daily note and show a Notice.
	 */
	private renderPeriodicSettings(containerEl: HTMLElement, testPath: boolean = false) {
		containerEl.empty(); // Clear previous results
		const periodicNotesSettings = getPeriodicNotesSettings(this.app);
		
		// Use `any` to access properties of the external plugin's settings
		const anySettings = periodicNotesSettings as PeriodicNotesSettings;

		if (!anySettings || Object.keys(anySettings).filter(k => anySettings[k]?.enabled).length === 0) {
			containerEl.createEl('p', { text: 'Could not read settings from Periodic Notes. Is it installed and enabled? Or are no periodic notes enabled?' });
			return;
		}

		containerEl.createEl('p', { text: 'Found Periodic Notes settings. Your configured path formats are:' });

		const periodicTypes = [
			{ key: 'daily', name: 'Daily' },
			{ key: 'weekly', name: 'Weekly' },
			{ key: 'monthly', name: 'Monthly' },
			{ key: 'yearly', name: 'Yearly' }
		];

		const pathList = containerEl.createEl('ul', { cls: 'periodic-paths-list' });

		periodicTypes.forEach(type => {
			const settings = anySettings[type.key];
			
			let pathFormat = "Not available";
			// Check if the specific periodic note type is enabled
			if (settings && settings.enabled) {
				const format = settings.format || '';
				const folder = settings.folder || '';
				// Construct the path, cleaning up any potential double slashes
				pathFormat = `${folder}/${format}.md`.replace(/^\/|\/$/g, '').replace('//', '/');
			}
			
			const item = pathList.createEl('li');
			item.createEl('strong', { text: `${type.name}: ` });
			item.createSpan({ text: pathFormat });
		});

		// Test today's daily note only if requested by the button click
		if (testPath) {
			if (anySettings.daily?.enabled) {
				const dailyNoteFormat = anySettings.daily.format || 'YYYY-MM-DD';
				const dailyNoteFolder = anySettings.daily.folder || '';
				const filename = moment().format(dailyNoteFormat) + '.md';
				const path = dailyNoteFolder ? `${dailyNoteFolder}/${filename}` : filename;
				console.log("Calculated Daily Note Path:", path);
				new Notice(`Today's daily note path: ${path}`);
			} else {
				new Notice("Daily notes are not enabled in Periodic Notes, cannot run test.");
			}
		}
	}
}
