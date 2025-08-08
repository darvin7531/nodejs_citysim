export class ModManager {
  constructor(engine) {
    this.engine = engine;
    this.mods = [];
  }

  async loadMods() {
    try {
      // Для примера один мод из папки mods
      const mod = await import('../../mods/hello-world.js');
      if (mod.init) {
        mod.init(this.engine);
        this.mods.push(mod);
        console.log(`Мод загружен: hello-world`);
      }
    } catch (e) {
      console.error('Ошибка загрузки мода:', e);
    }
  }
}
