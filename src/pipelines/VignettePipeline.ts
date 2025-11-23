import Phaser from 'phaser';

const fragShader = `
#define SHADER_NAME VIGNETTE_FS

precision mediump float;

uniform sampler2D uMainSampler;
uniform float time;

varying vec2 outTexCoord;

void main()
{
    vec4 color = texture2D(uMainSampler, outTexCoord);
    
    vec2 uv = outTexCoord;
    uv *=  1.0 - uv.yx;
    float vig = uv.x * uv.y * 15.0;
    
    vig = pow(vig, 0.25);
    
    gl_FragColor = vec4(color.rgb * vig, color.a);
}
`;

export class VignettePipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
    constructor(game: Phaser.Game) {
        super({
            game,
            name: 'Vignette',
            fragShader
        });
    }
}
