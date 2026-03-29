import {
  Color,
  InstancedBufferAttribute,
  InstancedMesh,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector2,
  WebGLRenderer,
} from "three";

const config = {
  cursor: {
    radius: 0.065,
    strength: 3,
    dragFactor: 0.015,
  },
  halo: {
    outerOscFrequency: 2.6,
    outerOscAmplitude: 0.76,
    radiusBase: 2.4,
    radiusAmplitude: 0.5,
    shapeAmplitude: 0.75,
    rimWidth: 1.8,
    outerStartOffset: 0.4,
    outerEndOffset: 2.2,
    scaleX: 1.3,
    scaleY: 1,
  },
  particles: {
    baseSize: 0.016,
    activeSize: 0.044,
    blobScaleX: 1,
    blobScaleY: 0.6,
    rotationSpeed: 0.1,
    rotationJitter: 0.2,
    cursorFollowStrength: 1,
    oscillationFactor: 1,
    colorBaseLight: "#000000",
    colorBaseDark: "#f3f3f3",
    colorOne: "#4285f5",
    colorTwo: "#eb4236",
    colorThree: "#faba03",
  },
} as const;

const vertexShader = `
uniform float uTime;
uniform vec2 uMouse;
uniform float uOuterOscFrequency;
uniform float uOuterOscAmplitude;
uniform float uHaloRadiusBase;
uniform float uHaloRadiusAmplitude;
uniform float uHaloShapeAmplitude;
uniform float uHaloRimWidth;
uniform float uHaloOuterStartOffset;
uniform float uHaloOuterEndOffset;
uniform float uHaloScaleX;
uniform float uHaloScaleY;
uniform float uParticleBaseSize;
uniform float uParticleActiveSize;
uniform float uBlobScaleX;
uniform float uBlobScaleY;
uniform float uParticleRotationSpeed;
uniform float uParticleRotationJitter;
uniform float uParticleOscillationFactor;
varying vec2 vUv;
varying float vSize;
varying vec2 vPos;
attribute vec3 aOffset;
attribute float aRandom;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

void main() {
  vUv = uv;
  vec3 pos = aOffset;
  float driftSpeed = uTime * 0.15;
  float dx = sin(driftSpeed + pos.y * 0.5) + sin(driftSpeed * 0.5 + pos.y * 2.0);
  float dy = cos(driftSpeed + pos.x * 0.5) + cos(driftSpeed * 0.5 + pos.x * 2.0);
  pos.x += dx * 0.25;
  pos.y += dy * 0.25;

  vec2 relToMouse = pos.xy - uMouse;
  vec2 haloScale = max(vec2(uHaloScaleX, uHaloScaleY), vec2(0.0001));
  float distFromMouse = length(relToMouse / haloScale);
  vec2 dirToMouse = normalize(relToMouse + vec2(0.0001, 0.0));
  float shapeFactor = noise(dirToMouse * 2.0 + vec2(0.0, uTime * 0.1));
  float breathCycle = sin(uTime * 0.8);
  float baseRadius = uHaloRadiusBase + breathCycle * uHaloRadiusAmplitude;
  float currentRadius = baseRadius + (shapeFactor * uHaloShapeAmplitude);
  float dist = distFromMouse;
  float rimInfluence = smoothstep(uHaloRimWidth, 0.0, abs(dist - currentRadius));
  vec2 pushDir = normalize(relToMouse + vec2(0.0001, 0.0));
  float pushAmt = (breathCycle * 0.5 + 0.5) * 0.5;
  pos.xy += pushDir * pushAmt * rimInfluence;
  pos.z += rimInfluence * 0.3 * sin(uTime);

  float outerInfluence = smoothstep(
    baseRadius + uHaloOuterStartOffset,
    baseRadius + uHaloOuterEndOffset,
    dist
  );
  float outerOsc = sin(uTime * uOuterOscFrequency + pos.x * 0.6 + pos.y * 0.6);
  pos.xy += normalize(relToMouse + vec2(0.0001, 0.0)) * outerOsc * uOuterOscAmplitude * outerInfluence;

  float bSize = uParticleBaseSize + (sin(uTime + pos.x) * 0.003);
  float currentScale = bSize + (rimInfluence * uParticleActiveSize);
  float stretch = rimInfluence * 0.02;
  vec3 transformed = position;
  transformed.x *= (currentScale + stretch) * uBlobScaleX;
  transformed.y *= currentScale * uBlobScaleY;
  vSize = rimInfluence;
  vPos = pos.xy;

  float dirLen = max(length(relToMouse), 0.0001);
  vec2 dir = relToMouse / dirLen;
  float oscPhase = aRandom * 6.28318530718;
  float osc = 0.5 + 0.5 * sin(uTime * (0.25 + uParticleOscillationFactor * 0.35) + oscPhase);
  float speedScale = mix(0.55, 1.35, osc) * (0.8 + uParticleOscillationFactor * 0.2);
  float jitterScale = mix(0.7, 1.45, osc) * (0.85 + uParticleOscillationFactor * 0.15);
  float jitter = sin(
    uTime * uParticleRotationSpeed * speedScale + pos.x * 0.35 + pos.y * 0.35
  ) * (uParticleRotationJitter * jitterScale);
  vec2 perp = vec2(-dir.y, dir.x);
  vec2 jitteredDir = normalize(dir + perp * jitter);
  mat2 rot = mat2(jitteredDir.x, jitteredDir.y, -jitteredDir.y, jitteredDir.x);
  transformed.xy = rot * transformed.xy;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos + transformed, 1.0);
}
`;

const fragmentShader = `
uniform float uTime;
uniform vec3 uParticleColorBase;
uniform vec3 uParticleColorOne;
uniform vec3 uParticleColorTwo;
uniform vec3 uParticleColorThree;
varying vec2 vUv;
varying float vSize;
varying vec2 vPos;

void main() {
  vec2 center = vec2(0.5);
  vec2 pos = abs(vUv - center) * 2.0;
  float d = pow(pow(pos.x, 2.6) + pow(pos.y, 2.6), 1.0 / 2.6);
  float alpha = 1.0 - smoothstep(0.8, 1.0, d);
  if (alpha < 0.01) discard;

  vec3 base = uParticleColorBase;
  vec3 cBlue = uParticleColorOne;
  vec3 cRed = uParticleColorTwo;
  vec3 cYellow = uParticleColorThree;
  float t = uTime * 1.2;
  float p1 = sin(vPos.x * 0.8 + t);
  float p2 = sin(vPos.y * 0.8 + t * 0.8 + p1);
  vec3 activeColor = mix(cBlue, cRed, p1 * 0.5 + 0.5);
  activeColor = mix(activeColor, cYellow, p2 * 0.5 + 0.5);
  vec3 finalColor = mix(base, activeColor, smoothstep(0.1, 0.8, vSize));
  float finalAlpha = alpha * smoothstep(0.02, 0.8, vSize) * 0.95;
  gl_FragColor = vec4(finalColor, finalAlpha);
}
`;

const COUNT_X = 100;
const COUNT_Y = 55;
const GRID_WIDTH = 40;
const GRID_HEIGHT = 22;
const JITTER_AMOUNT = 0.25;

export function mountHomeHeroParticles(hero: HTMLElement, mount: HTMLElement) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  const probeCanvas = document.createElement("canvas");
  const gl =
    probeCanvas.getContext("webgl") ??
    probeCanvas.getContext("experimental-webgl");

  if (!gl) {
    return;
  }

  const scene = new Scene();
  const camera = new PerspectiveCamera(75, 1, 0.1, 100);
  camera.position.z = 5;

  const renderer = new WebGLRenderer({
    antialias: true,
    alpha: true,
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.style.display = "block";
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  mount.appendChild(renderer.domElement);

  const uniforms = {
    uTime: { value: 0 },
    uMouse: { value: new Vector2(0, 0) },
    uOuterOscFrequency: { value: config.halo.outerOscFrequency },
    uOuterOscAmplitude: { value: config.halo.outerOscAmplitude },
    uHaloRadiusBase: { value: config.halo.radiusBase },
    uHaloRadiusAmplitude: { value: config.halo.radiusAmplitude },
    uHaloShapeAmplitude: { value: config.halo.shapeAmplitude },
    uHaloRimWidth: { value: config.halo.rimWidth },
    uHaloOuterStartOffset: { value: config.halo.outerStartOffset },
    uHaloOuterEndOffset: { value: config.halo.outerEndOffset },
    uHaloScaleX: { value: config.halo.scaleX },
    uHaloScaleY: { value: config.halo.scaleY },
    uParticleBaseSize: { value: config.particles.baseSize },
    uParticleActiveSize: { value: config.particles.activeSize },
    uBlobScaleX: { value: config.particles.blobScaleX },
    uBlobScaleY: { value: config.particles.blobScaleY },
    uParticleRotationSpeed: { value: config.particles.rotationSpeed },
    uParticleRotationJitter: { value: config.particles.rotationJitter },
    uParticleOscillationFactor: { value: config.particles.oscillationFactor },
    uParticleColorBase: {
      value: new Color(config.particles.colorBaseLight),
    },
    uParticleColorOne: { value: new Color(config.particles.colorOne) },
    uParticleColorTwo: { value: new Color(config.particles.colorTwo) },
    uParticleColorThree: {
      value: new Color(config.particles.colorThree),
    },
  };

  const material = new ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
  });

  const count = COUNT_X * COUNT_Y;
  const geometry = new PlaneGeometry(1, 1);
  const offsets = new Float32Array(count * 3);
  const randoms = new Float32Array(count);

  let index = 0;
  for (let y = 0; y < COUNT_Y; y += 1) {
    for (let x = 0; x < COUNT_X; x += 1) {
      const u = x / (COUNT_X - 1);
      const v = y / (COUNT_Y - 1);
      offsets[index * 3] =
        (u - 0.5) * GRID_WIDTH + (Math.random() - 0.5) * JITTER_AMOUNT;
      offsets[index * 3 + 1] =
        (v - 0.5) * GRID_HEIGHT + (Math.random() - 0.5) * JITTER_AMOUNT;
      offsets[index * 3 + 2] = 0;
      randoms[index] = Math.random();
      index += 1;
    }
  }

  geometry.setAttribute("aOffset", new InstancedBufferAttribute(offsets, 3));
  geometry.setAttribute("aRandom", new InstancedBufferAttribute(randoms, 1));

  const mesh = new InstancedMesh(geometry, material, count);
  scene.add(mesh);

  const animationStart = performance.now();
  const cleanupController = new AbortController();
  const resizeObserver = new ResizeObserver(() => {
    updateSize();
  });
  const themeObserver = new MutationObserver(() => {
    updateTheme();
  });

  const mouseTarget = { x: 0, y: 0 };
  const mouseCurrent = new Vector2(0, 0);
  let isDisposed = false;
  let isVisible = false;
  let frameId: number | null = null;

  const getViewportSize = () => {
    const verticalFov = (camera.fov * Math.PI) / 180;
    const height = 2 * Math.tan(verticalFov / 2) * camera.position.z;

    return {
      width: height * camera.aspect,
      height,
    };
  };

  const updateSize = () => {
    const width = hero.clientWidth;
    const height = hero.clientHeight;

    if (!width || !height) {
      return;
    }

    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };

  const updateTheme = () => {
    const isDark =
      document.documentElement.getAttribute("data-theme") === "dark";
    uniforms.uParticleColorBase.value.set(
      isDark ? config.particles.colorBaseDark : config.particles.colorBaseLight,
    );
  };

  const getScenePointFromClient = (clientX: number, clientY: number) => {
    const rect = hero.getBoundingClientRect();

    if (!rect.width || !rect.height) {
      return { x: 0, y: 0 };
    }

    const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -(((clientY - rect.top) / rect.height) * 2 - 1);
    const viewport = getViewportSize();
    const time = performance.now() / 1000;
    const jitterRadius =
      Math.min(viewport.width, viewport.height) * config.cursor.radius;
    const jitterX = (Math.sin(time * 0.35) + Math.sin(time * 0.77 + 1.2)) * 0.5;
    const jitterY = (Math.cos(time * 0.31) + Math.sin(time * 0.63 + 2.4)) * 0.5;

    return {
      x:
        ((ndcX * viewport.width) / 2 +
          jitterX * jitterRadius * config.cursor.strength) *
        config.particles.cursorFollowStrength,
      y:
        ((ndcY * viewport.height) / 2 +
          jitterY * jitterRadius * config.cursor.strength) *
        config.particles.cursorFollowStrength,
    };
  };

  const handlePointerMove = (event: PointerEvent) => {
    const point = getScenePointFromClient(event.clientX, event.clientY);
    mouseTarget.x = point.x;
    mouseTarget.y = point.y;
  };

  const handleTouchMove = (event: TouchEvent) => {
    const touch = event.touches[0];

    if (!touch) {
      return;
    }

    const point = getScenePointFromClient(touch.clientX, touch.clientY);
    mouseTarget.x = point.x;
    mouseTarget.y = point.y;
  };

  const shouldAnimate = () => !isDisposed && isVisible && !document.hidden;

  const renderFrame = () => {
    if (!shouldAnimate()) {
      frameId = null;
      return;
    }

    frameId = window.requestAnimationFrame(renderFrame);
    uniforms.uTime.value = (performance.now() - animationStart) / 1000;

    mouseCurrent.x +=
      (mouseTarget.x - mouseCurrent.x) * config.cursor.dragFactor;
    mouseCurrent.y +=
      (mouseTarget.y - mouseCurrent.y) * config.cursor.dragFactor;

    uniforms.uMouse.value.copy(mouseCurrent);
    renderer.render(scene, camera);
  };

  const startAnimation = () => {
    if (frameId !== null || !shouldAnimate()) {
      return;
    }

    frameId = window.requestAnimationFrame(renderFrame);
  };

  const stopAnimation = () => {
    if (frameId === null) {
      return;
    }

    window.cancelAnimationFrame(frameId);
    frameId = null;
  };

  const syncAnimationState = () => {
    if (shouldAnimate()) {
      startAnimation();
      return;
    }

    stopAnimation();
  };

  const intersectionObserver = new IntersectionObserver(
    ([entry]) => {
      isVisible = entry?.isIntersecting ?? false;
      syncAnimationState();
    },
    { threshold: 0 },
  );

  const cleanup = () => {
    if (isDisposed) {
      return;
    }

    isDisposed = true;
    stopAnimation();
    cleanupController.abort();
    intersectionObserver.disconnect();
    resizeObserver.disconnect();
    themeObserver.disconnect();
    geometry.dispose();
    material.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };

  updateSize();
  updateTheme();
  resizeObserver.observe(hero);
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  intersectionObserver.observe(mount);

  window.addEventListener("pointermove", handlePointerMove, {
    passive: true,
    signal: cleanupController.signal,
  });
  window.addEventListener("touchmove", handleTouchMove, {
    passive: true,
    signal: cleanupController.signal,
  });
  document.addEventListener("visibilitychange", syncAnimationState, {
    signal: cleanupController.signal,
  });
  document.addEventListener("astro:before-swap", cleanup, {
    once: true,
    signal: cleanupController.signal,
  });
  window.addEventListener("pagehide", cleanup, {
    once: true,
    signal: cleanupController.signal,
  });

  syncAnimationState();
}
