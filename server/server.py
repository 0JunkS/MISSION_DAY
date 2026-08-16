import asyncio
import json
import random
import time
import os
import websockets

EVENT_POOL = [
    {"id": "normal", "name": "평범한 날", "category": "environmental", "description": "평화로운 세계입니다. 자원을 채집하고 보금자리를 건설하세요."},
    {"id": "long_night", "name": "긴 밤의 날", "category": "environmental", "description": "어둠이 지속되는 시간이 2배로 길어집니다. 횃불과 조명을 준비하세요."},
    {"id": "speed_boost", "name": "질주의 날", "category": "special", "description": "바람이 불어 플레이어와 동물의 이동 속도가 50% 증가합니다."},
    {"id": "dense_fog", "name": "짙은 안개의 날", "category": "environmental", "description": "월드 전역에 자욱한 안개가 지평선을 가립니다. 시야가 제한됩니다."},
    {"id": "wildlife_surge", "name": "야생동물 대이동", "category": "ecological", "description": "숲속에서 수많은 동물이 떼를 지어 나타납니다."},
    {"id": "torrential_rain", "name": "폭우의 날", "category": "environmental", "description": "하루 종일 굵은 장대비가 내립니다. 이동속도가 감소합니다."},
    {"id": "monster_surge", "name": "몬스터 습격의 날", "category": "danger", "description": "밤에 사나운 그림자 몬스터들이 대거 출몰합니다."},
    {"id": "heatwave", "name": "폭염의 날", "category": "environmental", "description": "뜨거운 태양이 내리쬐어 배고픔이 빨리 감소합니다."},
    {"id": "resource_mult", "name": "풍요의 날", "category": "special", "description": "자원 채집 시 2배의 재료를 획득합니다."}
]

class PythonGameServer:
    def __init__(self):
        self.players = {}
        self.entities = []
        self.buildings = []
        self.claims = []
        self.day_num = 1
        self.day_phase = "day"
        self.day_progress = 0
        self.active_event_idx = 0
        self.init_entities()

    def init_entities(self):
        types = ['tree', 'rock', 'iron_ore', 'berry_bush', 'fiber_bush', 'rabbit', 'deer', 'chicken', 'pig', 'cow']
        for i in range(50):
            rx = (random.random() - 0.5) * 1600
            ry = (random.random() - 0.5) * 1600
            t = random.choice(types)
            self.entities.append({"id": f"ent_{i}", "type": t, "x": rx, "y": ry, "hp": 30, "maxHp": 30})

    async def tick_loop(self):
        while True:
            await asyncio.sleep(1 / 20)
            self.day_progress += 1 / 6000
            if self.day_progress >= 1:
                self.day_progress = 0
                if self.day_phase == "day":
                    self.day_phase = "night"
                else:
                    self.day_phase = "day"
                    self.day_num += 1
                    self.active_event_idx = (self.active_event_idx + 1) % len(EVENT_POOL)

            await self.broadcast_state()

    async def broadcast_state(self):
        if not self.players:
            return

        players_list = []
        for p in self.players.values():
            players_list.append({
                "id": p["id"], "name": p["name"], "x": p["x"], "y": p["y"],
                "hp": p["hp"], "maxHp": p["maxHp"], "hunger": p["hunger"], "maxHunger": p["maxHunger"],
                "stamina": p["stamina"], "maxStamina": p["maxStamina"], "customization": p["customization"],
                "animFrame": p["animFrame"], "dir": p["dir"], "isMoving": p["isMoving"]
            })

        packet = json.dumps({
            "type": "world_state",
            "payload": {
                "players": players_list,
                "entities": self.entities,
                "buildings": self.buildings,
                "claims": self.claims,
                "dayNum": self.day_num,
                "dayPhase": self.day_phase,
                "dayProgress": self.day_progress,
                "activeEvent": EVENT_POOL[this_idx := self.active_event_idx]
            }
        })

        connected = list(self.players.values())
        for p in connected:
            try:
                await p["ws"].send(packet)
            except Exception:
                pass

server = PythonGameServer()

async def handler(websocket):
    pid = f"player_{random.randint(1000, 9999)}"
    player_data = {
        "id": pid, "name": f"생존자_{pid}", "x": 0, "y": 0, "hp": 100, "maxHp": 100,
        "hunger": 100, "maxHunger": 100, "stamina": 100, "maxStamina": 100,
        "customization": {"skinColor": "#f5c29b", "hairStyle": "short", "hairColor": "#4a2c11", "topColor": "#2b5c8f", "bottomColor": "#3a3a3a"},
        "animFrame": 0, "dir": "down", "isMoving": False, "ws": websocket
    }
    server.players[pid] = player_data
    print(f"[PythonServer] Player Connected: {pid}")

    try:
        async for message in websocket:
            data = json.loads(message)
            if data["type"] == "player_tick":
                p = server.players.get(pid)
                if p:
                    p.update(data["payload"])
            elif data["type"] == "place_building":
                server.buildings.append({
                    "id": f"bld_{int(time.time())}", "type": data["payload"]["type"],
                    "x": data["payload"]["x"], "y": data["payload"]["y"],
                    "rotation": 0, "ownerId": pid, "hp": 100, "maxHp": 100
                })
    except Exception:
        pass
    finally:
        server.players.pop(pid, None)
        print(f"[PythonServer] Player Disconnected: {pid}")

async def main():
    asyncio.create_task(server.tick_loop())
    print("[PythonServer] Starting DAY RIFT Python Server on port 8080...")
    async with websockets.serve(handler, "0.0.0.0", 8080):
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())
