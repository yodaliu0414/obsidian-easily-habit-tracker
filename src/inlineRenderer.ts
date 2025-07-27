import { MarkdownView, App, FrontMatterCache } from 'obsidian';
import HabitTrackerPlugin from './main';

// Helper to parse the value string and separate the warning flag
function parseValueString(valStr: string): { values: string[], warnFlag: string } {
    const parts = valStr.split(',');
    const warnFlag = parts.pop() || 'T'; // Default to 'T' if missing
    return { values: parts, warnFlag };
}

export function renderChecks(valStr: string, id: string, plugin: HabitTrackerPlugin): string {
    const { values, warnFlag } = parseValueString(valStr);
    const [checkedStr, allStr, checklist = "", customCheckedIcon, customUncheckedIcon] = values;
    const all = parseInt(allStr) || checklist.length;
    const state = checklist || "0".repeat(all);

    // SIMPLIFIED LOGIC: The rendered icon is either what's in the text, or the global default.
    // It no longer depends on the habit's frontmatter during rendering.
    const checkedIcon = customCheckedIcon || plugin.settings.inline_DefaultCheckedIcon;
    const uncheckedIcon = customUncheckedIcon || plugin.settings.inline_DefaultUncheckedIcon;

    const boxes = Array.from({ length: all }, (_, i) => {
        const isChecked = state[i] === "1";
        const icon = isChecked ? checkedIcon : uncheckedIcon;
        return `<span class="habit-check" style="cursor: pointer;" data-pos="${i}" data-checked="${isChecked ? 'true' : 'false'}">${icon}</span>`;
    }).join("");

    // The data attributes now only need to store the custom icons from the text.
    return `<span class="habit-wrapper" data-id="${id}" data-type="checks" data-warn="${warnFlag}" data-custom-checked="${customCheckedIcon || ''}" data-custom-unchecked="${customUncheckedIcon || ''}">${boxes}</span>`;
}

export function renderRating(valStr: string, id:string, plugin: HabitTrackerPlugin): string {
    const { values, warnFlag } = parseValueString(valStr);
    const [rateStr, maxStr, customRated, customUnrated] = values;
    const value = parseInt(rateStr) || 0;
    const max = parseInt(maxStr) || 5;

    // SIMPLIFIED LOGIC: Use the icon from the text or the global default.
    const ratedIcon = customRated || plugin.settings.inline_DefaultRatedIcon;
    const unratedIcon = customUnrated || plugin.settings.inline_DefaultUnratedIcon;

    const stars = Array.from({ length: max }, (_, i) =>
        `<span class="habit-star" style="cursor: pointer;" data-val="${i + 1}">${i < value ? ratedIcon : unratedIcon}</span>`
    ).join("");

    return `<span class="habit-wrapper" data-id="${id}" data-type="rating" data-warn="${warnFlag}" data-max="${max}" data-rated="${customRated || ''}" data-unrated="${customUnrated || ''}">${stars}</span>`;
}

export function renderNumber(valStr: string, id: string): string {
    const { values, warnFlag } = parseValueString(valStr);
    const [inputStr, upperStr, unit = ""] = values;
    const value = inputStr || "0";
    const upper = upperStr || "0";

    return `<span class="habit-wrapper" data-id="${id}" data-type="number" data-warn="${warnFlag}" data-unit="${unit}" data-upper="${upper}">
        <input type="number" class="habit-number-input" value="${value}" min="0" style="width:50px; text-align: center;"> / ${upper} ${unit}
    </span>`;
}

export function renderProgress(valStr: string, id: string): string {
    const { values, warnFlag } = parseValueString(valStr);
    const [valueStr, totalStr] = values;
    const value = parseInt(valueStr) || 0;
    const total = parseInt(totalStr) || 100;

    return `<span class="habit-wrapper" data-id="${id}" data-type="progress" data-warn="${warnFlag}" data-max="${total}">
        <input type="range" class="habit-progress-slider" value="${value}" max="${total}"> <span class="habit-progress-value">${value}</span>/${total}
    </span>`;
}

export function attachHandlers(p: HTMLElement, plugin: HabitTrackerPlugin) {
    p.querySelectorAll<HTMLElement>(".habit-wrapper").forEach((wrapper) => {
        const type = wrapper.dataset.type!;
        const id = wrapper.dataset.id!;
        const warnFlag = wrapper.dataset.warn || 'T';

        if (type === "checks") {
            const customChecked = wrapper.dataset.customChecked || "";
            const customUnchecked = wrapper.dataset.customUnchecked || "";
            const checkedIcon = customChecked || plugin.settings.inline_DefaultCheckedIcon;
            const uncheckedIcon = customUnchecked || plugin.settings.inline_DefaultUncheckedIcon;

            wrapper.querySelectorAll<HTMLElement>(".habit-check").forEach((check) => {
                check.addEventListener("click", () => {
                    const allChecks = Array.from(wrapper.querySelectorAll<HTMLElement>(".habit-check"));
                    const newState = check.dataset.checked !== 'true';
                    check.dataset.checked = newState.toString();
                    check.textContent = newState ? checkedIcon : uncheckedIcon;

                    const bits = allChecks.map(c => c.dataset.checked === 'true' ? "1" : "0").join("");
                    const checkedCount = bits.split('1').length - 1;
                    
                    updateMarkdown(plugin.app, id, type, `${checkedCount},${allChecks.length},${bits},${customChecked},${customUnchecked},${warnFlag}`);
                });
            });
        }

        if (type === "rating") {
            const customRated = wrapper.dataset.rated || "";
            const customUnrated = wrapper.dataset.unrated || "";
            const ratedIcon = customRated || plugin.settings.inline_DefaultRatedIcon;
            const unratedIcon = customUnrated || plugin.settings.inline_DefaultUnratedIcon;

            wrapper.querySelectorAll<HTMLElement>(".habit-star").forEach((star) => {
                star.addEventListener("click", () => {
                    const val = parseInt(star.dataset.val!);
                    wrapper.querySelectorAll<HTMLElement>(".habit-star").forEach(s => {
                        s.textContent = parseInt(s.dataset.val!) <= val ? ratedIcon : unratedIcon;
                    });
                    updateMarkdown(plugin.app, id, type, `${val},${wrapper.dataset.max},${customRated},${customUnrated},${warnFlag}`);
                });
            });
        }
        
        if (type === "number") {
            const input = wrapper.querySelector<HTMLInputElement>(".habit-number-input");
            input?.addEventListener("change", () => {
                updateMarkdown(plugin.app, id, type, `${input.value},${wrapper.dataset.upper},${wrapper.dataset.unit},${warnFlag}`);
            });
        }

        if (type === "progress") {
            const slider = wrapper.querySelector<HTMLInputElement>(".habit-progress-slider");
            const valueEl = wrapper.querySelector<HTMLElement>(".habit-progress-value");
            slider?.addEventListener("input", () => { if (valueEl) valueEl.textContent = slider.value; });
            slider?.addEventListener("change", () => {
                updateMarkdown(plugin.app, id, type, `${slider.value},${wrapper.dataset.max},${warnFlag}`);
            });
        }
    });
}

export async function updateMarkdown(app: App, id: string, type: string, val: string) {
    const view = app.workspace.getActiveViewOfType(MarkdownView);
    if (!view || !view.file) return;

    const file = view.file;
    const content = await app.vault.read(file);
    const regex = new RegExp(`(\\{\\{${type}:)(?:[^:]+?)(:${id}\\}\\})`);
    
    if (!regex.test(content)) {
        console.error("Habit Tracker: Could not find marker to update with ID:", id);
        return;
    }

    const newMarker = `$1${val}$2`;
    const newContent = content.replace(regex, newMarker);
    await app.vault.modify(file, newContent);
}
