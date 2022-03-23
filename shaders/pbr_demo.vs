#version 100

//////////////////////////////
// CAMERA DATA
//////////////////////////////
uniform mat3 u_NormalMatrix;
uniform mat4 u_ModelMatrix;
uniform mat4 u_ViewMatrix;
uniform mat4 u_ProjectionMatrix;

//////////////////////////////
// OBJECT DATA
//////////////////////////////
attribute vec3 a_Position;
attribute vec3 a_Normal;

varying vec3 Pos;
varying vec3 Normal;


void main()
{
    Pos = vec3(u_ModelMatrix * vec4(a_Position, 1.0));
    Normal = u_NormalMatrix * a_Normal;

    gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_ModelMatrix * vec4(a_Position, 1.0);
}