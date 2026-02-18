#!/usr/bin/env node

const { Command } = require('commander');

const program = new Command();

const parseDuration = (input) => {
  if (!input) {
    return null;
  }

  const match = /^([0-9]+)(s|m|h)$/.exec(input.trim());
  if (!match) {
    throw new Error(`Invalid duration: ${input}`);
  }

  const value = Number(match[1]);
  const unit = match[2];
  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000
  };

  return value * multipliers[unit];
};

const logCheckpoint = (state) => {
  const message = {
    timestamp: new Date().toISOString(),
    mode: state.mode,
    waypoint: state.waypoint,
    simulated_minutes: state.simulatedMinutes
  };

  console.log(`[Checkpoint] ${JSON.stringify(message)}`);
};

program
  .option('--mode <mode>', 'rehearsal mode', 'world_synthesis')
  .option('--duration <duration>', 'duration such as 30m, 45s, 2h');

program.parse(process.argv);

const options = program.opts();
const durationMs = parseDuration(options.duration);
const temporalCompression = Number.parseFloat(process.env.TEMPORAL_COMPRESSION || '1');
const compressionFactor = Number.isFinite(temporalCompression) && temporalCompression > 0
  ? temporalCompression
  : 1;

const state = {
  mode: options.mode,
  waypoint: 0,
  simulatedMinutes: 0
};

console.log(`[Rehearsal] mode=${state.mode} temporal_compression=${compressionFactor}`);

if (state.mode === 'epoch_generation') {
  const acceleration = 60 * compressionFactor;
  const checkpointIntervalMs = 30 * 1000;
  const simMinutesPerCheckpoint = (checkpointIntervalMs / 1000) * acceleration / 60;

  console.log(`[Rehearsal] acceleration=${acceleration}x checkpoint_interval_ms=${checkpointIntervalMs}`);

  const intervalId = setInterval(() => {
    state.waypoint += 1;
    state.simulatedMinutes += simMinutesPerCheckpoint;
    logCheckpoint(state);
  }, checkpointIntervalMs);

  if (durationMs) {
    setTimeout(() => {
      clearInterval(intervalId);
      console.log('[Rehearsal] epoch_generation complete');
    }, durationMs);
  }
} else {
  console.log('[Rehearsal] mode active without epoch acceleration');
  if (durationMs) {
    setTimeout(() => {
      console.log('[Rehearsal] rehearsal complete');
    }, durationMs);
  }
}
