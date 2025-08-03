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
    
    const color = (settings.useCustomizedColor && habitMeta?.[plugin.settings.prop_Habit_Color] && `#${habitMeta[plugin.settings.prop_Habit_Color]}`) 
                  || plugin.settings.globalHabitColor;

    const completedIconProp = habitMeta?.[plugin.settings.prop_Completed_Icon_In_Calendar] || plugin.settings.render_DefaultCompletedIcon;
    const uncompletedIconProp = habitMeta?.[plugin.settings.prop_Uncompleted_Icon_In_Calendar] || plugin.settings.render_DefaultUncompletedIcon;

    let html: string;
    let linkPath = '';
    let title = dayStr;

    if (habitData) {
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
        html = uncompletedIconProp || (currentShape === 'circle' ? getFailedCircleIcon() : getFailedSquareIcon());
    }
    
    return { html, linkPath, title };
}

/**
 * Creates a clickable HTML element for an icon.
 */
export function createIconElement(app: App, iconInfo: IconInfo): HTMLElement {
    const iconWrapper = createDiv({ cls: 'habit-calendar-icon', attr: { 'title': iconInfo.title } });
    
    if (!iconInfo.html || iconInfo.html.trim() === '') {
        iconWrapper.setText('?'); // Fallback for genuinely empty data
        return iconWrapper;
    }

    // This is the safe logic to replace innerHTML
    if (iconInfo.html.trim().startsWith('<svg')) {
        // If it's an SVG, parse it safely
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(iconInfo.html, "image/svg+xml");
        const svgElement = svgDoc.documentElement;

        if (svgElement && svgElement.nodeName !== 'parsererror') {
            iconWrapper.appendChild(svgElement);
        } else {
            iconWrapper.setText('⚠️'); // Fallback for broken SVG
        }
    } else {
        // If it's not an SVG, it's probably an emoji. Use the safe setText method.
        iconWrapper.setText(iconInfo.html);
    }

    if (iconInfo.linkPath) {
        iconWrapper.addClass('is-clickable');
        iconWrapper.onClickEvent((e) => {
            e.preventDefault();
            app.workspace.openLinkText(iconInfo.linkPath, '', false);
        });
    }
    return iconWrapper;
}
