import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSpatialView } from "../hooks/useSpatialView";

type Position = {
  x: number;
  y: number;
};

export const calculateNewScale = (
  currentScale: number,
  deltaY: number,
  sensitivity: number,
  minScale: number,
  maxScale: number
): number => {
  return deltaY > 0
    ? Number(
        Math.max(minScale, currentScale - sensitivity * currentScale).toFixed(3)
      )
    : Number(
        Math.min(maxScale, currentScale + sensitivity * currentScale).toFixed(3)
      );
};

export const calculateMousePosition = (
  clientX: number,
  clientY: number,
  rect: DOMRect,
  currentPosition: Position,
  scale: number
): { currentMouseX: number; currentMouseY: number } => {
  const mouseX = clientX - rect.left;
  const mouseY = clientY - rect.top;
  return {
    currentMouseX: (mouseX - currentPosition.x) / scale,
    currentMouseY: (mouseY - currentPosition.y) / scale,
  };
};

export const calculateZoomPosition = (
  mouseX: number,
  mouseY: number,
  currentMouseX: number,
  currentMouseY: number,
  newScale: number
): Position => {
  return {
    x: mouseX - currentMouseX * newScale,
    y: mouseY - currentMouseY * newScale,
  };
};

type SpatialViewProps = {
  zoomSensitivity?: number;
  trackpadZoomSensitivity?: number;
  children: React.ReactNode;
  excludePan?: string[];
  constrainPan?: boolean;
  padding?: string;
  minScale?: number;
  maxScale?: number;
  initialScale?: number;
  initialPosition?: Position;
  zoomDuration?: number;
};

export const SpatialView: React.FC<SpatialViewProps> = ({
  children,
  zoomSensitivity = 0.2,
  trackpadZoomSensitivity = 0.05,
  excludePan = [],
  constrainPan = true,
  padding = "0",
  minScale = 0.1,
  maxScale = 5,
  initialScale = 1,
  initialPosition = { x: 0, y: 0 },
  zoomDuration = 50,
}) => {
  const { setContext } = useSpatialView();
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(initialScale);
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [isZooming, setIsZooming] = useState(false);

  const dragStart = useRef({ x: 0, y: 0 });
  const positionRef = useRef(position);
  const scaleRef = useRef(scale);
  const rafRef = useRef<number | null>(null);
  const deltaRef = useRef({ x: 0, y: 0 });
  const zoomTimeoutRef = useRef<number | null>(null);
  const dragTimeoutRef = useRef<number | null>(null);
  const adjustmentTimeoutRef = useRef<number | null>(null);

  const contextValue = useMemo(
    () => ({
      scale,
      setScale,
      scaleRef,
      position,
      setPosition,
      positionRef,
      isZooming,
      setIsZooming,
      isDragging,
      setIsDragging,
      contentRef,
      zoomDuration,
    }),
    [scale, position, isZooming, isDragging, zoomDuration]
  );

  useEffect(() => {
    setContext(contextValue);
  }, [contextValue, setContext]);

  const updatePosition = useCallback((newPosition: Position) => {
    positionRef.current = newPosition;
    setPosition(newPosition);
  }, []);

  const updateScale = useCallback((newScale: number) => {
    scaleRef.current = newScale;
    setScale(newScale);
  }, []);

  const calculateBounds = useCallback(() => {
    if (!containerRef.current || !contentRef.current) return null;
    const container = containerRef.current.getBoundingClientRect();
    const content = contentRef.current.getBoundingClientRect();
    const scaledContentWidth = content.width / scaleRef.current;
    const scaledContentHeight = content.height / scaleRef.current;

    return {
      container,
      content: {
        width: scaledContentWidth,
        height: scaledContentHeight,
      },
    };
  }, []);

  const constrainPosition = useCallback(
    (pos: Position, scl: number): Position => {
      const bounds = calculateBounds();
      if (!bounds || !constrainPan) return pos;
      const result = { ...pos };

      const { container, content } = bounds;
      const minX = Math.min(0, container.width - content.width * scl);
      const minY = Math.min(0, container.height - content.height * scl);
      const maxX = Math.max(0, container.width - content.width * scl);
      const maxY = Math.max(0, container.height - content.height * scl);

      if (content.width * scl <= container.width) {
        result.x = (container.width - content.width * scl) / 2;
      } else {
        result.x = Math.min(maxX, Math.max(minX, pos.x));
      }

      if (content.height * scl <= container.height) {
        result.y = (container.height - content.height * scl) / 2;
      } else {
        result.y = Math.min(maxY, Math.max(minY, pos.y));
      }

      return result;
    },
    [constrainPan, calculateBounds]
  );

  useEffect(() => {
    if (!isZooming && constrainPan) {
      if (adjustmentTimeoutRef.current) {
        clearTimeout(adjustmentTimeoutRef.current);
      }
      adjustmentTimeoutRef.current = window.setTimeout(() => {
        const adjustedPosition = constrainPosition(
          positionRef.current,
          scaleRef.current
        );
        const isPositionChanged =
          positionRef.current.x !== adjustedPosition.x ||
          positionRef.current.y !== adjustedPosition.y;
        updatePosition(adjustedPosition);
        if (!isZooming && contentRef.current && isPositionChanged) {
          contentRef.current.style.transition = "transform 0.2s ease-in-out";
          setTimeout(() => {
            if (contentRef.current) {
              contentRef.current.style.transition = `transform ${zoomDuration}ms`;
            }
          }, 200);
        }
      }, 200);
    }
    return () => {
      if (adjustmentTimeoutRef.current) {
        clearTimeout(adjustmentTimeoutRef.current);
      }
    };
  }, [
    isZooming,
    constrainPosition,
    constrainPan,
    updatePosition,
    zoomDuration,
  ]);

  const updatePanPosition = useCallback(() => {
    const newPosition = {
      x: position.x + deltaRef.current.x,
      y: position.y + deltaRef.current.y,
    };

    const adjustedPosition = isZooming
      ? newPosition
      : constrainPosition(newPosition, scaleRef.current);
    updatePosition(adjustedPosition);
    deltaRef.current = { x: 0, y: 0 };
    rafRef.current = null;
  }, [position, isZooming, constrainPosition, updatePosition]);

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      const isMouseWheel = e.deltaMode === 0 && Math.abs(e.deltaY) >= 100;
      if (e.ctrlKey || isMouseWheel) {
        e.stopPropagation();
        if (zoomTimeoutRef.current) {
          clearTimeout(zoomTimeoutRef.current);
        }
        setIsZooming(true);

        const container = containerRef.current;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const { currentMouseX, currentMouseY } = calculateMousePosition(
          e.clientX,
          e.clientY,
          rect,
          position,
          scale
        );

        const sensitivity = isMouseWheel
          ? zoomSensitivity
          : trackpadZoomSensitivity;
        const newScale = calculateNewScale(
          scale,
          e.deltaY,
          sensitivity,
          minScale,
          maxScale
        );

        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const newPosition = calculateZoomPosition(
          mouseX,
          mouseY,
          currentMouseX,
          currentMouseY,
          newScale
        );
        updatePosition(newPosition);
        updateScale(newScale);

        zoomTimeoutRef.current = window.setTimeout(() => {
          setIsZooming(false);
        }, 100);
      } else {
        setIsMoving(true);
        deltaRef.current.x -= e.deltaX;
        deltaRef.current.y -= e.deltaY;

        if (!rafRef.current) {
          rafRef.current = requestAnimationFrame(updatePanPosition);
        }
        if (dragTimeoutRef.current) {
          clearTimeout(dragTimeoutRef.current);
        }
        dragTimeoutRef.current = window.setTimeout(() => {
          setIsMoving(false);
        }, 100);
      }
    },
    [
      scale,
      position,
      updatePanPosition,
      updatePosition,
      updateScale,
      zoomSensitivity,
      trackpadZoomSensitivity,
      minScale,
      maxScale,
    ]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      const isPanDisabled = excludePan.some(
        (selector) => target.closest(selector) !== null
      );
      if (isPanDisabled) return;

      setIsDragging(true);
      dragStart.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };
    },
    [position, excludePan]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      const newPosition = {
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y,
      };

      const adjustedPosition = isZooming
        ? newPosition
        : constrainPosition(newPosition, scaleRef.current);
      updatePosition(adjustedPosition);
    },
    [isDragging, isZooming, constrainPosition, updatePosition]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", handleWheel);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [handleWheel]);

  const contentStyle = useMemo(
    () => ({
      transition:
        isDragging || isMoving ? "none" : `transform ${zoomDuration}ms`,
      transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
      transformOrigin: "0 0",
      willChange: isZooming || isDragging || isMoving ? "transform" : "auto",
      filter: "none",
      WebkitTransform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
      padding: padding,
      backfaceVisibility: "hidden" as const,
      WebkitFontSmoothing: "antialiased" as const,
      textRendering: "optimizeLegibility" as const,
      width: "max-content" as const,
      height: "max-content" as const,
      imageRendering: "crisp-edges" as const,
      WebkitBackfaceVisibility: "hidden" as const,
      transformStyle: "preserve-3d" as const,
    }),
    [
      position.x,
      position.y,
      scale,
      isZooming,
      isDragging,
      isMoving,
      padding,
      zoomDuration,
    ]
  );

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        overflow: "hidden",
        position: "relative" as const,
        touchAction: "none",
        userSelect: "none",
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDragStart={handleDragStart}
    >
      <div ref={contentRef} style={contentStyle}>
        {children}
      </div>
    </div>
  );
};
