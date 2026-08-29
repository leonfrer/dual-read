export const READING_BAND = 0.22;
export const DIM_OPACITY = 0.4;
export const FOCUS_MS = 180;
export const DRAG_THRESHOLD_PX = 5;

export function readingBandOffset(viewportHeight: number): number {
	return viewportHeight * READING_BAND;
}

export function indexAtReadingBand(tops: readonly number[], bandY: number): number {
	if (tops.length === 0) {
		return 0;
	}

	let index = 0;
	for (let i = 1; i < tops.length; i++) {
		const top = tops[i];
		if (top === undefined || top > bandY) {
			break;
		}
		index = i;
	}

	return index;
}

export function scrollTopForPair(pairOffsetTop: number, viewportHeight: number): number {
	return Math.max(0, pairOffsetTop - readingBandOffset(viewportHeight));
}

export function isPointerDrag(dx: number, dy: number, threshold = DRAG_THRESHOLD_PX): boolean {
	return dx * dx + dy * dy > threshold * threshold;
}

export function hairlinePercent(position: number, pairCount: number): number {
	if (pairCount <= 1) {
		return 0;
	}

	return ((position - 1) / (pairCount - 1)) * 100;
}
