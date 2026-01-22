(() => {
  const FIXED_DT = 1 / 60;
  const MAX_ACCUMULATOR = 0.25;
  const GRAVITY = 1800;
  const JUMP_VELOCITY = -650;
  const MOVE_SPEED = 260;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const sortPlatforms = (platforms) =>
    [...platforms].sort((a, b) => a.id.localeCompare(b.id));

  window.Loop0Invariants = {
    FIXED_DT,
    MAX_ACCUMULATOR,
    GRAVITY,
    JUMP_VELOCITY,
    MOVE_SPEED,
    clamp,
    sortPlatforms,
  };
})();
