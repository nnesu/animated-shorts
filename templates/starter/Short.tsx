// STARTER composition: rename StarterShort / STARTER_FRAMES for the new video and register it in src/Root.tsx.
import { makeShort } from "../../shared/short";
import { World, loadKit } from "./world";
import * as story from "./story";

export const STARTER_FRAMES = story.TOTAL;
/** poolShots: close-up shot ids that get the soft light pool behind the subject's head */
export const StarterShort = makeShort({ World, loadKit, story, poolShots: [2] }); // EXAMPLE poolShots
