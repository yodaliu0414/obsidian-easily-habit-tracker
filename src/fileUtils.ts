import { App, TFile, TFolder, FrontMatterCache } from 'obsidian';
import HabitTrackerPlugin from './main';

// This defines the structure of our new cache: a map from a habit's name to its frontmatter.
export type HabitCache = Map<string, FrontMatterCache | null>;

/**
 * Builds a cache of all habit notes and their frontmatter.
 * @param app The Obsidian App instance.
 * @param plugin The HabitTrackerPlugin instance to access settings.
 * @returns A promise that resolves to a Map where keys are habit names (basenames)
 * and values are their frontmatter cache.
 */
export async function buildHabitCache(app: App, plugin: HabitTrackerPlugin): Promise<HabitCache> {
    const habitCache: HabitCache = new Map();
    const folderPath = plugin.settings.habitFolder;
    const excludeList = plugin.settings.exclusionList || [];

    if (!folderPath) {
        return habitCache;
    }

    let filesInFolder: TFile[];
    const folder = app.vault.getAbstractFileByPath(folderPath);
    if (folder && folder instanceof TFolder) {
        filesInFolder = app.vault.getMarkdownFiles().filter(file => file.path.startsWith(folder.path + "/"));
    } else if (folderPath === '/') {
        filesInFolder = app.vault.getMarkdownFiles();
    } else {
        return habitCache; // Folder not found
    }
    
    const filteredFiles = filesInFolder.filter(file => {
        const shouldExclude = excludeList.some(excludeWord => 
            file.name.toLowerCase().includes(excludeWord.toLowerCase())
        );
        return !shouldExclude;
    });

    for (const file of filteredFiles) {
        const metadata = app.metadataCache.getFileCache(file);
        habitCache.set(file.basename, metadata?.frontmatter || null);
    }

    return habitCache;
}
