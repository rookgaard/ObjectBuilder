// Test entry — import every *.test.js so its describe()/it() registrations
// happen, then call run().

import { run } from "./runner.js";

import "./core/binary.test.js";
import "./core/spriteRle.test.js";
import "./core/thingType.test.js";

import "./formats/datLoader.test.js";
import "./formats/sprFile.test.js";
import "./formats/integration_7_72.test.js";

run();
