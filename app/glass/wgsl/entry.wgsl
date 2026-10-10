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
