// Shared coefficients: the shader and footprint simulation use the same wash edge.
export const WASH = { speed: .63, along: .34, mean: .45, amplitude: .92 };
export function shoreOffset(x) {
  return .9 + .95*Math.exp(-((x+8)**2)/30) - .7*Math.exp(-((x-2)**2)/22) + .55*Math.exp(-((x-12)**2)/16);
}
export function washEdge(x, time) {
  return WASH.mean + WASH.amplitude*Math.sin(time*WASH.speed+x*WASH.along)
    + .13*Math.sin(x*2.4+time*.24) + .065*Math.sin(x*5.7-time*.18);
}
export function washFootprint(mark, edge, dt) {
  // Irreversible erosion, local to the footprint, including its near-water edge.
  if (mark.distance-.09 < edge) mark.strength=Math.max(0,mark.strength-dt*1.8);
  return mark.strength;
}
