// Generated; edit files in wgsl/.
// ---- bindings ----
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

// ---- geometry ----
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

// ---- raymarch ----
const EPSILON: f32 = .00003;
fn normal_at(point: vec3f) -> vec3f {
 // Central differences reduce corner bias versus the previous tetrahedral estimate.
 let e=.0005*world_scale();
 return normalize(vec3f(
 shape_distance(point+vec3f(e,0,0))-shape_distance(point-vec3f(e,0,0)),
 shape_distance(point+vec3f(0,e,0))-shape_distance(point-vec3f(0,e,0)),
 shape_distance(point+vec3f(0,0,e))-shape_distance(point-vec3f(0,0,e))));
}
fn march(origin: vec3f, direction: vec3f, sign: f32, limit: f32) -> f32 {
 var travel=0.0;
 for(var step=0;step<160;step++) {
   let distance=shape_distance(origin+direction*travel)*sign;
   if(distance<EPSILON){return travel;}
   travel+=max(distance*.75,EPSILON*.25);
   if(travel>limit){break;}
 }
 return -1.0;
}
fn bounds_hit(origin: vec3f, direction: vec3f) -> vec2f {
 // Conservatively rotated box bounds; ray traversal starts just before the logo.
 let scale=world_scale();
 let radius=scale*(1.0+params.depth);
 let bounds=vec3f(radius,scale*1.01,radius);
 let inv=1.0/select(vec3f(.000001),direction,abs(direction)>vec3f(.000001));
 let a=(-bounds-origin)*inv; let b=(bounds-origin)*inv;
 let near=min(a,b);let far=max(a,b);
 return vec2f(max(max(near.x,near.y),near.z),min(min(far.x,far.y),far.z));
}

// ---- compositing ----
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

// ---- optics ----
fn fresnel(cosine: f32) -> f32 {
 if(abs(params.ior-1.0)<.00001){return 0.0;}
 let base=pow((params.ior-1.0)/(params.ior+1.0),2.0);
 return base+(1.0-base)*pow(1.0-clamp(cosine,0.0,1.0),5.0);
}
fn reflection_proxy(direction: vec3f) -> vec3f {
 // Independent neutral studio softboxes. Two long reflection strips reveal the rolled bevel.
 let blur=.035+params.roughness*.25;
 let key=exp(-pow((direction.x+.38)/(.10+blur),2.0))*smoothstep(-.25,.35,direction.z);
 let rim=exp(-pow((direction.x-.62)/(.07+blur),2.0))*smoothstep(-.55,.25,direction.z);
 let overhead=exp(-pow((direction.y-.7)/(.14+blur),2.0))*smoothstep(-.4,.1,direction.z);
 let ambient=mix(.035,.38,clamp(direction.y*.5+.5,0.0,1.0));
 return vec3f(ambient)+vec3f(8.0)*key+vec3f(5.0)*rim+vec3f(3.0)*overhead;
}

fn glass_color(origin: vec3f, direction: vec3f, point: vec3f, normal: vec3f, uv: vec2f) -> vec4f {
 let source=textureSampleLevel(backdrop,backdrop_sampler,uv,0);
 if(abs(params.ior-1.0)<.00001){return vec4f(source.rgb*source.a,source.a);}
 let front_fresnel=fresnel(dot(-direction,normal));
 var inside=refract(direction,normal,1.0/params.ior);
 var position=point; var traveled=0.0;
 var transmission=1.0; var internal=vec3f(0); var final_color=linear_color(source.rgb); var final_alpha=source.a;
 // Two interfaces plus one possible total-internal-reflection bounce.
 for(var bounce=0;bounce<3;bounce++) {
   let start=position+inside*EPSILON*4.0;
   let exit=march(start,inside,-1.0,world_scale()*3.0);
   if(exit<0.0){break;}
   traveled+=exit; position=start+inside*exit;
   let inward=-normal_at(position);
   let outgoing=refract(inside,inward,params.ior);
   if(dot(outgoing,outgoing)<.01){inside=reflect(inside,inward);continue;}
   let back_fresnel=fresnel(dot(-inside,inward));
   let transmitted=refracted_backdrop(position,outgoing,uv);
   final_color=transmitted.rgb; final_alpha=transmitted.a;
   internal+=reflection_proxy(reflect(inside,inward))*back_fresnel*.1*params.highlight;
   transmission*=1.0-back_fresnel;
   break;
 }
 let absorption=exp(-(vec3f(1)-params.tint.rgb)*params.absorption*traveled/world_scale()*12.0);
 let reflected=reflection_proxy(normalize(reflect(direction,normal)+vec3f(point.xy*.45,0.0)));
 let alpha=final_alpha*(1.0-front_fresnel)+front_fresnel;
 let body=final_color*absorption*(.98+.02*transmission)*final_alpha+internal;
 let premultiplied=body*(1.0-front_fresnel)+reflected*front_fresnel*params.highlight;
 let color=clamp(srgb_color(premultiplied/max(alpha,.00001)),vec3f(0),vec3f(1));
 return vec4f(color*alpha,alpha);
}

// ---- entry ----
@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
 let aspect=params.resolution.x/params.resolution.y;
 let screen=vec2f((uv.x-.5)*2.0*aspect,(.5-uv.y)*2.0);
 let front=vec3f(screen,0);let sample=logo_sample(logo_uv(front/world_scale()));
 let mode=i32(params.debug_mode+.5);
 if(mode==1){return vec4f(vec3f(.18,.24,.2)*sample.y,sample.y);}
 if(mode==2){
   let bands=.5+.5*cos(sample.x*600.0);
   let inside=select(vec3f(.24,.42,.62),vec3f(.78,.47,.32),sample.x<0.0);
   let contour=1.0-smoothstep(0.0,.002,abs(sample.x));
   return vec4f(mix(inside*(.7+.3*bands),vec3f(1),contour),1);
 }
 let origin=vec3f(screen,3.0);let direction=vec3f(0,0,-1);
 let bounds=bounds_hit(origin,direction);
 var result=vec4f(0);
 if(bounds.y>=max(bounds.x,0.0)) {
   let start=origin+direction*max(bounds.x-.002,0.0);
   let hit=march(start,direction,1.0,bounds.y-bounds.x+.004);
   if(hit>=0.0){
     let point=start+direction*hit;let normal=normal_at(point);
     if(mode==3){
       let diffuse=.3+.7*max(dot(normal,normalize(vec3f(-.5,.7,1))),0.0);
       result=vec4f(vec3f(.45,.53,.47)*diffuse,1);
     }else{
       result=glass_color(origin,direction,point,normal,uv);
     }
   }
 }
 // Front-view coverage comes from the source raster: antialiasing cannot inflate the logo.
 if(abs(params.yaw)<.00001){result=vec4f(result.rgb*sample.y,result.a*sample.y);}
 // Exact source contour overlay in pink; agreement appears on the geometry boundary.
 if(params.overlay>.5){
   let width=2.0/min(params.resolution.x,params.resolution.y)/world_scale();
   let line=1.0-smoothstep(width*.25,width,abs(sample.x));
   result=vec4f(mix(result.rgb,vec3f(.95,.22,.55)*line,line),max(result.a,line));
 }
 return result;
}
