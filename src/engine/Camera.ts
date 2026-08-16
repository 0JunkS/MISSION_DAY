// Smooth Top-Down Angled Camera System

export class Camera {
  public x: number = 0;
  public y: number = 0;
  public targetX: number = 0;
  public targetY: number = 0;
  public lerpSpeed: number = 0.1; // Smooth follow speed

  public viewportWidth: number = 800;
  public viewportHeight: number = 600;

  constructor(viewportWidth: number, viewportHeight: number) {
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
  }

  resize(w: number, h: number) {
    this.viewportWidth = w;
    this.viewportHeight = h;
  }

  setTarget(x: number, y: number) {
    this.targetX = x;
    this.targetY = y;
  }

  update() {
    // Smooth lerp movement toward target player position
    this.x += (this.targetX - this.x) * this.lerpSpeed;
    this.y += (this.targetY - this.y) * this.lerpSpeed;
  }

  // Convert World Coordinate to Screen Canvas Coordinate
  worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    return {
      x: Math.floor(worldX - this.x + this.viewportWidth / 2),
      y: Math.floor(worldY - this.y + this.viewportHeight / 2)
    };
  }

  // Convert Screen Canvas Coordinate to World Coordinate
  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: screenX - this.viewportWidth / 2 + this.x,
      y: screenY - this.viewportHeight / 2 + this.y
    };
  }
}
