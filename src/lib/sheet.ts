const SHEET_EXIT_MS = 280;

export function waitForSheetExit(element: HTMLDialogElement, onclosed: () => void): void {
	let finished = false;

	const finish = (event?: Event) => {
		if (finished) {
			return;
		}

		if (event instanceof TransitionEvent) {
			if (event.target !== element || event.propertyName !== 'opacity') {
				return;
			}
		}

		finished = true;
		element.removeEventListener('transitionend', finish);
		window.clearTimeout(timer);
		onclosed();
	};

	if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
		onclosed();
		return;
	}

	element.addEventListener('transitionend', finish);
	const timer = window.setTimeout(finish, SHEET_EXIT_MS);
}
