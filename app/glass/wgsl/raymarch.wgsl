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
