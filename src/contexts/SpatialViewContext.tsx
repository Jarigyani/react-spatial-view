import React, { type ReactNode, createContext, useState } from "react";

type Position = {
  x: number;
  y: number;
};

export type SpatialViewContextType = {
  scale: number;
  setScale: (scale: number) => void;
  scaleRef: React.MutableRefObject<number>;
  position: Position;
  setPosition: (position: Position) => void;
  positionRef: React.MutableRefObject<Position>;
  isZooming: boolean;
  setIsZooming: (isZooming: boolean) => void;
  isDragging: boolean;
  setIsDragging: (isDragging: boolean) => void;
  contentRef: React.RefObject<HTMLDivElement | null>;
  zoomDuration: number;
  setContext: (context: Omit<SpatialViewContextType, "setContext">) => void;
};

const defaultContext: Omit<SpatialViewContextType, "setContext"> = {
  scale: 1,
  setScale: () => {},
  scaleRef: { current: 1 },
  position: { x: 0, y: 0 },
  setPosition: () => {},
  positionRef: { current: { x: 0, y: 0 } },
  isZooming: false,
  setIsZooming: () => {},
  isDragging: false,
  setIsDragging: () => {},
  contentRef: { current: null },
  zoomDuration: 100,
};

export const SpatialViewContext = createContext<SpatialViewContextType>({
  ...defaultContext,
  setContext: () => {},
});

type SpatialViewProviderProps = {
  children: ReactNode;
};

const useSpatialViewContext = () => {
  const [context, setContext] =
    useState<Omit<SpatialViewContextType, "setContext">>(defaultContext);
  return { ...context, setContext };
};

export const SpatialViewProvider = ({ children }: SpatialViewProviderProps) => {
  const ctx = useSpatialViewContext();
  return (
    <SpatialViewContext.Provider value={ctx}>
      {children}
    </SpatialViewContext.Provider>
  );
};
