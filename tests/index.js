// Test entry — import every *.test.js so its describe()/it() registrations
// happen, then call run().

import { run } from "./runner.js";

import "./core/binary.test.js";
import "./core/spriteRle.test.js";
import "./core/thingType.test.js";

import "./app/spritesOptimizer.test.js";

import "./formats/datLoader.test.js";
import "./formats/sprFile.test.js";
import "./formats/datCompiler.test.js";
import "./formats/sprCompiler.test.js";
import "./formats/obdCodec.test.js";
import "./formats/integration_770.test.js";
import "./formats/roundtrip_770.test.js";
import "./formats/frameGroups.test.js";

import "./ui/virtualList.test.js";
import "./ui/animator.test.js";
import "./ui/spriteSheet.test.js";
import "./ui/lookTypeGenerator.test.js";
import "./ui/objectViewer.test.js";
import "./ui/animationEditor.test.js";
import "./store/projectStore.test.js";
import "./store/undo.test.js";
import "./store/mutations.test.js";
import "./formats/sprFileMutations.test.js";

run();
