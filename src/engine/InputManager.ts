// Input Manager for Keyboard, Mouse, and Touch Controls

export class InputManager {
  public keys: Record<string, boolean> = {};
  public mouseScreen: { x: number; y: number } = { x: 0, y: 0 };
  public mouseWorld: { x: number; y: number } = { x: 0, y: 0 };
  public mouseLeftDown: boolean = false;
  public mouseRightDown: boolean = false;
  public mouseLeftClicked: boolean = false;
  public mouseRightClicked: boolean = false;

  // Touch Virtual D-Pad vector
  public touchVector: { x: number; y: number } = { x: 0, y: 0 };

  private onActionCallback: ((action: string, payload?: any) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    // Keyboard events
    window.addEventListener('keydown', (e) => {
      // Don't capture keys if typing in chat or input inputs
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'SELECT') {
        if (e.key === 'Enter') {
          this.triggerAction('chat_submit');
        }
        return;
      }

      this.keys[e.key.toLowerCase()] = true;

      // Key Hotbar 1-9
      if (e.key >= '1' && e.key <= '9') {
        this.triggerAction('select_hotbar', parseInt(e.key) - 1);
      } else if (e.key === '0') {
        this.triggerAction('select_hotbar', 9);
      }

      // Hotkeys
      if (e.key.toLowerCase() === 'e') this.triggerAction('toggle_inventory');
      if (e.key.toLowerCase() === 'b') this.triggerAction('toggle_build');
      if (e.key.toLowerCase() === 'c') this.triggerAction('toggle_claim');
      if (e.key.toLowerCase() === 'k') this.triggerAction('toggle_customizer');
      if (e.key.toLowerCase() === 'r') this.triggerAction('rotate_building');
      if (e.key === 'Tab') {
        e.preventDefault();
        this.triggerAction('toggle_player_list');
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        this.triggerAction('focus_chat');
      }
      if (e.key === 'Escape') {
        this.triggerAction('close_all_modals');
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });

    // Mouse events
    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      this.mouseScreen.x = e.clientX - rect.left;
      this.mouseScreen.y = e.clientY - rect.top;
    });

    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.mouseLeftDown = true;
        this.mouseLeftClicked = true;
      } else if (e.button === 2) {
        e.preventDefault();
        this.mouseRightDown = true;
        this.mouseRightClicked = true;
        this.triggerAction('rotate_building');
      }
    });

    canvas.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouseLeftDown = false;
      if (e.button === 2) this.mouseRightDown = false;
    });

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Mobile D-Pad binding helpers
    this.setupMobileControls();
  }

  setActionCallback(cb: (action: string, payload?: any) => void) {
    this.onActionCallback = cb;
  }

  private triggerAction(action: string, payload?: any) {
    if (this.onActionCallback) {
      this.onActionCallback(action, payload);
    }
  }

  // Get current normalized movement direction vector
  getMovementVector(): { dx: number; dy: number } {
    let dx = 0;
    let dy = 0;

    if (this.keys['w'] || this.keys['arrowup']) dy -= 1;
    if (this.keys['s'] || this.keys['arrowdown']) dy += 1;
    if (this.keys['a'] || this.keys['arrowleft']) dx -= 1;
    if (this.keys['d'] || this.keys['arrowright']) dx += 1;

    // Combine with mobile touch vector if present
    if (this.touchVector.x !== 0 || this.touchVector.y !== 0) {
      dx = this.touchVector.x;
      dy = this.touchVector.y;
    }

    // Normalize diagonal movement speed
    if (dx !== 0 && dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      dx /= len;
      dy /= len;
    }

    return { dx, dy };
  }

  // Reset frame single-click triggers
  endFrame() {
    this.mouseLeftClicked = false;
    this.mouseRightClicked = false;
  }

  private setupMobileControls() {
    const bindTouchBtn = (id: string, dx: number, dy: number) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.touchVector.x = dx;
        this.touchVector.y = dy;
      });
      btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.touchVector.x = 0;
        this.touchVector.y = 0;
      });
    };

    bindTouchBtn('btnUp', 0, -1);
    bindTouchBtn('btnDown', 0, 1);
    bindTouchBtn('btnLeft', -1, 0);
    bindTouchBtn('btnRight', 1, 0);

    const btnActionF = document.getElementById('btnActionF');
    if (btnActionF) {
      btnActionF.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.triggerAction('interact');
      });
    }

    const btnActionAttack = document.getElementById('btnActionAttack');
    if (btnActionAttack) {
      btnActionAttack.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.mouseLeftClicked = true;
      });
    }
  }
}
