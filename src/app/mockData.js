// Hand-rolled fixtures so the UI shell has something to render before the
// real DAT/SPR loader lands in Stage 3. Each object is a partial ThingType:
// just enough fields for the panels to display something believable.

export const MOCK_THINGS = {
    item: [
        {
            id: 100,
            category: "item",
            name: "Empty Slot",
            width: 1, height: 1, layers: 1,
            patternX: 1, patternY: 1, patternZ: 1, frames: 1,
            isGround: true, groundSpeed: 100,
            spriteIndex: [1],
        },
        {
            id: 2160,
            category: "item",
            name: "Crystal Coin",
            width: 1, height: 1, layers: 1,
            patternX: 1, patternY: 1, patternZ: 1, frames: 1,
            pickupable: true, stackable: true, isMarketItem: true,
            spriteIndex: [413],
        },
        {
            id: 3031,
            category: "item",
            name: "Gold Coin",
            width: 1, height: 1, layers: 1,
            patternX: 1, patternY: 1, patternZ: 1, frames: 1,
            pickupable: true, stackable: true,
            spriteIndex: [314],
        },
    ],
    outfit: [
        {
            id: 128,
            category: "outfit",
            name: "Citizen (M)",
            width: 1, height: 1, layers: 2,
            patternX: 4, patternY: 1, patternZ: 1, frames: 3,
            isAnimation: true,
            spriteIndex: new Array(24).fill(0).map((_, i) => 7000 + i),
        },
    ],
    effect: [
        {
            id: 1,
            category: "effect",
            name: "Spark",
            width: 1, height: 1, layers: 1,
            patternX: 1, patternY: 1, patternZ: 1, frames: 8,
            isAnimation: true, animateAlways: true,
            spriteIndex: new Array(8).fill(0).map((_, i) => 8000 + i),
        },
    ],
    missile: [
        {
            id: 1,
            category: "missile",
            name: "Arrow",
            width: 1, height: 1, layers: 1,
            patternX: 3, patternY: 3, patternZ: 1, frames: 1,
            spriteIndex: new Array(9).fill(0).map((_, i) => 9000 + i),
        },
    ],
};

// Header counts so the FilesInfoPanel-equivalent has something to display.
export const MOCK_CLIENT_INFO = {
    valueStr: "(mock) 7.72",
    itemsCount: 5157,
    outfitsCount: 254,
    effectsCount: 26,
    missilesCount: 16,
    spritesCount: 10423,
};
