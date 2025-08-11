import { App, moment, MarkdownPostProcessorContext,TFile } from 'obsidian';
import HabitTrackerPlugin from '../main';
import { HabitDataMap } from '../readHabits';
import { getIconInfo, createIconElement } from './viewUtils';

export async function renderCalendarTight(
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

    let currentShape = settings.shape || 'circle';
    let habitsPerRow = settings.habitsPerRow || Math.min(4, habitsToRender.length) || 1;
    
    const mainContainer = el.createDiv({cls:'habit-main-container'});
    
    const headerContainer = mainContainer.createDiv({ cls: 'dmct-habit-header-container' });
    headerContainer.createEl('h4', { text: month.format("MMMM YYYY") });
    const controls = headerContainer.createDiv({ cls: 'dmct-habit-controls' });

    const shapeButton = controls.createEl('button', { text: `Use ${currentShape === 'circle' ? 'Square' : 'Circle'}` });
    shapeButton.onClickEvent(() => {
        currentShape = currentShape === 'circle' ? 'square' : 'circle';
        updateCodeBlockSource('shape', currentShape);
    });

    const decreaseButton = controls.createEl('button', { text: '-' });
    decreaseButton.onClickEvent(() => {
        habitsPerRow = Math.max(1, habitsPerRow - 1);
        updateCodeBlockSource('habitsPerRow', habitsPerRow.toString());
    });

    const increaseButton = controls.createEl('button', { text: '+' });
    increaseButton.onClickEvent(() => {
        habitsPerRow = Math.min(habitsToRender.length, habitsPerRow + 1);
        updateCodeBlockSource('habitsPerRow', habitsPerRow.toString());
    });

    const calendarContainer = mainContainer.createDiv();


    function redrawCalendars() {
        calendarContainer.empty();
        for (let i = 0; i < habitsToRender.length; i += habitsPerRow) {
            const habitChunk = habitsToRender.slice(i, i + habitsPerRow);
            const rowContainer = calendarContainer.createDiv({ cls: 'dmct-habit-calendar-row' });
            rowContainer.style.setProperty('--habits-per-row', habitsPerRow.toString());
            for (const habitName of habitChunk) {
                const habitContainer = rowContainer.createDiv({ cls: 'dmct-habit-calendar-instance' });
                habitContainer.createEl('div', { text: habitName, cls: 'dmct-habit-calendar-title' });
                
                const grid = habitContainer.createDiv({cls: 'dmct-habit-calendar-grid'});

                ['M', 'T', 'W', 'T', 'F', 'S', 'S'].forEach(day => {
                    grid.createDiv({ text: day, cls: 'dmct-habit-calendar-dow' });
                });

                const startDate = month.clone().startOf('month');
                const firstDayOfWeek = startDate.isoWeekday() - 1; // 0=Mon, 6=Sun
                
                for (let j = 0; j < firstDayOfWeek; j++) {
                    grid.createDiv(); // Spacer cells
                }

                for (let j = 0; j < month.daysInMonth(); j++) {
                    const day = startDate.clone().date(j + 1);
                    const dayStr = day.format('YYYY-MM-DD');
                    const habitData = data.get(dayStr)?.get(habitName);
                    
                    // --- REFACTORED LOGIC ---
                    const iconInfo = getIconInfo(plugin, settings, habitName, dayStr, habitData, currentShape);
                    const iconEl = createIconElement(app, iconInfo);
                    
                    // Append the icon element directly to the grid
                    grid.appendChild(iconEl);
                }
            }
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
    redrawCalendars();
}
