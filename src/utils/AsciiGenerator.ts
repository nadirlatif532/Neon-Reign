export class AsciiGenerator {
    static get parts() {
        return {
            hair: [
                [
                    "   .///////.   ",
                    "  //       \\\\  ",
                    " //  _____  \\\\ ",
                    " |  /     \\  | "
                ],
                [
                    "   xxxxxxxxx   ",
                    "  xx       xx  ",
                    " xx  _____  xx ",
                    " |  /     \\  | "
                ],
                [
                    "   !!!!!!!!!   ",
                    "  !!       !!  ",
                    " !!  _____  !! ",
                    " |  /     \\  | "
                ],
                [
                    "   #########   ",
                    "  ##       ##  ",
                    " ##  _____  ## ",
                    " |  /     \\  | "
                ],
                [
                    "   ^^^^^^^^^   ",
                    "  ^^       ^^  ",
                    " ^^  _____  ^^ ",
                    " |  /     \\  | "
                ]
            ],
            eyes: [
                " |   O   O   | ",
                " |   -   -   | ",
                " |   @   @   | ",
                " |   X   X   | ",
                " |   >   <   | "
            ],
            nose: [
                " |     ^     | ",
                " |     |     | ",
                " |     .     | ",
                " |     L     | ",
                " |     ~     | "
            ],
            mouth: [
                " |   _____   | ",
                " |   =====   | ",
                " |   ~~~~~   | ",
                " |   \\___/   | ",
                " |   [___]   | "
            ],
            chin: [
                "  \\  \\___/  /  ",
                "   \\_______/   ",
                "    \\_____/    ",
                "     \\___/     ",
                "      \\_/      "
            ]
        };
    }

    static get names() {
        return [
            "Viper", "Ghost", "Chrome", "Spike", "Nova",
            "Razer", "Shadow", "Blitz", "Zero", "Hex",
            "Neon", "Pulse", "Echo", "Flux", "Jinx",
            "Raven", "Steel", "Volt", "Cipher", "Dax"
        ];
    }

    static get descriptions() {
        return [
            "Ex-Corpo security, tired of the leash.",
            "Street kid with a chip on their shoulder.",
            "Nomad drifter looking for a crew.",
            "Tech-obsessed netrunner with twitchy fingers.",
            "Biker veteran who's seen it all.",
            "Underground pit fighter seeking glory.",
            "Disgraced medic with steady hands.",
            "Smuggler who knows every back alley.",
            "Sniper with a cybernetic eye.",
            "Demolitions expert who loves loud noises."
        ];
    }

    static generatePortrait() {
        const p = this.parts;
        const hair = p.hair[Math.floor(Math.random() * p.hair.length)];
        const eyes = p.eyes[Math.floor(Math.random() * p.eyes.length)];
        const nose = p.nose[Math.floor(Math.random() * p.nose.length)];
        const mouth = p.mouth[Math.floor(Math.random() * p.mouth.length)];
        const chin = p.chin[Math.floor(Math.random() * p.chin.length)];

        const artLines = [
            ...hair,
            eyes,
            nose,
            mouth,
            chin
        ];

        const art = artLines.join('\n');
        const name = this.names[Math.floor(Math.random() * this.names.length)] + '-' + Math.floor(Math.random() * 99);
        const description = this.descriptions[Math.floor(Math.random() * this.descriptions.length)];

        return { art, name, description };
    }
}
