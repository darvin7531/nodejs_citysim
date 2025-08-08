export class Hooks {
  constructor() {
    this.listeners = {};
  }

  on(event, fn) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(fn);
  }

  emit(event, ...args) {
    if (!this.listeners[event]) return;
    for (const fn of this.listeners[event]) {
      try {
        fn(...args);
      } catch (e) {
        console.error(`Ошибка в хуке ${event}:`, e);
      }
    }
  }
}
