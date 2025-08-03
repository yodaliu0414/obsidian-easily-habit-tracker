import { MarkdownView, App, FrontMatterCache } from 'obsidian';
import type HabitTrackerPlugin from './main';

// Helper to parse the value string and separate the warning flag
function parseValueString(valStr: string): { values: string[], warnFlag: string } {
    const parts = valStr.split(',');
    const warnFlag = parts.pop() || 'T';
    return { values: parts, warnFlag };
}

// All render functions now return an HTMLElement for security
export function renderChecks(valStr: string, id: string, plugin: HabitTrackerPlugin, habitProperties?: FrontMatterCache | null): HTMLElement {
    const { values, warnFlag } = parseValueString(valStr);
    const [checkedStr, allStr, checklist = "", customCheckedIcon, customUncheckedIcon] = values;
    const all = parseInt(allStr) || checklist.length;
    const state = checklist || "0".repeat(all);

    const checkedIcon = customCheckedIcon || (habitProperties && habitProperties[plugin.settings.prop_Checked_Icon]) || plugin.settings.inline_DefaultCheckedIcon;
    const uncheckedIcon = customUncheckedIcon || (habitProperties && habitProperties[plugin.settings.prop_Unchecked_Icon]) || plugin.settings.inline_DefaultUncheckedIcon;

    const wrapper = createSpan({ cls: 'habit-wrapper', attr: { 'data-id': id, 'data-type': 'checks', 'data-warn': warnFlag, 'data-custom-checked': customCheckedIcon || '', 'data-custom-unchecked': customUncheckedIcon || '', 'data-final-checked-icon': checkedIcon, 'data-final-unchecked-icon': uncheckedIcon } });

    for (let i = 0; i < all; i++) {
        const isChecked = state[i] === "1";
        const icon = isChecked ? checkedIcon : uncheckedIcon;
        wrapper.createSpan({ cls: 'habit-check', text: icon, attr: { 'style': 'cursor: pointer;', 'data-pos': i, 'data-checked': isChecked ? 'true' : 'false' } });
    }
    return wrapper;
}

export function renderRating(valStr: string, id:string, plugin: HabitTrackerPlugin, habitProperties?: FrontMatterCache | null): HTMLElement {
    const { values, warnFlag } = parseValueString(valStr);
    const [rateStr, maxStr, customRated, customUnrated] = values;
    const value = parseInt(rateStr) || 0;
    const max = parseInt(maxStr) || 5;

    const ratedIcon = customRated || (habitProperties && habitProperties[plugin.settings.prop_Rated_Icon]) || plugin.settings.inline_DefaultRatedIcon;
    const unratedIcon = customUnrated || (habitProperties && habitProperties[plugin.settings.prop_Unrated_Icon]) || plugin.settings.inline_DefaultUnratedIcon;

    const wrapper = createSpan({ cls: 'habit-wrapper', attr: { 'data-id': id, 'data-type': 'rating', 'data-warn': warnFlag, 'data-max': max, 'data-rated': customRated || '', 'data-unrated': customUnrated || '', 'data-final-rated-icon': ratedIcon, 'data-final-unrated-icon': unratedIcon } });

    for (let i = 0; i < max; i++) {
        wrapper.createSpan({ cls: 'habit-star', text: i < value ? ratedIcon : unratedIcon, attr: { 'style': 'cursor: pointer;', 'data-val': i + 1 } });
    }
    return wrapper;
}

export function renderNumber(valStr: string, id: string): HTMLElement {
    const { values, warnFlag } = parseValueString(valStr);
    const [inputStr, upperStr, unit = ""] = values;
    
    const wrapper = createSpan({ cls: 'habit-wrapper', attr: { 'data-id': id, 'data-type': 'number', 'data-warn': warnFlag, 'data-unit': unit, 'data-upper': upperStr || '0' } });
    wrapper.createEl('input', { type: 'number', cls: 'habit-number-input', value: inputStr || '0', attr: { 'min': '0', 'style': 'width:50px; text-align: center;' } });
    wrapper.appendText(` / ${upperStr || '0'} ${unit}`);
    return wrapper;
}

export function renderProgress(valStr: string, id: string): HTMLElement {
    const { values, warnFlag } = parseValueString(valStr);
    const [valueStr, totalStr] = values;

    const wrapper = createSpan({ cls: 'habit-wrapper', attr: { 'data-id': id, 'data-type': 'progress', 'data-warn': warnFlag, 'data-max': totalStr || '100' } });
    wrapper.createEl('input', { type: 'range', cls: 'habit-progress-slider', value: valueStr || '0', attr: { 'max': totalStr || '100' } });
    wrapper.createSpan({ cls: 'habit-progress-value', text: valueStr || '0' });
    wrapper.appendText(`/${totalStr || '100'}`);
    return wrapper;
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
