// String constants + value helpers for the four ThingType categories.
// AS3 reference: otlib.things.ThingCategory.

export const ITEM    = "item";
export const OUTFIT  = "outfit";
export const EFFECT  = "effect";
export const MISSILE = "missile";

export const ALL = Object.freeze([ITEM, OUTFIT, EFFECT, MISSILE]);

const NAME_BY_VALUE = { 1: ITEM, 2: OUTFIT, 3: EFFECT, 4: MISSILE };
const VALUE_BY_NAME = { [ITEM]: 1, [OUTFIT]: 2, [EFFECT]: 3, [MISSILE]: 4 };

export function isValid(category) {
    return category === ITEM || category === OUTFIT || category === EFFECT || category === MISSILE;
}

/** Loose lookup — tolerates pluralized / cased strings ("Items" → "item"). */
export function fromString(value) {
    if (typeof value !== "string") return null;
    const v = value.trim().toLowerCase().replace(/s$/, "");
    return isValid(v) ? v : null;
}

export function fromValue(value) {
    return NAME_BY_VALUE[value] ?? null;
}

export function toValue(category) {
    return VALUE_BY_NAME[category] ?? 0;
}

export default { ITEM, OUTFIT, EFFECT, MISSILE, ALL, isValid, fromString, fromValue, toValue };
