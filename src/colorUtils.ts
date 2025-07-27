/**
 * Converts a CSS variable name to its hexadecimal color value.
 * @param varName The name of the CSS variable (e.g., '--interactive-accent').
 * @returns The hex color string (e.g., '#483699') or null if not found.
 */
export function cssVarToHex(varName: string): string | null {
    const tempEl = document.createElement('div');
    tempEl.style.setProperty('color', `var(${varName})`);
    document.body.appendChild(tempEl);
    const computedColor = getComputedStyle(tempEl).color;
    document.body.removeChild(tempEl);

    // computedColor will be in rgb(r, g, b) format
    const rgb = computedColor.match(/\d+/g);
    if (!rgb || rgb.length < 3) return null;

    const toHex = (c: number) => ('0' + c.toString(16)).slice(-2);
    return `#${toHex(parseInt(rgb[0]))}${toHex(parseInt(rgb[1]))}${toHex(parseInt(rgb[2]))}`;
}
