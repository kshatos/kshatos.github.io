#version 100
#extension GL_EXT_shader_texture_lod : enable
precision mediump float;
const float PI = 3.14159265359;

//////////////////////////////
// MAIN
//////////////////////////////
uniform sampler2D tex;
uniform float u_brightness;

varying vec3 Pos;
varying vec3 Normal;
varying vec3 UV;


vec2 NormalToUV(vec3 normal)
{
    vec2 uv = vec2(0.0);

    uv.x =  normal.x != 0.0 ? atan(-normal.z, normal.x) / (2.0 * PI) : 0.0;
    uv.y = acos(-normal.y) / PI;

    uv.x = uv.x < 0.0 ? uv.x + 1.0 : uv.x;
    uv.y = uv.y < 0.0 ? uv.y + 1.0 : uv.y;

    return uv;
}

void main()
{
    vec3 direction = normalize(Pos);
    vec2 uv = NormalToUV(direction);
    vec3 color = texture2DLodEXT(tex, uv, 0.0).rgb;
    color = pow(color, vec3(2.2/1.0));
    color *= u_brightness; 

    color = color / (color + vec3(1.0));
    color = pow(color, vec3(1.0/2.2)); 

    gl_FragColor = vec4(color, 1.0);
}