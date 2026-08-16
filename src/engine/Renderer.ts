import { Camera } from './Camera';
import { PixelSprites, PlayerCustomization } from './PixelSprites';
import { PlayerData, WorldEntity, BuildingStructure, LandClaim } from '../game/Types';

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private camera: Camera;

  // Offscreen cached light canvas to prevent 60FPS memory allocation
  private lightCanvas: HTMLCanvasElement;
  private lightCtx: CanvasRenderingContext2D;

  // Particle systems
  private rainParticles: { x: number; y: number; speed: number }[] = [];
  private fogOffset: number = 0;

  constructor(canvas: HTMLCanvasElement, camera: Camera) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;
    this.camera = camera;

    // Offscreen light canvas setup
    this.lightCanvas = document.createElement('canvas');
    this.lightCtx = this.lightCanvas.getContext('2d')!;

    // Init rain particles
    for (let i = 0; i < 120; i++) {
      this.rainParticles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        speed: 8 + Math.random() * 6
      });
    }
  }

  resize(w: number, h: number) {
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx.imageSmoothingEnabled = false;

    this.lightCanvas.width = w;
    this.lightCanvas.height = h;
  }

  render(
    localPlayer: PlayerData,
    otherPlayers: PlayerData[],
    entities: WorldEntity[],
    buildings: BuildingStructure[],
    claims: LandClaim[],
    worldTiles: Record<string, string>,
    dayPhase: 'day' | 'night',
    activeEventId: string,
    buildPreview: { type: string; tileX: number; tileY: number; isValid: boolean; rotation: number } | null
  ) {
    const ctx = this.ctx;
    const cam = this.camera;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // 1. Clear background
    ctx.fillStyle = '#1e281b';
    ctx.fillRect(0, 0, w, h);

    // Tile Size
    const TILE_SIZE = 32;

    // 2. Render Ground Tiles (Visible Viewport Only)
    const minWorld = cam.screenToWorld(0, 0);
    const maxWorld = cam.screenToWorld(w, h);

    const startTileX = Math.floor(minWorld.x / TILE_SIZE) - 1;
    const endTileX = Math.ceil(maxWorld.x / TILE_SIZE) + 1;
    const startTileY = Math.floor(minWorld.y / TILE_SIZE) - 1;
    const endTileY = Math.ceil(maxWorld.y / TILE_SIZE) + 1;

    for (let ty = startTileY; ty <= endTileY; ty++) {
      for (let tx = startTileX; tx <= endTileX; tx++) {
        const key = `${tx},${ty}`;
        const tileType = worldTiles[key] || 'grass';
        const screenPos = cam.worldToScreen(tx * TILE_SIZE, ty * TILE_SIZE);
        const sprite = PixelSprites.getTileSprite(tileType);
        ctx.drawImage(sprite, screenPos.x, screenPos.y, TILE_SIZE, TILE_SIZE);
      }
    }

    // 3. Render Land Claim Boundaries (Subtle Pixel Outlines)
    claims.forEach((claim) => {
      const claimMin = cam.worldToScreen(
        (claim.tileX - claim.radius) * TILE_SIZE,
        (claim.tileY - claim.radius) * TILE_SIZE
      );
      const size = claim.radius * 2 * TILE_SIZE;

      ctx.strokeStyle = claim.ownerId === localPlayer.id ? '#48bb78' : '#e53e3e';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.strokeRect(claimMin.x, claimMin.y, size, size);
      ctx.setLineDash([]);

      // Claim owner label
      ctx.fillStyle = claim.ownerId === localPlayer.id ? '#48bb78' : '#feb2b2';
      ctx.font = '8px "Press Start 2P"';
      ctx.fillText(`🚩 ${claim.ownerName || '개척자'}의 영토`, claimMin.x + 8, claimMin.y + 16);
    });

    // 4. Collect Renderables for Depth Sorting (Y-Indexing)
    interface Renderable {
      yKey: number;
      draw: (ctx: CanvasRenderingContext2D) => void;
    }

    const renderables: Renderable[] = [];

    // Add Floors first (Always under entities)
    buildings.filter(b => b.type.includes('floor')).forEach(b => {
      const screenPos = cam.worldToScreen(b.x * TILE_SIZE, b.y * TILE_SIZE);
      const sprite = PixelSprites.getBuildingSprite(b.type);
      renderables.push({
        yKey: b.y * TILE_SIZE - 100, // force behind
        draw: (ctx) => {
          ctx.drawImage(sprite, screenPos.x, screenPos.y, TILE_SIZE, TILE_SIZE);
        }
      });
    });

    // Add World Entities (Trees, Rocks, Animals, Monsters)
    entities.forEach(ent => {
      const screenPos = cam.worldToScreen(ent.x, ent.y);
      let sprite: HTMLCanvasElement;

      if (['tree', 'rock', 'iron_ore', 'berry_bush', 'fiber_bush'].includes(ent.type)) {
        sprite = PixelSprites.getObjectSprite(ent.type);
      } else {
        sprite = PixelSprites.getEntitySprite(ent.type);
      }

      // Check if entity occludes local player
      const isTall = ['tree', 'rock', 'iron_ore'].includes(ent.type);
      const isOccluding = isTall &&
        Math.abs(localPlayer.x - ent.x) < 24 &&
        (ent.y > localPlayer.y && ent.y - localPlayer.y < 48);

      renderables.push({
        yKey: ent.y,
        draw: (ctx) => {
          ctx.save();
          if (isOccluding) {
            ctx.globalAlpha = 0.35; // Occlusion transparency!
          }
          const h = isTall ? 48 : 32;
          ctx.drawImage(sprite, screenPos.x - 16, screenPos.y - (h - 16), 32, h);
          ctx.restore();
        }
      });
    });

    // Add Buildings (Walls, Furniture, Totems) with Rotation Support
    buildings.filter(b => !b.type.includes('floor')).forEach(b => {
      const screenPos = cam.worldToScreen(b.x * TILE_SIZE, b.y * TILE_SIZE);
      const sprite = PixelSprites.getBuildingSprite(b.type);
      const isWall = b.type.includes('wall') || b.type.includes('door');

      const isOccluding = isWall &&
        Math.abs(localPlayer.x - (b.x * TILE_SIZE + 16)) < 24 &&
        (b.y * TILE_SIZE > localPlayer.y && b.y * TILE_SIZE - localPlayer.y < 48);

      renderables.push({
        yKey: b.y * TILE_SIZE + 16,
        draw: (ctx) => {
          ctx.save();
          if (isOccluding) ctx.globalAlpha = 0.35;
          if (b.rotation) {
            ctx.translate(screenPos.x + TILE_SIZE / 2, screenPos.y + TILE_SIZE / 2);
            ctx.rotate((b.rotation * Math.PI) / 180);
            ctx.drawImage(sprite, -TILE_SIZE / 2, -TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
          } else {
            ctx.drawImage(sprite, screenPos.x, screenPos.y, TILE_SIZE, TILE_SIZE);
          }
          ctx.restore();
        }
      });
    });

    // Add Players with Fallback Customization
    const allPlayers = [localPlayer, ...otherPlayers];
    allPlayers.forEach(p => {
      const screenPos = cam.worldToScreen(p.x, p.y);
      const cust = p.customization || {
        skinColor: '#f5c29b',
        hairStyle: 'short',
        hairColor: '#4a2c11',
        topColor: '#2b5c8f',
        bottomColor: '#3a3a3a'
      };
      const sprite = PixelSprites.getPlayerSprite(cust, p.animFrame || 0, p.dir || 'down');

      renderables.push({
        yKey: p.y,
        draw: (ctx) => {
          // Player shadow
          ctx.fillStyle = 'rgba(0,0,0,0.3)';
          ctx.beginPath();
          ctx.ellipse(screenPos.x, screenPos.y + 4, 10, 4, 0, 0, Math.PI * 2);
          ctx.fill();

          // Draw character
          ctx.drawImage(sprite, screenPos.x - 16, screenPos.y - 40, 32, 48);

          // Name Tag & HP Bar
          ctx.fillStyle = p.id === localPlayer.id ? '#ffd700' : '#ffffff';
          ctx.font = '8px "Press Start 2P"';
          ctx.textAlign = 'center';
          ctx.fillText(p.name || '생존자', screenPos.x, screenPos.y - 46);

          // Small overhead HP bar
          const barW = 24;
          const maxHp = p.maxHp || 100;
          const curHp = p.hp !== undefined ? p.hp : 100;
          const hpRatio = Math.max(0, curHp / maxHp);
          ctx.fillStyle = '#000';
          ctx.fillRect(screenPos.x - barW / 2, screenPos.y - 42, barW, 3);
          ctx.fillStyle = '#e53e3e';
          ctx.fillRect(screenPos.x - barW / 2, screenPos.y - 42, barW * hpRatio, 3);
        }
      });
    });

    // Sort by Y coordinate for true top-down perspective depth
    renderables.sort((a, b) => a.yKey - b.yKey);
    renderables.forEach(r => r.draw(ctx));

    // 5. Build Ghost Preview (Translucent Green/Red & Rotated)
    if (buildPreview) {
      const screenPos = cam.worldToScreen(buildPreview.tileX * TILE_SIZE, buildPreview.tileY * TILE_SIZE);
      const sprite = PixelSprites.getBuildingSprite(buildPreview.type);

      ctx.save();
      ctx.globalAlpha = 0.6;
      // Tint green if valid, red if blocked
      ctx.fillStyle = buildPreview.isValid ? 'rgba(72, 187, 120, 0.4)' : 'rgba(229, 62, 62, 0.4)';
      ctx.fillRect(screenPos.x, screenPos.y, TILE_SIZE, TILE_SIZE);

      if (buildPreview.rotation) {
        ctx.translate(screenPos.x + TILE_SIZE / 2, screenPos.y + TILE_SIZE / 2);
        ctx.rotate((buildPreview.rotation * Math.PI) / 180);
        ctx.drawImage(sprite, -TILE_SIZE / 2, -TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
      } else {
        ctx.drawImage(sprite, screenPos.x, screenPos.y, TILE_SIZE, TILE_SIZE);
      }
      ctx.restore();
    }

    // 6. Dynamic 2D Night Darkness & Light Radius Overlay (Using Cached Offscreen Canvas)
    const isLongNight = activeEventId === 'long_night';
    const isFog = activeEventId === 'dense_fog';

    if (dayPhase === 'night' || isFog) {
      if (this.lightCanvas.width !== w || this.lightCanvas.height !== h) {
        this.lightCanvas.width = w;
        this.lightCanvas.height = h;
      }
      const lCtx = this.lightCtx;
      lCtx.globalCompositeOperation = 'source-over';

      // Darkness base fill
      const darknessAlpha = dayPhase === 'night' ? (isLongNight ? 0.92 : 0.82) : 0.65;
      lCtx.fillStyle = `rgba(5, 10, 20, ${darknessAlpha})`;
      lCtx.fillRect(0, 0, w, h);

      // Radial Light Erase helper
      lCtx.globalCompositeOperation = 'destination-out';

      // Light source 1: Players (Torches / Default flashlight)
      allPlayers.forEach(p => {
        const pScreen = cam.worldToScreen(p.x, p.y);
        const radius = (p.selectedHotbarIdx === 2) ? 140 : 80; // Torch in hand increases radius
        const grad = lCtx.createRadialGradient(pScreen.x, pScreen.y, 10, pScreen.x, pScreen.y, radius);
        grad.addColorStop(0, 'rgba(0,0,0,1)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        lCtx.fillStyle = grad;
        lCtx.beginPath();
        lCtx.arc(pScreen.x, pScreen.y, radius, 0, Math.PI * 2);
        lCtx.fill();
      });

      // Light source 2: Campfires & Lamps in buildings
      buildings.filter(b => b.type === 'campfire' || b.type === 'lamp').forEach(b => {
        const bScreen = cam.worldToScreen(b.x * TILE_SIZE + 16, b.y * TILE_SIZE + 16);
        const radius = b.type === 'campfire' ? 160 : 180;
        const grad = lCtx.createRadialGradient(bScreen.x, bScreen.y, 15, bScreen.x, bScreen.y, radius);
        grad.addColorStop(0, 'rgba(0,0,0,1)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        lCtx.fillStyle = grad;
        lCtx.beginPath();
        lCtx.arc(bScreen.x, bScreen.y, radius, 0, Math.PI * 2);
        lCtx.fill();
      });

      ctx.drawImage(this.lightCanvas, 0, 0);
    }

    // 7. Weather Particle FX (Rain / Fog)
    if (activeEventId === 'torrential_rain') {
      ctx.strokeStyle = 'rgba(147, 197, 253, 0.6)';
      ctx.lineWidth = 1.5;
      this.rainParticles.forEach(p => {
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - 4, p.y + 12);
        ctx.stroke();

        p.y += p.speed;
        p.x -= 2;
        if (p.y > h) p.y = 0;
        if (p.x < 0) p.x = w;
      });
    } else if (activeEventId === 'dense_fog') {
      this.fogOffset += 0.5;
      ctx.fillStyle = 'rgba(226, 232, 240, 0.15)';
      ctx.fillRect(0, 0, w, h);
    }
  }
}

