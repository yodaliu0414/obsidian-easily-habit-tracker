import { App } from 'obsidian';

// Interface to describe the structure of Periodic Notes settings
interface PeriodicNotesSettings {
    daily?: { folder?: string; format?: string; };
    weekly?: { folder?: string; format?: string; };
    monthly?: { folder?: string; format?: string; };
    yearly?: { folder?: string; format?: string; };
}

/**
 * Safely retrieves the settings from the Periodic Notes plugin.
 * @param app The Obsidian App instance.
 * @returns The settings object or null if the plugin is not available.
 */
export function getPeriodicNotesSettings(app: App): PeriodicNotesSettings | null {
    // The `any` type is used here because we are accessing an external plugin's properties
    const periodicNotesPlugin = (app as any).plugins.plugins['periodic-notes'];
    if (periodicNotesPlugin && periodicNotesPlugin.settings) {
        return periodicNotesPlugin.settings;
    }
    return null;
}
