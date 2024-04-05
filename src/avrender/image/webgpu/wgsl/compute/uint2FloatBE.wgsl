
struct Meta {
  max: u32,
  width: u32,
  height: u32
};

@group(0) @binding(0) var<uniform> metaData: Meta;
@group(0) @binding(1) var input: texture_2d<u32>;
@group(0) @binding(2) var output: texture_storage_2d<r32float, write>;

@compute @workgroup_size(8, 8) fn main(
  @builtin(workgroup_id) workgroup_id: vec3<u32>,
  @builtin(local_invocation_id) local_invocation_id: vec3<u32>
) {
  var x = workgroup_id.x * 8 + local_invocation_id.x;
  var y = workgroup_id.y * 8 + local_invocation_id.y;
  if (x < metaData.width && y < metaData.height) {
    var value: u32 = textureLoad(input, vec2(x, y), 0).x;
    var low = value & 0xff;
    var high = (value >> 8) & 0xff;
    value = (low << 8) | high;
    var value_no: f32 = f32(value) / f32(metaData.max);
    textureStore(output, vec2(x, y), vec4(value_no, 0, 0, 0));
  }
}