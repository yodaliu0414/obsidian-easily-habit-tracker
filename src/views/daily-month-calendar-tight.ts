import { App, moment, MarkdownPostProcessorContext,TFile } from 'obsidian';
import HabitTrackerPlugin from '../main';
import { HabitDataMap } from '../readHabits';
import { getIconInfo, createIconElement } from './viewUtils';

/**
 * Renders a "tight" calendar view for a given month.
 * @param app The Obsidian App instance.
 * @param plugin The HabitTrackerPlugin instance.
 * @param el The HTML element to render into.
 * @param data The processed habit data for the period.
 * @param settings The settings from the code block.
 * @param habitsToRender The list of habit names to display.
 */
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
    
    const mainContainer = el.createDiv();
    const headerContainer = mainContainer.createDiv({ cls: 'habit-header-container' });
    headerContainer.style.display = 'flex';
    headerContainer.style.justifyContent = 'space-between';
    headerContainer.style.alignItems = 'center';

    headerContainer.createEl('h4', { text: month.format("MMMM YYYY") });

    const controls = headerContainer.createDiv({ cls: 'habit-controls' });
    controls.style.display = 'flex';
    controls.style.gap = '8px';

    const shapeButton = controls.createEl('button', { text: `Use ${currentShape === 'circle' ? 'Square' : 'Circle'}` });
    shapeButton.onClickEvent(() => {
        currentShape = currentShape === 'circle' ? 'square' : 'circle';
        shapeButton.setText(`Use ${currentShape === 'circle' ? 'Square' : 'Circle'}`);
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

    // --- Redraw Function ---
    function redrawCalendars() {
        calendarContainer.empty();

        for (let i = 0; i < habitsToRender.length; i += habitsPerRow) {
            const habitChunk = habitsToRender.slice(i, i + habitsPerRow);
            
            const rowContainer = calendarContainer.createDiv({ cls: 'habit-calendar-row' });
            rowContainer.style.display = 'grid';
            rowContainer.style.gridTemplateColumns = `repeat(${habitsPerRow}, 1fr)`;
            rowContainer.style.gap = '16px';
            rowContainer.style.marginBottom = '12px';

            for (const habitName of habitChunk) {
                const habitContainer = rowContainer.createDiv({ cls: 'habit-calendar-instance' });
                const habitTitle = habitContainer.createEl('div', { text: habitName, cls: 'habit-calendar-title' });
                habitTitle.style.fontWeight = 'bold';
                habitTitle.style.marginBottom = '4px';
                habitTitle.style.fontSize = '0.9em';

                // --- CORRECTED: Using the original grid structure ---
                const grid = habitContainer.createDiv();
                grid.style.display = 'grid';
                grid.style.gridTemplateColumns = 'repeat(7, 1fr)';
                grid.style.gap = '2px';

                // Add day of week headers
                ['M', 'T', 'W', 'T', 'F', 'S', 'S'].forEach(day => {
                    grid.createDiv({ text: day, cls: 'habit-calendar-dow' }).style.textAlign = 'center';
                });

                // Render calendar days
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
        
        if (!(file instanceof TFile)) {
            console.error("Habit Tracker: Source path is not a file.", ctx.sourcePath);
            return;
        }

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

        if (!found) {
            newBlockLines.push(`${key}: ${value}`);
        }

        const newLines = [
            ...lines.slice(0, section.lineStart + 1),
            ...newBlockLines,
            ...lines.slice(section.lineEnd)
        ];

        await app.vault.modify(file, newLines.join('\n'));
    }
    redrawCalendars(); // Initial draw
}
