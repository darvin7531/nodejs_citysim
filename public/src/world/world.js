export const TILE_TYPES = {
  EMPTY: 0, HOUSE: 1, ROAD: 2, FACTORY: 3, PARK: 4, WATER: 5, POWER_PLANT: 6, FIRE_STATION: 7,
};

const TILE_EMOJIS = {
  [TILE_TYPES.HOUSE]: '🏠',
  [TILE_TYPES.FACTORY]: '🏭',
  [TILE_TYPES.PARK]: '🌳',
  [TILE_TYPES.WATER]: '🌊',
  [TILE_TYPES.POWER_PLANT]: '⚡️',
  [TILE_TYPES.FIRE_STATION]: '🚒',
};

const POWERLESS_EMOJI = '🔌';
const NO_ROAD_ACCESS_EMOJI = '🚫';

export class World {
  constructor(canvas) {
    this.canvas = canvas; 
    this.ctx = canvas.getContext('2d');
    this.width = 30; 
    this.height = 20; 
    this.tileSize = 32;
    this.TILE_TYPES = TILE_TYPES;
    this.tiles = Array.from({ length: this.height }, () => 
      Array.from({ length: this.width }, () => ({ type: TILE_TYPES.EMPTY, level: 0 }))
    );
    for (let y = 10; y < 15; y++) { 
      for (let x = 5; x < 10; x++) { 
        this.tiles[y][x] = { type: TILE_TYPES.WATER, level: 0 }; 
      }
    }
  }

  draw(powerGrid, roadAccessGrid, landValueGrid, overlayMode, roadMaskGrid, vehicles) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const tile = this.tiles[y][x];
        const px = x * this.tileSize;
        const py = y * this.tileSize;

        // Фон
        if (tile.type === TILE_TYPES.EMPTY || tile.type === TILE_TYPES.ROAD) ctx.fillStyle = '#222';
        else if (tile.type === TILE_TYPES.WATER) ctx.fillStyle = '#06f';
        else ctx.fillStyle = '#111';
        ctx.fillRect(px, py, this.tileSize, this.tileSize);

        // Отрисовка дорог или зданий
        if (tile.type === TILE_TYPES.ROAD) {
          this.drawRoadTile(ctx, px, py, roadMaskGrid[y][x]);
        } else {
          const emoji = TILE_EMOJIS[tile.type];
          if (emoji) {
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.font = `${this.tileSize - 6}px serif`;
            ctx.fillStyle = (tile.level > 1) ? `rgba(255, 255, 255, ${Math.min(0.3 + tile.level * 0.14, 1)})` : '#fff';
            ctx.fillText(emoji, px + this.tileSize / 2, py + this.tileSize / 2);
          }
        }
        
        // Индикаторы статуса
        const needsResources = tile.type === TILE_TYPES.HOUSE || tile.type === TILE_TYPES.FACTORY;
        if (needsResources) {
          const isPowered = powerGrid && powerGrid[y][x];
          const hasRoadAccess = roadAccessGrid && roadAccessGrid[y][x];
          let statusEmoji = !isPowered ? POWERLESS_EMOJI : (!hasRoadAccess ? NO_ROAD_ACCESS_EMOJI : null);
          if (statusEmoji) {
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.font = `${this.tileSize - 12}px serif`;
            ctx.fillText(statusEmoji, px + this.tileSize / 2, py + this.tileSize / 2 + 2);
          }
        }
        
        // Оверлей
        if (overlayMode === 'landValue' && landValueGrid) {
          const value = landValueGrid[y][x];
          ctx.fillStyle = `hsla(${value}, 100%, 50%, 0.4)`;
          ctx.fillRect(px, py, this.tileSize, this.tileSize);
        }

        // Рамка тайла
        ctx.strokeStyle = '#444'; ctx.strokeRect(px, py, this.tileSize, this.tileSize);
      }
    }

    // РИСУЕМ МАШИНЫ ПОВЕРХ ВСЕГО
    if (vehicles) {
      ctx.fillStyle = '#ff3838';
      for (const vehicle of vehicles) {
        if(vehicle.state !== 'atWork') { // Не рисуем машины, которые "на работе"
            ctx.fillRect(vehicle.x - 2, vehicle.y - 2, 4, 4);
        }
      }
    }
  }

  drawRoadTile(ctx, px, py, mask) {
    if (mask === 0) return;
    const center = this.tileSize / 2;
    const centerX = px + center;
    const centerY = py + center;
    const roadWidth = this.tileSize / 2.5;

    ctx.strokeStyle = '#4a4a4a';
    ctx.lineWidth = roadWidth;
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (mask === 5 || mask === 10) {
      if(mask === 5) { ctx.moveTo(centerX, py); ctx.lineTo(centerX, py + this.tileSize); }
      else { ctx.moveTo(px, centerY); ctx.lineTo(px + this.tileSize, centerY); }
    } else {
      if ((mask & 1)) { ctx.moveTo(centerX, centerY); ctx.lineTo(centerX, py); }
      if ((mask & 2)) { ctx.moveTo(centerX, centerY); ctx.lineTo(px + this.tileSize, centerY); }
      if ((mask & 4)) { ctx.moveTo(centerX, centerY); ctx.lineTo(centerX, py + this.tileSize); }
      if ((mask & 8)) { ctx.moveTo(centerX, centerY); ctx.lineTo(px, centerY); }
    }
    ctx.stroke();

    ctx.strokeStyle = '#f0d000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'butt';
    const radius = roadWidth / 2;
    ctx.beginPath();
    switch (mask) {
      case 5: ctx.moveTo(centerX, py); ctx.lineTo(centerX, py + this.tileSize); break;
      case 10: ctx.moveTo(px, centerY); ctx.lineTo(px + this.tileSize, centerY); break;
      case 1: ctx.moveTo(centerX, py); ctx.lineTo(centerX, centerY); break;
      case 2: ctx.moveTo(px + this.tileSize, centerY); ctx.lineTo(centerX, centerY); break;
      case 4: ctx.moveTo(centerX, py + this.tileSize); ctx.lineTo(centerX, centerY); break;
      case 8: ctx.moveTo(px, centerY); ctx.lineTo(centerX, centerY); break;
      case 3: ctx.moveTo(centerX, py); ctx.arcTo(centerX, centerY, px + this.tileSize, centerY, radius); break;
      case 6: ctx.moveTo(px + this.tileSize, centerY); ctx.arcTo(centerX, centerY, centerX, py + this.tileSize, radius); break;
      case 12: ctx.moveTo(centerX, py + this.tileSize); ctx.arcTo(centerX, centerY, px, centerY, radius); break;
      case 9: ctx.moveTo(px, centerY); ctx.arcTo(centerX, centerY, centerX, py, radius); break;
      case 7: ctx.moveTo(centerX, py); ctx.lineTo(centerX, py + this.tileSize); ctx.moveTo(centerX, centerY); ctx.lineTo(px + this.tileSize, centerY); break;
      case 11: ctx.moveTo(px, centerY); ctx.lineTo(px + this.tileSize, centerY); ctx.moveTo(centerX, centerY); ctx.lineTo(centerX, py); break;
      case 13: ctx.moveTo(centerX, py); ctx.lineTo(centerX, py + this.tileSize); ctx.moveTo(centerX, centerY); ctx.lineTo(px, centerY); break;
      case 14: ctx.moveTo(px, centerY); ctx.lineTo(px + this.tileSize, centerY); ctx.moveTo(centerX, centerY); ctx.lineTo(centerX, py + this.tileSize); break;
      case 15: ctx.moveTo(centerX, py); ctx.lineTo(centerX, py + this.tileSize); ctx.moveTo(px, centerY); ctx.lineTo(px + this.tileSize, centerY); break;
    }
    ctx.stroke();
  }

  build(x, y, type) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return false;
    const current = this.tiles[y][x];
    if (current.type !== TILE_TYPES.EMPTY || current.type === TILE_TYPES.WATER) return false;
    
    const newTile = { type, level: 1 };

    if (type === TILE_TYPES.HOUSE) {
      newTile.residents = [];
      const capacity = newTile.level * 4;
      for (let i = 0; i < capacity; i++) {
        newTile.residents.push({ id: `res-${x}-${y}-${i}`, state: 'atHome', workplace: null });
      }
    } else if (type === TILE_TYPES.FACTORY) {
      newTile.jobs = { total: 10, filledBy: [] }; // 10 рабочих мест
    }

    this.tiles[y][x] = newTile;
    return true;
  }

  upgrade(x,y){
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return false;
    const tile = this.tiles[y][x];
    if (tile.type === TILE_TYPES.EMPTY || tile.type === TILE_TYPES.WATER || tile.type === TILE_TYPES.ROAD) return false;
    if (tile.level >= 5) return false;
    
    tile.level++;
    
    if (tile.type === TILE_TYPES.HOUSE) {
      const currentResidents = tile.residents.length;
      const newCapacity = tile.level * 4;
      for (let i = currentResidents; i < newCapacity; i++) {
        tile.residents.push({ id: `res-${x}-${y}-${i}`, state: 'atHome', workplace: null });
      }
    } else if (tile.type === TILE_TYPES.FACTORY) {
      tile.jobs.total = tile.level * 10;
    }
    
    return true;
  }

  demolish(x,y){
      if(x<0||y<0||x>=this.width||y>=this.height)return!1;
      const tile = this.tiles[y][x];
      if(tile.type===TILE_TYPES.EMPTY)return!1;

      // При сносе дома "увольняем" жителей, при сносе завода - освобождаем рабочие места
      // (эта логика будет добавлена в engine.js для корректности)
      
      this.tiles[y][x]={type:TILE_TYPES.EMPTY,level:0};
      return!0;
    }
}