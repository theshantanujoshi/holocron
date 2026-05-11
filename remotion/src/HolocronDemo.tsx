import { AbsoluteFill, Sequence } from "remotion";
import { COLORS } from "./tokens";
import { TitleScene } from "./scenes/TitleScene";
import { GalaxyScene } from "./scenes/GalaxyScene";
import { StoryScene } from "./scenes/StoryScene";
import { EndScene } from "./scenes/EndScene";
import { Grain } from "./scenes/Grain";

const FPS = 30;
const s = (n: number) => Math.round(n * FPS);

/**
 * 30-second demo composition.
 *
 * Frame budget (30 fps × 30 s = 900 frames):
 *   0–90    Title       (3s)  wordmark + cube glyph reveal
 *   90–360  Galaxy      (9s)  starfield + planets + ship traffic
 *   360–720 Story+Order (12s) "Rise of Vader" beats + Order 66 cinematic
 *   720–900 End card    (6s)  URLs + GitHub stars CTA
 */
export function HolocronDemo() {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bgDeep }}>
      <Sequence from={0} durationInFrames={s(3)}>
        <TitleScene />
      </Sequence>
      <Sequence from={s(3)} durationInFrames={s(9)}>
        <GalaxyScene />
      </Sequence>
      <Sequence from={s(12)} durationInFrames={s(12)}>
        <StoryScene />
      </Sequence>
      <Sequence from={s(24)} durationInFrames={s(6)}>
        <EndScene />
      </Sequence>
      {/* Grain overlay sits above everything for film-grain texture. */}
      <Grain />
    </AbsoluteFill>
  );
}
