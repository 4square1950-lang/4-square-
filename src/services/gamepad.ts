export function readGamepad() {
  return Array.from(navigator.getGamepads?.() ?? []).find((pad) => pad?.connected && pad.mapping === 'standard') ?? undefined;
}

export function stickAxis(pad: Gamepad | undefined, axis: number) {
  const value = pad?.axes[axis] ?? 0;
  return Math.abs(value) < .2 ? 0 : Math.sign(value) * (Math.abs(value) - .2) / .8;
}
