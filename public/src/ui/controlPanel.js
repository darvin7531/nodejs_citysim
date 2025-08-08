export class ControlPanel {
  constructor(engine) {
    this.engine = engine;
    this.buildHouseBtn = document.getElementById('build-house');
    this.buildRoadBtn = document.getElementById('build-road');
    this.buildFactoryBtn = document.getElementById('build-factory');
    this.buildParkBtn = document.getElementById('build-park');
    this.upgradeBtn = document.getElementById('upgrade');
    this.demolishBtn = document.getElementById('demolish');
    this.statusEl = document.getElementById('mode-status');

    this.statCash = document.getElementById('stat-cash');
    this.statPopulation = document.getElementById('stat-population');
    this.statPollution = document.getElementById('stat-pollution');
    this.statHappiness = document.getElementById('stat-happiness');
  }

  init() {
    this.buildHouseBtn.addEventListener('click', () => {
      this.engine.emit('build', 'HOUSE');
    });
    this.buildRoadBtn.addEventListener('click', () => {
      this.engine.emit('build', 'ROAD');
    });
    this.buildFactoryBtn.addEventListener('click', () => {
      this.engine.emit('build', 'FACTORY');
    });
    this.buildParkBtn.addEventListener('click', () => {
      this.engine.emit('build', 'PARK');
    });
    this.upgradeBtn.addEventListener('click', () => {
      this.engine.emit('upgrade');
    });
    this.demolishBtn.addEventListener('click', () => {
      this.engine.emit('demolish');
    });

    this.engine.on('modeChange', (mode) => {
      const names = this.engine.world.TILE_TYPES;
      const modeName = Object.keys(names).find(key => names[key] === mode);
      this.statusEl.textContent = modeName ? `Режим: ${modeName}` : 'Режим: Обычный';
    });

    this.engine.on('economyUpdate', ({ cash, population, pollution, happiness }) => {
      this.statCash.textContent = cash.toFixed(0);
      this.statPopulation.textContent = population;
      this.statPollution.textContent = pollution.toFixed(0);
      this.statHappiness.textContent = happiness.toFixed(0);
    });
  }
}
