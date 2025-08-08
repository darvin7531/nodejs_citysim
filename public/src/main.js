import { Engine } from './core/engine.js';
import { ControlPanel } from './ui/controlPanel.js';

const canvas = document.getElementById('canvas');
const engine = new Engine(canvas);
const controlPanel = new ControlPanel(engine);

controlPanel.init();
engine.init();

canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const tx = Math.floor(x / engine.world.tileSize);
  const ty = Math.floor(y / engine.world.tileSize);

  if (engine.buildMode !== null) {
    // Есть режим строительства — пытаемся поставить здание
    engine.emit('place', { x, y });
  } else {
    // Нет режима — просто выделяем тайл
    engine.emit('selectTile', { x: tx, y: ty });
  }
});
