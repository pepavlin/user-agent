// Element from accessibility snapshot with unique ID
export type SnapshotElement = {
  id: string;
  role: string;
  name: string;
  description?: string;
  value?: string;
  disabled?: boolean;
  focused?: boolean;
  children?: SnapshotElement[];
  // Index among elements with same role+name (for nth() selection)
  nthIndex?: number;
};

// Result of vision capture
export type VisionResult = {
  screenshot: Buffer;
  snapshot: SnapshotElement[];
  timestamp: number;
};

// Vision provider type
export type VisionProvider = {
  capture(): Promise<VisionResult>;
  findElementById(id: string): Promise<SnapshotElement | null>;
};
