import { App, FuzzySuggestModal, Modal, Setting, TFolder, moment } from 'obsidian';
import HabitTrackerPlugin from './main';

// --- Folder Suggest Modal (already exists) ---
export class FolderSuggestModal extends FuzzySuggestModal<TFolder> {
    onChoose: (folder: string) => void;

    constructor(app: App, onChoose: (folder: string) => void) {
        super(app);
        this.onChoose = onChoose;
    }

    getItems(): TFolder[] {
        return this.app.vault.getAllLoadedFiles().filter((file): file is TFolder => file instanceof TFolder);
    }

    getItemText(folder: TFolder): string {
        return folder.path;
    }

    onChooseItem(folder: TFolder, evt: MouseEvent | KeyboardEvent): void {
        this.onChoose(folder.path);
        this.close();
    }
}

// --- Base Modal with Warning Toggle ---
class HabitModal extends Modal {
    warnIfNotFound: boolean = true;

    addWarningToggle(contentEl: HTMLElement) {
        new Setting(contentEl)
            .setName("Warn if not found")
            .setDesc("Show a warning if the linked habit note doesn't exist in the habit folder.")
            .addToggle(toggle => toggle
                .setValue(this.warnIfNotFound)
                .onChange(value => this.warnIfNotFound = value)
            );
    }
}

// --- Modals for Inline Habits ---

export class ChecksModal extends HabitModal {
    onSubmit: (count: number, checkedIcon: string, uncheckedIcon: string, warn: boolean) => void;
    count: number = 3;
    checkedIcon: string;
    uncheckedIcon: string;

    constructor(app: App, initialChecked: string, initialUnchecked: string, onSubmit: (count: number, checkedIcon: string, uncheckedIcon: string, warn: boolean) => void) {
        super(app);
        this.onSubmit = onSubmit;
        this.checkedIcon = initialChecked;
        this.uncheckedIcon = initialUnchecked;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl("h2", { text: "Insert Habit: Checks" });
        new Setting(contentEl).setName("Number of checks").addText(text => text.setValue(this.count.toString()).onChange(value => this.count = parseInt(value) || 3));
        new Setting(contentEl).setName("Checked Icon").addText(text => text.setValue(this.checkedIcon).onChange(value => this.checkedIcon = value));
        new Setting(contentEl).setName("Unchecked Icon").addText(text => text.setValue(this.uncheckedIcon).onChange(value => this.uncheckedIcon = value));
        this.addWarningToggle(contentEl);
        new Setting(contentEl).addButton(btn => btn.setButtonText("Insert").setCta().onClick(() => {
            this.close();
            this.onSubmit(this.count, this.checkedIcon, this.uncheckedIcon, this.warnIfNotFound);
        }));
    }

    onClose() { this.contentEl.empty(); }
}

export class RatingModal extends HabitModal {
    onSubmit: (max: number, rated: string, unrated: string, warn: boolean) => void;
    max: number = 5;
    rated: string;
    unrated: string;

    constructor(app: App, initialRated: string, initialUnrated: string, onSubmit: (max: number, rated: string, unrated: string, warn: boolean) => void) {
        super(app);
        this.onSubmit = onSubmit;
        this.rated = initialRated;
        this.unrated = initialUnrated;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl("h2", { text: "Insert Habit: Rating" });
        new Setting(contentEl).setName("Max rating").addText(text => text.setValue(this.max.toString()).onChange(value => this.max = parseInt(value) || 5));
        new Setting(contentEl).setName("Rated icon").addText(text => text.setValue(this.rated).onChange(value => this.rated = value));
        new Setting(contentEl).setName("Unrated icon").addText(text => text.setValue(this.unrated).onChange(value => this.unrated = value));
        this.addWarningToggle(contentEl);
        new Setting(contentEl).addButton(btn => btn.setButtonText("Insert").setCta().onClick(() => {
            this.close();
            this.onSubmit(this.max, this.rated, this.unrated, this.warnIfNotFound);
        }));
    }

    onClose() { this.contentEl.empty(); }
}

export class NumberModal extends HabitModal {
    onSubmit: (val: number, max: number, unit: string, warn: boolean) => void;
    val: number = 0;
    max: number = 100;
    unit: string = "";

    constructor(app: App, onSubmit: (val: number, max: number, unit: string, warn: boolean) => void) {
        super(app);
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl("h2", { text: "Insert Habit: Number" });
        new Setting(contentEl).setName("Initial value").addText(text => text.setValue(this.val.toString()).onChange(value => this.val = parseInt(value) || 0));
        new Setting(contentEl).setName("Target value (Max)").addText(text => text.setValue(this.max.toString()).onChange(value => this.max = parseInt(value) || 100));
        new Setting(contentEl).setName("Unit (optional)").setDesc("e.g., pages, km, minutes").addText(text => text.setValue(this.unit).onChange(value => this.unit = value));
        this.addWarningToggle(contentEl);
        new Setting(contentEl).addButton(btn => btn.setButtonText("Insert").setCta().onClick(() => {
            this.close();
            this.onSubmit(this.val, this.max, this.unit, this.warnIfNotFound);
        }));
    }

    onClose() { this.contentEl.empty(); }
}

export class ProgressModal extends HabitModal {
    onSubmit: (val: number, total: number, warn: boolean) => void;
    val: number = 0;
    total: number = 100;

    constructor(app: App, onSubmit: (val: number, total: number, warn: boolean) => void) {
        super(app);
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl("h2", { text: "Insert Habit: Progress" });
        new Setting(contentEl).setName("Initial value").addText(text => text.setValue(this.val.toString()).onChange(value => this.val = parseInt(value) || 0));
        new Setting(contentEl).setName("Total value (Max)").addText(text => text.setValue(this.total.toString()).onChange(value => this.total = parseInt(value) || 100));
        this.addWarningToggle(contentEl);
        new Setting(contentEl).addButton(btn => btn.setButtonText("Insert").setCta().onClick(() => {
            this.close();
            this.onSubmit(this.val, this.total, this.warnIfNotFound);
        }));
    }

    onClose() { this.contentEl.empty(); }
}

// --- NEW MODAL FOR BLOCK SETTINGS ---
export class BlockSettingsModal extends Modal {
    onSubmit: (result: string) => void;

    habits: string = 'ALL';
    type: 'daily' | 'weekly' | 'monthly' | 'yearly' = 'daily';
    periodType: 'month' | 'week' | 'year' = 'month';
    periodValue: string = '';
    view: string = 'Calendar-Tight';
    shape: 'circle' | 'square' = 'circle';
    habitsPerRow: number = 2;
    useCustomizedColor: boolean = false;

    constructor(app: App, onSubmit: (result: string) => void) {
        super(app);
        this.onSubmit = onSubmit;
        this.updatePeriodDefault();
    }

    updatePeriodDefault() {
        switch(this.periodType) {
            case 'week': this.periodValue = moment().format('YYYY-[W]WW'); break;
            case 'month': this.periodValue = moment().format('YYYY-MM'); break;
            case 'year': this.periodValue = moment().format('YYYY'); break;
        }
    }

    onOpen() { this.display(); }

    display() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl("h2", { text: "Habit Tracker Block Settings" });

        new Setting(contentEl).setName("Habits to render").setDesc("Enter habit names as [[links]], separated by commas, or type ALL.").addTextArea(text => text.setPlaceholder("[[Habit 1]], [[Habit 2]]").setValue(this.habits).onChange(value => this.habits = value));
        new Setting(contentEl).setName("Data Source").addDropdown(dropdown => dropdown.addOption('daily', 'Daily Notes').addOption('weekly', 'Weekly Notes').setValue(this.type).onChange(value => this.type = value as 'daily' | 'weekly'));
        
        const periodSetting = new Setting(contentEl).setName("Period to Display");
        periodSetting.addDropdown(dropdown => dropdown.addOption('month', 'Month').addOption('week', 'Week').addOption('year', 'Year').setValue(this.periodType).onChange(value => { this.periodType = value as 'month' | 'week' | 'year'; this.updatePeriodDefault(); this.display(); }));
        periodSetting.addText(text => text.setValue(this.periodValue).onChange(value => this.periodValue = value));

        new Setting(contentEl)
            .setName("View Style")
            .addDropdown(dropdown => dropdown
                .addOption('Calendar-Tight', 'Calendar-Tight')
                .addOption('List-Row', 'List Row') // New option
                .setValue(this.view)
                .onChange(value => this.view = value));
        
        new Setting(contentEl).setName("Icon Shape").addDropdown(dropdown => dropdown.addOption('circle', 'Circle').addOption('square', 'Square').setValue(this.shape).onChange(value => this.shape = value as 'circle' | 'square'));
        new Setting(contentEl).setName("Habits per row").addText(text => text.setValue(this.habitsPerRow.toString()).onChange(value => this.habitsPerRow = parseInt(value) || 1));
        new Setting(contentEl).setName("Use customized color").addToggle(toggle => toggle.setValue(this.useCustomizedColor).onChange(value => this.useCustomizedColor = value));

        new Setting(contentEl).addButton(btn => btn.setButtonText("Insert Codeblock").setCta().onClick(() => { this.close(); this.onSubmit(this.buildResultString()); }));
    }

    buildResultString(): string {
        const lines = [
            `type: ${this.type}`,
            `habits: ${this.habits}`,
            `period: ${this.periodType} ${this.periodValue}`,
            `view: ${this.view}`,
            `shape: ${this.shape}`,
            `habitsPerRow: ${this.habitsPerRow}`,
            `useCustomizedColor: ${this.useCustomizedColor}`
        ];
        return lines.join('\n');
    }

    onClose() { this.contentEl.empty(); }
}