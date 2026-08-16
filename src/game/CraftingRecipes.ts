import { Recipe } from './Types';

export const CRAFTING_RECIPES: Recipe[] = [
  // TOOLS
  {
    id: 'stone_axe',
    name: '돌도끼',
    category: 'tools',
    resultItemId: 'stone_axe',
    resultCount: 1,
    ingredients: [
      { itemId: 'wood', count: 5 },
      { itemId: 'stone', count: 3 }
    ]
  },
  {
    id: 'stone_pickaxe',
    name: '돌곡괭이',
    category: 'tools',
    resultItemId: 'stone_pickaxe',
    resultCount: 1,
    ingredients: [
      { itemId: 'wood', count: 5 },
      { itemId: 'stone', count: 5 }
    ]
  },
  {
    id: 'torch',
    name: '횃불',
    category: 'tools',
    resultItemId: 'torch',
    resultCount: 2,
    ingredients: [
      { itemId: 'wood', count: 2 },
      { itemId: 'fiber', count: 2 }
    ]
  },
  {
    id: 'iron_axe',
    name: '철도끼',
    category: 'tools',
    resultItemId: 'iron_axe',
    resultCount: 1,
    ingredients: [
      { itemId: 'wood', count: 10 },
      { itemId: 'iron', count: 5 }
    ]
  },
  {
    id: 'iron_pickaxe',
    name: '철곡괭이',
    category: 'tools',
    resultItemId: 'iron_pickaxe',
    resultCount: 1,
    ingredients: [
      { itemId: 'wood', count: 10 },
      { itemId: 'iron', count: 8 }
    ]
  },

  // BUILDINGS
  {
    id: 'wood_wall',
    name: '나무 벽',
    category: 'buildings',
    resultItemId: 'wood_wall',
    resultCount: 2,
    ingredients: [
      { itemId: 'wood', count: 4 }
    ]
  },
  {
    id: 'stone_wall',
    name: '돌 벽',
    category: 'buildings',
    resultItemId: 'stone_wall',
    resultCount: 2,
    ingredients: [
      { itemId: 'stone', count: 4 }
    ]
  },
  {
    id: 'wood_door',
    name: '나무 문',
    category: 'buildings',
    resultItemId: 'wood_door',
    resultCount: 1,
    ingredients: [
      { itemId: 'wood', count: 6 }
    ]
  },
  {
    id: 'wood_floor',
    name: '나무 바닥',
    category: 'buildings',
    resultItemId: 'wood_floor',
    resultCount: 4,
    ingredients: [
      { itemId: 'wood', count: 4 }
    ]
  },

  // FURNITURE
  {
    id: 'chest',
    name: '나무 상자',
    category: 'furniture',
    resultItemId: 'chest',
    resultCount: 1,
    ingredients: [
      { itemId: 'wood', count: 10 }
    ]
  },
  {
    id: 'workbench',
    name: '작업대',
    category: 'furniture',
    resultItemId: 'workbench',
    resultCount: 1,
    ingredients: [
      { itemId: 'wood', count: 15 },
      { itemId: 'stone', count: 5 }
    ]
  },
  {
    id: 'campfire',
    name: '캠프파이어',
    category: 'furniture',
    resultItemId: 'campfire',
    resultCount: 1,
    ingredients: [
      { itemId: 'wood', count: 8 },
      { itemId: 'stone', count: 8 }
    ]
  },
  {
    id: 'lamp',
    name: '조명 램프',
    category: 'furniture',
    resultItemId: 'lamp',
    resultCount: 1,
    ingredients: [
      { itemId: 'wood', count: 4 },
      { itemId: 'iron', count: 2 },
      { itemId: 'fiber', count: 4 }
    ]
  },

  // SURVIVAL & CLAIMS
  {
    id: 'claim_totem',
    name: '토지 토템',
    category: 'survival',
    resultItemId: 'claim_totem',
    resultCount: 1,
    ingredients: [
      { itemId: 'wood', count: 20 },
      { itemId: 'stone', count: 10 }
    ]
  },
  {
    id: 'cooked_meat',
    name: '구운 고기',
    category: 'survival',
    resultItemId: 'cooked_meat',
    resultCount: 1,
    ingredients: [
      { itemId: 'raw_meat', count: 1 },
      { itemId: 'wood', count: 1 }
    ]
  }
];
