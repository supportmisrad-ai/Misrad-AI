import React from 'react';
import { Composition } from 'remotion';
import { FPS, SOCIAL_WIDTH, SOCIAL_HEIGHT, TV_WIDTH, TV_HEIGHT } from './shared/config';

// Module videos
import { SystemVideo } from './modules/system/SystemVideo';
import { NexusVideo } from './modules/nexus/NexusVideo';
import { SocialVideo } from './modules/social/SocialVideo';
import { FinanceVideo } from './modules/finance/FinanceVideo';
import { ClientVideo } from './modules/client/ClientVideo';
import { OperationsVideo } from './modules/operations/OperationsVideo';

// Package videos
import { SoloVideo } from './packages/solo/SoloVideo';
import { CloserVideo } from './packages/closer/CloserVideo';
import { AuthorityVideo } from './packages/authority/AuthorityVideo';
import { OperatorVideo } from './packages/operator/OperatorVideo';
import { EmpireVideo } from './packages/empire/EmpireVideo';
import { MentorVideo } from './packages/mentor/MentorVideo';

// UI Demo videos
import { RegistrationVideo } from './ui-demos/registration/RegistrationVideo';
import { NavigationVideo } from './ui-demos/navigation/NavigationVideo';
import { AIActionVideo } from './ui-demos/ai-action/AIActionVideo';

const DUR = 30 * FPS; // 900 frames = 30 seconds

const allVideos = [
  // A: Module videos
  { id: 'System', component: SystemVideo },
  { id: 'Nexus', component: NexusVideo },
  { id: 'Social', component: SocialVideo },
  { id: 'Finance', component: FinanceVideo },
  { id: 'Client', component: ClientVideo },
  { id: 'Operations', component: OperationsVideo },
  // B: Package videos
  { id: 'Solo', component: SoloVideo },
  { id: 'Closer', component: CloserVideo },
  { id: 'Authority', component: AuthorityVideo },
  { id: 'Operator', component: OperatorVideo },
  { id: 'Empire', component: EmpireVideo },
  { id: 'Mentor', component: MentorVideo },
  // C: UI Demo videos
  { id: 'Registration', component: RegistrationVideo },
  { id: 'Navigation', component: NavigationVideo },
  { id: 'AI-Action', component: AIActionVideo },
];

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {allVideos.map(({ id, component }) => (
        <React.Fragment key={id}>
          <Composition
            id={`${id}-Social`}
            component={component}
            durationInFrames={DUR}
            fps={FPS}
            width={SOCIAL_WIDTH}
            height={SOCIAL_HEIGHT}
            defaultProps={{}}
          />
          <Composition
            id={`${id}-TV`}
            component={component}
            durationInFrames={DUR}
            fps={FPS}
            width={TV_WIDTH}
            height={TV_HEIGHT}
            defaultProps={{}}
          />
        </React.Fragment>
      ))}
    </>
  );
};
