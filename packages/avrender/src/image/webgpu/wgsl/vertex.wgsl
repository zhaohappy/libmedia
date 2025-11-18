struct PositionColorInput {
    @location(0) in_position_3d: vec3<f32>,
    @location(1) in_color_rgba: vec4<f32>
};

struct PositionColorOutput {
    @builtin(position) coords_output: vec4<f32>,
    @location(0) color_output: vec4<f32>
};

struct RotateMatrix {
    matrix: mat4x4<f32>
};

@group(0) @binding(0) var<uniform> rotateMatrix: RotateMatrix;

@vertex
fn main(input: PositionColorInput) -> PositionColorOutput {
    var output: PositionColorOutput;
    output.color_output = input.in_color_rgba;
    output.coords_output = rotateMatrix.matrix * vec4<f32>(input.in_position_3d, 1.0);
    return output;
}