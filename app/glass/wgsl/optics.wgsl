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
