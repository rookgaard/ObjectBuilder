// Test entry — import every *.test.js so its describe()/it() registrations
// happen, then call run().

import { run } from "./runner.js";

import "./core/binary.test.js";
import "./core/spriteRle.test.js";
import "./core/thingType.test.js";

run();
