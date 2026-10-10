struct Parameters {
 resolution: vec2f, logo_scale: f32, depth: f32,
 bevel: f32, ior: f32, roughness: f32, absorption: f32,
 highlight: f32, distortion: f32, debug_mode: f32, overlay: f32,
 yaw: f32, time: f32, padding: vec2f,
 tint: vec4f,
}
@group(0) @binding(0) var<uniform> params: Parameters;
@group(0) @binding(1) var logo_sdf: texture_2d<f32>;
@group(0) @binding(2) var backdrop: texture_2d<f32>;
@group(0) @binding(3) var backdrop_sampler: sampler;
