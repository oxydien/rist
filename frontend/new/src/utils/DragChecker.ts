import { useEffect, useState } from "preact/hooks";

function DragChecker(): [boolean, (isDragging: boolean) => void] {
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const handleDragEnter = (_e: DragEvent) => {};

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
      console.log("dragging", e);
    };

    const handleDragLeave = (_e: DragEvent) => {
      setIsDragging(false);
    };

    const handleDragEnd = () => {
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
  }, []);

  return [isDragging, setIsDragging];
}

export default DragChecker;
