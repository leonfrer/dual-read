export function estimatedPairHeight(fontPx: number, en = '', zh = ''): number {
	if (!en && !zh) {
		return Math.round(fontPx * 8 + 24);
	}

	const enLines = Math.max(1, Math.ceil(en.length / 42));
	const zhLines = Math.max(1, Math.ceil(zh.length / 22));
	const lines = Math.min(40, Math.max(enLines, zhLines));
	return Math.round(fontPx * 1.8 * lines + fontPx * 2.2);
}

export function sumRange(heights: readonly number[], start: number, end: number): number {
	const from = Math.max(0, start);
	const to = Math.min(heights.length, end);
	let sum = 0;
	for (let i = from; i < to; i++) {
		sum += heights[i] ?? 0;
	}
	return sum;
}

export function visibleRange(
	heights: readonly number[],
	fromY: number,
	toY: number
): { start: number; end: number } {
	const n = heights.length;
	if (n === 0) {
		return { start: 0, end: 0 };
	}

	let y = 0;
	let start = 0;
	while (start < n) {
		const height = heights[start] ?? 0;
		if (y + height > fromY) {
			break;
		}
		y += height;
		start += 1;
	}

	if (start === n) {
		start = n - 1;
		y -= heights[start] ?? 0;
	}

	let end = start;
	let cursor = y;
	while (end < n && cursor < toY) {
		cursor += heights[end] ?? 0;
		end += 1;
	}

	if (end <= start) {
		end = Math.min(n, start + 1);
	}

	return { start, end };
}

export function overscanRange(
	heights: readonly number[],
	scrollTop: number,
	viewport: number,
	padTop: number,
	overscan: number
): { start: number; end: number } {
	return visibleRange(
		heights,
		scrollTop - overscan - padTop,
		scrollTop + viewport + overscan - padTop
	);
}

export function windowAround(
	index: number,
	count: number,
	radius = 10
): {
	start: number;
	end: number;
} {
	if (count <= 0) {
		return { start: 0, end: 0 };
	}

	const start = Math.max(0, Math.min(index, count - 1) - radius);
	const end = Math.min(count, Math.max(index, 0) + radius + 1);
	return { start, end };
}
