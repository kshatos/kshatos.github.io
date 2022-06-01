

function RenderData(gl)
{
    // Mesh
    this.mainSphere = new Model(gl);
    this.outerSphere = new Model(gl);
    this.plane = new Model(gl);

    // Shaders
    this.IBLShader = new ShaderProgram(gl);
    this.outerSphereShader = new ShaderProgram(gl);
    this.diffuseIntegrationShader = new ShaderProgram(gl);
    this.prefilterIntegrationShader = new ShaderProgram(gl);
    this.brdfLUTShader = new ShaderProgram(gl);

    // Texture
    this.evironmentRadianceTex = new Texture2D(gl);
    this.diffuseTex = new Texture2D(gl);
    this.prefilterTex = new Texture2D(gl);
    this.prefilterTexLevel0 = new Texture2D(gl);
    this.prefilterTexLevel1 = new Texture2D(gl);
    this.prefilterTexLevel2 = new Texture2D(gl);
    this.prefilterTexLevel3 = new Texture2D(gl);
    this.prefilterTexLevel4 = new Texture2D(gl);
    this.prefilterTexLevel5 = new Texture2D(gl);
    this.BRDFTex = new Texture2D(gl);

    // Camera
    this.camera = new PerspectiveCamera();
}

function rotateFromZUpToYUp(transform)
{
    quat.rotateX(transform.rotation, transform.rotation, 0.5 * Math.PI);
}

function initializeUniformData(renderData)
{
    renderData.albedo = [0.0, 0.0, 0.0]
    renderData.metallic = 0.0;
    renderData.roughness = 0.0;

    vec3.add(
        renderData.camera.transform.position,
        renderData.camera.transform.position,
        [0.0, 0.0, 10.0]);
}

function initializeUI(renderData)
{
    var albedoRSlider = document.getElementById("albedoRSlider");
    renderData.albedo[0] = albedoRSlider.value;
    albedoRSlider.oninput = function() {
        renderData.albedo[0] = albedoRSlider.value;
    }

    var albedoGSlider = document.getElementById("albedoGSlider");
    renderData.albedo[1] = albedoGSlider.value;
    albedoGSlider.oninput = function() {
        renderData.albedo[1] = albedoGSlider.value;
    }

    var albedoBSlider = document.getElementById("albedoBSlider");
    renderData.albedo[2] = albedoBSlider.value;
    albedoBSlider.oninput = function() {
        renderData.albedo[2] = albedoBSlider.value;
    }

    var metallicSlider = document.getElementById("metallicSlider");
    renderData.metallic = metallicSlider.value;
    metallicSlider.oninput = function() {
        renderData.metallic = metallicSlider.value;
    }

    var roughnessSlider = document.getElementById("roughnessSlider");
    renderData.roughness = roughnessSlider.value;
    roughnessSlider.oninput = function() {
        renderData.roughness = roughnessSlider.value;
    }

    var brightnessSlider = document.getElementById("brightnessSlider");
    renderData.brightness = brightnessSlider.value;
    brightnessSlider.oninput = function() {
        renderData.brightness = brightnessSlider.value;
    }
}

function drawOuterSphere(gl, renderData)
{
    let shader = renderData.outerSphereShader;
    let model = renderData.outerSphere;

    if (shader.program == null) { return; }

    shader.use();
    renderData.evironmentRadianceTex.use(gl.TEXTURE0);

    let modelMatrix = model.transform.getMatrix();
    let normalMatrix = normalFromModelMatrix(modelMatrix);

    normalMatLoc = gl.getUniformLocation(shader.program, "u_NormalMatrix");
    gl.uniformMatrix3fv(normalMatLoc, false, normalMatrix);

    modelMatLoc = gl.getUniformLocation(shader.program, "u_ModelMatrix");
    gl.uniformMatrix4fv(modelMatLoc, false, modelMatrix);
    
    viewMatLoc = gl.getUniformLocation(shader.program, "u_ViewMatrix");
    gl.uniformMatrix4fv(viewMatLoc, false, renderData.camera.viewMatrix);

    projMatLoc = gl.getUniformLocation(shader.program, "u_ProjectionMatrix");
    gl.uniformMatrix4fv(projMatLoc, false, renderData.camera.projectionMatrix);

    brightnessLoc = gl.getUniformLocation(shader.program, "u_brightness");
    gl.uniform1f(brightnessLoc, renderData.brightness);

    textureLoc = gl.getUniformLocation(shader.program, "tex");
    gl.uniform1i(textureLoc, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.mesh.indexBuffer);
    gl.bindBuffer(gl.ARRAY_BUFFER, model.mesh.vertexBuffer);

    positionID = 0;
    normalID = 1
    uvID = 2;

    gl.vertexAttribPointer(positionID, 3, gl.FLOAT, false, 4*8, 0);
    gl.enableVertexAttribArray(positionID);

    gl.vertexAttribPointer(normalID, 3, gl.FLOAT, false, 4*8, 4*3);
    gl.enableVertexAttribArray(normalID);

    gl.vertexAttribPointer(uvID, 2, gl.FLOAT, false, 4*8, 4*6);
    gl.enableVertexAttribArray(uvID);

    gl.drawElements(gl.TRIANGLES, sphereMesh.indices.length, gl.UNSIGNED_SHORT, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
}

function drawMainSphere(gl, renderData)
{
    let shader = renderData.IBLShader;
    let model = renderData.mainSphere;

    if (shader.program == null) { return; }

    shader.use();
    renderData.diffuseTex.use(gl.TEXTURE0);
    renderData.BRDFTex.use(gl.TEXTURE1);
    renderData.prefilterTexLevel0.use(gl.TEXTURE2);
    renderData.prefilterTexLevel1.use(gl.TEXTURE3);
    renderData.prefilterTexLevel2.use(gl.TEXTURE4);
    renderData.prefilterTexLevel3.use(gl.TEXTURE5);
    renderData.prefilterTexLevel4.use(gl.TEXTURE6);
    renderData.prefilterTexLevel5.use(gl.TEXTURE7);

    let modelMatrix = model.transform.getMatrix();
    let normalMatrix = normalFromModelMatrix(modelMatrix);

    normalMatLoc = gl.getUniformLocation(shader.program, "u_NormalMatrix");
    gl.uniformMatrix3fv(normalMatLoc, false, normalMatrix);

    modelMatLoc = gl.getUniformLocation(shader.program, "u_ModelMatrix");
    gl.uniformMatrix4fv(modelMatLoc, false, modelMatrix);
    
    viewMatLoc = gl.getUniformLocation(shader.program, "u_ViewMatrix");
    gl.uniformMatrix4fv(viewMatLoc, false, renderData.camera.viewMatrix);

    projMatLoc = gl.getUniformLocation(shader.program, "u_ProjectionMatrix");
    gl.uniformMatrix4fv(projMatLoc, false, renderData.camera.projectionMatrix);

    cameraPosLoc = gl.getUniformLocation(shader.program, "u_viewPos");
    gl.uniform3fv(cameraPosLoc, renderData.camera.transform.position);

    albedoLoc = gl.getUniformLocation(shader.program, "u_albedo");
    gl.uniform3fv(albedoLoc, renderData.albedo);

    metallicLoc = gl.getUniformLocation(shader.program, "u_metallic");
    gl.uniform1f(metallicLoc, renderData.metallic);

    roughnessLoc = gl.getUniformLocation(shader.program, "u_roughness");
    gl.uniform1f(roughnessLoc, renderData.roughness);

    brightnessLoc = gl.getUniformLocation(shader.program, "u_brightness");
    gl.uniform1f(brightnessLoc, renderData.brightness);

    diffuseTexLoc = gl.getUniformLocation(shader.program, "u_diffuseEnvironmentTex");
    gl.uniform1i(diffuseTexLoc, 0);

    brdftexLoc = gl.getUniformLocation(shader.program, "u_BRDFTex");
    gl.uniform1i(brdftexLoc, 1);

    prefilterTexLoc = gl.getUniformLocation(shader.program, "u_prefilterTexLevel0");
    gl.uniform1i(prefilterTexLoc, 2);

    prefilterTexLoc = gl.getUniformLocation(shader.program, "u_prefilterTexLevel1");
    gl.uniform1i(prefilterTexLoc, 3);

    prefilterTexLoc = gl.getUniformLocation(shader.program, "u_prefilterTexLevel2");
    gl.uniform1i(prefilterTexLoc, 4);

    prefilterTexLoc = gl.getUniformLocation(shader.program, "u_prefilterTexLevel3");
    gl.uniform1i(prefilterTexLoc, 5);

    prefilterTexLoc = gl.getUniformLocation(shader.program, "u_prefilterTexLevel4");
    gl.uniform1i(prefilterTexLoc, 6);

    prefilterTexLoc = gl.getUniformLocation(shader.program, "u_prefilterTexLevel5");
    gl.uniform1i(prefilterTexLoc, 7);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.mesh.indexBuffer);
    gl.bindBuffer(gl.ARRAY_BUFFER, model.mesh.vertexBuffer);

    let positionID = 0;
    let normalID = 1
    let uvID = 2;

    gl.vertexAttribPointer(positionID, 3, gl.FLOAT, false, 4*8, 0);
    gl.enableVertexAttribArray(positionID);

    gl.vertexAttribPointer(normalID, 3, gl.FLOAT, false, 4*8, 4*3);
    gl.enableVertexAttribArray(normalID);

    gl.vertexAttribPointer(uvID, 2, gl.FLOAT, false, 4*8, 4*6);
    gl.enableVertexAttribArray(uvID);

    gl.drawElements(gl.TRIANGLES, sphereMesh.indices.length, gl.UNSIGNED_SHORT, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
}

function drawScene(gl, renderData)
{
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT || gl.DEPTH_BUFFER_BIT);

    drawOuterSphere(gl, renderData)
    drawMainSphere(gl, renderData);
}

function integrateDiffuse(gl, renderData)
{
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT || gl.DEPTH_BUFFER_BIT);

    let shader = renderData.diffuseIntegrationShader;
    let model = renderData.plane;

    if (shader.program == null) { return; }

    shader.use();
    renderData.evironmentRadianceTex.use(gl.TEXTURE0);

    envTexLoc = gl.getUniformLocation(shader.program, "u_EnvironmentTexture");
    gl.uniform1i(envTexLoc, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.mesh.indexBuffer);
    gl.bindBuffer(gl.ARRAY_BUFFER, model.mesh.vertexBuffer);

    let positionID = 0;
    let normalID = 1
    let uvID = 2;

    gl.vertexAttribPointer(positionID, 3, gl.FLOAT, false, 4*8, 0);
    gl.enableVertexAttribArray(positionID);

    gl.vertexAttribPointer(normalID, 3, gl.FLOAT, false, 4*8, 4*3);
    gl.enableVertexAttribArray(normalID);

    gl.vertexAttribPointer(uvID, 2, gl.FLOAT, false, 4*8, 4*6);
    gl.enableVertexAttribArray(uvID);

    gl.drawElements(gl.TRIANGLES, planeMesh.indices.length, gl.UNSIGNED_SHORT, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
}

function integratePrefilter(gl, renderData, roughness)
{
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT || gl.DEPTH_BUFFER_BIT);

    let shader = renderData.prefilterIntegrationShader;
    let model = renderData.plane;

    if (shader.program == null) { return; }

    shader.use();
    renderData.evironmentRadianceTex.use(gl.TEXTURE0);

    envTexLoc = gl.getUniformLocation(shader.program, "u_EnvironmentTexture");
    gl.uniform1i(envTexLoc, 0);

    roughnessLoc = gl.getUniformLocation(shader.program, "u_Roughness");
    gl.uniform1f(roughnessLoc, roughness);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.mesh.indexBuffer);
    gl.bindBuffer(gl.ARRAY_BUFFER, model.mesh.vertexBuffer);

    let positionID = 0;
    let normalID = 1
    let uvID = 2;

    gl.vertexAttribPointer(positionID, 3, gl.FLOAT, false, 4*8, 0);
    gl.enableVertexAttribArray(positionID);

    gl.vertexAttribPointer(normalID, 3, gl.FLOAT, false, 4*8, 4*3);
    gl.enableVertexAttribArray(normalID);

    gl.vertexAttribPointer(uvID, 2, gl.FLOAT, false, 4*8, 4*6);
    gl.enableVertexAttribArray(uvID);

    gl.drawElements(gl.TRIANGLES, planeMesh.indices.length, gl.UNSIGNED_SHORT, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
}

function calculateBRDFLUT(gl, renderData)
{
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT || gl.DEPTH_BUFFER_BIT);

    let shader = renderData.brdfLUTShader;
    let model = renderData.plane;

    if (shader.program == null) { return; }

    shader.use();

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.mesh.indexBuffer);
    gl.bindBuffer(gl.ARRAY_BUFFER, model.mesh.vertexBuffer);

    let positionID = 0;
    let normalID = 1
    let uvID = 2;

    gl.vertexAttribPointer(positionID, 3, gl.FLOAT, false, 4*8, 0);
    gl.enableVertexAttribArray(positionID);

    gl.vertexAttribPointer(normalID, 3, gl.FLOAT, false, 4*8, 4*3);
    gl.enableVertexAttribArray(normalID);

    gl.vertexAttribPointer(uvID, 2, gl.FLOAT, false, 4*8, 4*6);
    gl.enableVertexAttribArray(uvID);

    gl.drawElements(gl.TRIANGLES, planeMesh.indices.length, gl.UNSIGNED_SHORT, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
}



function main()
{
    // Setup webGL context
    const canvas = document.querySelector("#glCanvas");
    const gl = canvas.getContext("webgl");
  
    if (gl === null) {
      alert("Unable to initialize WebGL. Your browser or machine may not support it.");
      return;
    }

    gl.getExtension('EXT_shader_texture_lod');
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.cullFace(gl.BACK);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    // Initialize render data
    renderData = new RenderData(gl);

    renderData.plane.mesh.loadMeshFromObject(planeMesh);

    renderData.outerSphere.mesh.loadMeshFromObject(invertedSphereMesh);
    rotateFromZUpToYUp(renderData.outerSphere.transform);
    renderData.outerSphere.transform.scale = vec3.fromValues(30.0, 30.0, 30.0);

    renderData.mainSphere.mesh.loadMeshFromObject(sphereMesh);
    rotateFromZUpToYUp(renderData.mainSphere.transform);
    renderData.mainSphere.transform.scale = vec3.fromValues(2.0, 2.0, 2.0);

    loadTextFile("\\shaders\\prefilter_integration.vs", function(vertexSource) {
        loadTextFile("\\shaders\\prefilter_integration.fs", function(fragmentSource) {
            renderData.prefilterIntegrationShader.compileFromSource(vertexSource, fragmentSource);
        });
    });

    loadTextFile("\\shaders\\ibl_demo.vs", function(vertexSource) {
        loadTextFile("\\shaders\\ibl_demo.fs", function(fragmentSource) {
            renderData.IBLShader.compileFromSource(vertexSource, fragmentSource);
        });
    });

    loadTextFile("\\shaders\\projection.vs", function(vertexSource) {
        loadTextFile("\\shaders\\projection.fs", function(fragmentSource) {
            renderData.outerSphereShader.compileFromSource(vertexSource, fragmentSource);
        });
    });

    loadTextFile("\\shaders\\brdf_lut.vs", function(vertexSource) {
        loadTextFile("\\shaders\\brdf_lut.fs", function(fragmentSource) {
            renderData.brdfLUTShader.compileFromSource(vertexSource, fragmentSource);
            renderData.BRDFTex.resize(1024, 1024);
            renderData.BRDFTex.renderTo(gl, function() { calculateBRDFLUT(gl, renderData); });
            renderData.BRDFTex.generateMipmaps();
        });
    });

    loadTextFile("\\shaders\\diffuse_integration.vs", function(vertexSource) {
        loadTextFile("\\shaders\\diffuse_integration.fs", function(fragmentSource) {
            renderData.diffuseIntegrationShader.compileFromSource(vertexSource, fragmentSource);

            const environmentImage = new Image();
            environmentImage.onload = function() {
                renderData.evironmentRadianceTex.loadFromImage(environmentImage);
                renderData.evironmentRadianceTex.generateMipmaps();
                renderData.prefilterTex.loadFromImage(environmentImage);
                renderData.prefilterTex.generateMipmaps();
                renderData.diffuseTex.resize(1024, 1024);
                renderData.diffuseTex.renderTo(gl, function() { integrateDiffuse(gl, renderData); });
                renderData.diffuseTex.generateMipmaps();

                renderData.prefilterTexLevel0.resize(1024, 1024);
                renderData.prefilterTexLevel0.renderTo(gl, function() { integratePrefilter(gl, renderData, 0.0*0.0); });

                renderData.prefilterTexLevel1.resize(512, 512);
                renderData.prefilterTexLevel1.renderTo(gl, function() { integratePrefilter(gl, renderData, 0.2*0.2); });
                renderData.prefilterTexLevel1.generateMipmaps();

                renderData.prefilterTexLevel2.resize(512, 512);
                renderData.prefilterTexLevel2.renderTo(gl, function() { integratePrefilter(gl, renderData, 0.4*0.4); });
                renderData.prefilterTexLevel2.generateMipmaps();

                renderData.prefilterTexLevel3.resize(256, 256);
                renderData.prefilterTexLevel3.renderTo(gl, function() { integratePrefilter(gl, renderData, 0.6*0.6); });
                renderData.prefilterTexLevel3.generateMipmaps();

                renderData.prefilterTexLevel4.resize(256, 256);
                renderData.prefilterTexLevel4.renderTo(gl, function() { integratePrefilter(gl, renderData, 0.8*0.8); });
                renderData.prefilterTexLevel4.generateMipmaps();

                renderData.prefilterTexLevel5.resize(128, 128);
                renderData.prefilterTexLevel5.renderTo(gl, function() { integratePrefilter(gl, renderData, 1.0*1.0); });
                renderData.prefilterTexLevel5.generateMipmaps();
            }
            environmentImage.src = "\\images\\Circus_Backstage_8k.jpg";
        });
    });

    initializeUniformData(renderData);
    initializeUI(renderData);

    // Animate
    lastTime = 0.0;
    function frameWork(currentTime)
    {
        let deltaTime = currentTime - lastTime;

        let angleChange = deltaTime * 0.0005;
        let transform = renderData.camera.transform;
        vec3.rotateY(transform.position, transform.position, [0, 0, 0], angleChange);
        quat.rotateY(transform.rotation, transform.rotation, angleChange);
        renderData.camera.updateMatrices();

        //integrateDiffuse(gl, renderData);
        gl.viewport(0, 0, canvas.clientWidth, canvas.clientHeight);
        drawScene(gl, renderData);

        lastTime = currentTime;
        requestAnimationFrame(frameWork);
    }
    requestAnimationFrame(frameWork);
}

window.onload = main;
