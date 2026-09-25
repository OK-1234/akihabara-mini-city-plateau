// Metres in the existing north-going local coordinate system (-Z).
// Loading is independent: this controls only a ground-up fragment reveal.
export function createJourneyReveal(startZ) {
  const width = 120;
  let front = startZ - 160;
  let finishStart = null;
  return {
    get front() { return front; },
    width,
    reset() { front = startZ - 160; finishStart = null; },
    update(targetZ, cameraHeight, dt, finish) {
      // Start ~230–320m ahead, finish ~0–80m ahead. Lower views use
      // the closer part of that range so the rising facades stay legible.
      const lead = 110 + Math.max(0, Math.min(600, cameraHeight)) * .15;
      const goal = targetZ - lead;
      // Limit camera-preset changes to a continuous sweep. Never conceal
      // already revealed streets, including while paused or looking around.
      front -= Math.min(Math.max(0, front - goal), 110 * Math.max(0, Math.min(dt, .1)));
      // Final approach sweeps the remaining *loaded* extent, smoothly at both
      // ends. Finish 25m before the station, without changing travel speed.
      if (finish && Number.isFinite(finish.northZ) && finish.remaining <= 500) {
        if (finishStart === null) finishStart = front;
        const t = Math.max(0, Math.min(1, (500 - finish.remaining) / 475));
        const eased = t * t * (3 - 2 * t);
        const end = finish.northZ - width - 1;
        front = Math.min(front, finishStart + (end - finishStart) * eased);
      }
      return front;
    },
  };
}
