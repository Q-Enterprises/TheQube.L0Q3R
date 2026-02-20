(() => {
  const FIXED_DT = 1 / 60;
  const MAX_ACCUMULATOR = 0.25;
  const GRAVITY = 1800;
  const JUMP_VELOCITY = -650;
  const MOVE_SPEED = 260;
  const INITIAL_SEED = 2026;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const sortPlatforms = (platforms) =>
    [...platforms].sort((a, b) => a.id.localeCompare(b.id));

  const createRng = (seed) => {
    let state = seed >>> 0;
    return () => {
      state = (1664525 * state + 1013904223) >>> 0;
      return state / 0x100000000;
    };
  };

  window.Loop0Invariants = {
    FIXED_DT,
    MAX_ACCUMULATOR,
    GRAVITY,
    JUMP_VELOCITY,
    MOVE_SPEED,
    INITIAL_SEED,
    clamp,
    sortPlatforms,
    createRng,
  };
})();
