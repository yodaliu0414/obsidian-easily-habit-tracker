import { App, moment, MarkdownPostProcessorContext, TFile } from 'obsidian';
import HabitTrackerPlugin from '../main';
import { HabitDataMap } from '../readHabits';
import { getIconInfo, createIconElement } from './viewUtils';

export async function renderMonthListRow(
    app: App, 
    plugin: HabitTrackerPlugin, 
    el: HTMLElement, 
    data: HabitDataMap, 
    settings: any,
    habitsToRender: string[],
    ctx: MarkdownPostProcessorContext
) {
    el.empty();
    const [periodType, periodValue] = settings.period.split(' ');
    const month = moment(periodValue, 'YYYY-MM');
    const daysInMonth = month.daysInMonth();

    let currentShape = settings.shape || 'circle';
    
    const mainContainer = el.createDiv({cls:'habit-main-container'});
    const headerContainer = mainContainer.createDiv({ cls: 'dmlr-habit-header-container'});
    headerContainer.createEl('h4', { text: month.format("MMMM, YYYY") });
    const controls = headerContainer.createDiv({ cls: 'dmlr-habit-controls' });

    const shapeButton = controls.createEl('button', { text: `Use ${currentShape === 'circle' ? 'Square' : 'Circle'}` });
    shapeButton.onClickEvent(() => {
        currentShape = currentShape === 'circle' ? 'square' : 'circle';
        updateCodeBlockSource('shape', currentShape);
    });

    const listContainer = mainContainer.createDiv({ cls: 'dmlr-habit-list-container' });
    listContainer.style.setProperty('--days-in-month', daysInMonth.toString());
    

    // --- Render Header Row ---
    listContainer.createDiv(); // Empty cell for the top-left corner
    for (let i = 1; i <= daysInMonth; i++) {
        const dayString = i < 10 ? `0${i}` : i.toString();
        listContainer.createDiv({ text: dayString, cls: 'dmlr-habit-list-dow' });
    }

    // --- Render Habit Rows ---
    const startDate = month.clone().startOf('month');
    for (const habitName of habitsToRender) {
        listContainer.createDiv({ text: habitName, cls: 'dmlr-habit-list-name' });

        for (let i = 0; i < daysInMonth; i++) {
            const day = startDate.clone().add(i, 'days');
            const dayStr = day.format('YYYY-MM-DD');
            const habitData = data.get(dayStr)?.get(habitName);

            const iconInfo = getIconInfo(plugin, settings, habitName, dayStr, habitData, currentShape);
            const iconEl = createIconElement(app, iconInfo);
            listContainer.appendChild(iconEl);
        }
    }

    async function updateCodeBlockSource(key: string, value: string) {
        const file = app.vault.getAbstractFileByPath(ctx.sourcePath);
        if (!(file instanceof TFile)) return;
        const section = ctx.getSectionInfo(el);
        if (!section) return;

        const content = await app.vault.read(file);
        const lines = content.split('\n');
        const blockLines = lines.slice(section.lineStart + 1, section.lineEnd);
        const regex = new RegExp(`^(\\s*${key}:\\s*)(.*)$`);
        let found = false;
        
        const newBlockLines = blockLines.map(line => {
            const match = line.match(regex);
            if (match) {
                found = true;
                return `${match[1]}${value}`;
            }
            return line;
        });

        if (!found) newBlockLines.push(`${key}: ${value}`);

        const newLines = [...lines.slice(0, section.lineStart + 1), ...newBlockLines, ...lines.slice(section.lineEnd)];
        await app.vault.modify(file, newLines.join('\n'));
    }
}
