// Sandbox entry: renders one video folder on its own, without touching src/Root.tsx (BRIDGE_ENTRY=<this file>).
// Copy to src/sandboxes/<box>/index.tsx and point the import at the folder to render.
import React from "react";
import { Composition, registerRoot } from "remotion";
import { StarterShort, STARTER_FRAMES } from "../../videos/_starter/Short";

const Root: React.FC = () => <Composition id="StarterShort" component={StarterShort} durationInFrames={STARTER_FRAMES} fps={30} width={1080} height={1920} />;
registerRoot(Root);
