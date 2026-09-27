export interface SceneRide { id: number; object: string; name: string; open: boolean; vehicles: number[][]; customers?: number; queue?: number; profit?: number; price?: number; broken?: boolean }
export interface SceneProp { x: number; y: number; z: number; d: number; kind: string; object: string }
export interface ScenePath { x: number; y: number; z: number; queue: boolean; surface?: string; edges: number; slope: number; addition: string }
export interface SceneTrack { x: number; y: number; z: number; d: number; ride: number; sequence: number; type: number; end: [number, number, number]; exit: number }
export interface SceneStaff { id: number; type: number; state: number; litterSwept: number; binsEmptied: number }
export interface ParkSceneSnapshot {
  width: number; height: number; ticks: number; paused: boolean; guests: number; cash: number; rating: number;
  rides: SceneRide[]; people: number[][];
  litter?: number[][]; staff?: SceneStaff[]; wellbeing?: { sick: number; vomit: number; happiness: number };
  land?: number[][]; paths?: ScenePath[]; props?: SceneProp[]; tracks?: SceneTrack[];
}
