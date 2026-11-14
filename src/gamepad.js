// Native W3C Gamepad API adapter for Xbox Edge (Tilt.gl) & USB/Bluetooth controllers

const DEADZONE = 0.18;
const prevButtonsState = new Map();
let lastMenuNavTime = 0;

function applyDeadzone(val) {
  if (Math.abs(val) < DEADZONE) return 0;
  const sign = Math.sign(val);
  return (sign * (Math.abs(val) - DEADZONE)) / (1 - DEADZONE);
}

export function getConnectedGamepads() {
  if (typeof navigator === "undefined" || typeof navigator.getGamepads !== "function") {
    return [];
  }
  const raw = navigator.getGamepads();
  const list = [];
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] && raw[i].connected) {
      list.push(raw[i]);
    }
  }
  return list;
}

export function isAnyGamepadConnected() {
  return getConnectedGamepads().length > 0;
}

function getEdgeTrigger(padIndex, buttonIdx, isPressed) {
  const key = `${padIndex}-${buttonIdx}`;
  const wasPressed = prevButtonsState.get(key) || false;
  prevButtonsState.set(key, isPressed);
  return isPressed && !wasPressed;
}

/**
 * Reads Left Stick / D-Pad and Action / Pause buttons for a player.
 * Maps controller screen-space directions into 3D rink world (dx, dz).
 */
export function readGamepadInput(padIndex = 0, isSideView = false, isMirrored = false) {
  const pads = getConnectedGamepads();
  const pad = pads[padIndex];
  if (!pad) {
    return {
      connected: false,
      dx: 0,
      dz: 0,
      actionPressed: false,
      pausePressed: false,
    };
  }

  let rawX = applyDeadzone(pad.axes[0] || 0);
  let rawY = applyDeadzone(pad.axes[1] || 0);

  // D-Pad support (buttons 12=Up, 13=Down, 14=Left, 15=Right)
  if (pad.buttons[14]?.pressed) rawX = -1;
  if (pad.buttons[15]?.pressed) rawX = 1;
  if (pad.buttons[12]?.pressed) rawY = -1;
  if (pad.buttons[13]?.pressed) rawY = 1;

  let dx = 0;
  let dz = 0;

  if (isSideView) {
    // Side-view camera at [-9.8, 7.8, 0] looking toward +X:
    // Screen Up (-rawY) -> +X, Screen Right (+rawX) -> +Z
    dx = -rawY;
    dz = rawX;
  } else if (isMirrored) {
    // Guest camera at [0, 6.05, +7.85] looking toward -Z:
    // Screen Right (+rawX) -> +X, Screen Up (-rawY) -> -Z
    dx = rawX;
    dz = rawY;
  } else {
    // Standard Host/P1 camera at [0, 6.05, -7.85] looking toward +Z:
    // Screen Right (+rawX) -> -X, Screen Up (-rawY) -> +Z
    dx = -rawX;
    dz = -rawY;
  }

  const aBtn = Boolean(pad.buttons[0]?.pressed); // A
  const xBtn = Boolean(pad.buttons[2]?.pressed); // X
  const rtBtn = Boolean(pad.buttons[7]?.pressed || (pad.buttons[7]?.value || 0) > 0.5);
  const startBtn = Boolean(pad.buttons[9]?.pressed); // Menu / Start

  return {
    connected: true,
    dx,
    dz,
    actionPressed:
      getEdgeTrigger(padIndex, 0, aBtn) ||
      getEdgeTrigger(padIndex, 2, xBtn) ||
      getEdgeTrigger(padIndex, 7, rtBtn),
    pausePressed: getEdgeTrigger(padIndex, 9, startBtn),
  };
}

/**
 * Menu focus & navigation for Xbox Edge (D-Pad/Stick to focus interactive elements, A to click)
 */
export function pollMenuGamepad() {
  const pads = getConnectedGamepads();
  const pad = pads[0];
  if (!pad || typeof document === "undefined") return;

  const now = performance.now();
  const up = pad.buttons[12]?.pressed || (pad.axes[1] || 0) < -0.55;
  const down = pad.buttons[13]?.pressed || (pad.axes[1] || 0) > 0.55;
  const left = pad.buttons[14]?.pressed || (pad.axes[0] || 0) < -0.55;
  const right = pad.buttons[15]?.pressed || (pad.axes[0] || 0) > 0.55;

  const confirm = getEdgeTrigger("menu", 0, Boolean(pad.buttons[0]?.pressed));
  const cancel = getEdgeTrigger("menu", 1, Boolean(pad.buttons[1]?.pressed));

  if (confirm && document.activeElement instanceof HTMLElement) {
    document.activeElement.click();
    return;
  }

  if (cancel) {
    const backBtn = document.querySelector("[data-gamepad-back='true']");
    if (backBtn instanceof HTMLElement) {
      backBtn.click();
    }
    return;
  }

  if ((up || down || left || right) && now - lastMenuNavTime > 210) {
    lastMenuNavTime = now;
    const focusables = Array.from(
      document.querySelectorAll("button:not([disabled]), input:not([disabled])")
    ).filter((el) => el.offsetParent !== null);

    if (focusables.length === 0) return;

    const currentIdx = focusables.indexOf(document.activeElement);
    const step = down || right ? 1 : -1;
    const nextIdx =
      currentIdx === -1
        ? 0
        : (currentIdx + step + focusables.length) % focusables.length;
    focusables[nextIdx].focus();
  }
}
