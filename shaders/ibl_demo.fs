#version 100
#extension GL_EXT_shader_texture_lod : enable
precision mediump float;

const float PI = 3.14159265359;

//////////////////////////////
// CAMERA DATA
//////////////////////////////
uniform vec3 u_viewPos;


//////////////////////////////
// PBR SURFACE MODEL
//////////////////////////////
struct PBRSurfaceData
{
    vec3 position;
    vec3 normal;
    vec3 albedo;
    float metallic;
    float roughness;
};

/* Trowbridge-Reitz GGX model */
float NormalDistribution_GGX(float cosNH, float roughness)
{
    float roughnessSquared = roughness * roughness;
    float denominator = cosNH * cosNH * (roughnessSquared - 1.0) + 1.0;
    return roughnessSquared / (PI * denominator * denominator);
}

/* Height Correlated Smith View */
float View_HCSmith(float cosNL, float cosNV, float roughness)
{
    float Vv = cosNL * (cosNV * (1.0 - roughness) + roughness);
    float Vl = cosNV * (cosNL * (1.0 - roughness) + roughness);

    return 0.5 / (Vv + Vl);
}

/* Schlick approximation */
vec3 Fresnel_Schlick(float cosVH, vec3 F0)
{
    return F0 + (1.0 - F0) * pow(1.0 - cosVH, 5.0);
}

vec3 fresnelSchlickRoughness(float cosVH, vec3 F0, float roughness)
{
    return F0 + (max(vec3(1.0 - roughness), F0) - F0) * pow(clamp(1.0 - cosVH, 0.0, 1.0), 5.0);
}   

vec3 BRDF(
    vec3 viewDir,
    vec3 lightDir,
    vec3 halfwayDir,
    PBRSurfaceData surface)
{
    float cosNH = clamp(dot(surface.normal, halfwayDir), 1.0e-6, 1.0);
    float cosNL = clamp(dot(surface.normal, lightDir), 1.0e-6, 1.0);
    float cosNV = clamp(dot(surface.normal, viewDir), 1.0e-6, 1.0);
    float cosVH = clamp(dot(viewDir, halfwayDir), 1.0e-6, 1.0);

    vec3 F0 = mix(vec3(0.04), surface.albedo, surface.metallic);
    vec3 diffuseColor =  (1.0 - surface.metallic) * surface.albedo;

    float D = NormalDistribution_GGX(cosNH, surface.roughness);
    float V = View_HCSmith(cosNL, cosNV, surface.roughness);
    vec3 F = Fresnel_Schlick(cosVH, F0);

    vec3 specular = D * V * F;
    vec3 diffuse = (vec3(1.0) - F) * diffuseColor / PI;

    vec3 f = diffuse + specular;

    return f * cosNL;
}


//////////////////////////////
// MAIN
//////////////////////////////
uniform vec3 u_albedo;
uniform float u_roughness;
uniform float u_metallic;
uniform float u_brightness;

uniform sampler2D u_diffuseEnvironmentTex;
uniform sampler2D u_prefilterTexLevel0;
uniform sampler2D u_prefilterTexLevel1;
uniform sampler2D u_prefilterTexLevel2;
uniform sampler2D u_prefilterTexLevel3;
uniform sampler2D u_prefilterTexLevel4;
uniform sampler2D u_prefilterTexLevel5;
uniform sampler2D u_BRDFTex;

varying vec3 Pos;
varying vec3 Normal;
varying vec2 UV;


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
    // Camera object geometry
    vec3 normal = normalize(Normal);
    vec3 view = normalize(u_viewPos - Pos);
    vec3 reflected = reflect(-view, normal);

    vec2 longLatUV = NormalToUV(normal);
    vec2 reflectedUV = NormalToUV(reflected);

    // Lighting calculations
    vec3 F0 = mix(vec3(0.04), u_albedo, u_metallic);
    float cosNV = clamp(dot(normal, view), 0.0, 1.0);

    vec3 F = fresnelSchlickRoughness(cosNV, F0, u_roughness);
    vec3 kS = F;
    vec3 kD = 1.0 - kS;
    kD *= 1.0 - u_metallic;
    
    vec3 irradiance = texture2DLodEXT(u_diffuseEnvironmentTex, longLatUV, 0.0).rgb;
    irradiance *= u_brightness;
    vec3 diffuse = irradiance * u_albedo;

    vec3 prefilterSample0 = texture2DLodEXT(u_prefilterTexLevel0, reflectedUV, 0.0).rgb;
    vec3 prefilterSample1 = texture2DLodEXT(u_prefilterTexLevel1, reflectedUV, 0.0).rgb;
    vec3 prefilterSample2 = texture2DLodEXT(u_prefilterTexLevel2, reflectedUV, 0.0).rgb;
    vec3 prefilterSample3 = texture2DLodEXT(u_prefilterTexLevel3, reflectedUV, 0.0).rgb;
    vec3 prefilterSample4 = texture2DLodEXT(u_prefilterTexLevel4, reflectedUV, 0.0).rgb;
    vec3 prefilterSample5 = texture2DLodEXT(u_prefilterTexLevel5, reflectedUV, 0.0).rgb;

    
    float WSample0 = clamp(1.0 - abs(5.0 * u_roughness - 0.0), 0.0, 1.0);
    float WSample1 = clamp(1.0 - abs(5.0 * u_roughness - 1.0), 0.0, 1.0);
    float WSample2 = clamp(1.0 - abs(5.0 * u_roughness - 2.0), 0.0, 1.0);
    float WSample3 = clamp(1.0 - abs(5.0 * u_roughness - 3.0), 0.0, 1.0);
    float WSample4 = clamp(1.0 - abs(5.0 * u_roughness - 4.0), 0.0, 1.0);
    float WSample5 = clamp(1.0 - abs(5.0 * u_roughness - 5.0), 0.0, 1.0);

    vec3 prefilteredColor = u_brightness *(
        WSample0 * prefilterSample0 +
        WSample1 * prefilterSample1 +
        WSample2 * prefilterSample2 +
        WSample3 * prefilterSample3 +
        WSample4 * prefilterSample4 +
        WSample5 * prefilterSample5);

    vec2 brdf  = texture2DLodEXT(u_BRDFTex, vec2(cosNV, u_roughness), 0.0).rg;
    vec3 specular = prefilteredColor * (F * brdf.x + brdf.y);
    vec3 result =  (kD * diffuse + specular);

    // HDR and gamma mapping
    result = result / (result + vec3(1.0));
    result = pow(result, vec3(1.0/2.2)); 

    gl_FragColor = vec4(result, 1.0);
}
