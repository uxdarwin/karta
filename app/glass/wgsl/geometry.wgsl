// Inward rounded extrusion: no positive contour offset at the widest cross section.
fn logo_sample(uv: vec2f) -> vec2f {
 let size = vec2i(textureDimensions(logo_sdf));
 let pixel = clamp(uv, vec2f(0), vec2f(1)) * vec2f(size) - .5;
 let base = vec2i(floor(pixel)); let fraction = fract(pixel);
 var distances: array<f32,4>; var coverage: array<f32,4>;
 for(var i = 0; i < 4; i++) {
   let offset = vec2i(i % 2, i / 2);
   let texel = textureLoad(logo_sdf, clamp(base + offset, vec2i(0), size - 1), 0);
   distances[i] = (texel.r * 255.0 * 256.0 + texel.g * 255.0) / 65535.0 * 2.0 - 1.0;
   coverage[i] = texel.b;
 }
 let distance = mix(mix(distances[0],distances[1],fraction.x),mix(distances[2],distances[3],fraction.x),fraction.y);
 let alpha = mix(mix(coverage[0],coverage[1],fraction.x),mix(coverage[2],coverage[3],fraction.x),fraction.y);
 let outside = length(max(abs(uv - .5) - .5, vec2f(0))) * 2.0;
 return vec2f(distance + outside, alpha);
}
fn world_scale() -> f32 { return params.logo_scale * min(params.resolution.x / params.resolution.y, 1.0); }
fn to_logo(point: vec3f) -> vec3f {
 let c=cos(params.yaw); let s=sin(params.yaw);
 return vec3f(c*point.x-s*point.z, point.y, s*point.x+c*point.z)/world_scale();
}
fn logo_uv(point: vec3f) -> vec2f { return vec2f(point.x, -point.y)*.5+.5; }
fn shape_distance(world: vec3f) -> f32 {
 let point=to_logo(world);
 let distance=logo_sample(logo_uv(point)).x;
 let bevel=params.bevel;
 let rounded=vec2f(distance+bevel, abs(point.z)-(params.depth*.5-bevel));
 return (min(max(rounded.x,rounded.y),0.0)+length(max(rounded,vec2f(0)))-bevel)*world_scale();
}
