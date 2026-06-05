// A single (property, value) pair — used by the Find tool and by ThingData
// serialization. AS3 reference: otlib.things.ThingProperty.

export class ThingProperty {
    constructor(property = "", value = null) {
        this.property = property;
        this.value = value;
    }

    toString() {
        return `[ThingProperty property=${this.property}, value=${this.value}]`;
    }
}
