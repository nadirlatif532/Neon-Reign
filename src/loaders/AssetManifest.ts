interface ImageAsset {
    key: string;
    path: string;
}

interface AtlasAsset {
    key: string;
    texturePath: string;
    atlasPath: string;
}

interface AudioAsset {
    key: string;
    path: string;
}

export const AssetManifest = {
    images: [
        { key: 'city_bg_user', path: 'assets/city.jpg' },
        { key: 'city_bg_mobile', path: 'assets/city_mb.png' },
        { key: 'biker', path: 'assets/biker.png' },
        { key: 'bar_building', path: 'assets/bar_building.png' },
        { key: 'hq_building', path: 'assets/hq_building.png' },
        { key: 'garage_building', path: 'assets/garage_building.png' }
    ] as ImageAsset[],
    atlases: [] as AtlasAsset[],
    audio: [
        { key: 'casualty_loop_1', path: 'assets/White Bat Audio - Casualty LOOP 1.wav' },
        { key: 'casualty_loop_2', path: 'assets/White Bat Audio - Casualty LOOP 2.wav' },
        { key: 'casualty_loop_3', path: 'assets/White Bat Audio - Casualty LOOP 3.wav' }
    ] as AudioAsset[]
};
