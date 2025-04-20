
struct Meta {
  max: u32,
  width: u32,
  height: u32
};

@group(0) @binding(0) var<uniform> metaData: Meta;
@group(0) @binding(1) var input: texture_2d<u32>;
@group(0) @binding(2) var output: texture_storage_2d<${out_format}, write>;

fn byte_swap_u32(x: u32) -> u32 {
  var low = x & 0xff;
  var high = (x >> 8) & 0xff;
  return (low << 8) | high;
}

fn byte_swap_vec4_u32(v: vec4<u32>) -> vec4<u32> {
  return vec4<u32>(
    byte_swap_u32(v.r),
    byte_swap_u32(v.g),
    byte_swap_u32(v.b),
    byte_swap_u32(v.a)
  );
}

@compute @workgroup_size(8, 8) fn main(
  @builtin(workgroup_id) workgroup_id: vec3<u32>,
  @builtin(local_invocation_id) local_invocation_id: vec3<u32>
) {
  var x = workgroup_id.x * 8 + local_invocation_id.x;
  var y = workgroup_id.y * 8 + local_invocation_id.y;
  if (x < metaData.width && y < metaData.height) {
    var value: vec4<u32> = textureLoad(input, vec2(x, y), 0);
    var value_unorm: vec4<f32> = vec4<f32>(byte_swap_vec4_u32(value) >> vec4<u32>(${shift})) / vec4<f32>(f32(metaData.max));
    textureStore(output, vec2(x, y), value_unorm);
  }
}