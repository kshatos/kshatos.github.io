#version 100
precision mediump float;
const float PI = 3.14159265359;

uniform sampler2D u_EnvironmentTexture;

varying vec3 v_Position;
varying vec3 v_Normal;
varying vec2 v_UV;


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

vec3 NormalHemisphereSample(float theta, float phi, vec3 normal)
{   
    vec3 up        = abs(normal.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
    vec3 tangent   = normalize(cross(up, normal));
    vec3 bitangent = cross(normal, tangent);

    vec3 H = LongLatToNormal(theta, phi);

    vec3 sampleVec = tangent * H.x + bitangent * H.y + normal * H.z;

    return sampleVec;
}


void main()
{
    vec3 normal = LongLatToNormal(v_UV.x * 2.0 * PI, v_UV.y * PI);

    const float NX = 150.0;
    const float NY = 80.0;
    const float dTheta = 2.0 * PI / NX;
    const float dPhi = 1.0 * PI / NY;

    vec3 irradiance = vec3(0.0);
    for (float phi=0.5*PI; phi < PI; phi += dPhi)
    {
        for (float theta=0.0; theta < 2.0 * PI; theta += dTheta)
        {
            vec3 light = -NormalHemisphereSample(theta, phi, normal);
            float cosNL = dot(light, normal);
            cosNL = cosNL > 0.0 ? cosNL : 0.0;
            vec2 sampleUV = NormalToUV(light);
            vec3 sample = texture2D(u_EnvironmentTexture, sampleUV).rgb;
            sample = pow(sample, vec3(2.2/1.0));
            irradiance +=  sample * cosNL * sin(phi) * dTheta * dPhi;
        }
    }
    irradiance /= PI;

    gl_FragColor = vec4(irradiance, 1.0);
}