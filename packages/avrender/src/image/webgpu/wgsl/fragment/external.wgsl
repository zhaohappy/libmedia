
@group(0) @binding(1) var eTexture: texture_external;
@group(0) @binding(2) var s: sampler;

@fragment
fn main(@location(0) in_texcoord: vec4<f32>) -> @location(0) vec4<f32> {
  return textureSampleBaseClampToEdge(eTexture, s, in_texcoord.xy);
}