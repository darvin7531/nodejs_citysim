class Vehicle {
  constructor(path, resident, homeCoords, workplaceCoords, onArrivalCallback) {
    this.path = path;
    this.resident = resident;
    this.homeCoords = homeCoords;
    this.workplaceCoords = workplaceCoords;
    this.onArrival = onArrivalCallback; // Функция, которая вызовется по прибытии

    this.state = resident.state; // 'toWork' или 'toHome'
    this.speed = 2.0;
    this.currentTargetIndex = 1;
    const startTile = path[0];
    this.x = startTile.x * 32 + 16;
    this.y = startTile.y * 32 + 16;
    this.isFinished = false;
  }

  update() {
    if (this.isFinished) return;
    const targetNode = this.path[this.currentTargetIndex];
    const targetX = targetNode.x * 32 + 16;
    const targetY = targetNode.y * 32 + 16;
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < this.speed) {
      this.x = targetX;
      this.y = targetY;
      this.currentTargetIndex++;
      if (this.currentTargetIndex >= this.path.length) {
        this.isFinished = true;
        this.onArrival(this); // Сообщаем, что мы приехали
      }
    } else {
      this.x += (dx / distance) * this.speed;
      this.y += (dy / distance) * this.speed;
    }
  }
}

export class TrafficManager {
  constructor(engine) {
    this.engine = engine;
    this.vehicles = [];
  }

  updatePositions() {
    this.vehicles.forEach(v => v.update());
    this.vehicles = this.vehicles.filter(v => !v.isFinished);
  }

  createTrip(resident, startBuilding, endBuilding) {
    const startNode = this.findAdjacentRoad(startBuilding);
    const endNode = this.findAdjacentRoad(endBuilding);

    if (startNode && endNode) {
      const path = this.findPath(startNode, endNode);
      if (path && path.length > 1) {
        const vehicle = new Vehicle(path, resident, startBuilding, endBuilding, this.handleArrival.bind(this));
        this.vehicles.push(vehicle);
        return true;
      }
    }
    return false;
  }

  handleArrival(vehicle) {
    this.engine.onVehicleArrival(vehicle);
  }
  
  key(node) { return `${node.x},${node.y}`; }

  findAdjacentRoad(building) {
    const { x, y } = building;
    const roadMaskGrid = this.engine.roadMaskGrid;
    const directions = [{ dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }];
    for (const dir of directions) {
      const nx = x + dir.dx, ny = y + dir.dy;
      if (nx >= 0 && nx < this.engine.world.width && ny >= 0 && ny < this.engine.world.height && roadMaskGrid[ny][nx] > 0) {
        return { x: nx, y: ny };
      }
    }
    return null;
  }
  
  findPath(start, end) {
    const roadMaskGrid = this.engine.roadMaskGrid;
    const cameFrom = new Map();
    const gScore = new Map();
    const fScore = new Map();
    const closedSet = new Set();
    const openQueue = [start];
    gScore.set(this.key(start), 0);
    fScore.set(this.key(start), this.heuristic(start, end));
    
    while (openQueue.length > 0) {
      let lowestIndex = 0;
      for (let i = 1; i < openQueue.length; i++) {
        if ((fScore.get(this.key(openQueue[i])) || Infinity) < (fScore.get(this.key(openQueue[lowestIndex])) || Infinity)) {
          lowestIndex = i;
        }
      }
      const current = openQueue[lowestIndex];

      if (current.x === end.x && current.y === end.y) {
        return this.reconstructPath(cameFrom, current);
      }

      openQueue.splice(lowestIndex, 1);
      closedSet.add(this.key(current));

      const neighbors = this.getNeighbors(current, roadMaskGrid);
      for (const neighbor of neighbors) {
        if (closedSet.has(this.key(neighbor))) {
          continue;
        }
        const tentativeGScore = (gScore.get(this.key(current)) || 0) + 1;
        if (tentativeGScore < (gScore.get(this.key(neighbor)) || Infinity)) {
          cameFrom.set(this.key(neighbor), current);
          gScore.set(this.key(neighbor), tentativeGScore);
          fScore.set(this.key(neighbor), tentativeGScore + this.heuristic(neighbor, end));
          if (!openQueue.some(node => node.x === neighbor.x && node.y === neighbor.y)) {
            openQueue.push(neighbor);
          }
        }
      }
    }
    return null;
  }
  
  getNeighbors(node, roadMaskGrid) {
    const neighbors = [];
    const { x, y } = node;
    const mask = roadMaskGrid[y][x];
    if ((mask & 1)) neighbors.push({ x, y: y - 1 });
    if ((mask & 2)) neighbors.push({ x: x + 1, y });
    if ((mask & 4)) neighbors.push({ x, y: y + 1 });
    if ((mask & 8)) neighbors.push({ x: x - 1, y });
    return neighbors;
  }
  
  reconstructPath(cameFrom, current) {
    const totalPath = [current];
    while (cameFrom.has(this.key(current))) {
      current = cameFrom.get(this.key(current));
      totalPath.unshift(current);
    }
    return totalPath;
  }

  heuristic(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }
}