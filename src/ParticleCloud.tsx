import * as THREE from "three";
import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";

type Props = { count?: number };

const vert = /* glsl */ `
uniform float uTime;
attribute float aScale;

// Simplex noise 3D implementation (sourced compact)
vec3 mod289(vec3 x){return x - floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x - floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);} 
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a1.xy, h.y);
  vec3 p2 = vec3(a0.zw, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m*m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

varying float vMix;
void main(){
  vec3 p = position;
  float n = snoise(p * 1.2 + vec3(0.0, 0.0, uTime * 0.08));
  vec3 disp = normalize(p) * n * 0.4 + vec3(
    snoise(p + uTime*0.05),
    snoise(p + 23.4 + uTime*0.05),
    snoise(p + 87.1 + uTime*0.05)
  ) * 0.12;
  vec3 pos = p + disp;
  vMix = clamp(0.5 + 0.5 * pos.x, 0.0, 1.0);
  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = aScale * 2.0;
  gl_PointSize *= 300.0 / -mvPosition.z;
}
`;

const frag = /* glsl */ `
precision highp float;
varying float vMix;

void main(){
  vec2 uv = gl_PointCoord - 0.5;
  float d = dot(uv, uv);
  float alpha = smoothstep(0.25, 0.0, d);
  vec3 warm = vec3(0.98, 0.48, 0.25);
  vec3 cool = vec3(0.24, 0.52, 1.0);
  vec3 color = mix(cool, warm, vMix);
  float glow = smoothstep(0.25, 0.0, d);
  gl_FragColor = vec4(color, alpha * glow);
}
`;

export default function ParticleCloud({ count = 15000 }: Props) {
  const points = useRef<THREE.Points>(null!);
  const material = useRef<THREE.ShaderMaterial>(null!);

  const { positions, scales } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const scl = new Float32Array(count);
    const ga = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < count; i++) {
      const t = i / count;
      const y = 1 - 2 * t;
      const r = Math.sqrt(1 - y * y);
      const phi = i * ga;
      const rad = 2.2 * (0.7 + 0.3 * Math.random());
      pos[3 * i + 0] = rad * r * Math.cos(phi);
      pos[3 * i + 1] = rad * y;
      pos[3 * i + 2] = rad * r * Math.sin(phi);
      scl[i] = 0.5 + Math.random() * 1.5;
    }
    return { positions: pos, scales: scl };
  }, [count]);

  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);

  useFrame((_, dt) => {
    uniforms.uTime.value += dt;
  });

  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute("aScale", new THREE.Float32BufferAttribute(scales, 1));
    return g;
  }, [positions, scales]);

  return (
    <points ref={points}>
      <primitive object={geom} attach="geometry" />
      <shaderMaterial
        ref={material}
        vertexShader={vert}
        fragmentShader={frag}
        uniforms={uniforms}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        transparent
      />
    </points>
  );
}
