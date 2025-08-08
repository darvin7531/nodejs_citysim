export const TILE_TYPES = {
  EMPTY: 0,
  HOUSE: 1,
  ROAD: 2,
  FACTORY: 3,
  PARK: 4,
  WATER: 5,
};

const TILE_EMOJIS = {
  [TILE_TYPES.EMPTY]: '',
  [TILE_TYPES.HOUSE]: '🏠',
  [TILE_TYPES.ROAD]: '🛣️',
  [TILE_TYPES.FACTORY]: '🏭',
  [TILE_TYPES.PARK]: '🌳',
  [TILE_TYPES.WATER]: '🌊',
};

export class World {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = 30;
    this.height = 20;
    this.tileSize = 32;

    this.tiles = [];
    for (let y = 0; y < this.height; y++) {
      this.tiles[y] = [];
      for (let x = 0; x < this.width; x++) {
        this.tiles[y][x] = { type: TILE_TYPES.EMPTY, level: 0 };
      }
    }

    for (let y = 10; y < 15; y++) {
      for (let x = 5; x < 10; x++) {
        this.tiles[y][x] = { type: TILE_TYPES.WATER, level: 0 };
      }
    }
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${this.tileSize - 6}px serif`;

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const tile = this.tiles[y][x];
        const px = x * this.tileSize;
        const py = y * this.tileSize;

        // Нарисуем фон для пустых и воды (чтобы не белели)
        if (tile.type === TILE_TYPES.EMPTY) {
          ctx.fillStyle = '#222';
          ctx.fillRect(px, py, this.tileSize, this.tileSize);
        } else if (tile.type === TILE_TYPES.WATER) {
          ctx.fillStyle = '#06f';
          ctx.fillRect(px, py, this.tileSize, this.tileSize);
        } else {
          ctx.fillStyle = '#111';
          ctx.fillRect(px, py, this.tileSize, this.tileSize);
        }

        // Нарисовать emoji
        const emoji = TILE_EMOJIS[tile.type];
        if (emoji) {
          // Подсветка ярче для уровня здания
          if (tile.level && tile.level > 1) {
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(0.3 + tile.level * 0.14, 1)})`;
          } else {
            ctx.fillStyle = '#fff';
          }
          ctx.fillText(emoji, px + this.tileSize / 2, py + this.tileSize / 2);
        }

        // Рамка тайла
        ctx.strokeStyle = '#444';
        ctx.strokeRect(px, py, this.tileSize, this.tileSize);
      }
    }
  }

  build(x, y, type) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return false;
    const current = this.tiles[y][x];
    if (current.type !== TILE_TYPES.EMPTY) return false;
    if (current.type === TILE_TYPES.WATER) return false;

    this.tiles[y][x] = { type, level: 1 };
    return true;
  }

  upgrade(x, y) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return false;
    const tile = this.tiles[y][x];
    if (tile.type === TILE_TYPES.EMPTY || tile.type === TILE_TYPES.WATER) return false;

    if (tile.level >= 5) return false;
    tile.level++;
    return true;
  }

  demolish(x, y) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return false;
    const tile = this.tiles[y][x];
    if (tile.type === TILE_TYPES.EMPTY) return false;

    this.tiles[y][x] = { type: TILE_TYPES.EMPTY, level: 0 };
    return true;
  }
}

World.prototype.TILE_TYPES = TILE_TYPES;
