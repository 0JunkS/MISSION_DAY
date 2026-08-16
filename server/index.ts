import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import fs from 'fs';
import path from 'path';

// Types
interface PlayerState {
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
  customization: any;
  animFrame: number;
  dir: string;
  isMoving: boolean;
  ws?: WebSocket;
}

interface WorldEntity {
  id: string;
  type: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
}

interface BuildingStructure {
  id: string;
  type: string;
  x: number;
  y: number;
  rotation: number;
  ownerId: string;
  hp: number;
  maxHp: number;
}

interface LandClaim {
  id: string;
  ownerId: string;
  ownerName: string;
  tileX: number;
  tileY: number;
  radius: number;
  permissions: Record<string, string>;
}

// DAY Event Pool
const EVENT_POOL = [
  { id: 'normal', name: '평범한 날', category: 'environmental', description: '평화로운 세계입니다. 자원을 채집하고 보금자리를 건설하세요.' },
  { id: 'long_night', name: '긴 밤의 날', category: 'environmental', description: '어둠이 지속되는 시간이 2배로 길어집니다. 횃불과 조명을 준비하세요.' },
  { id: 'speed_boost', name: '질주의 날', category: 'special', description: '바람이 불어 플레이어와 동물의 이동 속도가 50% 증가합니다.' },
  { id: 'dense_fog', name: '짙은 안개의 날', category: 'environmental', description: '월드 전역에 자욱한 안개가 지평선을 가립니다. 시야가 제한됩니다.' },
  { id: 'wildlife_surge', name: '야생동물 대이동', category: 'ecological', description: '숲속에서 수많은 동물이 떼를 지어 나타납니다.' },
  { id: 'torrential_rain', name: '폭우의 날', category: 'environmental', description: '하루 종일 굵은 장대비가 내립니다. 이동속도가 감소합니다.' },
  { id: 'monster_surge', name: '몬스터 습격의 날', category: 'danger', description: '밤에 사나운 그림자 몬스터들이 대거 출몰합니다.' },
  { id: 'heatwave', name: '폭염의 날', category: 'environmental', description: '뜨거운 태양이 내리쬐어 배고픔이 빨리 감소합니다.' },
  { id: 'resource_mult', name: '풍요의 날', category: 'special', description: '자원 채집 시 2배의 재료를 획득합니다.' }
];

class GameServer {
  private players: Map<string, PlayerState> = new Map();
  private entities: WorldEntity[] = [];
  private buildings: BuildingStructure[] = [];
  private claims: LandClaim[] = [];

  // DAY System
  private dayNum: number = 1;
  private dayPhase: 'day' | 'night' = 'day';
  private dayProgress: number = 0; // 0 to 1
  private activeEventIndex: number = 0;

  private saveFilePath: string;

  constructor() {
    this.saveFilePath = path.join(process.cwd(), 'world_save.json');
    this.loadState();
    this.initEntities();

    // 20 TPS Tick loop
    setInterval(() => this.tick(), 1000 / 20);

    // Auto-save every 30 seconds
    setInterval(() => this.saveState(), 30000);
  }

  private initEntities() {
    if (this.entities.length === 0) {
      for (let i = 0; i < 50; i++) {
        const rx = (Math.random() - 0.5) * 1600;
        const ry = (Math.random() - 0.5) * 1600;
        const types = ['tree', 'rock', 'iron_ore', 'berry_bush', 'fiber_bush', 'rabbit', 'deer', 'chicken', 'pig', 'cow'];
        const type = types[Math.floor(Math.random() * types.length)];
        this.entities.push({ id: `ent_${i}`, type, x: rx, y: ry, hp: 30, maxHp: 30 });
      }
    }
  }

  // Authoritative Tick Update
  private tick() {
    // 1. Advance Day Cycle Timer (5 min Day / 5 min Night = 6000 ticks)
    this.dayProgress += 1 / 6000;
    if (this.dayProgress >= 1) {
      this.dayProgress = 0;
      if (this.dayPhase === 'day') {
        this.dayPhase = 'night';
        this.broadcastChat('시스템', '🌙 어둠이 짙어지고 밤이 찾아왔습니다. 몬스터를 조심하세요!', true);
        this.spawnNightMonsters();
      } else {
        this.dayPhase = 'day';
        this.dayNum++;
        this.selectNextDayEvent();
      }
    }

    // 2. Animal & Monster AI Behavior
    this.entities.forEach(ent => {
      if (['rabbit', 'deer', 'chicken', 'pig', 'cow'].includes(ent.type)) {
        // Random wander
        if (Math.random() < 0.05) {
          ent.x += (Math.random() - 0.5) * 4;
          ent.y += (Math.random() - 0.5) * 4;
        }
      } else if (['monster_slime', 'monster_shadow'].includes(ent.type)) {
        // Pursue closest player
        let closestPlayer: PlayerState | null = null;
        let minDist = 300;
        this.players.forEach(p => {
          const d = Math.hypot(p.x - ent.x, p.y - ent.y);
          if (d < minDist) {
            minDist = d;
            closestPlayer = p;
          }
        });

        if (closestPlayer) {
          const p = closestPlayer as PlayerState;
          const angle = Math.atan2(p.y - ent.y, p.x - ent.x);
          ent.x += Math.cos(angle) * 1.5;
          ent.y += Math.sin(angle) * 1.5;

          // Attack player on contact
          if (minDist < 20) {
            p.hp = Math.max(0, p.hp - 0.5);
          }
        }
      }
    });

    // 3. Broadcast World State to Clients
    this.broadcastWorldState();
  }

  // Select non-repeating event for new day
  private selectNextDayEvent() {
    let nextIdx = Math.floor(Math.random() * EVENT_POOL.length);
    // Ensure no consecutive repeating events
    if (nextIdx === this.activeEventIndex) {
      nextIdx = (nextIdx + 1) % EVENT_POOL.length;
    }
    this.activeEventIndex = nextIdx;
    const event = EVENT_POOL[this.activeEventIndex];

    this.broadcastChat('시스템', `☀️ DAY ${this.dayNum} 이 시작되었습니다! 오늘의 세계 규칙: "${event.name}"`, true);
  }

  private spawnNightMonsters() {
    const isSurge = EVENT_POOL[this.activeEventIndex].id === 'monster_surge';
    const count = isSurge ? 12 : 6;
    for (let i = 0; i < count; i++) {
      const rx = (Math.random() - 0.5) * 1200;
      const ry = (Math.random() - 0.5) * 1200;
      const type = Math.random() > 0.5 ? 'monster_slime' : 'monster_shadow';
      this.entities.push({ id: `mon_${Date.now()}_${i}`, type, x: rx, y: ry, hp: 50, maxHp: 50 });
    }
  }

  addPlayer(ws: WebSocket): PlayerState {
    const id = `player_${Math.random().toString(36).substr(2, 6)}`;
    const player: PlayerState = {
      id,
      name: `생존자_${id.substr(7)}`,
      x: 0,
      y: 0,
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
      ws
    };

    this.players.set(id, player);
    return player;
  }

  removePlayer(id: string) {
    this.players.delete(id);
  }

  handlePlayerTick(id: string, data: any) {
    const p = this.players.get(id);
    if (!p) return;

    p.x = data.x;
    p.y = data.y;
    p.dir = data.dir;
    p.hp = data.hp;
    p.hunger = data.hunger;
    p.stamina = data.stamina;
    p.animFrame = data.animFrame;
    p.isMoving = data.isMoving;
  }

  handlePlaceBuilding(ownerId: string, data: any) {
    this.buildings.push({
      id: `bld_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      type: data.type,
      x: data.x,
      y: data.y,
      rotation: 0,
      ownerId,
      hp: 100,
      maxHp: 100
    });
  }

  broadcastWorldState() {
    const playerArray = Array.from(this.players.values()).map(p => ({
      id: p.id,
      name: p.name,
      x: p.x,
      y: p.y,
      hp: p.hp,
      maxHp: p.maxHp,
      hunger: p.hunger,
      maxHunger: p.maxHunger,
      stamina: p.stamina,
      maxStamina: p.maxStamina,
      customization: p.customization,
      animFrame: p.animFrame,
      dir: p.dir,
      isMoving: p.isMoving
    }));

    const packet = JSON.stringify({
      type: 'world_state',
      payload: {
        players: playerArray,
        entities: this.entities,
        buildings: this.buildings,
        claims: this.claims,
        dayNum: this.dayNum,
        dayPhase: this.dayPhase,
        dayProgress: this.dayProgress,
        activeEvent: EVENT_POOL[this.activeEventIndex]
      }
    });

    this.players.forEach(p => {
      if (p.ws && p.ws.readyState === WebSocket.OPEN) {
        p.ws.send(packet);
      }
    });
  }

  broadcastChat(author: string, text: string, isSystem: boolean = false) {
    const packet = JSON.stringify({
      type: 'chat_message',
      payload: { author, text, isSystem }
    });
    this.players.forEach(p => {
      if (p.ws && p.ws.readyState === WebSocket.OPEN) {
        p.ws.send(packet);
      }
    });
  }

  private loadState() {
    if (fs.existsSync(this.saveFilePath)) {
      try {
        const raw = fs.readFileSync(this.saveFilePath, 'utf8');
        const data = JSON.parse(raw);
        this.buildings = data.buildings || [];
        this.claims = data.claims || [];
        this.dayNum = data.dayNum || 1;
        this.activeEventIndex = data.activeEventIndex || 0;
        console.log('[GameServer] Loaded persisted state from world_save.json');
      } catch (err) {
        console.error('[GameServer] Error loading save state:', err);
      }
    }
  }

  private saveState() {
    try {
      const data = {
        buildings: this.buildings,
        claims: this.claims,
        dayNum: this.dayNum,
        activeEventIndex: this.activeEventIndex
      };
      fs.writeFileSync(this.saveFilePath, JSON.stringify(data, null, 2));
    } catch (err) {
      console.error('[GameServer] Error saving state:', err);
    }
  }
}

// Express + WebSocket Server initialization
const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.static(path.join(process.cwd(), 'dist')));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const gameServer = new GameServer();

wss.on('connection', (ws: WebSocket) => {
  const player = gameServer.addPlayer(ws);
  console.log(`[WebSocket] Player Connected: ${player.id}`);

  ws.on('message', (message: string) => {
    try {
      const msg = JSON.parse(message.toString());
      if (msg.type === 'player_tick') {
        gameServer.handlePlayerTick(player.id, msg.payload);
      } else if (msg.type === 'place_building') {
        gameServer.handlePlaceBuilding(player.id, msg.payload);
      } else if (msg.type === 'update_customization') {
        player.customization = msg.payload.customization;
        player.name = msg.payload.name;
      }
    } catch (e) {
      console.error('[WebSocket] Message parsing error:', e);
    }
  });

  ws.on('close', () => {
    console.log(`[WebSocket] Player Disconnected: ${player.id}`);
    gameServer.removePlayer(player.id);
  });
});

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🎮 DAY RIFT Authoritative Server Running on port ${PORT}`);
  console.log(`====================================================`);
});
