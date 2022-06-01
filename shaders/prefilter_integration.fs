#version 100
#extension GL_EXT_shader_texture_lod : enable
precision mediump float;
const float PI = 3.14159265359;

uniform sampler2D u_EnvironmentTexture;
uniform float u_Roughness;

varying vec3 v_Position;
varying vec3 v_Normal;
varying vec2 v_UV;


float VanDerCorput(int n, int base)
{
    float invBase = 1.0 / float(base);
    float denom   = 1.0;
    float result  = 0.0;

    for(int i = 0; i < 32; ++i)
    {
        if(n > 0)
        {
            denom   = mod(float(n), 2.0);
            result += denom * invBase;
            invBase = invBase / 2.0;
            n       = int(float(n) / 2.0);
        }
    }

    return result;
}

vec2 HammersleyNoBitOps(int i, int N)
{
    return vec2(float(i)/float(N), VanDerCorput(i, 2));
}

vec3 ImportanceSampleGGX(vec2 Xi, vec3 N, float roughness)
{
    float a = roughness*roughness;

    float phi = 2.0 * PI * Xi.x;
    float cosTheta = sqrt((1.0 - Xi.y) / (1.0 + (a*a - 1.0) * Xi.y));
    float sinTheta = sqrt(1.0 - cosTheta*cosTheta);

    // from spherical coordinates to cartesian coordinates
    vec3 H;
    H.x = cos(phi) * sinTheta;
    H.y = sin(phi) * sinTheta;
    H.z = cosTheta;

    // from tangent-space vector to world-space sample vector
    vec3 up        = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
    vec3 tangent   = normalize(cross(up, N));
    vec3 bitangent = cross(N, tangent);

    vec3 sampleVec = tangent * H.x + bitangent * H.y + N * H.z;
    return normalize(sampleVec);
}  

vec3 LongLatToNormal(float theta, float phi)
{
    float cosTheta = cos(theta);
    float sinTheta = sin(theta);
    float cosPhi = cos(phi);
    float sinPhi = sin(phi);

    return vec3(
        cosTheta * sinPhi,
        sinTheta * sinPhi,
        cosPhi
    );
}

vec2 NormalToUV(vec3 normal)
{
    vec2 uv = vec2(0.0);

    uv.x =  normal.x != 0.0 ? atan(normal.y, normal.x) / (2.0 * PI) : 0.0;
    uv.y = acos(normal.z) / PI;

    uv.x = uv.x < 0.0 ? uv.x + 1.0 : uv.x;
    uv.y = uv.y < 0.0 ? uv.y + 1.0 : uv.y;

    return uv;
}


void main()
{
    vec3 normal = LongLatToNormal(v_UV.x * 2.0 * PI, v_UV.y * PI);
    vec3 reflection = normal;
    vec3 view = reflection;

    const int SAMPLE_COUNT = 512;
    float totalWeight = 0.0;   
    vec3 prefilteredColor = vec3(0.0);     
    for(int i = 0; i < SAMPLE_COUNT; ++i)
    {
        vec2 Xi = HammersleyNoBitOps(i, SAMPLE_COUNT);
        vec3 halfway  = ImportanceSampleGGX(Xi, normal, u_Roughness);
        vec3 light  = normalize(2.0 * dot(view, halfway) * halfway - view);
        vec2 lightUV = NormalToUV(light);

        float cosNL = max(dot(normal, light), 0.0);
        if(cosNL > 0.0)
        {
            vec3 sample = texture2DLodEXT(u_EnvironmentTexture, lightUV, 0.0).rgb;
            sample = pow(sample, vec3(2.2/1.0));
            prefilteredColor += sample * cosNL;
            totalWeight += cosNL;
        }
    }
    prefilteredColor = prefilteredColor / totalWeight;

    gl_FragColor = vec4(prefilteredColor, 1.0);
}