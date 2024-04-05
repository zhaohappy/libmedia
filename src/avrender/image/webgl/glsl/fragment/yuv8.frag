precision highp float;

varying vec4 v_color;
uniform sampler2D y_Sampler;
uniform sampler2D u_Sampler;
uniform sampler2D v_Sampler;
const mat4 YUV2RGB = mat4(
  1.1643828125, 0, 1.59602734375, -.87078515625,
  1.1643828125, -.39176171875, -.81296875, .52959375,
  1.1643828125, 2.017234375, 0, -1.081390625,
  0, 0, 0, 1
);

void main () {
  gl_FragColor = vec4(texture2D(y_Sampler, v_color.xy).x, texture2D(u_Sampler, v_color.xy).x, texture2D(v_Sampler, v_color.xy).x, 1) * YUV2RGB;
}
