fn world_to_backdrop(point: vec3f) -> vec2f {
 let aspect=params.resolution.x/params.resolution.y;
 return vec2f(point.x/aspect,-point.y)*.5+.5;
}
fn backdrop_color(uv: vec2f) -> vec3f {
 return textureSampleLevel(backdrop,backdrop_sampler,clamp(uv,vec2f(0),vec2f(1)),0).rgb;
}
fn linear_color(srgb: vec3f) -> vec3f {
 return select(srgb/12.92,pow((srgb+.055)/1.055,vec3f(2.4)),srgb>vec3f(.04045));
}
fn srgb_color(linear: vec3f) -> vec3f {
 let value=max(linear,vec3f(0));
 return select(value*12.92,1.055*pow(value,vec3f(1.0/2.4))-.055,value>vec3f(.0031308));
}
fn refracted_backdrop(position: vec3f, direction: vec3f, original_uv: vec2f) -> vec4f {
 // The backdrop is an independent screen-aligned plane behind the volume, not a scene floor.
 let depth=-1.4;
 let travel=(depth-position.z)/min(direction.z,-.025);
 let projected=world_to_backdrop(position+direction*travel);
 let uv=mix(original_uv,projected,params.distortion);
 let texel=textureSampleLevel(backdrop,backdrop_sampler,clamp(uv,vec2f(0),vec2f(1)),0);
 return vec4f(linear_color(texel.rgb),texel.a);
}
