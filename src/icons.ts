/**
 * Creates a partially filled circle icon in a fan-shape (pie chart) style.
 * @param progress A number between 0 (empty) and 1 (full).
 * @param color The fill color for the progress part of the circle.
 * @returns An HTML string for the SVG icon.
 */
export function getCircleIcon(progress: number, color: string): string {
    const size = 16;
    const center = size / 2;
    const radius = size / 2 - 1.5;
    const clampedProgress = Math.max(0, Math.min(1, progress));

    const angle = clampedProgress * 2 * Math.PI;
    const x = center + radius * Math.sin(angle);
    const y = center - radius * Math.cos(angle);
    const largeArcFlag = clampedProgress > 0.5 ? 1 : 0;
    const pathData = `M ${center},${center} L ${center},${center - radius} A ${radius},${radius} 0 ${largeArcFlag},1 ${x},${y} Z`;

    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="vertical-align: middle;"><circle cx="${center}" cy="${center}" r="${radius}" stroke="currentColor" stroke-width="1.5" fill="none" opacity="0.2"/><path d="${pathData}" fill="${color}"/></svg>`;
}

/**
 * Creates a completed (tick) icon inside a circle.
 * @param color The background color of the icon.
 * @returns An HTML string for the SVG icon.
 */
export function getCompletedCircleIcon(color: string): string {
    const size = 16;
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" style="vertical-align: middle; border-radius: 50%;"><circle cx="12" cy="12" r="11" fill="${color}"/><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="white"/></svg>`;
}

/**
 * Creates a failed (cross) icon inside a circle.
 * @returns An HTML string for the SVG icon.
 */
export function getFailedCircleIcon(): string {
    const size = 16;
    const fillColor = '#cccccc';
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" style="vertical-align: middle; border-radius: 50%;"><circle cx="12" cy="12" r="11" fill="${fillColor}" fill-opacity="0.5"/><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" fill="white"/></svg>`;
}

/**
 * Creates a partially filled square icon.
 * @param progress A number between 0 (empty) and 1 (full).
 * @param color The fill color for the progress part of the square.
 * @returns An HTML string for the SVG icon.
 */
export function getSquareIcon(progress: number, color: string): string {
    const size = 16;
    const strokeWidth = 2;
    const innerSize = size - (strokeWidth * 2);
    const clampedProgress = Math.max(0, Math.min(1, progress));

    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="vertical-align: middle;"><rect x="${strokeWidth/2}" y="${strokeWidth/2}" width="${size-strokeWidth}" height="${size-strokeWidth}" stroke="currentColor" stroke-width="${strokeWidth}" fill="none" opacity="0.2"/><rect x="${strokeWidth}" y="${strokeWidth}" width="${innerSize * clampedProgress}" height="${innerSize}" fill="${color}" /></svg>`;
}

/**
 * Creates a completed (tick) icon inside a square.
 * @param color The background color of the icon.
 * @returns An HTML string for the SVG icon.
 */
export function getCompletedSquareIcon(color: string): string {
    const size = 16;
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" style="vertical-align: middle;"><rect width="24" height="24" fill="${color}" rx="4"/><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="white"/></svg>`;
}

/**
 * Creates a failed (cross) icon inside a square.
 * @returns An HTML string for the SVG icon.
 */
export function getFailedSquareIcon(): string {
    const size = 16;
    const fillColor = '#cccccc';
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" style="vertical-align: middle;"><rect width="24" height="24" fill="${fillColor}" fill-opacity="0.5" rx="4"/><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" fill="white"/></svg>`;
}
