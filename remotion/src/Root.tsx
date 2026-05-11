import { Composition } from "remotion";
import { HolocronDemo } from "./HolocronDemo";

const FPS = 30;
const DURATION_SECONDS = 30;

export function Root() {
  return (
    <Composition
      id="HolocronDemo"
      component={HolocronDemo}
      durationInFrames={DURATION_SECONDS * FPS}
      fps={FPS}
      width={1280}
      height={720}
      defaultProps={{}}
    />
  );
}
