(() => {
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const tickCount = document.getElementById("tickCount");
  const lifeCount = document.getElementById("lifeCount");
  const seedValue = document.getElementById("seedValue");
  const groundedValue = document.getElementById("groundedValue");
  const hashValue = document.getElementById("hashValue");

  const {
    FIXED_DT,
    MAX_ACCUMULATOR,
    GRAVITY,
    JUMP_VELOCITY,
    MOVE_SPEED,
    clamp,
    sortPlatforms,
  } = window.Loop0Invariants;

  const { computeStableHash } = window.Loop0Fossil;

  const input = {
    left: false,
    right: false,
    jump: false,
    reset: false,
  };

  const world = {
    seed: 2026,
    tick: 0,
    lives: 3,
    grounded: true,
    player: {
      x: 80,
      y: 340,
      width: 36,
      height: 46,
      vx: 0,
      vy: 0,
    },
    platforms: [
      { id: "ground", x: 0, y: 420, width: 960, height: 120 },
      { id: "step-a", x: 160, y: 350, width: 140, height: 20 },
      { id: "step-b", x: 360, y: 300, width: 160, height: 20 },
      { id: "step-c", x: 600, y: 260, width: 140, height: 20 },
      { id: "step-d", x: 760, y: 220, width: 120, height: 20 },
    ],
  };

  const sortedPlatforms = sortPlatforms(world.platforms);

  const handleInput = (event, isDown) => {
    switch (event.code) {
      case "ArrowLeft":
        input.left = isDown;
        break;
      case "ArrowRight":
        input.right = isDown;
        break;
      case "Space":
        input.jump = isDown;
        break;
      case "KeyR":
        input.reset = isDown;
        break;
      default:
        break;
    }
  };

  const updateGame = (dt) => {
    updatePhysics(dt);
    checkCollisions();
    applyFailSafe();
    world.tick += 1;
  };

  const updatePhysics = (dt) => {
    const player = world.player;
    const moveAxis = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    player.vx = moveAxis * MOVE_SPEED;

    if (input.jump && world.grounded) {
      player.vy = JUMP_VELOCITY;
      world.grounded = false;
    }

    player.vy += GRAVITY * dt;
    player.x += player.vx * dt;
    player.y += player.vy * dt;

    player.x = clamp(player.x, 0, canvas.width - player.width);
  };

  const checkCollisions = () => {
    const player = world.player;
    world.grounded = false;

    for (const platform of sortedPlatforms) {
      if (
        player.x < platform.x + platform.width &&
        player.x + player.width > platform.x &&
        player.y < platform.y + platform.height &&
        player.y + player.height > platform.y
      ) {
        const overlapBottom = platform.y + platform.height - player.y;
        const overlapTop = player.y + player.height - platform.y;
        if (overlapTop < overlapBottom && player.vy >= 0) {
          player.y = platform.y - player.height;
          player.vy = 0;
          world.grounded = true;
        }
      }
    }
  };

  const applyFailSafe = () => {
    const player = world.player;
    if (player.y > canvas.height + 120) {
      world.lives = Math.max(0, world.lives - 1);
      resetPlayer();
    }
    if (input.reset) {
      world.lives = 3;
      resetPlayer();
    }
  };

  const resetPlayer = () => {
    world.player.x = 80;
    world.player.y = 340;
    world.player.vx = 0;
    world.player.vy = 0;
    world.grounded = true;
  };

  const render = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#0f1324";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#263a63";
    for (const platform of sortedPlatforms) {
      ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    }

    ctx.fillStyle = "#f2b632";
    const player = world.player;
    ctx.fillRect(player.x, player.y, player.width, player.height);

    ctx.fillStyle = "#94d1ff";
    ctx.font = "16px 'Courier New', monospace";
    ctx.fillText("Loop0 Playable Checkpoint", 20, 32);
  };

  const updateTelemetry = () => {
    tickCount.textContent = world.tick.toString();
    lifeCount.textContent = world.lives.toString();
    seedValue.textContent = world.seed.toString();
    groundedValue.textContent = world.grounded ? "true" : "false";
    hashValue.textContent = computeStableHash({
      tick: world.tick,
      lives: world.lives,
      grounded: world.grounded,
      player: world.player,
    });
  };

  let accumulator = 0;
  let lastTime = performance.now();

  const frame = (time) => {
    const deltaSeconds = Math.min((time - lastTime) / 1000, MAX_ACCUMULATOR);
    accumulator = Math.min(accumulator + deltaSeconds, MAX_ACCUMULATOR);

    while (accumulator >= FIXED_DT) {
      updateGame(FIXED_DT);
      accumulator -= FIXED_DT;
    }

    render();
    updateTelemetry();
    lastTime = time;
    requestAnimationFrame(frame);
  };

  window.addEventListener("keydown", (event) => handleInput(event, true));
  window.addEventListener("keyup", (event) => handleInput(event, false));

  requestAnimationFrame(frame);
})();
