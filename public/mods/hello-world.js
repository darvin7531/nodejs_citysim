export function init(engine) {
  engine.hooks.on('tick', (tick) => {
    if (tick % 60 === 0) { // Каждую секунду (~60 FPS)
      console.log(`[Мод HelloWorld] Тик: ${tick}`);
    }
  });

  engine.hooks.on('built', ({type, x, y}) => {
    console.log(`[Мод HelloWorld] Построено: ${type} в (${x},${y})`);
  });
}
