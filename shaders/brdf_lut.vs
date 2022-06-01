#version 100

attribute vec3 a_Position;
attribute vec3 a_Normal;
attribute vec2 a_UV;

varying vec3 v_Position;
varying vec3 v_Normal;
varying vec2 v_UV;


void main()
{
    v_Position = a_Position;
    v_Normal = a_Normal;
    v_UV = a_UV;
    gl_Position = vec4(a_Position, 1.0);
}