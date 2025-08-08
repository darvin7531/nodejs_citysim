import { EventEmitter } from 'events';
import { World, TILE_TYPES } from '../world/world.js';
import { Hooks } from '../api/hooks.js';

export class Engine extends EventEmitter {
  constructor(canvas) {
    super();
    this.tickCount = 0;
    this.canvas = canvas;
    this.world = new World(canvas);
    this.buildMode = null;
    this.hooks = new Hooks();

    this.cash = 1000;
    this.population = 0;
    this.pollution = 0;
    this.happiness = 50;

    this.selectedTile = null; // Для подсветки и улучшений
  }

  setBuildMode(mode) {
    this.buildMode = mode;
    this.emit('modeChange', mode);
    this.hooks.emit('modeChange', mode);
  }

  init() {
    console.log('Игра стартует...');
    this.loop();

    this.on('build', (type) => {
      if (typeof type === 'string' && TILE_TYPES[type]) {
        this.setBuildMode(TILE_TYPES[type]);
      } else if (typeof type === 'number') {
        this.setBuildMode(type);
      } else {
        console.warn('Неизвестный тип строительства:', type);
      }
    });

    this.on('place', ({ x, y }) => {
      if (!this.buildMode) return;
      const tx = Math.floor(x / this.world.tileSize);
      const ty = Math.floor(y / this.world.tileSize);

      const success = this.world.build(tx, ty, this.buildMode);
      if (success) {
        console.log(`Построили ${this.buildMode} в (${tx},${ty})`);
        this.hooks.emit('built', { type: this.buildMode, x: tx, y: ty });
        this.setBuildMode(null); // Сброс режима после постройки
      } else {
        console.log('Нельзя строить здесь');
      }
    });

    this.on('upgrade', () => {
      if (!this.selectedTile) {
        console.log('Нет выбранного тайла для улучшения');
        return;
      }
      const { x, y } = this.selectedTile;
      if (this.world.upgrade(x, y)) {
        console.log(`Улучшили здание на (${x},${y})`);
      } else {
        console.log('Нельзя улучшить это здание');
      }
    });

    this.on('demolish', () => {
      if (!this.selectedTile) {
        console.log('Нет выбранного тайла для сноса');
        return;
      }
      const { x, y } = this.selectedTile;
      if (this.world.demolish(x, y)) {
        console.log(`Снесли здание на (${x},${y})`);
      } else {
        console.log('Нельзя снести это здание');
      }
    });

    this.on('selectTile', ({ x, y }) => {
      this.selectedTile = { x, y };
      this.emit('tileSelected', this.selectedTile);
    });
  }

  updateEconomy() {
    let houses = 0, factories = 0, parks = 0;

    for (let y = 0; y < this.world.height; y++) {
      for (let x = 0; x < this.world.width; x++) {
        const tile = this.world.tiles[y][x];
        if (tile.type === this.world.TILE_TYPES.HOUSE) houses++;
        else if (tile.type === this.world.TILE_TYPES.FACTORY) factories++;
        else if (tile.type === this.world.TILE_TYPES.PARK) parks++;
      }
    }

    const incomeFromHouses = houses * 5;
    const incomeFromFactories = factories * 20;
    const pollutionFromFactories = factories * 2;
    const happinessFromParks = parks * 3;

    this.cash += incomeFromHouses + incomeFromFactories;
    this.pollution += pollutionFromFactories;
    this.happiness = Math.min(100, Math.max(0, this.happiness + happinessFromParks - pollutionFromFactories));

    this.population = houses * 4;
  }

  loop() {
    this.tickCount++;
    this.emit('tick', this.tickCount);
    this.hooks.emit('tick', this.tickCount);

    if (this.tickCount % 60 === 0) {
      this.updateEconomy();
      this.emit('economyUpdate', {
        cash: this.cash,
        population: this.population,
        pollution: this.pollution,
        happiness: this.happiness,
      });
    }

    this.world.draw();

    // Подсветка выбранного тайла
    if (this.selectedTile) {
      const ctx = this.world.ctx;
      const { x, y } = this.selectedTile;
      ctx.strokeStyle = 'yellow';
      ctx.lineWidth = 3;
      ctx.strokeRect(
        x * this.world.tileSize + 1.5,
        y * this.world.tileSize + 1.5,
        this.world.tileSize - 3,
        this.world.tileSize - 3
      );
      ctx.lineWidth = 1;
    }

    this.emit('render');
    this.hooks.emit('render');

    requestAnimationFrame(() => this.loop());
  }
}
