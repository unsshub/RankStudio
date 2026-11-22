import React from "react";
import { Composition, registerRoot } from "remotion";
import { RankingVideo, type RankingVideoProps } from "./RankingVideo.js";
import { defaultProject } from "./schema.js";
import { computeDurationFrames, COMPOSITION_FPS } from "./logic/duration.js";
import "./fonts.js";

const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="RankingVideo"
      component={RankingVideo as unknown as React.FC<Record<string, unknown>>}
      width={1080}
      height={1920}
      fps={COMPOSITION_FPS}
      durationInFrames={270}
      defaultProps={{
        project: defaultProject(),
        engineUrl: "",
        token: "",
        assetPaths: {},
        voiceDurations: {},
        sfxPaths: {},
      }}
      calculateMetadata={({ props }) => {
        const typed = props as unknown as RankingVideoProps;
        return {
          durationInFrames: computeDurationFrames(
            typed.project,
            typed.voiceDurations,
            COMPOSITION_FPS
          ),
          fps: COMPOSITION_FPS,
          width: 1080,
          height: 1920,
        };
      }}
    />
  );
};

registerRoot(RemotionRoot);
