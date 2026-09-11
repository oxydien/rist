import { useState, useEffect, useRef, useCallback } from 'preact/hooks';
import {ComponentChildren} from "preact";
import "../../assets/styles/common/carousel.css";

interface CarouselProps {
  /** Current page */
  index: number,
  children: ComponentChildren[],
  width?: number | string,
  maxWidth?: number,
  height?: number
}

export function Carousel(
  {
    index = 0,
    children,
    width = '100%',
    maxWidth = 1200,
    height = 600,
  }: CarouselProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const itemsRef = useRef<HTMLDivElement | null>(null);

  // Ref so the resize closure always reads the latest index without needing to re-register the listener on every index change.
  const indexRef = useRef(index);
  const [itemWidth, setItemWidth] = useState(100);
  const [itemAnimated, setItemAnimated] = useState(false);

  indexRef.current = index;

  const moveItems = useCallback((idx: number) => {
    const items = itemsRef.current?.children;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i] as HTMLElement;
      item.style.transform = `translateX(${(i - idx) * -100}%)`;
      setTabIndexRecursively(item, i === idx ? 0 : -1);
    }
  }, []);

  useEffect(() => {
    if (wrapperRef.current) {
      setItemWidth(wrapperRef.current.offsetWidth);
    }
    const t = setTimeout(() => moveItems(indexRef.current), 60);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    moveItems(index);
  }, [index, moveItems]);

  // Resize: debounced at 60ms, uses indexRef to avoid stale closures.
  useEffect(() => {
    let t: NodeJS.Timeout;
    const onResize = () => {
      clearTimeout(t);
      t = setTimeout(() => {
        if (wrapperRef.current) {
          setItemWidth(wrapperRef.current.offsetWidth);
        }
        moveItems(indexRef.current);
      }, 60);
    };
    setTimeout(() => {
      setItemAnimated(true)
    }, 120);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      clearTimeout(t);
    };
  }, [moveItems]);

  return (
    <div
      class="carousel-wrapper"
      ref={wrapperRef}
      style={{
        width: px(width),
        maxWidth: px(maxWidth),
        height: px(height),
      }}
    >
      <div
        class={`carousel-items ${itemAnimated ? "animated" : ""}`}
        ref={itemsRef}
        style={{ '--_item-width': `${itemWidth}px` }}
      >
        {children}
      </div>
    </div>
  );
}

function setTabIndexRecursively(element: HTMLElement, value = 0) {
  if (!element || !element.children) return;
  const focusableElements = ['a', 'button', 'input', 'select', 'textarea'];
  if (
    focusableElements.includes(element.tagName.toLowerCase()) ||
    element.tabIndex !== -1
  ) {
    element.tabIndex = value;
  }
  for (let i = 0; i < element.children.length; i++) {
    setTabIndexRecursively(element.children[i] as HTMLElement, value);
  }
}

const px = (v: string | number) => (typeof v === 'number' ? `${v}px` : v);
