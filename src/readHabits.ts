import { App, TFile, moment, TFolder, Notice } from 'obsidian';
import { Moment } from 'moment';
import HabitTrackerPlugin from './main';

// --- TYPE DEFINITIONS ---

export interface HabitData {
    type: string;
    value: number;
    total: number;
    progress: number;
    sourcePath: string;
    line: number;
}

export type HabitDataMap = Map<string, Map<string, HabitData>>;

type NoteType = 'daily' | 'weekly' | 'monthly';

// --- SETTINGS HELPER ---

/**
 * A local, safe implementation to read the periodic note settings.
 * This function mimics the logic within the Periodic Notes plugin's main.js
 * by reading the publicly available `settings` property, which is a reliable approach.
 */
function getLocalPeriodicNoteSettings(app: App, noteType: NoteType): { folder: string, format: string } {
    const periodicNotes = (app as any).plugins.getPlugin("periodic-notes");
    
    const DEFAULTS = {
        daily: "YYYY-MM-DD",
        weekly: "gggg-[W]ww",
        monthly: "YYYY-MM",
    };

    // 1. Try to get settings from the Periodic Notes plugin itself
    if (periodicNotes && periodicNotes.settings?.[noteType]?.enabled) {
        // According to user feedback, 'folder' is a static prefix, 
        // and 'format' contains the full dynamic path.
        const { format, folder } = periodicNotes.settings[noteType] || {};
        return {
            format: format || DEFAULTS[noteType],
            folder: folder?.trim() || "", // folder can be an optional prefix
        };
    }
    
    // 2. Fallback for daily notes to the core 'daily-notes' plugin
    if (noteType === 'daily') {
        const dailyNotesPlugin = (app as any).internalPlugins.getPluginById("daily-notes");
        if (dailyNotesPlugin?.enabled) {
            const { folder, format } = dailyNotesPlugin.instance?.options || {};
             return {
                format: format || DEFAULTS.daily,
                folder: folder?.trim() || "",
            };
        }
    }
    
    // 3. Fallback for weekly notes to the Calendar plugin (as seen in main.js)
    if (noteType === 'weekly') {
        const calendarPlugin = (app as any).plugins.getPlugin("calendar");
        if (calendarPlugin) {
             const { weeklyNoteFormat, weeklyNoteFolder } = calendarPlugin.options || {};
             return {
                format: weeklyNoteFormat || DEFAULTS.weekly,
                folder: weeklyNoteFolder?.trim() || "",
            };
        }
    }

    // 4. Return default values if no specific settings are found
    return { format: DEFAULTS[noteType], folder: "" };
}


// --- MAIN FUNCTION (REWRITTEN with Path Generation logic) ---

export async function readHabitData(app: App, plugin: HabitTrackerPlugin, settings: any, habitsToRender: string[]): Promise<HabitDataMap> {

    const habitDataMap: HabitDataMap = new Map();
    const noteType = settings.type as NoteType;

    // 1. Get the folder (prefix) and format (path template) settings.
    const { folder, format } = getLocalPeriodicNoteSettings(app, noteType);

    // 2. Calculate the date range to iterate through.
    const [periodType, periodValue] = settings.period.split(' ');
    let startDate;
    if (periodType === 'week') {
        startDate = moment(periodValue, 'YYYY-[W]WW');
    } else {
        startDate = moment(periodValue);
    }
    const endDate = moment(startDate).endOf(periodType as any);

    console.log(`Habit Tracker: Generating paths for ${noteType} notes from ${startDate.format('YYYY-MM-DD')} to ${endDate.format('YYYY-MM-DD')}`);

    // 3. Iterate through each day in the range and generate the expected path.
    for (let m = moment(startDate); m.isSameOrBefore(endDate); m.add(1, 'days')) {
        
        // --- ⭐️ KEY CHANGE: Path Generation ---
        // Generate the dynamic part of the path from the 'format' string.
        const dynamicPath = m.format(format) + '.md';
        // Prepend the static 'folder' part if it exists.
        const fullPath = folder ? `${folder}/${dynamicPath}` : dynamicPath;
        
        const file = app.vault.getAbstractFileByPath(fullPath);

        // 4. If the generated path corresponds to an existing file, process it.
        if (file && file instanceof TFile) {
            const dayStr = m.format('YYYY-MM-DD');
            habitDataMap.set(dayStr, new Map());
            
            const content = await app.vault.read(file);
            
            // --- This section is your original parsing logic ---
            const lines = content.split('\n');
            const heading = plugin.settings.habitHeading;
            const headingRegex = new RegExp(`^#+\\s+${heading}\\s*$`, 'i');
            let startLine = -1;
            let endLine = lines.length;

            for (let i = 0; i < lines.length; i++) {
                if (lines[i].match(headingRegex)) {
                    startLine = i;
                    const level = (lines[i].match(/^#+/) || ['#'])[0].length;
                    for (let j = i + 1; j < lines.length; j++) {
                        const nextLevelMatch = lines[j].match(/^#+/);
                        if (nextLevelMatch && nextLevelMatch[0].length <= level) {
                            endLine = j;
                            break;
                        }
                    }
                    break;
                }
            }

            if (startLine === -1) {
                continue;
            }
        
            console.log(`Habit Tracker: Found and processing file: ${file.path}`);

            const habitMarkerRegex = /\[\[([^\]]+)\]\]\s*:?\s*\{\{([a-z]+):(.+?):(id\d+)\}\}/g;

            for (let i = startLine + 1; i < endLine; i++) {
                const line = lines[i];
                let match;
                while ((match = habitMarkerRegex.exec(line)) !== null) {
                    const [, habitName, type, valStr] = match;
                    
                    if (!habitsToRender.includes(habitName)) continue;
                    
                    const parts = valStr.split(',');
                    let value = parseInt(parts[0], 10) || 0;
                    let total = parseInt(parts[1], 10) || 1;
                    if (total === 0) total = 1;
                    
                    const progress = Math.min(value / total, 1);

                    habitDataMap.get(dayStr)?.set(habitName, {
                        type, value, total, progress, sourcePath: file.path, line: i
                    });
                }
            }
        }
    }

    return habitDataMap;
}