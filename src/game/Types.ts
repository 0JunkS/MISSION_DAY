// Shared Game Interfaces & Data Types

export interface PlayerData {
  id: string;
  name: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  hunger: number;
  maxHunger: number;
  stamina: number;
  maxStamina: number;
  customization: {
    skinColor: string;
    hairStyle: 'short' | 'long' | 'spiky' | 'cap';
    hairColor: string;
    topColor: string;
    bottomColor: string;
  };
  animFrame: number;
  dir: 'down' | 'up' | 'left' | 'right';
  isMoving: boolean;
  selectedHotbarIdx: number;
}

export interface Item {
  id: string;
  name: string;
  icon: string;
  count: number;
  type: 'tool' | 'material' | 'food' | 'building' | 'totem';
  recipeId?: string;
}

export interface Recipe {
  id: string;
  name: string;
  category: 'tools' | 'buildings' | 'furniture' | 'survival';
  resultItemId: string;
  resultCount: number;
  ingredients: { itemId: string; count: number }[];
}

export interface BuildingStructure {
  id: string;
  type: string;
  x: number; // grid X tile coordinate (32px per tile)
  y: number; // grid Y tile coordinate
  rotation: number; // 0, 90, 180, 270 degrees
  ownerId: string;
  hp: number;
  maxHp: number;
}

export interface WorldEntity {
  id: string;
  type: 'tree' | 'rock' | 'iron_ore' | 'berry_bush' | 'fiber_bush' | 'rabbit' | 'deer' | 'chicken' | 'pig' | 'cow' | 'wolf' | 'monster_slime' | 'monster_shadow';
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  animFrame?: number;
}

export interface LandClaim {
  id: string;
  ownerId: string;
  ownerName: string;
  tileX: number;
  tileY: number;
  radius: number; // claim tile radius (e.g. 10 tiles = 20x20 area)
  permissions: Record<string, 'OWNER' | 'BUILDER' | 'MEMBER' | 'VISITOR'>;
}

export interface DayEventRule {
  id: string;
  name: string;
  category: 'environmental' | 'ecological' | 'danger' | 'special';
  description: string;
  applyEffect: (gameState: any) => void;
}
