export class ControlPanel {
  constructor(engine) {
    this.engine = engine;
    this.buildHouseBtn = document.getElementById('build-house');
    this.buildFactoryBtn = document.getElementById('build-factory');
    this.buildRoadBtn = document.getElementById('build-road');
    this.buildPowerPlantBtn = document.getElementById('build-power-plant');
    this.buildFireStationBtn = document.getElementById('build-fire-station'); // Новая кнопка
    this.buildParkBtn = document.getElementById('build-park');
    this.upgradeBtn = document.getElementById('upgrade');
    this.demolishBtn = document.getElementById('demolish');
    this.toggleLandValueBtn = document.getElementById('toggle-land-value');
    
    this.statusEl = document.getElementById('mode-status');
    this.statCash = document.getElementById('stat-cash');
    this.statPopulation = document.getElementById('stat-population');
    this.statPollution = document.getElementById('stat-pollution');
    this.statHappiness = document.getElementById('stat-happiness');
    this.inspectorDefault = document.getElementById('inspector-default');
    this.inspectorContent = document.getElementById('inspector-content');
    this.inspectorTitle = document.getElementById('inspector-title');
    this.inspectorLevel = document.getElementById('inspector-level');
    this.inspectorLandValue = document.getElementById('inspector-land-value');
    this.inspectorInfo = document.getElementById('inspector-info');
  }

  init() {
    const { COSTS } = this.engine;
    this.buildHouseBtn.title = `Дом (Стоимость: ${COSTS.BUILD_HOUSE})`;
    this.buildFactoryBtn.title = `Завод (Стоимость: ${COSTS.BUILD_FACTORY})`;
    this.buildRoadBtn.title = `Дорога (Стоимость: ${COSTS.BUILD_ROAD})`;
    this.buildPowerPlantBtn.title = `Станция (Стоимость: ${COSTS.BUILD_POWER_PLANT})`;
    this.buildFireStationBtn.title = `Пожарная (Стоимость: ${COSTS.BUILD_FIRE_STATION}, Содержание: ${COSTS.UPKEEP_FIRE_STATION})`;
    this.buildParkBtn.title = `Парк (Стоимость: ${COSTS.BUILD_PARK})`;
    this.upgradeBtn.title = `Улучшить (Стоимость: ${COSTS.UPGRADE})`;
    this.demolishBtn.title = `Снести (Вернут: ${COSTS.DEMOLISH_REFUND_PERCENT*100}%)`;

    this.buildHouseBtn.addEventListener('click', () => this.engine.emit('build', 'HOUSE'));
    this.buildFactoryBtn.addEventListener('click', () => this.engine.emit('build', 'FACTORY'));
    this.buildRoadBtn.addEventListener('click', () => this.engine.emit('build', 'ROAD'));
    this.buildPowerPlantBtn.addEventListener('click', () => this.engine.emit('build', 'POWER_PLANT'));
    this.buildFireStationBtn.addEventListener('click', () => this.engine.emit('build', 'FIRE_STATION'));
    this.buildParkBtn.addEventListener('click', () => this.engine.emit('build', 'PARK'));
    this.upgradeBtn.addEventListener('click', () => this.engine.emit('upgrade'));
    this.demolishBtn.addEventListener('click', () => this.engine.emit('demolish'));
    this.toggleLandValueBtn.addEventListener('click', () => {
      this.engine.emit('toggleOverlay', 'landValue');
      this.toggleLandValueBtn.classList.toggle('active');
    });

    this.engine.on('modeChange', this.updateModeStatus.bind(this));
    this.engine.on('economyUpdate', this.updateStats.bind(this));
    this.engine.on('tileSelected', this.updateInspector.bind(this));
    this.engine.on('tileDeselected', this.clearInspector.bind(this));
  }

  updateModeStatus(mode) {
    if(mode===null){this.statusEl.textContent="Режим: Обычный";return}
    const names = this.engine.world.TILE_TYPES;
    const modeName = Object.keys(names).find(key => names[key] === mode);
    this.statusEl.textContent = modeName ? `Строим: ${modeName}` : 'Режим: Обычный';
  }

  updateStats({cash,population,pollution,happiness}){
    this.statCash.textContent=cash.toFixed(0);
    this.statPopulation.textContent=population;
    this.statPollution.textContent=pollution.toFixed(0);
    this.statHappiness.textContent=happiness.toFixed(0);
  }

  updateInspector({ tile, isPowered, hasRoadAccess, landValue }) {
    this.inspectorDefault.classList.add('hidden');
    this.inspectorContent.classList.remove('hidden');

    const { TILE_TYPES } = this.engine.world;
    let title = 'Неизвестный объект', level = tile.level, info = '', showLandValue = true;

    switch (tile.type) {
      case TILE_TYPES.EMPTY: this.clearInspector(); return;
      case TILE_TYPES.WATER: title = 'Вода 🌊'; info = 'Здесь нельзя строить.'; level = 'N/A'; showLandValue = false; break;
      case TILE_TYPES.ROAD: title = 'Дорога 🛣️'; info = 'Соединяет здания.'; level = 'N/A'; break;
      case TILE_TYPES.HOUSE:
        title = 'Жилой дом 🏠';
        info = `Вмещает: ${tile.level * 4} чел.`;
        const nextLevel = tile.level + 1;
        const requiredValue = this.engine.UPGRADE_THRESHOLDS[nextLevel];
        if (requiredValue) {
          info += `<br>Для L${nextLevel} нужна ценность > ${requiredValue}.`;
        }
        break;
      case TILE_TYPES.FACTORY: title = 'Завод 🏭'; info = `Приносит: ${tile.level * 20}💰. Загрязнение: +${tile.level * 2}`; break;
      case TILE_TYPES.PARK: title = 'Парк 🌳'; info = `Повышает ценность земли.`; break;
      case TILE_TYPES.POWER_PLANT: title = 'Электростанция ⚡️'; info = `Снабжает энергией. Загрязнение: +5`; level = 'N/A'; break;
      case TILE_TYPES.FIRE_STATION:
        title = 'Пожарная станция 🚒';
        info = `Содержание: ${this.engine.COSTS.UPKEEP_FIRE_STATION}💰/мес.<br>Повышает ценность земли.`;
        level = 'N/A';
        break;
    }

    this.inspectorLandValue.parentElement.style.display = showLandValue ? 'block' : 'none';
    if (showLandValue) this.inspectorLandValue.textContent = landValue;
    
    if (tile.type === TILE_TYPES.HOUSE || tile.type === TILE_TYPES.FACTORY) {
      let statusText = !isPowered ? 'Нет энергии 🔌' : (!hasRoadAccess ? 'Нет дороги 🚫' : 'Работает');
      info += `<br><b>Статус: ${statusText}</b>`;
    }

    this.inspectorTitle.textContent = title;
    this.inspectorLevel.textContent = level;
    this.inspectorInfo.innerHTML = info;
  }

  clearInspector() {
    this.inspectorDefault.classList.remove('hidden');
    this.inspectorContent.classList.add('hidden');
  }
}