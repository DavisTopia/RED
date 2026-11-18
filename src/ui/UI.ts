import type { Creature } from '../creatures/Creature';
import type { CharacterData, Race } from '../core/types';

export interface UIActions {
  start: (race: Race, name: string) => void;
  continue: () => void;
  attack: () => void;
  jump: () => void;
  interact: () => void;
  spirit: () => void;
  camera: () => void;
  toggleInventory: () => void;
  setBlocking: (blocked: boolean) => void;
  setSprinting: (sprinting: boolean) => void;
}

export class UI {
  private readonly menu: HTMLDivElement;
  private readonly hud: HTMLDivElement;
  private readonly toast: HTMLDivElement;
  private readonly inventory: HTMLDivElement;
  private toastTimeout = 0;
  private selectedRace: Race = 'Human';
  private currentCharacter: CharacterData | null = null;
  private readonly buttons = new Map<string, HTMLButtonElement>();

  constructor(private readonly root: HTMLElement, private readonly actions: UIActions) {
    this.menu = document.createElement('div');
    this.menu.className = 'screen menu-screen';
    this.hud = document.createElement('div');
    this.hud.className = 'hud hidden';
    this.toast = document.createElement('div');
    this.toast.className = 'toast';
    this.inventory = document.createElement('div');
    this.inventory.className = 'inventory-panel hidden';
    root.append(this.menu, this.hud, this.toast, this.inventory);
    this.renderMenu(null);
    this.root.addEventListener('click', (event) => this.handleClick(event));
    this.root.addEventListener('pointerdown', (event) => this.handlePointerDown(event));
    window.addEventListener('pointerup', () => {
      actions.setBlocking(false);
      actions.setSprinting(false);
    });
    window.addEventListener('pointercancel', () => {
      actions.setBlocking(false);
      actions.setSprinting(false);
    });
  }

  private renderMenu(save: CharacterData | null): void {
    this.menu.innerHTML = `
      <div class="menu-card">
        <div class="eyebrow">REALM OF ETERNAL DRAGONS</div>
        <h1>THE FORGOTTEN<br><span>VALLEY</span></h1>
        <p class="menu-copy">A quiet frontier. Old stones remember what the world has forgotten.</p>
        ${save ? `<button class="primary-button wide" data-action="continue">Continue as ${this.escape(save.name)} · ${this.escape(save.race)}</button>` : ''}
        <div class="section-label">${save ? 'OR BEGIN A NEW JOURNEY' : 'CHOOSE YOUR WAYFARER'}</div>
        <div class="race-grid">
          ${(['Human', 'Elf', 'Dwarf', 'Beastkin'] as Race[]).map((race) => `
            <button class="race-card ${race === this.selectedRace ? 'selected' : ''}" data-race="${race}">
              <span class="race-sigil">${this.raceIcon(race)}</span><strong>${race}</strong>
              <small>${this.raceSummary(race)}</small>
            </button>`).join('')}
        </div>
        <label class="name-field">WAYFARER NAME<input id="character-name" maxlength="20" value="Wayfarer" autocomplete="off"></label>
        <button class="primary-button wide" data-action="start">Enter the valley <span>→</span></button>
        <div class="menu-footer">Single-player · Local save · Desktop &amp; mobile</div>
      </div>
    `;
    this.menu.classList.remove('hidden');
    this.hud.classList.add('hidden');
  }

  private raceIcon(race: Race): string {
    return ({ Human: '✦', Elf: '⌁', Dwarf: '⬡', Beastkin: '❋' })[race];
  }

  private raceSummary(race: Race): string {
    return ({
      Human: 'Balanced · adaptable',
      Elf: 'Swift · keen-minded',
      Dwarf: 'Stout · mighty',
      Beastkin: 'Agile · enduring',
    })[race];
  }

  private handleClick(event: Event): void {
    const target = event.target as HTMLElement;
    const raceButton = target.closest<HTMLButtonElement>('[data-race]');
    if (raceButton) {
      this.selectedRace = raceButton.dataset.race as Race;
      this.menu.querySelectorAll('.race-card').forEach((card) => card.classList.toggle('selected', card === raceButton));
      return;
    }
    const action = target.closest<HTMLButtonElement>('[data-action]')?.dataset.action;
    switch (action) {
      case 'start': {
        const name = this.menu.querySelector<HTMLInputElement>('#character-name')?.value.trim() || 'Wayfarer';
        this.actions.start(this.selectedRace, name);
        break;
      }
      case 'continue':
        this.actions.continue();
        break;
      case 'attack':
        this.actions.attack();
        break;
      case 'jump':
        this.actions.jump();
        break;
      case 'interact':
        this.actions.interact();
        break;
      case 'spirit':
        this.actions.spirit();
        break;
      case 'camera':
        this.actions.camera();
        break;
      case 'inventory':
        this.actions.toggleInventory();
        break;
      case 'close-inventory':
        this.inventory.classList.add('hidden');
        break;
    }
  }

  private handlePointerDown(event: PointerEvent): void {
    const target = event.target as HTMLElement;
    if (target.closest('[data-action="block"]')) {
      event.preventDefault();
      this.actions.setBlocking(true);
    }
    if (target.closest('[data-action="sprint"]')) {
      event.preventDefault();
      this.actions.setSprinting(true);
    }
  }

  setSprintingReleased(): void {
    this.actions.setSprinting(false);
  }

  startGame(character: CharacterData): void {
    this.currentCharacter = character;
    this.menu.classList.add('hidden');
    this.hud.classList.remove('hidden');
    this.renderHud();
  }

  showSavedCharacter(character: CharacterData | null): void {
    this.renderMenu(character);
  }

  private renderHud(): void {
    this.hud.innerHTML = `
      <div class="hud-top">
        <div class="identity"><span class="identity-mark">R</span><span><b id="hud-name"></b><small id="hud-level"></small></span></div>
        <div class="region"><i></i> THE FORGOTTEN VALLEY</div>
        <button class="icon-button" data-action="camera" aria-label="Switch camera">◉ <span>V · THIRD PERSON</span></button>
      </div>
      <div class="status-panel">
        <div class="status-row"><span>HEALTH</span><div class="bar"><i id="health-bar" class="health-fill"></i></div><b id="health-value"></b></div>
        <div class="status-row"><span>STAMINA</span><div class="bar"><i id="stamina-bar" class="stamina-fill"></i></div><b id="stamina-value"></b></div>
        <div class="status-row"><span>MANA</span><div class="bar"><i id="mana-bar" class="mana-fill"></i></div><b id="mana-value"></b></div>
        <div class="xp-row"><span>XP</span><div class="bar"><i id="xp-bar" class="xp-fill"></i></div><b id="xp-value"></b></div>
      </div>
      <div class="interaction-prompt" id="interaction-prompt"></div>
      <div class="landmark-label" id="landmark-label">DISCOVERED · FORGOTTEN VALLEY</div>
      <div class="bottom-left"><button class="small-button" data-action="inventory">I · INVENTORY</button><div class="companion-status" id="companion-status">COMPANION · NONE</div></div>
      <div class="desktop-hints"><span>WASD MOVE</span><span>SHIFT SPRINT</span><span>SPACE JUMP</span><span>CLICK ATTACK</span><span>E INTERACT</span><span>Q SPIRIT</span></div>
      <div class="touch-controls">
        <div class="joystick"><span></span></div>
        <div class="touch-actions">
          <button data-action="camera">CAM</button>
          <button data-action="jump">JUMP</button>
          <button data-action="block">BLOCK</button>
          <button data-action="attack" class="attack-button">STRIKE</button>
          <button data-action="interact">USE</button>
          <button data-action="spirit">SPIRIT</button>
          <button data-action="sprint">RUN</button>
        </div>
      </div>
    `;
    this.buttons.clear();
    this.hud.querySelectorAll<HTMLButtonElement>('[data-action]').forEach((button) => {
      if (button.dataset.action) this.buttons.set(button.dataset.action, button);
    });
  }

  update(data: {
    character: CharacterData;
    health: number;
    stamina: number;
    mana: number;
    camera: string;
    prompt: string;
    companion: Creature | null;
    spiritActive: boolean;
    spiritCooldown: number;
  }): void {
    this.currentCharacter = data.character;
    const setText = (selector: string, value: string): void => {
      const element = this.hud.querySelector<HTMLElement>(selector);
      if (element) element.textContent = value;
    };
    const setBar = (selector: string, value: number, max: number): void => {
      const element = this.hud.querySelector<HTMLElement>(selector);
      if (element) element.style.width = `${Math.max(0, Math.min(100, (value / max) * 100))}%`;
    };
    setText('#hud-name', data.character.name);
    setText('#hud-level', `LEVEL ${data.character.level} · ${data.character.race.toUpperCase()}`);
    setText('#health-value', `${Math.ceil(data.health)} / ${data.character.attributes.health}`);
    setText('#stamina-value', `${Math.ceil(data.stamina)} / ${data.character.attributes.stamina}`);
    setText('#mana-value', `${Math.ceil(data.mana)} / ${data.character.attributes.mana}`);
    const xpRequired = 100 + (data.character.level - 1) * 75;
    setText('#xp-value', `${data.character.xp} / ${xpRequired}`);
    setBar('#health-bar', data.health, data.character.attributes.health);
    setBar('#stamina-bar', data.stamina, data.character.attributes.stamina);
    setBar('#mana-bar', data.mana, data.character.attributes.mana);
    setBar('#xp-bar', data.character.xp, xpRequired);
    setText('#interaction-prompt', data.prompt);
    setText('#companion-status', data.companion ? `COMPANION · WOLF · ${Math.ceil(data.companion.health)} HP` : 'COMPANION · NONE');
    const cameraButton = this.buttons.get('camera');
    if (cameraButton) {
      cameraButton.title = data.camera === 'first-person' ? 'First person · V' : 'Third person · V';
      const label = cameraButton.querySelector('span');
      if (label) label.textContent = `V · ${data.camera === 'first-person' ? 'FIRST PERSON' : 'THIRD PERSON'}`;
    }
    const spiritButton = this.buttons.get('spirit');
    if (spiritButton) spiritButton.textContent = data.spiritActive ? 'DISMISS' : data.spiritCooldown > 0 ? `Q · ${Math.ceil(data.spiritCooldown)}s` : 'SPIRIT';
  }

  toggleInventory(): void {
    if (!this.currentCharacter) return;
    if (!this.inventory.classList.contains('hidden')) {
      this.inventory.classList.add('hidden');
      return;
    }
    this.inventory.innerHTML = `
      <div class="inventory-card">
        <button class="close-button" data-action="close-inventory">×</button>
        <div class="eyebrow">WAYFARER'S PACK</div><h2>Inventory</h2>
        <div class="inventory-items">${this.currentCharacter.inventory.map((item) => `<div>◇ <span>${this.escape(item)}</span><small>${this.currentCharacter?.equipment.includes(item) ? 'EQUIPPED' : 'ITEM'}</small></div>`).join('')}</div>
        <p class="inventory-note">Items are collected from creatures and the valley.</p>
      </div>
    `;
    this.inventory.classList.remove('hidden');
  }

  toastMessage(message: string): void {
    this.toast.textContent = message;
    this.toast.classList.add('visible');
    window.clearTimeout(this.toastTimeout);
    this.toastTimeout = window.setTimeout(() => this.toast.classList.remove('visible'), 2600);
  }

  private escape(text: string): string {
    return text.replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[character] ?? character);
  }
}
