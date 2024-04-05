const YUV2RGB: mat4x4<f32> = mat4x4(
  1.1643828125, 0, 1.59602734375, -0.87078515625,
  1.1643828125, -0.39176171875, -0.81296875, 0.52959375,
  1.1643828125, 2.017234375, 0, -01.081390625,
  0, 0, 0, 1
);

@group(0) @binding(1) var yTexture: texture_2d<f32>;
@group(0) @binding(2) var uTexture: texture_2d<f32>;
@group(0) @binding(3) var vTexture: texture_2d<f32>;
@group(0) @binding(4) var s: sampler;

@fragment
fn main(@location(0) in_texcoord: vec4<f32>) -> @location(0) vec4<f32> {
  return vec4(textureSample(yTexture, s, in_texcoord.xy).x, textureSample(uTexture, s, in_texcoord.xy).x, textureSample(vTexture, s, in_texcoord.xy).x, 1) * YUV2RGB;
}