import React from 'react';
import { Composition } from 'remotion';
import { FPS, V2_DURATION, SOCIAL_WIDTH, SOCIAL_HEIGHT, TV_WIDTH, TV_HEIGHT } from './shared/config';

// Module videos
import { SystemVideoV2 } from './modules/system/SystemVideo';
import { NexusVideoV2 } from './modules/nexus/NexusVideo';
import { SocialVideoV2 } from './modules/social/SocialVideo';
import { FinanceVideoV2 } from './modules/finance/FinanceVideo';
import { ClientVideoV2 } from './modules/client/ClientVideo';
import { OperationsVideoV2 } from './modules/operations/OperationsVideo';

// Package videos
import { SoloVideoV2 } from './packages/solo/SoloVideo';
import { CloserVideoV2 } from './packages/closer/CloserVideo';
import { AuthorityVideoV2 } from './packages/authority/AuthorityVideo';
import { OperatorVideoV2 } from './packages/operator/OperatorVideo';
import { EmpireVideoV2 } from './packages/empire/EmpireVideo';
import { MentorVideoV2 } from './packages/mentor/MentorVideo';

// UI Demo videos
import { NavigationVideoV2 } from './ui-demos/navigation/NavigationVideo';
import { RegistrationVideoV2 } from './ui-demos/registration/RegistrationVideo';
import { AIActionVideoV2 } from './ui-demos/ai-action/AIActionVideo';

// Launch videos
import { L1HeroVideo } from './launch/L1-HeroVideo';
import { L2ShabbatVideo } from './launch/L2-ShabbatVideo';
import { L3WorkflowVideo } from './launch/L3-WorkflowVideo';

// Bonus videos
import { BrandStoryVideoV2 } from './bonus/brand-story/BrandStoryVideo';
import { AIShowcaseVideoV2 } from './bonus/ai-showcase/AIShowcaseVideo';
import { ShabbatModeVideoV2 } from './bonus/shabbat-mode/ShabbatModeVideo';

// Tutorial videos
import { SystemLeadsTutorialDesktop, SystemLeadsTutorialMobile } from './tutorials/system/SystemLeadsTutorial';
import { SystemDialerTutorialDesktop, SystemDialerTutorialMobile } from './tutorials/system/SystemDialerTutorial';
import { NexusEmployeeTutorialDesktop, NexusEmployeeTutorialMobile } from './tutorials/nexus/NexusEmployeeTutorial';
import { NexusTasksTutorialDesktop, NexusTasksTutorialMobile } from './tutorials/nexus/NexusTasksTutorial';
import { FinanceInvoiceTutorialDesktop, FinanceInvoiceTutorialMobile } from './tutorials/finance/FinanceInvoiceTutorial';
import { SocialPostTutorialDesktop, SocialPostTutorialMobile } from './tutorials/social/SocialPostTutorial';
import { OperationsInventoryTutorialDesktop, OperationsInventoryTutorialMobile } from './tutorials/operations/OperationsInventoryTutorial';
import { ClientPortalTutorialDesktop, ClientPortalTutorialMobile } from './tutorials/client/ClientPortalTutorial';

// Helper to register both Social (9:16) and TV (16:9) compositions
const dualComposition = (id: string, Component: React.FC) => (
  <>
    <Composition id={`${id}-Social`} component={Component} durationInFrames={V2_DURATION} fps={FPS} width={SOCIAL_WIDTH} height={SOCIAL_HEIGHT} />
    <Composition id={`${id}-TV`} component={Component} durationInFrames={V2_DURATION} fps={FPS} width={TV_WIDTH} height={TV_HEIGHT} />
  </>
);

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* ═══ MODULE VIDEOS (6 × 2 = 12 compositions) ═══ */}
      {dualComposition('V2-System', SystemVideoV2)}
      {dualComposition('V2-Nexus', NexusVideoV2)}
      {dualComposition('V2-Social', SocialVideoV2)}
      {dualComposition('V2-Finance', FinanceVideoV2)}
      {dualComposition('V2-Client', ClientVideoV2)}
      {dualComposition('V2-Operations', OperationsVideoV2)}

      {/* ═══ PACKAGE VIDEOS (6 × 2 = 12 compositions) ═══ */}
      {dualComposition('V2-Solo', SoloVideoV2)}
      {dualComposition('V2-Closer', CloserVideoV2)}
      {dualComposition('V2-Authority', AuthorityVideoV2)}
      {dualComposition('V2-Operator', OperatorVideoV2)}
      {dualComposition('V2-Empire', EmpireVideoV2)}
      {dualComposition('V2-Mentor', MentorVideoV2)}

      {/* ═══ UI DEMO VIDEOS (3 × 2 = 6 compositions) ═══ */}
      {dualComposition('V2-Navigation', NavigationVideoV2)}
      {dualComposition('V2-Registration', RegistrationVideoV2)}
      {dualComposition('V2-AIAction', AIActionVideoV2)}

      {/* ═══ BONUS VIDEOS (3 × 2 = 6 compositions) ═══ */}
      {dualComposition('V2-BrandStory', BrandStoryVideoV2)}
      {dualComposition('V2-AIShowcase', AIShowcaseVideoV2)}
      {dualComposition('V2-ShabbatMode', ShabbatModeVideoV2)}

      {/* ═══ LAUNCH VIDEOS (3 × 2 = 6 compositions) ═══ */}
      {dualComposition('Launch-L1-Hero', L1HeroVideo)}
      {dualComposition('Launch-L2-Shabbat', L2ShabbatVideo)}
      {dualComposition('Launch-L3-Workflow', L3WorkflowVideo)}

      {/* ═══ TUTORIAL VIDEOS ═══ */}
      <Composition id="Tutorial-System-Leads-Desktop" component={SystemLeadsTutorialDesktop} durationInFrames={90 * FPS} fps={FPS} width={TV_WIDTH} height={TV_HEIGHT} />
      <Composition id="Tutorial-System-Leads-Mobile" component={SystemLeadsTutorialMobile} durationInFrames={90 * FPS} fps={FPS} width={SOCIAL_WIDTH} height={SOCIAL_HEIGHT} />
      <Composition id="Tutorial-System-Dialer-Desktop" component={SystemDialerTutorialDesktop} durationInFrames={80 * FPS} fps={FPS} width={TV_WIDTH} height={TV_HEIGHT} />
      <Composition id="Tutorial-System-Dialer-Mobile" component={SystemDialerTutorialMobile} durationInFrames={80 * FPS} fps={FPS} width={SOCIAL_WIDTH} height={SOCIAL_HEIGHT} />
      <Composition id="Tutorial-Nexus-Employee-Desktop" component={NexusEmployeeTutorialDesktop} durationInFrames={60 * FPS} fps={FPS} width={TV_WIDTH} height={TV_HEIGHT} />
      <Composition id="Tutorial-Nexus-Employee-Mobile" component={NexusEmployeeTutorialMobile} durationInFrames={60 * FPS} fps={FPS} width={SOCIAL_WIDTH} height={SOCIAL_HEIGHT} />
      <Composition id="Tutorial-Nexus-Tasks-Desktop" component={NexusTasksTutorialDesktop} durationInFrames={60 * FPS} fps={FPS} width={TV_WIDTH} height={TV_HEIGHT} />
      <Composition id="Tutorial-Nexus-Tasks-Mobile" component={NexusTasksTutorialMobile} durationInFrames={60 * FPS} fps={FPS} width={SOCIAL_WIDTH} height={SOCIAL_HEIGHT} />
      <Composition id="Tutorial-Finance-Invoice-Desktop" component={FinanceInvoiceTutorialDesktop} durationInFrames={60 * FPS} fps={FPS} width={TV_WIDTH} height={TV_HEIGHT} />
      <Composition id="Tutorial-Finance-Invoice-Mobile" component={FinanceInvoiceTutorialMobile} durationInFrames={60 * FPS} fps={FPS} width={SOCIAL_WIDTH} height={SOCIAL_HEIGHT} />
      <Composition id="Tutorial-Social-Post-Desktop" component={SocialPostTutorialDesktop} durationInFrames={60 * FPS} fps={FPS} width={TV_WIDTH} height={TV_HEIGHT} />
      <Composition id="Tutorial-Social-Post-Mobile" component={SocialPostTutorialMobile} durationInFrames={60 * FPS} fps={FPS} width={SOCIAL_WIDTH} height={SOCIAL_HEIGHT} />
      <Composition id="Tutorial-Operations-Inventory-Desktop" component={OperationsInventoryTutorialDesktop} durationInFrames={55 * FPS} fps={FPS} width={TV_WIDTH} height={TV_HEIGHT} />
      <Composition id="Tutorial-Operations-Inventory-Mobile" component={OperationsInventoryTutorialMobile} durationInFrames={55 * FPS} fps={FPS} width={SOCIAL_WIDTH} height={SOCIAL_HEIGHT} />
      <Composition id="Tutorial-Client-Portal-Desktop" component={ClientPortalTutorialDesktop} durationInFrames={50 * FPS} fps={FPS} width={TV_WIDTH} height={TV_HEIGHT} />
      <Composition id="Tutorial-Client-Portal-Mobile" component={ClientPortalTutorialMobile} durationInFrames={50 * FPS} fps={FPS} width={SOCIAL_WIDTH} height={SOCIAL_HEIGHT} />
    </>
  );
};
