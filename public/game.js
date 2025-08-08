const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const tileSize = 32;

const MAP_WIDTH = 20;
const MAP_HEIGHT = 15;

// Типы зданий
const EMPTY = 0;
const RESIDENTIAL = 1;
const COMMERCIAL = 2;
const INDUSTRIAL = 3;
const ROAD = 6;
const SCHOOL = 8;
const PARK = 10;
const BUS_STOP = 11;
const HOSPITAL = 12;

// Карты игры
let map = [];
let zoneMap = [];
let pollutionMap = [];
let populationMap = [];
let crimeMap = [];
let degradationMap = [];
let schoolMap = [];
let poweredMap = [];

let money = 5000;
let incomePerTick = 0;
let month = 0;

let taxResidential = 0.1;
let taxCommercial = 0.1;
let taxIndustrial = 0.1;

const maintenanceCosts = {
  1: 5,
  2: 7,
  3: 10,
  6: 2,
  8: 12,
  10: 0,
  11: 4,
  12: 20,
};

const colors = {
  0: "#a3d977", // пусто
  1: "#00cc44", // жилой
  2: "#0044cc", // коммерция
  3: "#996600", // промышленность
  6: "#888888", // дорога
  8: "#ffcc00", // школа
  10: "#228B22", // парк
  11: "#ff00ff", // автобусная остановка
  12: "#ff6666", // больница
};

function initMaps() {
  map = Array.from({ length: MAP_HEIGHT }, () => Array(MAP_WIDTH).fill(EMPTY));
  zoneMap = Array.from({ length: MAP_HEIGHT }, () => Array(MAP_WIDTH).fill(0));
  pollutionMap = Array.from({ length: MAP_HEIGHT }, () => Array(MAP_WIDTH).fill(0));
  populationMap = Array.from({ length: MAP_HEIGHT }, () => Array(MAP_WIDTH).fill(0));
  crimeMap = Array.from({ length: MAP_HEIGHT }, () => Array(MAP_WIDTH).fill(1));
  degradationMap = Array.from({ length: MAP_HEIGHT }, () => Array(MAP_WIDTH).fill(0));
  schoolMap = Array.from({ length: MAP_HEIGHT }, () => Array(MAP_WIDTH).fill(false));
  poweredMap = Array.from({ length: MAP_HEIGHT }, () => Array(MAP_WIDTH).fill(false));
}

async function loadMap() {
  try {
    const res = await fetch("/map");
    if (!res.ok) throw new Error("Нет сохранённой карты");
    map = await res.json();
  } catch {
    initMaps();
  }
  zoneMap = Array.from({ length: MAP_HEIGHT }, () => Array(MAP_WIDTH).fill(0));
  pollutionMap = Array.from({ length: MAP_HEIGHT }, () => Array(MAP_WIDTH).fill(0));
  populationMap = Array.from({ length: MAP_HEIGHT }, () => Array(MAP_WIDTH).fill(0));
  crimeMap = Array.from({ length: MAP_HEIGHT }, () => Array(MAP_WIDTH).fill(1));
  degradationMap = Array.from({ length: MAP_HEIGHT }, () => Array(MAP_WIDTH).fill(0));
  schoolMap = Array.from({ length: MAP_HEIGHT }, () => Array(MAP_WIDTH).fill(false));
  poweredMap = Array.from({ length: MAP_HEIGHT }, () => Array(MAP_WIDTH).fill(false));
}

canvas.addEventListener("click", (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / tileSize);
  const y = Math.floor((e.clientY - rect.top) / tileSize);

  if (y < 0 || y >= MAP_HEIGHT || x < 0 || x >= MAP_WIDTH) return;

  if (window.selectedZone > 0) {
    zoneMap[y][x] = window.selectedZone;
    window.selectedTile = 0;
    draw();
    return;
  }

  if (window.selectedTile === 0) {
    map[y][x] = EMPTY;
    populationMap[y][x] = 0;
    degradationMap[y][x] = 0;
    draw();
    updateStats();
    return;
  }

  // Проверка зоны для строительства
  let allowed = false;
  if (window.selectedTile === RESIDENTIAL && zoneMap[y][x] === 1) allowed = true;
  else if (window.selectedTile === COMMERCIAL && zoneMap[y][x] === 2) allowed = true;
  else if (window.selectedTile === INDUSTRIAL && zoneMap[y][x] === 3) allowed = true;
  else if ([ROAD, SCHOOL, PARK, BUS_STOP, HOSPITAL].includes(window.selectedTile)) allowed = true;

  if (!allowed) {
    alert("Нельзя строить здесь: зона не соответствует типу здания");
    return;
  }

  if (money >= (maintenanceCosts[window.selectedTile] || 0)) {
    map[y][x] = window.selectedTile;
    money -= maintenanceCosts[window.selectedTile] || 0;
    draw();
    updateStats();
  } else {
    alert("Недостаточно денег на строительство!");
  }
});

function updatePollution() {
  for(let y=0; y<MAP_HEIGHT; y++) {
    for(let x=0; x<MAP_WIDTH; x++) {
      pollutionMap[y][x] = 0;
    }
  }

  for(let y=0; y<MAP_HEIGHT; y++) {
    for(let x=0; x<MAP_WIDTH; x++) {
      if(map[y][x] === INDUSTRIAL) {
        for(let dy=-2; dy<=2; dy++) {
          for(let dx=-2; dx<=2; dx++) {
            let ny = y + dy + (Math.random() < 0.5 ? 1 : -1);
            let nx = x + dx + (Math.random() < 0.5 ? 1 : -1);
            if(ny >= 0 && ny < MAP_HEIGHT && nx >= 0 && nx < MAP_WIDTH) {
              pollutionMap[ny][nx] += 1;
            }
          }
        }
      }
    }
  }

  for(let y=0; y<MAP_HEIGHT; y++) {
    for(let x=0; x<MAP_WIDTH; x++) {
      if(map[y][x] === PARK) {
        for(let dy=-3; dy<=3; dy++) {
          for(let dx=-3; dx<=3; dx++) {
            let ny = y+dy, nx = x+dx;
            if(ny >= 0 && ny < MAP_HEIGHT && nx >= 0 && nx < MAP_WIDTH) {
              pollutionMap[ny][nx] = Math.max(0, pollutionMap[ny][nx] - 2);
            }
          }
        }
      }
    }
  }
}

function updateSchoolMap() {
  schoolMap = Array.from({ length: MAP_HEIGHT }, () => Array(MAP_WIDTH).fill(false));
  for(let y=0; y<MAP_HEIGHT; y++) {
    for(let x=0; x<MAP_WIDTH; x++) {
      if(map[y][x] === SCHOOL) {
        for(let dy=-4; dy<=4; dy++) {
          for(let dx=-4; dx<=4; dx++) {
            let ny = y+dy, nx = x+dx;
            if(ny >= 0 && ny < MAP_HEIGHT && nx >= 0 && nx < MAP_WIDTH) {
              schoolMap[ny][nx] = true;
            }
          }
        }
      }
    }
  }
}

function updateCrimeMap() {
  crimeMap = Array.from({ length: MAP_HEIGHT }, () => Array(MAP_WIDTH).fill(1));
  for(let y=0; y<MAP_HEIGHT; y++) {
    for(let x=0; x<MAP_WIDTH; x++) {
      if(map[y][x] === 5) { // полиция (тип 5)
        for(let dy=-5; dy<=5; dy++) {
          for(let dx=-5; dx<=5; dx++) {
            let ny = y+dy, nx = x+dx;
            if(ny >= 0 && ny < MAP_HEIGHT && nx >= 0 && nx < MAP_WIDTH) {
              crimeMap[ny][nx] = 0;
            }
          }
        }
      }
    }
  }
}

function calculateHappiness() {
  let happinessMap = map.map(row => row.map(() => 1));
  for(let y=0; y<MAP_HEIGHT; y++) {
    for(let x=0; x<MAP_WIDTH; x++) {
      if(map[y][x] === RESIDENTIAL) {
        let h = 1;
        let poll = pollutionMap[y][x];
        if(poll > 3) h -= 0.5;
        if(schoolMap[y][x]) h += 0.3;
        // poweredMap можно добавить, сейчас считаем всегда true
        happinessMap[y][x] = Math.min(Math.max(h, 0), 1);
      }
    }
  }
  return happinessMap;
}

function simulatePopulation() {
  const happiness = calculateHappiness();
  for(let y=0; y<MAP_HEIGHT; y++) {
    for(let x=0; x<MAP_WIDTH; x++) {
      if(map[y][x] === RESIDENTIAL) {
        if(happiness[y][x] > 0.8 && populationMap[y][x] < 10) {
          populationMap[y][x]++;
        } else if(happiness[y][x] < 0.5 && populationMap[y][x] > 0) {
          populationMap[y][x]--;
        }
      }
    }
  }
}

function degradeBuildings() {
  for(let y=0; y<MAP_HEIGHT; y++) {
    for(let x=0; x<MAP_WIDTH; x++) {
      if(map[y][x] !== EMPTY && degradationMap[y][x] < 5) {
        degradationMap[y][x]++;
        if(map[y][x] === RESIDENTIAL && populationMap[y][x] > 0) {
          populationMap[y][x]--;
        }
      }
    }
  }
}

function repairBuildings() {
  for(let y=0; y<MAP_HEIGHT; y++) {
    for(let x=0; x<MAP_WIDTH; x++) {
      if(degradationMap[y][x] > 0) {
        degradationMap[y][x]--;
      }
    }
  }
}

function calculateTrafficAndIncome() {
  updateCrimeMap();

  let residential = 0, commercial = 0, industrial = 0;
  let maintenanceSum = 0;

  for(let y=0; y<MAP_HEIGHT; y++) {
    for(let x=0; x<MAP_WIDTH; x++) {
      if(map[y][x] === EMPTY) continue;

      let degradationFactor = 1 - (degradationMap[y][x] * 0.2);
      degradationFactor = Math.max(degradationFactor, 0);

      if(map[y][x] === RESIDENTIAL) residential += populationMap[y][x] * degradationFactor;
      else if(map[y][x] === COMMERCIAL) commercial += degradationFactor;
      else if(map[y][x] === INDUSTRIAL) industrial += degradationFactor;

      maintenanceSum += maintenanceCosts[map[y][x]] || 0;
    }
  }

  money -= maintenanceSum;

  if(money < 0) {
    degradeBuildings();
  } else {
    repairBuildings();
  }

  let baseIncome =
    residential * 2 * taxResidential +
    commercial * 3 * taxCommercial +
    industrial * 4 * taxIndustrial;

  incomePerTick = baseIncome;
  money += Math.floor(incomePerTick);
}

function updateStats() {
  let pop = 0;
  for(let y=0; y<MAP_HEIGHT; y++) {
    for(let x=0; x<MAP_WIDTH; x++) {
      pop += populationMap[y][x];
    }
  }

  const statsDiv = document.getElementById("stats");
  statsDiv.innerHTML = `
    Деньги: ${money.toFixed(2)}<br>
    Доход за тик: ${incomePerTick.toFixed(2)}<br>
    Население: ${pop}<br>
    Месяц: ${month}
  `;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for(let y=0; y<MAP_HEIGHT; y++) {
    for(let x=0; x<MAP_WIDTH; x++) {
      ctx.fillStyle = colors[map[y][x]] || "#000000";
      ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);

      if(zoneMap[y][x] !== 0) {
        ctx.fillStyle = zoneMap[y][x] === 1 ? "rgba(0,255,0,0.3)" :
                        zoneMap[y][x] === 2 ? "rgba(0,0,255,0.3)" :
                        zoneMap[y][x] === 3 ? "rgba(255,255,0,0.3)" : "transparent";
        ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
      }

      if(populationMap[y][x] > 0) {
        ctx.fillStyle = "#000";
        ctx.font = "14px Arial";
        ctx.fillText(populationMap[y][x], x * tileSize + 10, y * tileSize + 20);
      }

      if(pollutionMap[y][x] > 3) {
        ctx.fillStyle = "rgba(255,0,0,0.3)";
        ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
      }

      if(degradationMap[y][x] > 0) {
        ctx.fillStyle = `rgba(128,128,128,${degradationMap[y][x]*0.15})`;
        ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
      }
    }
  }
}

async function gameLoop() {
  updatePollution();
  updateSchoolMap();
  simulatePopulation();
  calculateTrafficAndIncome();
  draw();
  updateStats();
  month++;
}

(async () => {
  await loadMap();
  draw();
  updateStats();
  setInterval(gameLoop, 1000);
})();
