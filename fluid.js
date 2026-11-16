// WebGL fluid simulation (stable fluids: advection, curl/vorticity, pressure solve) that
// paints rainbow dye wherever the pointer moves inside `area`. Transparent output, so it
// sits on any background. Usage: HZFluid(canvas, areaElement, { ...config })
window.HZFluid = function (canvas, area, opts = {}) {
  const C = Object.assign({
    SIM_RESOLUTION: 128, DYE_RESOLUTION: 1024, DENSITY_DISSIPATION: 2.6, VELOCITY_DISSIPATION: 2,
    PRESSURE: 0.1, PRESSURE_ITERATIONS: 20, CURL: 3.5, SPLAT_RADIUS: 0.22, SPLAT_FORCE: 6000,
    SHADING: true, COLOR_UPDATE_SPEED: 10, INTENSITY: 0.2
  }, opts);

  const params = { alpha: true, depth: false, stencil: false, antialias: false, preserveDrawingBuffer: false, premultipliedAlpha: true };
  let gl = canvas.getContext("webgl2", params);
  const isGL2 = !!gl;
  if (!gl) gl = canvas.getContext("webgl", params) || canvas.getContext("experimental-webgl", params);
  if (!gl) return null;

  let halfFloat, linear;
  if (isGL2) { gl.getExtension("EXT_color_buffer_float"); linear = gl.getExtension("OES_texture_float_linear"); }
  else { halfFloat = gl.getExtension("OES_texture_half_float"); linear = gl.getExtension("OES_texture_half_float_linear"); }
  gl.clearColor(0, 0, 0, 0);
  const HF = isGL2 ? gl.HALF_FLOAT : halfFloat && halfFloat.HALF_FLOAT_OES;
  if (!HF) return null;
  const supports = (internal, format) => {
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, 4, 4, 0, format, HF, null);
    const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    return gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
  };
  const fmt = (i, f) => supports(i, f) ? { internal: i, format: f } : null;
  let RGBA, RG, R;
  if (isGL2) {
    RGBA = fmt(gl.RGBA16F, gl.RGBA);
    RG = fmt(gl.RG16F, gl.RG) || RGBA;
    R = fmt(gl.R16F, gl.RED) || RG;
  } else RGBA = RG = R = fmt(gl.RGBA, gl.RGBA);
  if (!RGBA) return null;
  const filtering = linear ? gl.LINEAR : gl.NEAREST;
  if (!linear) C.SHADING = false;

  // ---------- shaders ----------
  const compile = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.warn(gl.getShaderInfoLog(s)); return s; };
  const baseVS = compile(gl.VERTEX_SHADER, `precision highp float;
    attribute vec2 aPosition; varying vec2 vUv, vL, vR, vT, vB; uniform vec2 texelSize;
    void main(){ vUv = aPosition*.5+.5; vL = vUv-vec2(texelSize.x,0.); vR = vUv+vec2(texelSize.x,0.); vT = vUv+vec2(0.,texelSize.y); vB = vUv-vec2(0.,texelSize.y); gl_Position = vec4(aPosition,0.,1.); }`);
  const prog = src => {
    const p = gl.createProgram(); gl.attachShader(p, baseVS); gl.attachShader(p, compile(gl.FRAGMENT_SHADER, src)); gl.linkProgram(p);
    const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const name = gl.getActiveUniform(p, i).name; u[name] = gl.getUniformLocation(p, name); }
    return { p, u, bind() { gl.useProgram(p); } };
  };
  const H = "precision highp float; precision highp sampler2D; varying highp vec2 vUv, vL, vR, vT, vB;";
  const copyP = prog(`${H} uniform sampler2D uTexture; void main(){ gl_FragColor = texture2D(uTexture, vUv); }`);
  const clearP = prog(`${H} uniform sampler2D uTexture; uniform float value; void main(){ gl_FragColor = value*texture2D(uTexture, vUv); }`);
  const splatP = prog(`${H} uniform sampler2D uTarget; uniform float aspectRatio; uniform vec3 color; uniform vec2 point; uniform float radius;
    void main(){ vec2 p = vUv-point.xy; p.x *= aspectRatio; vec3 s = exp(-dot(p,p)/radius)*color; gl_FragColor = vec4(texture2D(uTarget, vUv).xyz + s, 1.); }`);
  const advP = prog(`${H} uniform sampler2D uVelocity, uSource; uniform vec2 texelSize, dyeTexelSize; uniform float dt, dissipation;
    vec4 bilerp(sampler2D sam, vec2 uv, vec2 ts){ vec2 st = uv/ts-.5; vec2 i = floor(st); vec2 f = fract(st);
      vec4 a = texture2D(sam,(i+vec2(.5,.5))*ts), b = texture2D(sam,(i+vec2(1.5,.5))*ts), c = texture2D(sam,(i+vec2(.5,1.5))*ts), d = texture2D(sam,(i+vec2(1.5,1.5))*ts);
      return mix(mix(a,b,f.x),mix(c,d,f.x),f.y); }
    void main(){ ${linear ? "vec2 coord = vUv - dt*texture2D(uVelocity,vUv).xy*texelSize; vec4 r = texture2D(uSource, coord);"
                          : "vec2 coord = vUv - dt*bilerp(uVelocity,vUv,texelSize).xy*texelSize; vec4 r = bilerp(uSource, coord, dyeTexelSize);"}
      gl_FragColor = r/(1.+dissipation*dt); }`);
  const divP = prog(`${H} uniform sampler2D uVelocity; void main(){ float L = texture2D(uVelocity,vL).x, R = texture2D(uVelocity,vR).x, T = texture2D(uVelocity,vT).y, B = texture2D(uVelocity,vB).y;
    vec2 C = texture2D(uVelocity,vUv).xy; if(vL.x<0.) L=-C.x; if(vR.x>1.) R=-C.x; if(vT.y>1.) T=-C.y; if(vB.y<0.) B=-C.y; gl_FragColor = vec4(.5*(R-L+T-B),0.,0.,1.); }`);
  const curlP = prog(`${H} uniform sampler2D uVelocity; void main(){ float L = texture2D(uVelocity,vL).y, R = texture2D(uVelocity,vR).y, T = texture2D(uVelocity,vT).x, B = texture2D(uVelocity,vB).x;
    gl_FragColor = vec4(.5*(R-L-T+B),0.,0.,1.); }`);
  const vortP = prog(`${H} uniform sampler2D uVelocity, uCurl; uniform float curl, dt; void main(){
    float L = texture2D(uCurl,vL).x, R = texture2D(uCurl,vR).x, T = texture2D(uCurl,vT).x, B = texture2D(uCurl,vB).x, C = texture2D(uCurl,vUv).x;
    vec2 force = .5*vec2(abs(T)-abs(B), abs(R)-abs(L)); force /= length(force)+.0001; force *= curl*C; force.y *= -1.;
    vec2 v = texture2D(uVelocity,vUv).xy + force*dt; v = min(max(v,-1000.),1000.); gl_FragColor = vec4(v,0.,1.); }`);
  const presP = prog(`${H} uniform sampler2D uPressure, uDivergence; void main(){ float L = texture2D(uPressure,vL).x, R = texture2D(uPressure,vR).x, T = texture2D(uPressure,vT).x, B = texture2D(uPressure,vB).x;
    float d = texture2D(uDivergence,vUv).x; gl_FragColor = vec4((L+R+B+T-d)*.25,0.,0.,1.); }`);
  const gradP = prog(`${H} uniform sampler2D uPressure, uVelocity; void main(){ float L = texture2D(uPressure,vL).x, R = texture2D(uPressure,vR).x, T = texture2D(uPressure,vT).x, B = texture2D(uPressure,vB).x;
    vec2 v = texture2D(uVelocity,vUv).xy - vec2(R-L,T-B); gl_FragColor = vec4(v,0.,1.); }`);
  const dispP = prog(`${H} uniform sampler2D uTexture; uniform vec2 texelSize; uniform bool shading; void main(){
    vec3 c = texture2D(uTexture,vUv).rgb;
    if (shading) { vec3 lc = texture2D(uTexture,vL).rgb, rc = texture2D(uTexture,vR).rgb, tc = texture2D(uTexture,vT).rgb, bc = texture2D(uTexture,vB).rgb;
      float dx = length(rc)-length(lc), dy = length(tc)-length(bc); vec3 n = normalize(vec3(dx,dy,length(texelSize)));
      float diffuse = clamp(dot(n, vec3(0.,0.,1.))+.7, .7, 1.); c *= diffuse; }
    float a = max(c.r, max(c.g, c.b)); gl_FragColor = vec4(c, a); }`);

  // ---------- geometry + framebuffers ----------
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); gl.enableVertexAttribArray(0);
  const blit = target => {
    if (target) { gl.viewport(0, 0, target.w, target.h); gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo); }
    else { gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight); gl.bindFramebuffer(gl.FRAMEBUFFER, null); }
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
  };
  const makeFBO = (w, h, f, filter) => {
    gl.activeTexture(gl.TEXTURE0); const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, f.internal, w, h, 0, f.format, HF, null);
    const fbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.viewport(0, 0, w, h); gl.clear(gl.COLOR_BUFFER_BIT);
    return { tex, fbo, w, h, tsx: 1 / w, tsy: 1 / h, attach(id) { gl.activeTexture(gl.TEXTURE0 + id); gl.bindTexture(gl.TEXTURE_2D, tex); return id; } };
  };
  const makeDouble = (w, h, f, filter) => { let a = makeFBO(w, h, f, filter), b = makeFBO(w, h, f, filter);
    return { w, h, tsx: 1 / w, tsy: 1 / h, get read() { return a; }, get write() { return b; }, swap() { [a, b] = [b, a]; } }; };
  const res = r => { const ar = gl.drawingBufferWidth / gl.drawingBufferHeight, mx = Math.round(r * Math.max(ar, 1 / ar)), mn = Math.round(r);
    return gl.drawingBufferWidth > gl.drawingBufferHeight ? { w: mx, h: mn } : { w: mn, h: mx }; };
  let dye, velocity, divergence, curl, pressure;
  const initFBOs = () => {
    const s = res(C.SIM_RESOLUTION), d = res(C.DYE_RESOLUTION);
    dye = makeDouble(d.w, d.h, RGBA, filtering); velocity = makeDouble(s.w, s.h, RG, filtering);
    divergence = makeFBO(s.w, s.h, R, gl.NEAREST); curl = makeFBO(s.w, s.h, R, gl.NEAREST); pressure = makeDouble(s.w, s.h, R, gl.NEAREST);
  };
  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2), w = Math.floor(canvas.clientWidth * dpr), h = Math.floor(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; initFBOs(); return true; }
    return false;
  };
  resize(); if (!dye) initFBOs();

  // ---------- input ----------
  const pointer = { x: 0, y: 0, dx: 0, dy: 0, moved: false, down: false, color: { r: 0, g: 0, b: 0 }, seen: false };
  const hsv = (h, s, v) => { const i = Math.floor(h * 6), f = h * 6 - i, p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
    const [r, g, b] = [[v, t, p], [q, v, p], [p, v, t], [p, q, v], [t, p, v], [v, p, q]][i % 6]; return { r, g, b }; };
  const genColor = () => { const c = hsv(Math.random(), 1, 1); c.r *= C.INTENSITY; c.g *= C.INTENSITY; c.b *= C.INTENSITY; return c; };
  const local = e => { const r = canvas.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height]; };
  area.addEventListener("pointermove", e => {
    const [x, y] = local(e);
    if (!pointer.seen) { pointer.seen = true; pointer.x = x; pointer.y = y; pointer.color = genColor(); return; }
    const ar = canvas.width / canvas.height;
    pointer.dx = (x - pointer.x) * (ar < 1 ? ar : 1); pointer.dy = (y - pointer.y) / (ar > 1 ? ar : 1);
    pointer.x = x; pointer.y = y; pointer.moved = Math.abs(pointer.dx) > 0 || Math.abs(pointer.dy) > 0;
  });
  area.addEventListener("pointerdown", e => { const [x, y] = local(e); pointer.x = x; pointer.y = y; const c = genColor(); c.r *= 10; c.g *= 10; c.b *= 10; splat(x, y, 10 * (Math.random() - .5), 30 * (Math.random() - .5), c); });
  area.addEventListener("pointerleave", () => pointer.seen = false);

  const radius = r => { const ar = canvas.width / canvas.height; return ar > 1 ? r * ar : r; };
  function splat(x, y, dx, dy, color) {
    splatP.bind();
    gl.uniform1i(splatP.u.uTarget, velocity.read.attach(0)); gl.uniform1f(splatP.u.aspectRatio, canvas.width / canvas.height);
    gl.uniform2f(splatP.u.point, x, y); gl.uniform3f(splatP.u.color, dx, dy, 0); gl.uniform1f(splatP.u.radius, radius(C.SPLAT_RADIUS / 100));
    blit(velocity.write); velocity.swap();
    gl.uniform1i(splatP.u.uTarget, dye.read.attach(0)); gl.uniform3f(splatP.u.color, color.r, color.g, color.b);
    blit(dye.write); dye.swap();
  }

  // ---------- loop ----------
  let last = performance.now(), colorTimer = 0, visible = true, running = true;
  new IntersectionObserver(es => visible = es[0].isIntersecting).observe(area);
  function step(dt) {
    gl.disable(gl.BLEND);
    curlP.bind(); gl.uniform2f(curlP.u.texelSize, velocity.tsx, velocity.tsy); gl.uniform1i(curlP.u.uVelocity, velocity.read.attach(0)); blit(curl);
    vortP.bind(); gl.uniform2f(vortP.u.texelSize, velocity.tsx, velocity.tsy); gl.uniform1i(vortP.u.uVelocity, velocity.read.attach(0)); gl.uniform1i(vortP.u.uCurl, curl.attach(1));
    gl.uniform1f(vortP.u.curl, C.CURL); gl.uniform1f(vortP.u.dt, dt); blit(velocity.write); velocity.swap();
    divP.bind(); gl.uniform2f(divP.u.texelSize, velocity.tsx, velocity.tsy); gl.uniform1i(divP.u.uVelocity, velocity.read.attach(0)); blit(divergence);
    clearP.bind(); gl.uniform1i(clearP.u.uTexture, pressure.read.attach(0)); gl.uniform1f(clearP.u.value, C.PRESSURE); blit(pressure.write); pressure.swap();
    presP.bind(); gl.uniform2f(presP.u.texelSize, velocity.tsx, velocity.tsy); gl.uniform1i(presP.u.uDivergence, divergence.attach(0));
    for (let i = 0; i < C.PRESSURE_ITERATIONS; i++) { gl.uniform1i(presP.u.uPressure, pressure.read.attach(1)); blit(pressure.write); pressure.swap(); }
    gradP.bind(); gl.uniform2f(gradP.u.texelSize, velocity.tsx, velocity.tsy); gl.uniform1i(gradP.u.uPressure, pressure.read.attach(0)); gl.uniform1i(gradP.u.uVelocity, velocity.read.attach(1)); blit(velocity.write); velocity.swap();
    advP.bind(); gl.uniform2f(advP.u.texelSize, velocity.tsx, velocity.tsy); if (!linear) gl.uniform2f(advP.u.dyeTexelSize, velocity.tsx, velocity.tsy);
    const v = velocity.read.attach(0); gl.uniform1i(advP.u.uVelocity, v); gl.uniform1i(advP.u.uSource, v); gl.uniform1f(advP.u.dt, dt); gl.uniform1f(advP.u.dissipation, C.VELOCITY_DISSIPATION); blit(velocity.write); velocity.swap();
    if (!linear) gl.uniform2f(advP.u.dyeTexelSize, dye.tsx, dye.tsy);
    gl.uniform1i(advP.u.uVelocity, velocity.read.attach(0)); gl.uniform1i(advP.u.uSource, dye.read.attach(1)); gl.uniform1f(advP.u.dissipation, C.DENSITY_DISSIPATION); blit(dye.write); dye.swap();
  }
  function render() {
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.enable(gl.BLEND);
    dispP.bind(); if (C.SHADING) gl.uniform2f(dispP.u.texelSize, 1 / gl.drawingBufferWidth, 1 / gl.drawingBufferHeight);
    gl.uniform1i(dispP.u.shading, C.SHADING ? 1 : 0); gl.uniform1i(dispP.u.uTexture, dye.read.attach(0));
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight); gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.clear(gl.COLOR_BUFFER_BIT); gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
  }
  // gentle idle swirl so the effect is discoverable before the mouse arrives
  let idleT = 0;
  function frame() {
    if (!running) return;
    requestAnimationFrame(frame);
    const now = performance.now(), dt = Math.min((now - last) / 1000, .016666); last = now;
    if (!visible) return;
    resize();
    colorTimer += dt * C.COLOR_UPDATE_SPEED; if (colorTimer >= 1) { colorTimer %= 1; pointer.color = genColor(); }
    if (pointer.moved) { pointer.moved = false; splat(pointer.x, pointer.y, pointer.dx * C.SPLAT_FORCE, pointer.dy * C.SPLAT_FORCE, pointer.color); }
    else if (!pointer.seen) {
      idleT += dt;
      if (Math.floor(idleT * 2) !== Math.floor((idleT - dt) * 2)) {
        const a = idleT * .9, x = .5 + Math.cos(a) * .3, y = .32 + Math.sin(a * 1.3) * .14;
        splat(x, y, -Math.sin(a) * 260, Math.cos(a) * 200, genColor());
      }
    }
    step(dt); render();
  }
  frame();
  return { splat, stop() { running = false; } };
};
