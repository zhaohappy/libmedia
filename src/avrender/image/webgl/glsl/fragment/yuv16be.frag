precision highp float;

varying vec4 v_color;
uniform sampler2D y_Sampler;
uniform sampler2D u_Sampler;
uniform sampler2D v_Sampler;

uniform float v_max;

const mat4 YUV2RGB = mat4(
  1.1643828125, 0, 1.59602734375, -.87078515625,
  1.1643828125, -.39176171875, -.81296875, .52959375,
  1.1643828125, 2.017234375, 0, -1.081390625,
  0, 0, 0, 1
);

float swap(float x) {
  int value = int(x * 65535.0);
  int low = value & 0xff;
  int high = (value >> 8) & 0xff;
  value = (low << 8) | high;
  return float(value) / v_max;
}

void main () {

  float y = texture2D(y_Sampler, v_color.xy).x;
  float u = texture2D(u_Sampler, v_color.xy).x;
  float v = texture2D(v_Sampler, v_color.xy).x;

  y = swap(y);
  u = swap(u);
  v = swap(v);

  gl_FragColor = vec4(y, u, v, 1) * YUV2RGB;
}
