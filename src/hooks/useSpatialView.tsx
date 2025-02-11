import { useCallback, useContext } from "react";
import { SpatialViewContext } from "../contexts/SpatialViewContext";

export type JumpToElement = (
  element: HTMLElement,
  options?: JumpToElementOptions
) => void;

type JumpToElementOptions = {
  padding?: number;
  animate?: boolean;
};

export const useSpatialView = () => {
  const context = useContext(SpatialViewContext);
  if (context === undefined) {
    throw new Error("useSpatialView must be used within a SpatialViewProvider");
  }
  const {
    setScale,
    setPosition,
    contentRef,
    scaleRef,
    positionRef,
    zoomDuration,
  } = context;

  const jumpToElement = useCallback(
    (element: HTMLElement, options: JumpToElementOptions = {}) => {
      const { padding = 0 } = options;

      const container = element.closest('[style*="overflow: hidden"]');
      if (!container) return;

      const containerRect = container.getBoundingClientRect();

      const contentContainer = element.closest('[style*="transform"]');
      if (!contentContainer) return;

      const contentTransform = new DOMMatrix(
        getComputedStyle(contentContainer).transform
      );
      const currentScale = contentTransform.a;

      const elementRect = element.getBoundingClientRect();
      const originalWidth = elementRect.width / currentScale;
      const originalHeight = elementRect.height / currentScale;

      const scaleX = (containerRect.width - padding * 2) / originalWidth;
      const scaleY = (containerRect.height - padding * 2) / originalHeight;
      const newScale = Math.min(scaleX, scaleY, 5);

      const contentRect = contentContainer.getBoundingClientRect();
      const elementX = (elementRect.left - contentRect.left) / currentScale;
      const elementY = (elementRect.top - contentRect.top) / currentScale;

      const scaledWidth = originalWidth * newScale;
      const scaledHeight = originalHeight * newScale;

      const newX =
        (containerRect.width - scaledWidth) / 2 - elementX * newScale;
      const newY =
        (containerRect.height - scaledHeight) / 2 - elementY * newScale;

      const newPosition = { x: newX, y: newY };

      const el = contentRef.current;
      if (el) el.style.transition = "transform 0.5s ease-in-out";

      scaleRef.current = newScale;
      setScale(newScale);
      positionRef.current = newPosition;
      setPosition(newPosition);
      setTimeout(() => {
        if (el) el.style.transition = `transform ${zoomDuration}ms`;
      }, 500);
    },
    [setScale, setPosition, contentRef, scaleRef, positionRef, zoomDuration]
  );
  return { ...context, jumpToElement };
};
