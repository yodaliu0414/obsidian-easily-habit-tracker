import { App, moment, MarkdownPostProcessorContext, TFile } from 'obsidian';
import type HabitTrackerPlugin from '../main';
import { HabitDataMap } from '../readHabits';
import { getIconInfo, createIconElement } from './viewUtils';

export async function renderCalendarYearTight(
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
    const year = moment(periodValue, 'YYYY');

    let currentShape = settings.shape || 'circle';
    
    const mainContainer = el.createDiv();
    const headerContainer = mainContainer.createDiv({ cls: 'dyct-habit-header-container' });
    headerContainer.createEl('h4', { text: year.format("YYYY") });
    const controls = headerContainer.createDiv({ cls: 'dyct-habit-controls' });

    const shapeButton = controls.createEl('button', { text: `Use ${currentShape === 'circle' ? 'Square' : 'Circle'}` });
    shapeButton.onClickEvent(() => {
        currentShape = currentShape === 'circle' ? 'square' : 'circle';
        updateCodeBlockSource('shape', currentShape);
    });

    const calendarContainer = mainContainer.createDiv();

    function drawCalendars() {
        calendarContainer.empty();

        for (const habitName of habitsToRender) {
            const habitContainer = calendarContainer.createDiv({ cls: 'dyct-habit-calendar-instance' });
            habitContainer.createEl('div', { text: habitName, cls: 'dyct-habit-calendar-title' });

            const loopStartDate = year.clone().startOf('year').startOf('isoWeek');
            const loopEndDate = year.clone().endOf('year').endOf('isoWeek');

            const weekMap = new Map<string, number>();
            let gridColumnCount = 0;
            for (let day = loopStartDate.clone(); day.isSameOrBefore(loopEndDate); day.add(1, 'day')) {
                const weekKey = `${day.isoWeekYear()}-${day.isoWeek()}`;
                if (!weekMap.has(weekKey)) {
                    gridColumnCount++;
                    weekMap.set(weekKey, gridColumnCount);
                }
            }

            const yearGrid = habitContainer.createDiv({ cls: 'dyct-habit-year-grid' });
            yearGrid.style.setProperty('--grid-column-count', gridColumnCount.toString());

            const monthHeaderContainer = yearGrid.createDiv({cls: 'dyct-month-header-container'});
            monthHeaderContainer.style.setProperty('--grid-column-count', gridColumnCount.toString());

            for (let m = 0; m < 12; m++) {
                const month = year.clone().month(m);
                const firstDayOfMonth = month.startOf('month');
                const weekKey = `${firstDayOfMonth.isoWeekYear()}-${firstDayOfMonth.isoWeek()}`;
                const gridColumn = weekMap.get(weekKey);
                
                if (gridColumn) {
                    const monthLabel = monthHeaderContainer.createDiv({ text: month.format('MMM'), cls: 'dyct-habit-month-label' });
                    monthLabel.style.setProperty("--grid-column", gridColumn.toString());
                }
            }

            const dayLabels = ['M', 'W', 'F'];
            const dayLabelPositions = [2, 4, 6];
            for(let d = 0; d < dayLabels.length; d++) {
                const dayLabel = yearGrid.createDiv({ text: dayLabels[d], cls: 'dyct-habit-dow-label' });
                // We add 1 to the row because the month headers are in row 1
                dayLabel.style.setProperty("--day-label", (dayLabelPositions[d] + 1).toString());
            }

            for (let day = loopStartDate.clone(); day.isSameOrBefore(loopEndDate); day.add(1, 'day')) {
                const weekKey = `${day.isoWeekYear()}-${day.isoWeek()}`;
                const gridColumn = weekMap.get(weekKey);
                const dayOfWeek = day.isoWeekday();
                
                if (gridColumn) {
                    const gridCell = yearGrid.createDiv();
                    // We add 1 to the column/row to account for the header rows/columns
                    gridCell.style.gridColumn = `${gridColumn + 1}`;
                    gridCell.style.gridRow = `${dayOfWeek + 1}`;
                    
                    if (day.year() === year.year()) {
                        const dayStr = day.format('YYYY-MM-DD');
                        const habitData = data.get(dayStr)?.get(habitName);
                        
                        const iconInfo = getIconInfo(plugin, settings, habitName, dayStr, habitData, currentShape);
                        const iconEl = createIconElement(app, iconInfo);
                        gridCell.appendChild(iconEl);
                    }
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

    drawCalendars();
}
