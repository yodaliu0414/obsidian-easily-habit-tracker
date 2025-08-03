import { App, TFile, moment } from 'obsidian';
import HabitTrackerPlugin from '../main';
import { getPeriodicNotesSettings } from './periodicNotesUtils';

export interface HabitData {
    type: string;
    value: number;
    total: number;
    progress: number;
    sourcePath: string;
    line: number;
}

export type HabitDataMap = Map<string, Map<string, HabitData>>;

export async function readHabitData(app: App, plugin: typeof HabitTrackerPlugin, settings: any, habitsToRender: string[]): Promise<HabitDataMap> {
    const habitDataMap: HabitDataMap = new Map();
    const periodicSettings = getPeriodicNotesSettings(app) as any;
    
    if (!periodicSettings || !periodicSettings[settings.type]?.enabled) {
        console.error(`Habit Tracker: Periodic notes for type "${settings.type}" are not enabled.`);
        return habitDataMap;
    }

    const { folder, format } = periodicSettings[settings.type];
    const [periodType, periodValue] = settings.period.split(' ');
    
    // UPDATED: Added specific format parsing for weeks
    let startDate;
    if (periodType === 'week') {
        startDate = moment(periodValue, 'YYYY-[W]WW');
    } else {
        // This handles 'month' (YYYY-MM) and 'year' (YYYY) correctly
        startDate = moment(periodValue); 
    }
    
    const endDate = moment(startDate).endOf(periodType as any);

    console.log(`Habit Tracker: Scanning for data from ${startDate.format('YYYY-MM-DD')} to ${endDate.format('YYYY-MM-DD')}`);

    for (let m = moment(startDate); m.isSameOrBefore(endDate); m.add(1, 'days')) {
        const dayStr = m.format('YYYY-MM-DD');
        habitDataMap.set(dayStr, new Map());

        const filename = m.format(format) + '.md';
        const filePath = folder ? `${folder}/${filename}` : filename;
        const file = app.vault.getAbstractFileByPath(filePath);

        if (!(file instanceof TFile)) {
            continue;
        }

        const content = await app.vault.read(file);
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
        
        console.log(`Habit Tracker: Found heading "${heading}" in file: ${file.path}`);

        const habitMarkerRegex = /\[\[([^\]]+)\]\]\s*:?\s*\{\{([a-z]+):(.+?):(id\d+)\}\}/g;

        for (let i = startLine + 1; i < endLine; i++) {
            const line = lines[i];
            let match;
            while ((match = habitMarkerRegex.exec(line)) !== null) {
                const [full, habitName, type, valStr, id] = match;
                
                if (!habitsToRender.includes(habitName)) continue;
                
                console.log(`Habit Tracker: [${dayStr}] Found habit "${habitName}" with data.`);

                const parts = valStr.split(',');
                let value = parseInt(parts[0]) || 0;
                let total = parseInt(parts[1]) || 1;
                if (total === 0) total = 1;
                
                const progress = Math.min(value / total, 1);

                habitDataMap.get(dayStr)?.set(habitName, {
                    type, value, total, progress, sourcePath: file.path, line: i
                });
            }
        }
    }

    return habitDataMap;
}
