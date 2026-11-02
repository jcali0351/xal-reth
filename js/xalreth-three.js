/* Xal'Reth hero, WebGL layer (Three.js r160, vendored in js/vendor).
   A coil of particles turning around the sigil, procedural violet fog, and purple energy arcs.
   All motion runs on the GPU in shaders; the CPU only rebuilds a few short arc lines.
   Loaded by js/xalreth.js only when WebGL works and the visitor allows motion. */
import * as THREE from "./vendor/three.module.min.js";

export function start(hero, canvas) {
  const mobile = window.matchMedia("(max-width: 700px)").matches;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: "high-performance" });
  } catch (e) { return null; }
  renderer.setClearColor(0x000000, 0);
  const dprCap = mobile ? 1.0 : 1.25;
  let renderScale = 1;                                    // lowered automatically if frames run slow

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 12);
  const world = new THREE.Group(); scene.add(world);       // centred on the sigil

  /* ---------------------------------------------------------------- procedural fog */
  const fogMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uAspect: { value: 1 }, uSurge: { value: 0 } },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
    fragmentShader: `
      precision mediump float;
      varying vec2 vUv; uniform float uTime, uAspect, uSurge;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
        return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
      float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ v += a*noise(p); p = p*2.03 + 7.1; a *= 0.5; } return v; }
      void main(){
        vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
        float t = uTime * 0.035;
        vec2 q = vec2(fbm(p*2.2 + vec2(t, -t)), fbm(p*2.2 + vec2(-t*0.7, t*1.3) + 4.0));
        float f = fbm(p*1.6 + q*1.4 + vec2(0.0, -t*2.0));
        float r = length(p);
        float glow = smoothstep(0.75, 0.0, r);                 // brightest behind the sigil
        float mist = smoothstep(0.35, 0.95, f) * (0.35 + 0.65*glow);
        vec3 col = mix(vec3(0.16, 0.05, 0.32), vec3(0.62, 0.38, 1.0), smoothstep(0.5, 1.0, f));
        float a = mist * (0.34 + 0.25*uSurge) * smoothstep(1.05, 0.25, r);
        gl_FragColor = vec4(col * a, a);
      }`
  });
  const fog = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), fogMat);
  fog.frustumCulled = false; fog.renderOrder = -1; scene.add(fog);

  /* ---------------------------------------------------------------- particle field: the coil */
  const COUNT = mobile ? 1600 : 4200;
  const pos = new Float32Array(COUNT * 3), seed = new Float32Array(COUNT * 4);
  for (let i = 0; i < COUNT; i++) {
    const shell = Math.random();
    const r = shell < 0.82 ? 1.6 + Math.pow(Math.random(), 0.7) * 6.4 : 8 + Math.random() * 10;   // disc + deep stars
    const a = Math.random() * Math.PI * 2;
    const arm = Math.floor(Math.random() * 3) * (Math.PI * 2 / 3);                                 // three coils
    const ang = shell < 0.82 ? arm + r * 0.55 + (Math.random() - 0.5) * 1.1 : a;
    pos[i * 3] = r; pos[i * 3 + 1] = (Math.random() - 0.5) * (shell < 0.82 ? 0.5 + r * 0.06 : 9); pos[i * 3 + 2] = ang;
    seed[i * 4] = Math.random(); seed[i * 4 + 1] = 0.6 + Math.random() * 1.8;   // twinkle, size
    seed[i * 4 + 2] = Math.random(); seed[i * 4 + 3] = shell < 0.82 ? 1 : 0;   // hue, in-disc
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  pGeo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 4));
  const pMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPx: { value: 1 }, uSurge: { value: 0 } },
    vertexShader: `
      attribute vec4 aSeed; uniform float uTime, uPx, uSurge; varying float vA; varying float vHue;
      void main(){
        float r = position.x, h = position.y, ang = position.z;
        float spin = aSeed.w > 0.5 ? 0.05 / (0.35 + r*0.12) : 0.006;          // inner coils turn faster
        ang += uTime * spin * (1.0 + uSurge*4.0);
        r *= 1.0 + uSurge*0.18*aSeed.w;
        vec3 p = vec3(cos(ang)*r, h + sin(uTime*0.3 + aSeed.x*6.28)*0.08, sin(ang)*r);
        p.yz = mat2(cos(1.12), -sin(1.12), sin(1.12), cos(1.12)) * p.yz;         // tilt the disc toward the viewer
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float tw = 0.55 + 0.45*sin(uTime*(1.5 + aSeed.x*2.5) + aSeed.x*40.0);
        vA = tw * (aSeed.w > 0.5 ? 0.9 : 0.55);
        vHue = aSeed.z;
        gl_PointSize = aSeed.y * uPx * (7.0 / -mv.z) * (1.0 + uSurge*0.6);
      }`,
    fragmentShader: `
      precision mediump float; varying float vA; varying float vHue;
      void main(){
        vec2 c = gl_PointCoord - 0.5; float d = length(c);
        float a = smoothstep(0.5, 0.0, d); a *= a;
        vec3 col = mix(vec3(0.55, 0.32, 1.0), vec3(0.93, 0.85, 1.0), vHue*vHue);
        gl_FragColor = vec4(col * a * vA, a * vA);
      }`
  });
  const points = new THREE.Points(pGeo, pMat); points.frustumCulled = false; world.add(points);

  /* ---------------------------------------------------------------- purple energy arcs */
  const ARC_SEG = 28, MAX_ARCS = mobile ? 4 : 7;
  const arcs = [];
  for (let i = 0; i < MAX_ARCS; i++) {
    for (const layer of [0, 1]) {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(ARC_SEG * 3), 3));
      const m = new THREE.LineBasicMaterial({ color: layer ? 0xf0e4ff : 0x9d5cff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
      const line = new THREE.Line(g, m); line.frustumCulled = false; world.add(line);
      arcs.push({ line, layer, life: 0, max: 0, a0: 0, a1: 0, r: 0, group: i });
    }
  }
  let ringR = 2.2;                                          // set from the sigil's size on resize
  function rebuildArc(arc, jitter) {
    const p = arc.line.geometry.attributes.position.array;
    for (let s = 0; s < ARC_SEG; s++) {
      const t = s / (ARC_SEG - 1);
      const ang = arc.a0 + (arc.a1 - arc.a0) * t;
      const bow = Math.sin(t * Math.PI) * arc.r * 0.28;        // arcs bow outward like a coil
      const n = (s === 0 || s === ARC_SEG - 1) ? 0 : (Math.random() - 0.5) * jitter;
      const rr = arc.r + bow + n;
      p[s * 3] = Math.cos(ang) * rr; p[s * 3 + 1] = Math.sin(ang) * rr; p[s * 3 + 2] = 0.2 + n * 0.5;
    }
    arc.line.geometry.attributes.position.needsUpdate = true;
  }
  function fireArc() {
    const free = arcs.filter(a => a.layer === 0 && a.life <= 0);
    if (!free.length) return;
    const core = free[Math.floor(Math.random() * free.length)];
    const a0 = Math.random() * Math.PI * 2, span = (0.6 + Math.random() * 1.3) * (Math.random() < 0.5 ? -1 : 1);
    const r = ringR * (0.92 + Math.random() * 0.35), max = 0.45 + Math.random() * 0.5;
    for (const a of arcs) if (a.group === core.group) { a.a0 = a0; a.a1 = a0 + span; a.r = r; a.life = max; a.max = max; }
  }

  /* ---------------------------------------------------------------- layout */
  let W = 1, H = 1, visibleH = 1;
  function layout() {
    const r = canvas.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap) * renderScale);
    renderer.setSize(W, H, false);
    camera.aspect = W / H; camera.updateProjectionMatrix();
    visibleH = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const logo = hero.querySelector(".xr-stage").getBoundingClientRect();
    const px2w = visibleH / H;
    world.position.x = ((logo.left + logo.width / 2) - (r.left + W / 2)) * px2w;
    world.position.y = -((logo.top + logo.height * 0.52) - (r.top + H / 2)) * px2w;
    ringR = logo.width * 0.44 * px2w;
    world.scale.setScalar(Math.max(0.55, Math.min(1.25, logo.width / 440)));
    pMat.uniforms.uPx.value = renderer.getPixelRatio() * (H / 900) * 10;
    fogMat.uniforms.uAspect.value = W / H;
  }
  layout();
  window.addEventListener("resize", layout);
  const ro = "ResizeObserver" in window ? new ResizeObserver(layout) : null; if (ro) ro.observe(hero);

  /* ---------------------------------------------------------------- gentle parallax */
  let tx = 0, ty = 0;
  window.addEventListener("pointermove", e => { tx = (e.clientX / window.innerWidth - 0.5); ty = (e.clientY / window.innerHeight - 0.5); }, { passive: true });

  /* ---------------------------------------------------------------- loop, with a 60 FPS budget */
  const clock = new THREE.Clock();
  let paused = false, surge = 0, nextArc = 0.8, winFrames = 0, winTime = 0, t = 0, rebuildAcc = 0;
  function frame() {
    if (dead) return;
    requestAnimationFrame(frame);
    const rawDt = clock.getDelta(), dt = Math.min(rawDt, 0.1);
    if (paused) return;
    t += dt;
    // 60 FPS budget: every 2 seconds, if the average frame rate is under 50, lower the render
    // resolution one step; at the floor, drop the fog; as a last resort, thin the particles.
    winFrames++; winTime += rawDt;
    if (winTime >= 2) {
      const fps = winFrames / winTime; winFrames = 0; winTime = 0;
      if (fps < 50) {
        if (renderScale > 0.55) { renderScale = Math.max(0.5, renderScale - 0.25); layout(); }
        else if (fog.visible) fog.visible = false;
        else if (pGeo.drawRange.count > COUNT / 3 || pGeo.drawRange.count === Infinity) pGeo.setDrawRange(0, Math.floor(COUNT / 3));
        else if (fps < 24) { giveUp(); return; }              // no graphics card: hand back to the 2D particles
      }
    }
    surge = Math.max(0, surge - dt * 0.9);
    pMat.uniforms.uTime.value = t; pMat.uniforms.uSurge.value = surge;
    fogMat.uniforms.uTime.value = t; fogMat.uniforms.uSurge.value = surge;
    camera.position.x += (tx * 0.9 - camera.position.x) * 0.04;
    camera.position.y += (-ty * 0.6 - camera.position.y) * 0.04;
    camera.lookAt(world.position.x * 0.15, world.position.y * 0.15, 0);
    nextArc -= dt * (1 + surge * 6);
    if (nextArc <= 0) { fireArc(); nextArc = 0.9 + Math.random() * 2.2; }
    rebuildAcc += dt; const flick = rebuildAcc > 0.06; if (flick) rebuildAcc = 0;
    for (const a of arcs) {
      if (a.life <= 0) { a.line.material.opacity = 0; continue; }
      a.life -= dt;
      if (flick) rebuildArc(a, a.layer ? 0.08 : 0.22);
      const k = Math.max(0, a.life / a.max);
      a.line.material.opacity = (a.layer ? 0.9 : 0.75) * Math.sin(k * Math.PI) * (0.7 + 0.3 * Math.random());
    }
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);

  let dead = false;
  function giveUp() {
    dead = true; paused = true;
    hero.classList.remove("xr-gl");
    try { renderer.dispose(); renderer.forceContextLoss(); } catch (e) {}
    if (ro) ro.disconnect(); window.removeEventListener("resize", layout);
  }

  return {
    get dead() { return dead; },
    setPaused(v) { paused = !!v; if (!paused) { clock.getDelta(); winFrames = 0; winTime = 0; } },
    surge(amount) { surge = Math.min(2.5, surge + (amount || 1)); for (let i = 0; i < 2; i++) fireArc(); },
    unwrap() { surge = 2.5; for (let i = 0; i < MAX_ARCS; i++) fireArc(); }
  };
}
