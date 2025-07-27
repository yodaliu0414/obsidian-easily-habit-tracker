import { App, MarkdownPostProcessorContext, parseYaml } from 'obsidian';
import type HabitTrackerPlugin from './main';
import { readHabitData } from './readHabits';
import { renderCalendarTight } from './views/daily-month-calendar-tight';
import { renderCalendarYearTight } from './views/daily-year-calendar-tight';
import { renderListRow } from './views/daily-week-list-row';
import { renderMonthListRow } from './views/daily-month-list-row';

// --- View Router ---
const viewRenderers: { [key: string]: Function } = {
    'daily-month-Calendar-Tight': renderCalendarTight,
    'daily-year-Calendar-Tight': renderCalendarYearTight,
    'daily-week-List-Row': renderListRow,
    'daily-month-List-Row': renderMonthListRow,
};

/**
 * Registers the handler for the 'habit-tracker' code block.
 */
export function registerHabitTrackerBlock(plugin: HabitTrackerPlugin) {
    // CORRECTED: Added explicit types for source, el, and ctx
    plugin.registerMarkdownCodeBlockProcessor('habit-tracker', (source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
        renderHabitBlock(plugin, source, el, ctx);
    });
}

/**
 * The main function to render a habit tracker code block.
 */
async function renderHabitBlock(plugin: HabitTrackerPlugin, source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) {
    el.empty();

    let settings: any;
    try {
        settings = parseYaml(source);
    } catch (e) {
        el.createEl('pre', { text: `Error parsing habit tracker settings:\n${e.message}` });
        return;
    }

    let habitsToRender: string[] = [];
    if (!settings.habits || settings.habits.trim().toUpperCase() === 'ALL') {
        habitsToRender = Array.from(plugin.habitCache.keys());
    } else {
        const specifiedHabits = settings.habits.replace(/\[\[|\]\]/g, '').split(',').map((h: string) => h.trim());
        habitsToRender = specifiedHabits.filter((habitName: string) => plugin.habitCache.has(habitName));
    }

    if (habitsToRender.length === 0) {
        el.createEl('p', { text: 'No valid habits found to render.' });
        return;
    }

    const dataMap = await readHabitData(plugin.app, plugin, settings, habitsToRender);

    const type = settings.type || 'daily';
    const [periodType] = (settings.period || 'month').split(' ');
    const viewStyle = settings.view || 'Calendar-Tight';

    const viewKey = `${type}-${periodType}-${viewStyle}`;
    const renderer = viewRenderers[viewKey];

    if (renderer) {
        await renderer(plugin.app, plugin, el, dataMap, settings, habitsToRender, ctx);
    } else {
        el.createEl('p', { 
            text: `Error: No view found for the combination type: "${type}", period: "${periodType}", view: "${viewStyle}"` 
        });
        console.error(`Habit Tracker: No renderer found for key "${viewKey}"`);
    }
}
