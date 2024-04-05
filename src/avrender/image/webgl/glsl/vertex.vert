precision highp float;

attribute vec3 point;
attribute vec4 color;
varying vec4 v_color;

uniform mat4 rotateMatrix;

void main(void){
  gl_Position = rotateMatrix * vec4(point, 1.0);
  v_color = color;
}
