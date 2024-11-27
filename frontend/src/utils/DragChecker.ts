import { useEffect, useState } from "preact/hooks";

function DragChecker(elId?: string): [boolean, (isDragging: boolean) => void] {
	const [isDragging, setIsDragging] = useState(false);

	useEffect(() => {
		const handleDragEnter = (_e: DragEvent) => {};

		const handleDragOver = (e: DragEvent) => {
			e.preventDefault();

			// Nice things can't exist
			const el = document.querySelector(elId || "");
			const rect = el?.getBoundingClientRect();
			if (rect) {
				if (
					e.clientX < rect.left ||
					e.clientX > rect.right ||
					e.clientY < rect.top ||
					e.clientY > rect.bottom
				) {
					setIsDragging(false);
					return;
				}
			}

			setIsDragging(true);
			return;
		};

		const handleDragLeave = (_e: DragEvent) => {
			setIsDragging(false);
		};

		const handleDragEnd = (_e: DragEvent) => {
			setIsDragging(false);
		};

		window.addEventListener("dragenter", handleDragEnter);
		window.addEventListener("dragover", handleDragOver);
		window.addEventListener("dragleave", handleDragLeave);
		window.addEventListener("dragend", handleDragEnd);

		return () => {
			window.removeEventListener("dragenter", handleDragEnter);
			window.removeEventListener("dragover", handleDragOver);
			window.removeEventListener("dragleave", handleDragLeave);
			window.removeEventListener("dragend", handleDragEnd);
		};
	}, [elId]);

	return [isDragging, setIsDragging];
}

export default DragChecker;
