
const { mat2, mat2d, mat3, mat4, quat, quat2, vec2, vec3, vec4 } = glMatrix;


/***************************************
DATA
***************************************/
const emptyVertexSource = `
#version 100
void main() {}
`

const emptyFragmentSource = `
#version 100
precision mediump float;

void main()
{
    gl_FragColor = vec4(0.0, 0.0, 1.0, 1.0);
}
`
/***************************************
Data Structures
***************************************/
function Transform()
{
    this.position = vec3.fromValues(0.0, 0.0, 0.0);
    this.rotation = quat.create();
    this.scale = vec3.fromValues(1.0, 1.0, 1.0);

    this.getMatrix = function() {
        let matrix = mat4.create();
        mat4.fromRotationTranslationScale(
            matrix,
            this.rotation, 
            this.position,
            this.scale);
        return matrix;
    }
}

function normalFromModelMatrix(modelMatrix)
{
    let normalMatrix3 = mat3.create();
    let normalMatrix4 = mat4.create();
    mat4.invert(normalMatrix4, modelMatrix);
    mat4.transpose(normalMatrix4, normalMatrix4);
    mat3.fromMat4(normalMatrix3, normalMatrix4);
    
    return normalMatrix3;
}

/***************************************
MESH
***************************************/
function Mesh(gl)
{
    this.vertexBuffer = null;
    this.indexBuffer = null;

    this.loadMeshFromObject = function(meshData) {
        this.vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(meshData.vertices), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);

        this.indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(meshData.indices), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    }
}

function Model(gl)
{
    this.mesh = new Mesh(gl);
    this.transform = new Transform();
}

/***************************************
CAMERA
***************************************/
function PerspectiveCamera()
{
    this.transform = new Transform();
    this.fovy = Math.PI / 4;
    this.aspect = 1.0;
    this.near = 0.001;
    this.far = 50.0;

    this.viewMatrix = mat4.create();
    this.projectionMatrix = mat4.create();


    this.updateMatrices = function() {
        mat4.perspective(this.projectionMatrix, this.fovy, this.aspect, this.near, this.far);
        this.viewMatrix = this.transform.getMatrix();
        mat4.invert(this.viewMatrix, this.viewMatrix);
    }
}


/***************************************
SHADER
***************************************/
function loadTextFile(url, callback) {
    let request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.addEventListener('load', function() {
        callback(request.responseText);
    });
    request.send();
}

function createShader(gl, type, source)
{
    let shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    let success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success)
    {
      return shader;
    }

    console.log(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
}

function createProgram(gl, vertexShader, fragmentShader) {
    // create a program.
    let program = gl.createProgram();
   
    // attach the shaders.
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
   
    // link the program.
    gl.linkProgram(program);
   
    // Check if it linked.
    let success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (!success) {
        // something went wrong with the link
        throw ("program failed to link:" + gl.getProgramInfoLog (program));
    }
   
    return program;
};

function ShaderProgram(gl)
{
    this.program = null;

    this.compileFromSource = function(vertexSource, fragmentSource) {
        let vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
        let fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
        this.program = createProgram(gl, vertexShader, fragmentShader);
    }

    this.use = function() {
        if (this.program == null) { return; }
        gl.useProgram(this.program);
    }
}

/***************************************
TEXTURES
***************************************/
function Texture2D(gl)
{
    this.texture = gl.createTexture(gl.TEXTURE_2D);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);

    // Fill with one blue pixel so state is valid to use
    this.width = 1;
    this.height = 1;
    const level = 0;
    const internalFormat = gl.RGBA;
    const border = 0;
    const srcFormat = gl.RGBA;
    const srcType = gl.UNSIGNED_BYTE;
    const pixel = new Uint8Array([0, 0, 255, 255]);

    gl.texImage2D(
        gl.TEXTURE_2D,
        level, internalFormat,
        this.width, this.height, border, 
        srcFormat, srcType, pixel);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    gl.bindTexture(gl.TEXTURE_2D, null);

    this.loadFromImage = function(image) {
        const level = 0;
        const internalFormat = gl.RGBA;
        const srcFormat = gl.RGBA;
        const srcType = gl.UNSIGNED_BYTE;
        this.width = image.width;
        this.height = image.height;

        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(
            gl.TEXTURE_2D,
            level, internalFormat,
            srcFormat, srcType,
            image);
            
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.bindTexture(gl.TEXTURE_2D, null);
    }

    this.resize = function(width, height, generateMips=false)
    {
        const level = 0;
        const internalFormat = gl.RGBA;
        const border = 0;
        const srcFormat = gl.RGBA;
        const srcType = gl.UNSIGNED_BYTE;
        let pixels = new Uint8Array(width * height * 4).fill(255);

        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(
            gl.TEXTURE_2D,
            level, internalFormat,
            width, height, border, 
            srcFormat, srcType, pixels);
        this.width = width;
        this.height = height;

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        if (generateMips)
        {
            gl.generateMipmap(gl.TEXTURE_2D);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.MIPMAP_LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.MIPMAP_LINEAR);
        }

        
       gl.bindTexture(gl.TEXTURE_2D, null);
    }

    this.generateMipmaps = function()
    {
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.bindTexture(gl.TEXTURE_2D, null);
    }

    this.use = function(slot)
    {
        gl.activeTexture(slot);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
    }

    this.renderTo = function(gl, drawCallback, mipLevel=0)
    {
        let fb = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.framebufferTexture2D(
            gl.FRAMEBUFFER,
            gl.COLOR_ATTACHMENT0,
            gl.TEXTURE_2D,
            this.texture,
            mipLevel);
        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.viewport(0, 0, this.width, this.height);
        
        drawCallback();

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
}

/***************************************
FRAMEBUFFER
***************************************/
function createFramebuffer(gl, width, height)
{
    let framebuffer = gl.createFramebuffer();

    colorTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, colorTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, colorTexture, 0);

    let fbStatus = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (gl.FRAMEBUFFER_COMPLETE !== fbStatus) {
      console.log('Frame buffer object is incomplete: ' + fbStatus.toString());
      return error();
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);

    return framebuffer;
}
