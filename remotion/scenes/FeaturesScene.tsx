import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Img, staticFile } from 'remotion';
import { MISRAD_COLORS, SPRING_CONFIGS } from '../config';

export const FeaturesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const modules = [
    {
      name: 'מרכז המכירות',
      icon: staticFile('icons/system-icon.svg'),
      color: MISRAD_COLORS.primary,
      description: 'AI חוזה סגירות ב-75% דיוק',
      delay: 0,
    },
    {
      name: 'שיווק חכם',
      icon: staticFile('icons/social-icon.svg'),
      color: '#7C3AED',
      description: 'Hashtags + שעות פרסום מיטביות',
      delay: 90,
    },
    {
      name: 'ניהול צוות',
      icon: staticFile('icons/nexus-icon.svg'),
      color: MISRAD_COLORS.indigo,
      description: 'משימות אוטומטיות + מעקב',
      delay: 180,
    },
    {
      name: 'Client OS',
      icon: staticFile('icons/client-icon.svg'),
      color: '#0EA5E9',
      description: 'מעקב לקוחות חכם + תזכורות',
      delay: 270,
    },
    {
      name: 'Finance AI',
      icon: staticFile('icons/finance-icon.svg'),
      color: '#059669',
      description: 'חשבוניות + תזרים + תחזיות',
      delay: 360,
    },
    {
      name: 'תפעול שטח',
      icon: staticFile('icons/operations-icon.svg'),
      color: '#0EA5E9',
      description: 'פרויקטים + לוחות זמנים',
      delay: 450,
    },
  ];

  const currentModuleIndex = Math.min(
    Math.floor(frame / 90),
    modules.length - 1
  );

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, ${MISRAD_COLORS.onyx900} 0%, ${MISRAD_COLORS.onyx800} 100%)`,
        direction: 'rtl',
      }}
    >
      {/* Title */}
      <div
        style={{
          position: 'absolute',
          top: '8%',
          right: '10%',
          left: '10%',
          textAlign: 'center',
          opacity: interpolate(frame, [0, 30], [0, 1]),
        }}
      >
        <h2
          style={{
            fontFamily: 'Heebo, sans-serif',
            fontSize: 72,
            fontWeight: 900,
            background: `linear-gradient(135deg, ${MISRAD_COLORS.primary} 0%, ${MISRAD_COLORS.indigo} 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: 0,
          }}
        >
          6 מודולים. מערכת אחת.
        </h2>
      </div>

      {/* Modules grid */}
      <div
        style={{
          position: 'absolute',
          top: '22%',
          right: '8%',
          left: '8%',
          bottom: '8%',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gridTemplateRows: 'repeat(2, 1fr)',
          gap: 30,
        }}
      >
        {modules.map((module, index) => {
          const isActive = index === currentModuleIndex;
          const hasAppeared = frame >= module.delay;
          
          const moduleSpring = spring({
            frame: frame - module.delay,
            fps,
            config: SPRING_CONFIGS.ui,
          });

          const scale = hasAppeared ? (isActive ? 1.08 : 1) : 0;
          const opacity = hasAppeared ? (isActive ? 1 : 0.5) : 0;

          return (
            <div
              key={index}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 20,
                padding: 40,
                background: isActive
                  ? `linear-gradient(145deg, ${module.color}20 0%, ${module.color}10 100%)`
                  : `rgba(24, 24, 27, 0.4)`,
                backdropFilter: 'blur(20px)',
                borderRadius: 32,
                border: `3px solid ${isActive ? module.color : 'rgba(255,255,255,0.1)'}`,
                transform: `scale(${scale * moduleSpring})`,
                opacity,
                transition: 'all 0.3s ease',
                boxShadow: isActive ? `0 0 60px ${module.color}40` : 'none',
              }}
            >
              <Img
                src={module.icon}
                style={{
                  width: 100,
                  height: 100,
                  filter: isActive
                    ? `drop-shadow(0 0 20px ${module.color})`
                    : 'grayscale(0.5)',
                }}
              />
              <h3
                style={{
                  fontFamily: 'Heebo, sans-serif',
                  fontSize: 38,
                  fontWeight: 900,
                  color: isActive ? '#fff' : MISRAD_COLORS.surface100,
                  margin: 0,
                  textAlign: 'center',
                }}
              >
                {module.name}
              </h3>
              <p
                style={{
                  fontFamily: 'Heebo, sans-serif',
                  fontSize: 24,
                  fontWeight: 500,
                  color: isActive ? module.color : MISRAD_COLORS.surface100,
                  margin: 0,
                  textAlign: 'center',
                  opacity: isActive ? 1 : 0.7,
                }}
              >
                {module.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Bottom message */}
      <div
        style={{
          position: 'absolute',
          bottom: '3%',
          right: '10%',
          left: '10%',
          textAlign: 'center',
          opacity: interpolate(frame, [540, 570], [0, 1]),
        }}
      >
        <p
          style={{
            fontFamily: 'Heebo, sans-serif',
            fontSize: 42,
            fontWeight: 700,
            color: '#fff',
            margin: 0,
          }}
        >
          כל זה במערכת אחת. עם AI שעובד 24/7.
        </p>
      </div>
    </AbsoluteFill>
  );
};
