import { Camera } from './engine/Camera';
import { Renderer } from './engine/Renderer';
import { InputManager } from './engine/InputManager';
import { HUDManager } from './game/UI/HUDManager';
import { NetworkClient } from './net/NetworkClient';
import { PlayerData, WorldEntity, BuildingStructure, LandClaim, Item } from './game/Types';
import { CRAFTING_RECIPES } from './game/CraftingRecipes';
import { AudioSynth } from './engine/AudioSynth';

class DayRiftGame {
  private canvas: HTMLCanvasElement;
  private camera: Camera;
  private renderer: Renderer;
  private input: InputManager;
  private hud: HUDManager;
  private net: NetworkClient;

  // Local Player State
  private localPlayer: PlayerData = {
    id: 'local_' + Math.random().toString(36).substr(2, 6),
    name: '생존자1',
    x: 400,
    y: 400,
    hp: 100,
    maxHp: 100,
    hunger: 100,
    maxHunger: 100,
    stamina: 100,
    maxStamina: 100,
    customization: {
      skinColor: '#f5c29b',
      hairStyle: 'short',
      hairColor: '#4a2c11',
      topColor: '#2b5c8f',
      bottomColor: '#3a3a3a'
    },
    animFrame: 0,
    dir: 'down',
    isMoving: false,
    selectedHotbarIdx: 0
  };

  private inventory: Item[] = [
    { id: 'stone_axe', name: '돌도끼', icon: '🪓', count: 1, type: 'tool' },
    { id: 'stone_pickaxe', name: '돌곡괭이', icon: '⛏️', count: 1, type: 'tool' },
    { id: 'torch', name: '횃불', icon: '🔦', count: 2, type: 'tool' },
    { id: 'wood', name: '목재', icon: '🪵', count: 20, type: 'material' },
    { id: 'stone', name: '돌', icon: '🪨', count: 15, type: 'material' },
    { id: 'cooked_meat', name: '구운 고기', icon: '🍖', count: 5, type: 'food' }
  ];

  private otherPlayers: PlayerData[] = [];
  private entities: WorldEntity[] = [];
  private buildings: BuildingStructure[] = [];
  private claims: LandClaim[] = [];
  private worldTiles: Record<string, string> = {};

  // Server Day State
  private dayNum: number = 1;
  private dayPhase: 'day' | 'night' = 'day';
  private dayProgress: number = 0;
  private activeEventId: string = 'normal';
  private activeEventTitle: string = '평범한 날';
  private activeEventDesc: string = '평화로운 세계입니다. 자원을 채집하고 보금자리를 건설하세요.';

  // Build Mode state
  private buildModeActive: boolean = false;
  private selectedBuildType: string | null = null;
  private buildRotation: number = 0;

  // Animation frame ticker
  private animTicker: number = 0;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.camera = new Camera(window.innerWidth, window.innerHeight);
    this.renderer = new Renderer(this.canvas, this.camera);
    this.input = new InputManager(this.canvas);
    this.hud = new HUDManager();
    this.net = new NetworkClient();

    this.initWorld();
    this.setupEvents();

    window.addEventListener('resize', () => {
      this.camera.resize(window.innerWidth, window.innerHeight);
      this.renderer.resize(window.innerWidth, window.innerHeight);
    });

    // Start Game Loop
    requestAnimationFrame((t) => this.loop(t));
  }

  private initWorld() {
    // Generate starter procedural world tiles (64x64)
    for (let ty = -32; ty < 32; ty++) {
      for (let tx = -32; tx < 32; tx++) {
        const key = `${tx},${ty}`;
        const dist = Math.sqrt(tx * tx + ty * ty);
        if (dist > 25) {
          this.worldTiles[key] = 'snow';
        } else if (dist > 18) {
          this.worldTiles[key] = 'sand';
        } else if (tx % 5 === 0 && ty % 5 === 0) {
          this.worldTiles[key] = 'water';
        } else {
          this.worldTiles[key] = 'grass';
        }
      }
    }

    // Starter Entities (Trees, Rocks, Animals)
    for (let i = 0; i < 40; i++) {
      const rx = (Math.random() - 0.5) * 1200;
      const ry = (Math.random() - 0.5) * 1200;
      const types: WorldEntity['type'][] = ['tree', 'rock', 'iron_ore', 'berry_bush', 'fiber_bush', 'rabbit', 'deer', 'chicken', 'pig', 'cow'];
      const type = types[Math.floor(Math.random() * types.length)];
      this.entities.push({
        id: `ent_${i}`,
        type,
        x: rx,
        y: ry,
        hp: 30,
        maxHp: 30
      });
    }

    this.hud.renderHotbar(this.inventory, this.localPlayer.selectedHotbarIdx);
    this.hud.updateEventInfo(this.activeEventTitle, this.activeEventDesc);
  }

  private setupEvents() {
    // Input Action Listeners
    this.input.setActionCallback((action, payload) => {
      if (action === 'toggle_inventory') this.hud.toggleInventory();
      if (action === 'toggle_build') this.hud.toggleBuild();
      if (action === 'toggle_claim') this.hud.toggleClaim();
      if (action === 'toggle_customizer') this.hud.toggleCustomizer();
      if (action === 'toggle_player_list') this.hud.togglePlayerList();
      if (action === 'close_all_modals') {
        this.hud.closeAllModals();
        this.buildModeActive = false;
        this.selectedBuildType = null;
      }
      if (action === 'select_hotbar') {
        this.localPlayer.selectedHotbarIdx = payload;
        this.hud.renderHotbar(this.inventory, payload);
      }
      if (action === 'rotate_building') {
        this.buildRotation = (this.buildRotation + 90) % 360;
      }
    });

    // HUD Callback Listeners
    this.hud.setCallbacks(
      (recipeId) => this.handleCraft(recipeId),
      (buildType) => {
        this.selectedBuildType = buildType;
        this.buildModeActive = true;
        this.hud.addChatMessage('시스템', `건축 청사진 선택: [${buildType}]. 마우스 클릭으로 설치하세요.`, true);
      },
      (cust, name) => {
        this.localPlayer.customization = cust;
        this.localPlayer.name = name;
        this.net.send('update_customization', { customization: cust, name });
      },
      () => this.handleBuyClaim()
    );

    // Network Sync Message Listener
    this.net.setOnMessage((msg) => {
      if (msg.type === 'world_state') {
        this.otherPlayers = msg.payload.players.filter((p: PlayerData) => p.id !== this.localPlayer.id);
        this.entities = msg.payload.entities;
        this.buildings = msg.payload.buildings;
        this.claims = msg.payload.claims;
        this.dayNum = msg.payload.dayNum;
        this.dayPhase = msg.payload.dayPhase;
        this.dayProgress = msg.payload.dayProgress;

        if (this.activeEventId !== msg.payload.activeEvent.id) {
          this.activeEventId = msg.payload.activeEvent.id;
          this.activeEventTitle = msg.payload.activeEvent.name;
          this.activeEventDesc = msg.payload.activeEvent.description;
          this.hud.updateEventInfo(this.activeEventTitle, this.activeEventDesc);
          this.hud.showDayBanner(this.dayNum, this.activeEventTitle, this.activeEventDesc);
        }
      } else if (msg.type === 'chat_message') {
        this.hud.addChatMessage(msg.payload.author, msg.payload.text, msg.payload.isSystem);
      }
    });
  }

  // Handle Recipe Crafting
  private handleCraft(recipeId: string) {
    const recipe = CRAFTING_RECIPES.find(r => r.id === recipeId);
    if (!recipe) return;

    // Check ingredients
    const canCraft = recipe.ingredients.every(ing => {
      const item = this.inventory.find(i => i.id === ing.itemId);
      return item && item.count >= ing.count;
    });

    if (!canCraft) {
      this.hud.addChatMessage('시스템', '재료가 부족합니다!', true);
      return;
    }

    // Deduct ingredients
    recipe.ingredients.forEach(ing => {
      const item = this.inventory.find(i => i.id === ing.itemId)!;
      item.count -= ing.count;
    });
    this.inventory = this.inventory.filter(i => i.count > 0);

    // Add result item
    const existing = this.inventory.find(i => i.id === recipe.resultItemId);
    if (existing) {
      existing.count += recipe.resultCount;
    } else {
      this.inventory.push({
        id: recipe.resultItemId,
        name: recipe.name,
        icon: '📦',
        count: recipe.resultCount,
        type: 'building'
      });
    }

    AudioSynth.playCraftSound();
    this.hud.renderHotbar(this.inventory, this.localPlayer.selectedHotbarIdx);
    this.hud.renderInventory(this.inventory);
    this.hud.addChatMessage('시스템', `${recipe.name} 제작 완료!`, true);
  }

  // Handle Land Claim purchase
  private handleBuyClaim() {
    const tileX = Math.floor(this.localPlayer.x / 32);
    const tileY = Math.floor(this.localPlayer.y / 32);

    const newClaim: LandClaim = {
      id: `claim_${Math.random().toString(36).substr(2, 6)}`,
      ownerId: this.localPlayer.id,
      ownerName: this.localPlayer.name,
      tileX,
      tileY,
      radius: 10, // 20x20 tiles
      permissions: { [this.localPlayer.id]: 'OWNER' }
    };

    this.claims.push(newClaim);
    // Add claim totem structure
    this.buildings.push({
      id: `bld_totem_${Math.random().toString(36).substr(2, 6)}`,
      type: 'claim_totem',
      x: tileX,
      y: tileY,
      rotation: 0,
      ownerId: this.localPlayer.id,
      hp: 200,
      maxHp: 200
    });

    AudioSynth.playBuildSound();
    this.hud.addChatMessage('시스템', '🚩 새로운 영토 토템이 설치되었습니다!', true);
    this.hud.toggleClaim();
  }

  // Game Loop
  private loop(timestamp: number) {
    this.update();

    // Calculate mouse world position
    const mouseWorld = this.camera.screenToWorld(this.input.mouseScreen.x, this.input.mouseScreen.y);
    const mouseTileX = Math.floor(mouseWorld.x / 32);
    const mouseTileY = Math.floor(mouseWorld.y / 32);

    // Build Preview Ghost
    let buildPreview = null;
    if (this.buildModeActive && this.selectedBuildType) {
      // Check building distance (max 5 tiles)
      const playerTileX = Math.floor(this.localPlayer.x / 32);
      const playerTileY = Math.floor(this.localPlayer.y / 32);
      const dist = Math.abs(mouseTileX - playerTileX) + Math.abs(mouseTileY - playerTileY);
      const isOccupied = this.buildings.some(b => b.x === mouseTileX && b.y === mouseTileY);
      const isValid = dist <= 6 && !isOccupied;

      buildPreview = {
        type: this.selectedBuildType,
        tileX: mouseTileX,
        tileY: mouseTileY,
        isValid,
        rotation: this.buildRotation
      };

      // Place building on left click
      if (this.input.mouseLeftClicked && isValid) {
        this.buildings.push({
          id: `bld_${Math.random().toString(36).substr(2, 6)}`,
          type: this.selectedBuildType,
          x: mouseTileX,
          y: mouseTileY,
          rotation: this.buildRotation,
          ownerId: this.localPlayer.id,
          hp: 100,
          maxHp: 100
        });
        AudioSynth.playBuildSound();
        this.net.send('place_building', { type: this.selectedBuildType, x: mouseTileX, y: mouseTileY });
      }
    }

    // Render 2D Top-Down View
    this.renderer.render(
      this.localPlayer,
      this.otherPlayers,
      this.entities,
      this.buildings,
      this.claims,
      this.worldTiles,
      this.dayPhase,
      this.activeEventId,
      buildPreview
    );

    this.input.endFrame();
    requestAnimationFrame((t) => this.loop(t));
  }

  private update() {
    // Movement Processing
    const move = this.input.getMovementVector();
    let speed = 3.2;

    // Apply DAY Event Speed Boost rule if active
    if (this.activeEventId === 'speed_boost') speed *= 1.5;
    if (this.activeEventId === 'torrential_rain') speed *= 0.8;

    if (move.dx !== 0 || move.dy !== 0) {
      this.localPlayer.x += move.dx * speed;
      this.localPlayer.y += move.dy * speed;
      this.localPlayer.isMoving = true;

      // Direction
      if (Math.abs(move.dx) > Math.abs(move.dy)) {
        this.localPlayer.dir = move.dx > 0 ? 'right' : 'left';
      } else {
        this.localPlayer.dir = move.dy > 0 ? 'down' : 'up';
      }

      // Stamina drain on movement
      this.localPlayer.stamina = Math.max(0, this.localPlayer.stamina - 0.05);
    } else {
      this.localPlayer.isMoving = false;
      this.localPlayer.stamina = Math.min(100, this.localPlayer.stamina + 0.1);
    }

    // Animation frame ticker
    this.animTicker++;
    if (this.animTicker % 10 === 0) {
      this.localPlayer.animFrame = (this.localPlayer.animFrame + 1) % 4;
    }

    // Camera target follow
    this.camera.setTarget(this.localPlayer.x, this.localPlayer.y);
    this.camera.update();

    // Survival Hunger Tick Drain
    const hungerDrain = (this.activeEventId === 'heatwave') ? 0.03 : 0.015;
    this.localPlayer.hunger = Math.max(0, this.localPlayer.hunger - hungerDrain);
    if (this.localPlayer.hunger === 0) {
      this.localPlayer.hp = Math.max(0, this.localPlayer.hp - 0.05);
    }

    // Update HUD Stats
    this.hud.updateStats(
      this.localPlayer.hp,
      this.localPlayer.maxHp,
      this.localPlayer.hunger,
      this.localPlayer.maxHunger,
      this.localPlayer.stamina,
      this.localPlayer.maxStamina
    );

    this.hud.updateDayClock(this.dayNum, this.dayPhase, this.dayProgress);

    // Left Click Harvesting / Attacking nearby entities
    if (this.input.mouseLeftClicked && !this.buildModeActive) {
      const mouseWorld = this.camera.screenToWorld(this.input.mouseScreen.x, this.input.mouseScreen.y);
      const target = this.entities.find(e => Math.hypot(e.x - mouseWorld.x, e.y - mouseWorld.y) < 36);

      if (target) {
        target.hp -= 10;
        if (['tree'].includes(target.type)) AudioSynth.playHitSound('wood');
        else if (['rock', 'iron_ore'].includes(target.type)) AudioSynth.playHitSound('rock');
        else AudioSynth.playHitSound('monster');

        if (target.hp <= 0) {
          // Grant resources to inventory
          let resId = 'wood';
          if (target.type === 'rock') resId = 'stone';
          if (target.type === 'iron_ore') resId = 'iron';
          if (target.type === 'berry_bush') resId = 'berries';
          if (target.type === 'fiber_bush') resId = 'fiber';
          if (['rabbit', 'deer', 'chicken', 'pig', 'cow'].includes(target.type)) resId = 'raw_meat';

          const existing = this.inventory.find(i => i.id === resId);
          if (existing) existing.count += 3;
          else this.inventory.push({ id: resId, name: resId, icon: '🪵', count: 3, type: 'material' });

          this.hud.renderHotbar(this.inventory, this.localPlayer.selectedHotbarIdx);
          this.entities = this.entities.filter(e => e.id !== target.id);
        }
      }
    }

    // Send player tick updates to server
    this.net.send('player_tick', {
      x: this.localPlayer.x,
      y: this.localPlayer.y,
      dir: this.localPlayer.dir,
      hp: this.localPlayer.hp,
      hunger: this.localPlayer.hunger,
      stamina: this.localPlayer.stamina,
      animFrame: this.localPlayer.animFrame,
      isMoving: this.localPlayer.isMoving
    });
  }
}

// Start Game
new DayRiftGame();
