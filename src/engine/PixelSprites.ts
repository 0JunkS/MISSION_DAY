// Dynamic Canvas Procedural Pixel Art Generator & Cache System

export interface PlayerCustomization {
  name: string;
  skinColor: string;
  hairStyle: 'short' | 'long' | 'spiky' | 'cap';
  hairColor: string;
  topColor: string;
  bottomColor: string;
}

class PixelSpriteManager {
  private cache: Map<string, HTMLCanvasElement> = new Map();

  // Create offscreen canvas helper
  private createCanvas(w: number, h: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    return { canvas, ctx };
  }

  // Draw pixel grid helper
  private drawPixelGrid(ctx: CanvasRenderingContext2D, map: string[], palette: Record<string, string>, pixelSize: number = 2) {
    for (let r = 0; r < map.length; r++) {
      const line = map[r];
      for (let c = 0; c < line.length; c++) {
        const char = line[c];
        if (char !== '.' && char !== ' ' && palette[char]) {
          ctx.fillStyle = palette[char];
          ctx.fillRect(c * pixelSize, r * pixelSize, pixelSize, pixelSize);
        }
      }
    }
  }

  // ----------------------------------------------------
  // PLAYER SPRITE GENERATOR (16x24 scaled x2 = 32x48)
  // ----------------------------------------------------
  getPlayerSprite(cust: PlayerCustomization, frame: number = 0, dir: 'down'|'up'|'left'|'right' = 'down'): HTMLCanvasElement {
    const key = `player_${cust.skinColor}_${cust.hairStyle}_${cust.hairColor}_${cust.topColor}_${cust.bottomColor}_${dir}_${frame}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const { canvas, ctx } = this.createCanvas(32, 48);
    const p = 2; // pixel size multiplier

    // Color definitions
    const skin = cust.skinColor;
    const skinShadow = '#c48b64';
    const hair = cust.hairColor;
    const top = cust.topColor;
    const bottom = cust.bottomColor;
    const shoes = '#1a202c';

    // Bobbing offset for walking frame animation
    const bob = (frame % 2 === 1) ? 2 : 0;

    // Hair maps
    let hairMap: string[] = [];
    if (cust.hairStyle === 'short') {
      hairMap = [
        "  HHHHHH  ",
        " HHHHHHHH ",
        " HHHHHHHH ",
        " HH    HH "
      ];
    } else if (cust.hairStyle === 'long') {
      hairMap = [
        "  HHHHHH  ",
        " HHHHHHHH ",
        " HHHHHHHH ",
        " HH    HH ",
        " HH    HH ",
        " HH    HH "
      ];
    } else if (cust.hairStyle === 'spiky') {
      hairMap = [
        " H H  H H ",
        " HHHHHHHH ",
        " HHHHHHHH ",
        " HH    HH "
      ];
    } else {
      hairMap = [
        "  CCCCCC  ",
        " CCCCCCCC ",
        " HHHHHHHH ",
        " HH    HH "
      ];
    }

    const palette: Record<string, string> = {
      'S': skin,
      'k': skinShadow,
      'E': '#000000',
      'W': '#ffffff',
      'H': hair,
      'C': '#e53e3e', // Cap color
      'T': top,
      'B': bottom,
      'F': shoes
    };

    // Head base (8x8)
    const headMap = [
      "  SSSSSS  ",
      " SSSSSSSS ",
      " SS E  E S",
      " SS E  E S",
      " SSSSSSSS ",
      "  SSSSSS  "
    ];

    // Body base (8x10)
    const bodyMap = [
      "  TTTTTT  ",
      " TTTTTTTT ",
      " TTTTTTTT ",
      "  TTTTTT  ",
      "  BBBBBB  ",
      "  BBBBBB  ",
      "  BB  BB  ",
      "  FF  FF  "
    ];

    // Draw Head & Hair
    ctx.translate(3, 4 + bob);
    this.drawPixelGrid(ctx, headMap, palette, p);
    this.drawPixelGrid(ctx, hairMap, palette, p);

    // Draw Body
    ctx.translate(0, 12 * p);
    this.drawPixelGrid(ctx, bodyMap, palette, p);

    this.cache.set(key, canvas);
    return canvas;
  }

  // ----------------------------------------------------
  // WORLD TERRAIN TILES (32x32)
  // ----------------------------------------------------
  getTileSprite(type: string): HTMLCanvasElement {
    if (this.cache.has(`tile_${type}`)) return this.cache.get(`tile_${type}`)!;

    const { canvas, ctx } = this.createCanvas(32, 32);

    if (type === 'grass') {
      ctx.fillStyle = '#38a169';
      ctx.fillRect(0, 0, 32, 32);
      // Pixel grass blades
      ctx.fillStyle = '#2f855a';
      ctx.fillRect(4, 8, 4, 4); ctx.fillRect(20, 16, 4, 4); ctx.fillRect(12, 24, 4, 4);
      ctx.fillStyle = '#48bb78';
      ctx.fillRect(8, 4, 2, 4); ctx.fillRect(24, 20, 2, 4);
    } else if (type === 'water') {
      ctx.fillStyle = '#3182ce';
      ctx.fillRect(0, 0, 32, 32);
      ctx.fillStyle = '#63b3ed';
      ctx.fillRect(2, 6, 12, 2); ctx.fillRect(16, 18, 10, 2); ctx.fillRect(8, 26, 8, 2);
    } else if (type === 'sand') {
      ctx.fillStyle = '#ecc94b';
      ctx.fillRect(0, 0, 32, 32);
      ctx.fillStyle = '#d69e2e';
      ctx.fillRect(6, 6, 2, 2); ctx.fillRect(18, 14, 4, 2); ctx.fillRect(10, 24, 2, 2);
    } else if (type === 'snow') {
      ctx.fillStyle = '#edf2f7';
      ctx.fillRect(0, 0, 32, 32);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(4, 10, 6, 4); ctx.fillRect(20, 22, 4, 4);
    } else if (type === 'rock_ground') {
      ctx.fillStyle = '#4a5568';
      ctx.fillRect(0, 0, 32, 32);
      ctx.fillStyle = '#2d3748';
      ctx.fillRect(4, 4, 8, 8); ctx.fillRect(16, 16, 10, 10);
    }

    this.cache.set(`tile_${type}`, canvas);
    return canvas;
  }

  // ----------------------------------------------------
  // RESOURCE OBJECTS (Trees, Rocks, Bushes)
  // ----------------------------------------------------
  getObjectSprite(type: string): HTMLCanvasElement {
    if (this.cache.has(`obj_${type}`)) return this.cache.get(`obj_${type}`)!;

    const { canvas, ctx } = this.createCanvas(32, 48);

    if (type === 'tree') {
      // Trunk
      ctx.fillStyle = '#744210';
      ctx.fillRect(12, 28, 8, 20);
      // Leaves Crown (Top-Down Angled look)
      ctx.fillStyle = '#22543d';
      ctx.fillRect(4, 4, 24, 26);
      ctx.fillStyle = '#2f855a';
      ctx.fillRect(8, 8, 16, 18);
      ctx.fillStyle = '#48bb78';
      ctx.fillRect(10, 10, 8, 8);
    } else if (type === 'rock') {
      ctx.fillStyle = '#718096';
      ctx.fillRect(4, 20, 24, 20);
      ctx.fillStyle = '#a0aec0';
      ctx.fillRect(8, 22, 12, 10);
      ctx.fillStyle = '#2d3748';
      ctx.fillRect(16, 32, 10, 6);
    } else if (type === 'iron_ore') {
      ctx.fillStyle = '#718096';
      ctx.fillRect(4, 20, 24, 20);
      // Iron Ore Veins
      ctx.fillStyle = '#dd6b20';
      ctx.fillRect(8, 24, 6, 6); ctx.fillRect(18, 28, 6, 6);
    } else if (type === 'berry_bush') {
      ctx.fillStyle = '#276749';
      ctx.fillRect(6, 24, 20, 18);
      // Berries
      ctx.fillStyle = '#e53e3e';
      ctx.fillRect(8, 26, 4, 4); ctx.fillRect(18, 28, 4, 4); ctx.fillRect(12, 34, 4, 4);
    } else if (type === 'fiber_bush') {
      ctx.fillStyle = '#2f855a';
      ctx.fillRect(6, 26, 20, 16);
      ctx.fillStyle = '#9ae6b4';
      ctx.fillRect(8, 28, 2, 8); ctx.fillRect(16, 30, 2, 8);
    }

    this.cache.set(`obj_${type}`, canvas);
    return canvas;
  }

  // ----------------------------------------------------
  // ANIMALS & MONSTERS (32x32)
  // ----------------------------------------------------
  getEntitySprite(type: string): HTMLCanvasElement {
    if (this.cache.has(`entity_${type}`)) return this.cache.get(`entity_${type}`)!;

    const { canvas, ctx } = this.createCanvas(32, 32);

    if (type === 'rabbit') {
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(10, 16, 12, 10); // body
      ctx.fillRect(10, 8, 4, 8); ctx.fillRect(18, 8, 4, 8); // ears
      ctx.fillStyle = '#e53e3e'; ctx.fillRect(20, 18, 2, 2); // eye
    } else if (type === 'deer') {
      ctx.fillStyle = '#975a16';
      ctx.fillRect(8, 12, 16, 12); // body
      ctx.fillRect(20, 4, 4, 10); // neck
      ctx.fillStyle = '#744210';
      ctx.fillRect(18, 0, 8, 4); // antlers
    } else if (type === 'chicken') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(10, 14, 10, 10);
      ctx.fillStyle = '#dd6b20'; ctx.fillRect(20, 16, 4, 3); // beak
      ctx.fillStyle = '#e53e3e'; ctx.fillRect(12, 10, 4, 4); // comb
    } else if (type === 'pig') {
      ctx.fillStyle = '#fbb6ce';
      ctx.fillRect(8, 12, 16, 12);
      ctx.fillStyle = '#f687b3'; ctx.fillRect(22, 16, 4, 4); // snout
    } else if (type === 'cow') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(6, 10, 20, 14);
      ctx.fillStyle = '#1a202c'; ctx.fillRect(10, 12, 6, 6); ctx.fillRect(18, 16, 4, 6); // spots
    } else if (type === 'wolf') {
      ctx.fillStyle = '#4a5568';
      ctx.fillRect(8, 12, 16, 10);
      ctx.fillStyle = '#fc8181'; ctx.fillRect(22, 14, 2, 2); // glowing eye
    } else if (type === 'monster_slime') {
      ctx.fillStyle = '#38a169';
      ctx.fillRect(6, 14, 20, 14);
      ctx.fillStyle = '#9ae6b4'; ctx.fillRect(10, 16, 4, 4); ctx.fillRect(18, 16, 4, 4); // eyes
    } else if (type === 'monster_shadow') {
      ctx.fillStyle = '#1a202c';
      ctx.fillRect(6, 8, 20, 20);
      ctx.fillStyle = '#e53e3e'; ctx.fillRect(10, 12, 4, 4); ctx.fillRect(18, 12, 4, 4); // red eyes
    }

    this.cache.set(`entity_${type}`, canvas);
    return canvas;
  }

  // ----------------------------------------------------
  // BUILDINGS & FURNITURE (32x32)
  // ----------------------------------------------------
  getBuildingSprite(type: string): HTMLCanvasElement {
    if (this.cache.has(`build_${type}`)) return this.cache.get(`build_${type}`)!;

    const { canvas, ctx } = this.createCanvas(32, 32);

    if (type === 'wood_wall') {
      ctx.fillStyle = '#744210';
      ctx.fillRect(0, 0, 32, 32);
      ctx.fillStyle = '#975a16';
      ctx.fillRect(0, 4, 32, 4); ctx.fillRect(0, 14, 32, 4); ctx.fillRect(0, 24, 32, 4);
    } else if (type === 'stone_wall') {
      ctx.fillStyle = '#4a5568';
      ctx.fillRect(0, 0, 32, 32);
      ctx.fillStyle = '#2d3748';
      ctx.fillRect(0, 14, 32, 2); ctx.fillRect(14, 0, 2, 14); ctx.fillRect(22, 16, 2, 16);
    } else if (type === 'wood_door') {
      ctx.fillStyle = '#975a16';
      ctx.fillRect(0, 0, 32, 32);
      ctx.fillStyle = '#d69e2e'; ctx.fillRect(24, 14, 4, 4); // handle
    } else if (type === 'wood_floor') {
      ctx.fillStyle = '#b7791f';
      ctx.fillRect(0, 0, 32, 32);
      ctx.fillStyle = '#975a16';
      ctx.fillRect(0, 8, 32, 2); ctx.fillRect(0, 20, 32, 2);
    } else if (type === 'chest') {
      ctx.fillStyle = '#744210';
      ctx.fillRect(4, 6, 24, 20);
      ctx.fillStyle = '#d69e2e'; ctx.fillRect(14, 14, 4, 4); // lock
    } else if (type === 'workbench') {
      ctx.fillStyle = '#975a16';
      ctx.fillRect(2, 8, 28, 16);
      ctx.fillStyle = '#718096'; ctx.fillRect(6, 10, 8, 6); // anvil/tool on table
    } else if (type === 'campfire') {
      ctx.fillStyle = '#744210'; ctx.fillRect(8, 18, 16, 8); // logs
      ctx.fillStyle = '#dd6b20'; ctx.fillRect(10, 8, 12, 12); // fire
      ctx.fillStyle = '#f6e05e'; ctx.fillRect(12, 10, 8, 8);
    } else if (type === 'lamp') {
      ctx.fillStyle = '#4a5568'; ctx.fillRect(14, 16, 4, 12);
      ctx.fillStyle = '#f6e05e'; ctx.fillRect(12, 8, 8, 8); // glowing bulb
    } else if (type === 'claim_totem') {
      ctx.fillStyle = '#744210'; ctx.fillRect(14, 12, 4, 16); // pole
      ctx.fillStyle = '#e53e3e'; ctx.fillRect(18, 4, 10, 10); // red flag banner
      ctx.fillStyle = '#ffd700'; ctx.fillRect(12, 26, 8, 4); // golden pedestal
    }

    this.cache.set(`build_${type}`, canvas);
    return canvas;
  }
}

export const PixelSprites = new PixelSpriteManager();
