import { EventEmitter } from 'events';
import { World, TILE_TYPES } from '../world/world.js';
import { Hooks } from '../api/hooks.js';
import { TrafficManager } from './traffic.js';

const COSTS = {
  BUILD_HOUSE: 100, BUILD_ROAD: 10, BUILD_FACTORY: 500,
  BUILD_POWER_PLANT: 800, BUILD_PARK: 200, BUILD_FIRE_STATION: 600,
  UPGRADE: 150, DEMOLISH_REFUND_PERCENT: 0.4,
  UPKEEP_FIRE_STATION: 40,
};

const UPGRADE_THRESHOLDS = { 2: 30, 3: 50, 4: 70, 5: 90 };

export class Engine extends EventEmitter {
  constructor(canvas) {
    super();
    this.tickCount = 0;
    this.canvas = canvas;
    this.world = new World(canvas);
    this.hooks = new Hooks();
    this.trafficManager = new TrafficManager(this);
    this.buildMode = null;
    this.overlayMode = null;
    this.COSTS = COSTS;
    this.UPGRADE_THRESHOLDS = UPGRADE_THRESHOLDS;
    
    this.cash = 2000;
    this.population = 0;
    this.pollution = 0;
    this.happiness = 50;
    this.selectedTile = null;

    this.powerGrid = Array.from({ length: this.world.height }, () => Array(this.world.width).fill(false));
    this.roadAccessGrid = Array.from({ length: this.world.height }, () => Array(this.world.width).fill(false));
    this.landValueGrid = Array.from({ length: this.world.height }, () => Array(this.world.width).fill(0));
    this.roadMaskGrid = Array.from({ length: this.world.height }, () => Array(this.world.width).fill(0));
  }
  
  init() {
    this.on('build', (type) => this.setBuildMode(TILE_TYPES[type]));
    this.on('place', this.handlePlace.bind(this));
    this.on('upgrade', this.handleUpgrade.bind(this));
    this.on('demolish', this.handleDemolish.bind(this));
    this.on('selectTile', this.handleSelectTile.bind(this));
    this.on('toggleOverlay', (mode) => { this.overlayMode = this.overlayMode === mode ? null : mode; });
    this.loop();
  }

  handlePlace({ x, y }) {
    if (!this.buildMode) return;
    const typeName = Object.keys(TILE_TYPES).find(key => TILE_TYPES[key] === this.buildMode);
    const cost = this.COSTS[`BUILD_${typeName}`];
    if (this.cash < cost) return;
    const tx = Math.floor(x / this.world.tileSize);
    const ty = Math.floor(y / this.world.tileSize);
    if (this.world.build(tx, ty, this.buildMode)) {
      this.cash -= cost;
      this.hooks.emit('built', { type: this.buildMode, x: tx, y: ty });
      this.setBuildMode(null);
    }
  }

  handleUpgrade() {
    if (!this.selectedTile || this.cash < this.COSTS.UPGRADE) return;
    const { x, y } = this.selectedTile;
    const tile = this.world.tiles[y][x];
    const requiredValue = this.UPGRADE_THRESHOLDS[tile.level + 1];
    if (requiredValue && this.landValueGrid[y][x] < requiredValue) return;
    if (this.world.upgrade(x, y)) {
      this.cash -= this.COSTS.UPGRADE;
      this.handleSelectTile({ x, y });
    }
  }

  handleDemolish() {
    if (!this.selectedTile) return;
    const { x, y } = this.selectedTile;
    const tile = this.world.tiles[y][x];
    const typeName = Object.keys(TILE_TYPES).find(key => TILE_TYPES[key] === tile.type);
    const refund = Math.floor((this.COSTS[`BUILD_${typeName}`] || 0) * this.COSTS.DEMOLISH_REFUND_PERCENT);
    if (this.world.demolish(x, y)) {
      this.cash += refund;
      this.selectedTile = null;
      this.emit('tileDeselected');
    }
  }

  handleSelectTile({ x, y }) {
    if (x >= 0 && x < this.world.width && y >= 0 && y < this.world.height) {
      this.selectedTile = { x, y };
      this.emit('tileSelected', {
        x, y, tile: this.world.tiles[y][x], isPowered: this.powerGrid[y][x],
        hasRoadAccess: this.roadAccessGrid[y][x], landValue: this.landValueGrid[y][x],
      });
    }
  }

  setBuildMode(mode) { this.buildMode = mode; this.emit('modeChange', mode); }

  onVehicleArrival(vehicle) {
    if (vehicle.resident.state === 'toWork') {
      vehicle.resident.state = 'atWork';
      const workDurationInSeconds = 5;
      vehicle.resident.departureTick = this.tickCount + (60 * workDurationInSeconds);
    } else if (vehicle.resident.state === 'toHome') {
      vehicle.resident.state = 'atHome';
      const factory = this.world.tiles[vehicle.workplaceCoords.y][vehicle.workplaceCoords.x];
      if (factory && factory.jobs) {
        factory.jobs.filledBy = factory.jobs.filledBy.filter(id => id !== vehicle.resident.id);
      }
      vehicle.resident.workplace = null;
    }
  }

  simulatePopulation() {
    const { tiles } = this.world;
    const { HOUSE, FACTORY } = TILE_TYPES;
    const availableJobs = [];
    for (let y = 0; y < tiles.length; y++) {
      for (let x = 0; x < tiles[y].length; x++) {
        const tile = tiles[y][x];
        if (tile.type === FACTORY && tile.jobs && tile.jobs.filledBy.length < tile.jobs.total) {
          const numFreeSlots = tile.jobs.total - tile.jobs.filledBy.length;
          for (let i = 0; i < numFreeSlots; i++) {
            availableJobs.push({ x, y });
          }
        }
      }
    }
    for (let y = 0; y < tiles.length; y++) {
      for (let x = 0; x < tiles[y].length; x++) {
        const tile = tiles[y][x];
        if (tile.type === HOUSE && tile.residents) {
          for (const resident of tile.residents) {
            if (resident.state === 'atHome' && availableJobs.length > 0) {
              const workplaceCoords = availableJobs.pop();
              const homeCoords = {x, y};
              resident.state = 'toWork';
              const tripStarted = this.trafficManager.createTrip(resident, homeCoords, workplaceCoords);
              if (tripStarted) {
                resident.workplace = workplaceCoords;
                const factory = this.world.tiles[workplaceCoords.y][workplaceCoords.x];
                factory.jobs.filledBy.push(resident.id);
              } else {
                resident.state = 'atHome';
              }
            } else if (resident.state === 'atWork' && this.tickCount >= resident.departureTick) {
              const homeCoords = {x, y};
              const workplaceCoords = resident.workplace;
              resident.state = 'toHome';
              const tripStarted = this.trafficManager.createTrip(resident, workplaceCoords, homeCoords);
              if (!tripStarted) {
                this.onVehicleArrival({ resident, workplaceCoords });
              }
            }
          }
        }
      }
    }
  }

  loop() {
    this.tickCount++;
    this.trafficManager.updatePositions();
    if (this.tickCount % 60 === 0) {
      this.updateEconomy();
      this.simulatePopulation();
      this.emit('economyUpdate', { cash: this.cash, population: this.population, pollution: this.pollution, happiness: this.happiness });
    }
    this.world.draw(
      this.powerGrid, this.roadAccessGrid, this.landValueGrid, 
      this.overlayMode, this.roadMaskGrid, this.trafficManager.vehicles
    );
    if (this.selectedTile) {
      const { x, y } = this.selectedTile;
      const ctx = this.world.ctx;
      ctx.strokeStyle = 'yellow'; ctx.lineWidth = 3;
      ctx.strokeRect(x * this.world.tileSize + 1.5, y * this.world.tileSize + 1.5, this.world.tileSize - 3, this.world.tileSize - 3);
    }
    requestAnimationFrame(this.loop.bind(this));
  }
  
  updateEconomy() {
    this.updatePowerGrid(); 
    this.updateRoadAccessGrid(); 
    this.updateLandValueGrid(); 
    this.updateRoadMaskGrid(); // <-- Эта строка больше не вызовет ошибку
    
    let income = 0, expenses = 0, totalPopulation = 0, totalPollution = 0, happinessBonus = 0;
    let employedPopulation = 0;
    for (let y = 0; y < this.world.height; y++) {
      for (let x = 0; x < this.world.width; x++) {
        const tile = this.world.tiles[y][x];
        const isProductive = this.powerGrid[y][x] && this.roadAccessGrid[y][x];
        if(tile.type === TILE_TYPES.HOUSE && tile.residents) { totalPopulation += tile.residents.length; }
        if(tile.type === TILE_TYPES.FACTORY && tile.jobs) {
            if(isProductive) { employedPopulation += tile.jobs.filledBy.length; }
            totalPollution += tile.level * 2;
        }
        if (tile.type === TILE_TYPES.PARK) { happinessBonus += tile.level * 3; totalPollution -= tile.level * 0.5; }
        if (tile.type === TILE_TYPES.POWER_PLANT) { totalPollution += 5; }
        if (tile.type === TILE_TYPES.FIRE_STATION) { expenses += this.COSTS.UPKEEP_FIRE_STATION; }
      }
    }
    income = employedPopulation * 2;
    this.cash += income - expenses; this.population = totalPopulation;
    this.pollution = Math.max(0, totalPollution);
    this.happiness = Math.min(100, Math.max(0, 50 + happinessBonus - this.pollution));
  }
  
  // **ВОССТАНОВЛЕННЫЙ МЕТОД**
  updateRoadMaskGrid() {
    for (let y = 0; y < this.world.height; y++) {
      for (let x = 0; x < this.world.width; x++) {
        if (this.world.tiles[y][x].type !== TILE_TYPES.ROAD) {
          this.roadMaskGrid[y][x] = 0;
          continue;
        }
        let mask = 0;
        if (y > 0 && this.world.tiles[y - 1][x].type === TILE_TYPES.ROAD) mask |= 1;
        if (x < this.world.width - 1 && this.world.tiles[y][x + 1].type === TILE_TYPES.ROAD) mask |= 2;
        if (y < this.world.height - 1 && this.world.tiles[y + 1][x].type === TILE_TYPES.ROAD) mask |= 4;
        if (x > 0 && this.world.tiles[y][x - 1].type === TILE_TYPES.ROAD) mask |= 8;
        this.roadMaskGrid[y][x] = mask;
      }
    }
  }

  updateLandValueGrid() {
    const influenceSources = [];
    for (let y = 0; y < this.world.height; y++) {
        for (let x = 0; x < this.world.width; x++) {
            const tile = this.world.tiles[y][x];
            if (tile.type === TILE_TYPES.PARK || tile.type === TILE_TYPES.FIRE_STATION) {
                influenceSources.push({ x, y, value: 50, radius: 5 });
            } else if (tile.type === TILE_TYPES.FACTORY || tile.type === TILE_TYPES.POWER_PLANT) {
                influenceSources.push({ x, y, value: -40, radius: 4 });
            }
        }
    }
    for (let y = 0; y < this.world.height; y++) {
        for (let x = 0; x < this.world.width; x++) {
            let totalValue = 5;
            for (const source of influenceSources) {
                const distance = Math.sqrt(Math.pow(x - source.x, 2) + Math.pow(y - source.y, 2));
                if (distance < source.radius) {
                    totalValue += source.value * (1 - distance / source.radius);
                }
            }
            this.landValueGrid[y][x] = Math.max(0, Math.min(120, Math.round(totalValue)));
        }
    }
  }

  updatePowerGrid() {
      const queue = [];
      for (let y = 0; y < this.world.height; y++) {
          this.powerGrid[y].fill(false);
          for (let x = 0; x < this.world.width; x++) {
              if (this.world.tiles[y][x].type === TILE_TYPES.POWER_PLANT) {
                  queue.push({ x, y });
                  this.powerGrid[y][x] = true;
              }
          }
      }
      const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
      let head = 0;
      while (head < queue.length) {
          const { x, y } = queue[head++];
          for (const [dx, dy] of directions) {
              const nx = x + dx, ny = y + dy;
              if (nx >= 0 && nx < this.world.width && ny >= 0 && ny < this.world.height && !this.powerGrid[ny][nx]) {
                  const tile = this.world.tiles[ny][nx];
                  if (tile.type !== TILE_TYPES.EMPTY && tile.type !== TILE_TYPES.WATER) {
                      this.powerGrid[ny][nx] = true;
                      queue.push({ x: nx, y: ny });
                  }
              }
          }
      }
  }

  updateRoadAccessGrid() {
      const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
      for (let y = 0; y < this.world.height; y++) {
          for (let x = 0; x < this.world.width; x++) {
              const tile = this.world.tiles[y][x];
              if (tile.type !== TILE_TYPES.HOUSE && tile.type !== TILE_TYPES.FACTORY) {
                  this.roadAccessGrid[y][x] = true;
                  continue;
              }
              let hasAccess = false;
              for (const [dx, dy] of directions) {
                  const nx = x + dx, ny = y + dy;
                  if (nx >= 0 && nx < this.world.width && ny >= 0 && ny < this.world.height && this.world.tiles[ny][nx].type === TILE_TYPES.ROAD) {
                      hasAccess = true;
                  }
              }
              this.roadAccessGrid[y][x] = hasAccess;
          }
      }
  }
}