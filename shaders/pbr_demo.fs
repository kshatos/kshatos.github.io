#version 100
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
// LIGHTING MODEL
//////////////////////////////
struct PointLight
{
    vec3 position;
    float radiantFlux;
    float range;
    vec3 color;
};

float PunctualLightAttenuation(float separation, float range)
{
    float separation2 = separation * separation;
    float relativeRange = min(1.0, separation / range);
    float relativeRange4 = relativeRange * relativeRange * relativeRange * relativeRange;

    return 1.0 / (separation2 + 1.0e-6) * (1.0 - relativeRange4);
}

vec3 PointLightReflectedRadiance(
    PointLight light,
    PBRSurfaceData surface)
{
    float separation = length(light.position - surface.position);
    vec3 viewDir = normalize(u_viewPos - surface.position);
    vec3 lightDir = normalize(light.position - surface.position);
    vec3 halfwayDir = normalize(lightDir + viewDir);

    vec3 f = BRDF(viewDir, lightDir, halfwayDir, surface);
    vec3 L0 = light.color * light.radiantFlux / (4.0 * PI);
    float A = PunctualLightAttenuation(separation, light.range);

    return L0 * A * f;
}


//////////////////////////////
// MAIN
//////////////////////////////
uniform vec3 u_albedo;
uniform float u_roughness;
uniform float u_metallic;

varying vec3 Pos;
varying vec3 Normal;


void main()
{
    PointLight light;
    light.radiantFlux = 3000.0;
    light.range = 100.0;
    light.color = vec3(1.0, 1.0, 1.0);

    PBRSurfaceData surface;
    surface.position = Pos;
    surface.normal = normalize(Normal);
    surface.albedo = u_albedo;
    surface.metallic = u_metallic;
    surface.roughness = u_roughness * u_roughness;

    vec3 result = vec3(0.0, 0.0, 0.0);

    light.position = vec3(0.0, -1.0, 10.0);
    result = PointLightReflectedRadiance(light, surface);

    light.position = vec3(1.0, 1.0, 10.0);
    result += PointLightReflectedRadiance(light, surface);

    light.position = vec3(-1.0, 1.0, 10.0);
    result += PointLightReflectedRadiance(light, surface);

    result += 0.2 * surface.albedo;

    result = result / (result + vec3(1.0));
    result = pow(result, vec3(1.0/2.2)); 

    gl_FragColor = vec4(result, 1.0);
}