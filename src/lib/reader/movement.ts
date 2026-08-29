export type Movement = 'first' | 'last' | 'exit';

export const CHROME_EDGE_PX = 64;

export type KeyLike = {
	key: string;
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
