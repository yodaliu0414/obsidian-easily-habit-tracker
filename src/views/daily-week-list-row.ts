import { App, moment, MarkdownPostProcessorContext, TFile } from 'obsidian';
import HabitTrackerPlugin from '../main';
import { HabitDataMap } from '../readHabits';
import { getIconInfo, createIconElement } from './viewUtils';

export async function renderListRow(
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
    const week = moment(periodValue, 'YYYY-[W]WW');

    let currentShape = settings.shape || 'circle';
    
    const mainContainer = el.createDiv();
    const headerContainer = mainContainer.createDiv({ cls: 'habit-header-container'});
    headerContainer.style.display = 'flex';
    headerContainer.style.justifyContent = 'space-between';
    headerContainer.style.alignItems = 'center';

    headerContainer.createEl('h4', { text: `Week ${week.format("WW, YYYY")}` });
    const controls = headerContainer.createDiv({ cls: 'habit-controls' });
    controls.style.display = 'flex';
    controls.style.gap = '8px';

    const shapeButton = controls.createEl('button', { text: `Use ${currentShape === 'circle' ? 'Square' : 'Circle'}` });
    shapeButton.onClickEvent(() => {
        currentShape = currentShape === 'circle' ? 'square' : 'circle';
        updateCodeBlockSource('shape', currentShape);
    });

    const listContainer = mainContainer.createDiv({ cls: 'habit-list-container' });
    listContainer.style.display = 'grid';
    // CORRECTED: Changed '1fr' to 'auto' to make the first column fit its content
    listContainer.style.gridTemplateColumns = 'auto repeat(7, 30px)'; 
    listContainer.style.gap = '4px';
    listContainer.style.alignItems = 'center';
    listContainer.style.marginTop = '8px';
    // Added this to make the whole grid align to the left
    listContainer.style.width = 'max-content';

    // --- Render Header Row ---
    listContainer.createDiv(); // Empty cell for the top-left corner
    ['M', 'T', 'W', 'T', 'F', 'S', 'S'].forEach(day => {
        const headerEl = listContainer.createDiv({ text: day, cls: 'habit-list-dow' });
        headerEl.style.textAlign = 'center';
        headerEl.style.fontWeight = 'bold';
        headerEl.style.fontSize = '0.9em';
    });

    // --- Render Habit Rows ---
    const startDate = week.clone().startOf('isoWeek');
    for (const habitName of habitsToRender) {
        const nameEl = listContainer.createDiv({ text: habitName, cls: 'habit-list-name' });
        nameEl.style.fontSize = '0.9em';
        nameEl.style.paddingRight = '8px';
        nameEl.style.whiteSpace = 'nowrap'; // Prevent long names from wrapping

        for (let i = 0; i < 7; i++) {
            const day = startDate.clone().add(i, 'days');
            const dayStr = day.format('YYYY-MM-DD');
            const habitData = data.get(dayStr)?.get(habitName);

            const iconInfo = getIconInfo(plugin, settings, habitName, dayStr, habitData, currentShape);
            const iconEl = createIconElement(app, iconInfo);
            iconEl.style.justifySelf = 'center';
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
