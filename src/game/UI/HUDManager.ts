import { PlayerData, Item, Recipe, LandClaim, DayEventRule } from '../Types';
import { CRAFTING_RECIPES } from '../CraftingRecipes';
import { PixelSprites } from '../../engine/PixelSprites';
import { AudioSynth } from '../../engine/AudioSynth';

export class HUDManager {
  private hpBar: HTMLElement;
  private hpText: HTMLElement;
  private hungerBar: HTMLElement;
  private hungerText: HTMLElement;
  private staminaBar: HTMLElement;
  private staminaText: HTMLElement;

  private dayTitle: HTMLElement;
  private dayPhaseText: HTMLElement;
  private clockIndicator: HTMLElement;

  private eventTitle: HTMLElement;
  private eventDesc: HTMLElement;

  private dayBannerOverlay: HTMLElement;
  private bannerDayNum: HTMLElement;
  private bannerRuleTitle: HTMLElement;
  private bannerRuleDesc: HTMLElement;

  private hotbarSlots: HTMLElement;

  private inventoryModal: HTMLElement;
  private inventoryGrid: HTMLElement;
  private craftingRecipes: HTMLElement;

  private buildPaletteModal: HTMLElement;
  private buildItemsGrid: HTMLElement;

  private claimModal: HTMLElement;
  private claimDetails: HTMLElement;

  private customizerModal: HTMLElement;
  private customPreviewCanvas: HTMLCanvasElement;

  private playerListOverlay: HTMLElement;
  private playerListItems: HTMLElement;
  private onlineCount: HTMLElement;

  private chatMessages: HTMLElement;

  private onCraftRequest: ((recipeId: string) => void) | null = null;
  private onBuildSelect: ((type: string) => void) | null = null;
  private onCustomSave: ((cust: PlayerData['customization'], name: string) => void) | null = null;
  private onClaimBuy: (() => void) | null = null;

  constructor() {
    this.hpBar = document.getElementById('hpBar')!;
    this.hpText = document.getElementById('hpText')!;
    this.hungerBar = document.getElementById('hungerBar')!;
    this.hungerText = document.getElementById('hungerText')!;
    this.staminaBar = document.getElementById('staminaBar')!;
    this.staminaText = document.getElementById('staminaText')!;

    this.dayTitle = document.getElementById('dayTitle')!;
    this.dayPhaseText = document.getElementById('dayPhaseText')!;
    this.clockIndicator = document.getElementById('clockIndicator')!;

    this.eventTitle = document.getElementById('eventTitle')!;
    this.eventDesc = document.getElementById('eventDesc')!;

    this.dayBannerOverlay = document.getElementById('dayBannerOverlay')!;
    this.bannerDayNum = document.getElementById('bannerDayNum')!;
    this.bannerRuleTitle = document.getElementById('bannerRuleTitle')!;
    this.bannerRuleDesc = document.getElementById('bannerRuleDesc')!;

    this.hotbarSlots = document.getElementById('hotbarSlots')!;

    this.inventoryModal = document.getElementById('inventoryModal')!;
    this.inventoryGrid = document.getElementById('inventoryGrid')!;
    this.craftingRecipes = document.getElementById('craftingRecipes')!;

    this.buildPaletteModal = document.getElementById('buildPaletteModal')!;
    this.buildItemsGrid = document.getElementById('buildItemsGrid')!;

    this.claimModal = document.getElementById('claimModal')!;
    this.claimDetails = document.getElementById('claimDetails')!;

    this.customizerModal = document.getElementById('customizerModal')!;
    this.customPreviewCanvas = document.getElementById('customPreviewCanvas') as HTMLCanvasElement;

    this.playerListOverlay = document.getElementById('playerListOverlay')!;
    this.playerListItems = document.getElementById('playerListItems')!;
    this.onlineCount = document.getElementById('onlineCount')!;

    this.chatMessages = document.getElementById('chatMessages')!;

    this.setupListeners();
  }

  setCallbacks(
    onCraft: (recipeId: string) => void,
    onBuild: (type: string) => void,
    onCustom: (cust: PlayerData['customization'], name: string) => void,
    onClaim: () => void
  ) {
    this.onCraftRequest = onCraft;
    this.onBuildSelect = onBuild;
    this.onCustomSave = onCustom;
    this.onClaimBuy = onClaim;
  }

  // Update HUD Stats
  updateStats(hp: number, maxHp: number, hunger: number, maxHunger: number, stamina: number, maxStamina: number) {
    this.hpBar.style.width = `${(hp / maxHp) * 100}%`;
    this.hpText.textContent = `${Math.ceil(hp)}/${maxHp}`;

    this.hungerBar.style.width = `${(hunger / maxHunger) * 100}%`;
    this.hungerText.textContent = `${Math.ceil(hunger)}/${maxHunger}`;

    this.staminaBar.style.width = `${(stamina / maxStamina) * 100}%`;
    this.staminaText.textContent = `${Math.ceil(stamina)}/${maxStamina}`;
  }

  // Update Day & Clock
  updateDayClock(dayNum: number, phase: 'day' | 'night', dayProgressRatio: number) {
    this.dayTitle.textContent = `DAY ${dayNum}`;
    this.dayPhaseText.textContent = phase === 'day' ? '낮 (DAY)' : '밤 (NIGHT)';
    this.clockIndicator.textContent = phase === 'day' ? '☀️' : '🌙';
  }

  // Update Active World Event Badge
  updateEventInfo(title: string, desc: string) {
    this.eventTitle.textContent = title;
    this.eventDesc.textContent = desc;
  }

  // Show Big Day Alert Banner
  showDayBanner(dayNum: number, ruleTitle: string, ruleDesc: string) {
    this.bannerDayNum.textContent = `DAY ${dayNum}`;
    this.bannerRuleTitle.textContent = `"${ruleTitle}"`;
    this.bannerRuleDesc.textContent = ruleDesc;

    this.dayBannerOverlay.classList.remove('hidden');
    AudioSynth.playDayAlertSound();

    // Auto-hide after 5 seconds
    setTimeout(() => {
      this.dayBannerOverlay.classList.add('hidden');
    }, 5000);
  }

  // Populate Hotbar
  renderHotbar(inventory: Item[], selectedIdx: number) {
    this.hotbarSlots.innerHTML = '';
    for (let i = 0; i < 10; i++) {
      const item = inventory[i];
      const slot = document.createElement('div');
      slot.className = `hotbar-slot ${i === selectedIdx ? 'active' : ''}`;
      
      const keySpan = document.createElement('span');
      keySpan.className = 'slot-key';
      keySpan.textContent = `${(i + 1) % 10}`;
      slot.appendChild(keySpan);

      if (item) {
        const iconSpan = document.createElement('span');
        iconSpan.className = 'slot-icon';
        iconSpan.textContent = item.icon;
        slot.appendChild(iconSpan);

        if (item.count > 1) {
          const countSpan = document.createElement('span');
          countSpan.className = 'slot-count';
          countSpan.textContent = `${item.count}`;
          slot.appendChild(countSpan);
        }
      }

      this.hotbarSlots.appendChild(slot);
    }
  }

  // Populate Inventory Grid & Crafting
  renderInventory(inventory: Item[], selectedCategory: string = 'tools') {
    // Render 16 grid slots
    this.inventoryGrid.innerHTML = '';
    for (let i = 0; i < 16; i++) {
      const item = inventory[i];
      const cell = document.createElement('div');
      cell.className = 'item-cell';
      if (item) {
        cell.innerHTML = `<span>${item.icon}</span><span class="slot-count">${item.count}</span>`;
      }
      this.inventoryGrid.appendChild(cell);
    }

    // Render Crafting Recipes
    this.craftingRecipes.innerHTML = '';
    const categoryRecipes = CRAFTING_RECIPES.filter(r => r.category === selectedCategory);
    categoryRecipes.forEach(recipe => {
      const card = document.createElement('div');
      card.className = 'recipe-card';

      const matText = recipe.ingredients.map(ing => `${ing.itemId} x${ing.count}`).join(', ');
      card.innerHTML = `
        <div class="recipe-info">
          <div class="recipe-name">${recipe.name}</div>
          <div class="recipe-mats">재료: ${matText}</div>
        </div>
        <button class="pixel-btn green-btn craft-btn" data-id="${recipe.id}">제작</button>
      `;

      card.querySelector('.craft-btn')?.addEventListener('click', () => {
        if (this.onCraftRequest) this.onCraftRequest(recipe.id);
      });

      this.craftingRecipes.appendChild(card);
    });
  }

  // Populate Build Palette Modal (B)
  renderBuildPalette(category: string = 'walls') {
    const buildOptions = [
      { id: 'wood_wall', name: '나무 벽', cat: 'walls', icon: '🪵', cost: '목재 4' },
      { id: 'stone_wall', name: '돌 벽', cat: 'walls', icon: '🧱', cost: '돌 4' },
      { id: 'wood_door', name: '나무 문', cat: 'walls', icon: '🚪', cost: '목재 6' },
      { id: 'wood_floor', name: '나무 바닥', cat: 'floors', icon: '🪵', cost: '목재 4' },
      { id: 'chest', name: '나무 상자', cat: 'furniture', icon: '📦', cost: '목재 10' },
      { id: 'workbench', name: '작업대', cat: 'furniture', icon: '⚒️', cost: '목재 15 + 돌 5' },
      { id: 'campfire', name: '캠프파이어', cat: 'furniture', icon: '🔥', cost: '목재 8 + 돌 8' },
      { id: 'lamp', name: '조명 램프', cat: 'furniture', icon: '💡', cost: '철 2 + 섬유 4' },
      { id: 'claim_totem', name: '토지 토템', cat: 'furniture', icon: '🚩', cost: '목재 20 + 돌 10' }
    ];

    this.buildItemsGrid.innerHTML = '';
    const items = buildOptions.filter(b => b.cat === category || category === 'walls');
    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'build-card';
      card.innerHTML = `
        <div class="b-icon">${item.icon}</div>
        <div class="b-name">${item.name}</div>
        <div class="b-cost">${item.cost}</div>
      `;
      card.addEventListener('click', () => {
        if (this.onBuildSelect) this.onBuildSelect(item.id);
        this.toggleModal(this.buildPaletteModal, false);
      });
      this.buildItemsGrid.appendChild(card);
    });
  }

  // Modal Visibility Toggles
  toggleModal(modal: HTMLElement, force?: boolean) {
    if (force !== undefined) {
      if (force) modal.classList.remove('hidden');
      else modal.classList.add('hidden');
    } else {
      modal.classList.toggle('hidden');
    }
  }

  toggleInventory() { this.toggleModal(this.inventoryModal); }
  toggleBuild() { this.toggleModal(this.buildPaletteModal); }
  toggleClaim() { this.toggleModal(this.claimModal); }
  toggleCustomizer() { this.toggleModal(this.customizerModal); }
  togglePlayerList() { this.toggleModal(this.playerListOverlay); }

  closeAllModals() {
    [this.inventoryModal, this.buildPaletteModal, this.claimModal, this.customizerModal, this.playerListOverlay].forEach(m => {
      m.classList.add('hidden');
    });
  }

  // Add Chat Log Message
  addChatMessage(author: string, text: string, isSystem: boolean = false) {
    const msg = document.createElement('div');
    msg.className = `chat-msg ${isSystem ? 'system' : ''}`;
    if (isSystem) {
      msg.textContent = `[시스템] ${text}`;
    } else {
      msg.innerHTML = `<span class="author">${author}:</span> ${text}`;
    }
    this.chatMessages.appendChild(msg);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }

  // Setup Event Listeners for UI Close/Tabs/Save Buttons
  private setupListeners() {
    document.getElementById('closeInvBtn')?.addEventListener('click', () => this.toggleModal(this.inventoryModal, false));
    document.getElementById('closeBuildBtn')?.addEventListener('click', () => this.toggleModal(this.buildPaletteModal, false));
    document.getElementById('closeClaimBtn')?.addEventListener('click', () => this.toggleModal(this.claimModal, false));
    document.getElementById('closeCustomBtn')?.addEventListener('click', () => this.toggleModal(this.customizerModal, false));

    // Crafting Category Tabs
    document.querySelectorAll('.craft-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        document.querySelectorAll('.craft-tab').forEach(t => t.classList.remove('active'));
        target.classList.add('active');
        const cat = target.getAttribute('data-tab') || 'tools';
        this.renderInventory([], cat);
      });
    });

    // Customizer Save Button
    document.getElementById('saveCustomBtn')?.addEventListener('click', () => {
      const skinColor = (document.getElementById('skinColorPicker') as HTMLInputElement).value;
      const hairStyle = (document.getElementById('hairStyleSelect') as HTMLSelectElement).value as any;
      const hairColor = (document.getElementById('hairColorPicker') as HTMLInputElement).value;
      const topColor = (document.getElementById('topColorPicker') as HTMLInputElement).value;
      const bottomColor = (document.getElementById('bottomColorPicker') as HTMLInputElement).value;
      const name = (document.getElementById('playerNameInput') as HTMLInputElement).value || '생존자';

      if (this.onCustomSave) {
        this.onCustomSave({ skinColor, hairStyle, hairColor, topColor, bottomColor }, name);
      }
      this.toggleModal(this.customizerModal, false);
    });

    // Land Claim Buy Button
    document.getElementById('buyClaimBtn')?.addEventListener('click', () => {
      if (this.onClaimBuy) this.onClaimBuy();
    });
  }
}
