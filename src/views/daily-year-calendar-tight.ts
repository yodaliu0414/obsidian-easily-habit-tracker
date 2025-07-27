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
    let habitsPerRow = 1;
    
    const mainContainer = el.createDiv();
    const headerContainer = mainContainer.createDiv({ cls: 'habit-header-container' });
    headerContainer.style.display = 'flex';
    headerContainer.style.justifyContent = 'space-between';
    headerContainer.style.alignItems = 'center';

    headerContainer.createEl('h4', { text: year.format("YYYY") });
    const controls = headerContainer.createDiv({ cls: 'habit-controls' });
    controls.style.display = 'flex';
    controls.style.gap = '8px';

    const shapeButton = controls.createEl('button', { text: `Use ${currentShape === 'circle' ? 'Square' : 'Circle'}` });
    shapeButton.onClickEvent(() => {
        currentShape = currentShape === 'circle' ? 'square' : 'circle';
        updateCodeBlockSource('shape', currentShape);
    });

    const calendarContainer = mainContainer.createDiv();

    function drawCalendars() {
        calendarContainer.empty();

        for (let i = 0; i < habitsToRender.length; i += habitsPerRow) {
            const habitChunk = habitsToRender.slice(i, i + habitsPerRow);
            const rowContainer = calendarContainer.createDiv({ cls: 'habit-calendar-row' });
            rowContainer.style.display = 'grid';
            rowContainer.style.gridTemplateColumns = `repeat(${habitsPerRow}, 1fr)`;
            rowContainer.style.gap = '24px';
            rowContainer.style.marginBottom = '12px';
            for (const habitName of habitChunk) {
                const habitContainer = rowContainer.createDiv({ cls: 'habit-calendar-instance' });
                const titleContainer = habitContainer.createEl('div', { text: habitName, cls: 'habit-calendar-title' });
                titleContainer.style.fontSize = '0.9em';
                titleContainer.style.fontWeight = 'bold';
                titleContainer.style.marginBottom = '4px';
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

                const yearGrid = habitContainer.createDiv({ cls: 'habit-year-grid' });
                yearGrid.style.display = 'grid';
                yearGrid.style.gridTemplateColumns = `auto repeat(${gridColumnCount}, 1fr)`; 
                yearGrid.style.gridTemplateRows = 'auto repeat(7, 1fr)'; 
                yearGrid.style.gap = '2px';
                yearGrid.style.alignItems = 'center';

                const monthHeaderContainer = createDiv({cls: 'month-header-container'});
                monthHeaderContainer.style.gridColumn = `2 / span ${gridColumnCount}`;
                monthHeaderContainer.style.gridRow = '1';
                monthHeaderContainer.style.display = 'grid';
                monthHeaderContainer.style.gridTemplateColumns = `repeat(${gridColumnCount}, 1fr)`;
                monthHeaderContainer.style.gap = '2px';
                
                for (let m = 0; m < 12; m++) {
                    const month = year.clone().month(m);
                    const firstDayOfMonth = month.startOf('month');
                    const weekKey = `${firstDayOfMonth.isoWeekYear()}-${firstDayOfMonth.isoWeek()}`;
                    const gridColumn = weekMap.get(weekKey);
                    
                    if (gridColumn) {
                        const monthLabel = createDiv({ text: month.format('MMM'), cls: 'habit-month-label' });
                        monthLabel.style.gridColumn = `${gridColumn}`;
                        monthLabel.style.fontSize = '0.8em';
                        monthLabel.style.textAlign = 'center';
                        monthHeaderContainer.appendChild(monthLabel);
                    }
                }
                yearGrid.appendChild(monthHeaderContainer);

                const dayLabels = ['M', 'W', 'F'];
                const dayLabelPositions = [2, 4, 6];
                for(let d = 0; d < dayLabels.length; d++) {
                    const dayLabel = createDiv({ text: dayLabels[d], cls: 'habit-dow-label' });
                    dayLabel.style.gridColumn = '1';
                    dayLabel.style.gridRow = `${dayLabelPositions[d]}`;
                    dayLabel.style.fontSize = '0.8em';
                    dayLabel.style.paddingRight = '8px';
                    yearGrid.appendChild(dayLabel);
                }

                for (let day = loopStartDate.clone(); day.isSameOrBefore(loopEndDate); day.add(1, 'day')) {
                    const weekKey = `${day.isoWeekYear()}-${day.isoWeek()}`;
                    const gridColumn = weekMap.get(weekKey);
                    const dayOfWeek = day.isoWeekday();
                    
                    // CORRECTED: Check if gridColumn is defined before using it
                    if (gridColumn) {
                        if (day.year() === year.year()) {
                            const dayStr = day.format('YYYY-MM-DD');
                            const habitData = data.get(dayStr)?.get(habitName);
                            
                            const iconInfo = getIconInfo(plugin, settings, habitName, dayStr, habitData, currentShape);
                            const iconEl = createIconElement(app, iconInfo);

                            iconEl.style.gridColumn = `${gridColumn + 1}`;
                            iconEl.style.gridRow = `${dayOfWeek + 1}`;
                            yearGrid.appendChild(iconEl);
                        } else {
                            const placeholder = createDiv();
                            placeholder.style.gridColumn = `${gridColumn + 1}`;
                            placeholder.style.gridRow = `${dayOfWeek + 1}`;
                            yearGrid.appendChild(placeholder);
                        }
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
