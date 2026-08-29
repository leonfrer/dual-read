export type Movement = 'prev' | 'next' | 'first' | 'last' | 'exit';

export const CHROME_EDGE_PX = 64;

export type KeyLike = {
	key: string;
	code?: string;
	shiftKey: boolean;
	metaKey: boolean;
	ctrlKey: boolean;
	altKey: boolean;
};

export function movementFromKeyboard(event: KeyLike): Movement | null {
	if (event.metaKey || event.ctrlKey || event.altKey) {
		return null;
	}

	if (event.key === 'Escape') {
		return 'exit';
	}

	if (event.key === 'Home') {
		return 'first';
	}

	if (event.key === 'End') {
		return 'last';
	}

	if (event.key === 'ArrowLeft' || event.key === 'j') {
		return 'prev';
	}

	if (event.key === 'ArrowRight' || event.key === 'k') {
		return 'next';
	}

	const space = event.key === ' ' || event.code === 'Space';
	if (space) {
		return event.shiftKey ? 'prev' : 'next';
	}

	return null;
}

export function chromeDock(y: number, height: number): 'top' | 'bottom' | null {
	if (y <= CHROME_EDGE_PX) {
		return 'top';
	}

	if (y >= height - CHROME_EDGE_PX) {
		return 'bottom';
	}

	return null;
}
