import { App } from 'obsidian';
import HabitTrackerPlugin from '../main';
import { HabitData } from '../readHabits';
import { getCircleIcon, getCompletedCircleIcon, getFailedCircleIcon, getSquareIcon, getCompletedSquareIcon, getFailedSquareIcon } from '../icons';

/**
 * A data structure to hold all the necessary information for rendering a single icon.
 */
export interface IconInfo {
    html: string;
    linkPath: string;
    title: string;
}

/**
 * The core logic for determining which icon to display for a given day and habit.
 * This function encapsulates the entire icon selection hierarchy.
 * @param plugin The main plugin instance.
 * @param settings The settings from the code block.
 * @param habitName The name of the habit being processed.
 * @param dayStr The date string for the day (e.g., '2025-07-27').
 * @param habitData The data for the habit on that specific day (can be undefined).
 * @param currentShape The desired shape for the icon ('circle' or 'square').
 * @returns An IconInfo object with the final HTML and metadata for the icon.
 */
export function getIconInfo(
    plugin: HabitTrackerPlugin,
    settings: any,
    habitName: string,
    dayStr: string,
    habitData: HabitData | undefined,
    currentShape: 'circle' | 'square'
): IconInfo {
    const habitMeta = plugin.habitCache.get(habitName);
    
    // 1. Determine the color based on the hierarchy
    const color = (settings.useCustomizedColor && habitMeta?.[plugin.settings.prop_Habit_Color] && `#${habitMeta[plugin.settings.prop_Habit_Color]}`) 
                  || plugin.settings.globalHabitColor;

    // 2. Determine the icon properties based on the hierarchy
    const completedIconProp = habitMeta?.[plugin.settings.prop_Completed_Icon_In_Calendar] || plugin.settings.render_DefaultCompletedIcon;
    const uncompletedIconProp = habitMeta?.[plugin.settings.prop_Uncompleted_Icon_In_Calendar] || plugin.settings.render_DefaultUncompletedIcon;

    let html: string;
    let linkPath = '';
    let title = dayStr;

    if (habitData) {
        // Data exists for this day
        linkPath = `${habitData.sourcePath}#L${habitData.line + 1}`;
        title += `\nProgress: ${habitData.value}/${habitData.total}`;
        
        if (habitData.progress >= 1) {
            html = completedIconProp || (currentShape === 'circle' ? getCompletedCircleIcon(color) : getCompletedSquareIcon(color));
        } else if (habitData.progress > 0) {
            html = currentShape === 'circle' ? getCircleIcon(habitData.progress, color) : getSquareIcon(habitData.progress, color);
        } else {
            html = uncompletedIconProp || (currentShape === 'circle' ? getFailedCircleIcon() : getFailedSquareIcon());
        }
    } else {
        // No data for this day, treat as uncompleted
        html = uncompletedIconProp || (currentShape === 'circle' ? getFailedCircleIcon() : getFailedSquareIcon());
    }

    return { html, linkPath, title };
}

/**
 * Creates a clickable HTML element for an icon.
 * @param app The Obsidian App instance.
 * @param iconInfo The data for the icon to be created.
 * @returns An HTMLElement containing the icon.
 */
export function createIconElement(app: App, iconInfo: IconInfo): HTMLElement {
    const iconWrapper = createDiv({ cls: 'habit-calendar-icon', attr: { 'title': iconInfo.title } });
    iconWrapper.innerHTML = iconInfo.html;
    if (iconInfo.linkPath) {
        iconWrapper.addClass('is-clickable');
        iconWrapper.onClickEvent((e) => {
            e.preventDefault();
            app.workspace.openLinkText(iconInfo.linkPath, '', false);
        });
    }
    return iconWrapper;
}
