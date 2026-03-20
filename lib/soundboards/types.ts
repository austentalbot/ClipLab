export type SoundboardEntry = {
  clipId: string;
  position: number;
};

export type Soundboard = {
  id: string;
  name: string;
  entries: SoundboardEntry[];
  createdAt: string;
  updatedAt: string;
};
