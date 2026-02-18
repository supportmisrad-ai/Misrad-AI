import { Composition } from 'remotion';
import { MisradAIPromo } from './compositions/MisradAIPromo';
import { MainComposition } from './v5/MainComposition';
import { MainComposition_Social } from './v5/MainComposition_Social';
import { MainComposition_Light } from './v5/MainComposition_Light';
import { MainComposition_Impact } from './v5/MainComposition_Impact';
import { MainComposition_ImpactSocial } from './v5/MainComposition_ImpactSocial';
import { NarrationRevealScene } from './v5/scenes/impact_social/NarrationRevealScene';

// 👇 1. הוסף את השורה הזו (וודא שהנתיב נכון למיקום הקובץ שלך)
import { HookChaosScene } from './v5/scenes/impact_social/HookChaosScene'; 

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MisradAIPromo"
        component={MisradAIPromo}
        durationInFrames={1800}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{}}
      />
      <Composition
        id="ProtocolV5"
        component={MainComposition}
        durationInFrames={900}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{}}
      />
      <Composition
        id="ProtocolV5-Social"
        component={MainComposition_Social}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{}}
      />
      <Composition
        id="ProtocolV5-Light"
        component={MainComposition_Light}
        durationInFrames={900}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{}}
      />
      <Composition
        id="ProtocolV5-Impact"
        component={MainComposition_Impact}
        durationInFrames={900}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{}}
      />
      <Composition
        id="ProtocolV5-ImpactSocial"
        component={MainComposition_ImpactSocial}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{}}
      />
      <Composition
        id="NarrationReveal"
        component={NarrationRevealScene}
        durationInFrames={120}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{}}
      />

      {/* 👇 2. הוסף את הקומפוזיציה החדשה כאן */}
      <Composition
        id="HookChaos"
        component={HookChaosScene}
        durationInFrames={90} 
        fps={30}
        width={1080}
        height={1920}
      />
      
    </>
  );
};