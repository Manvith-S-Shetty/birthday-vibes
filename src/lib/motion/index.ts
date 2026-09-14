export const MOTION_TIMINGS = {
  MICRO: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
  SCENE: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  HERO: { duration: 1.4, ease: [0.25, 1, 0.5, 1] },
};

export const fadeInVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (customDuration = MOTION_TIMINGS.SCENE.duration) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: customDuration,
      ease: MOTION_TIMINGS.SCENE.ease,
    },
  }),
};

export const heroEntranceVariants = {
  hidden: { opacity: 0, scale: 0.96, y: 24 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: MOTION_TIMINGS.HERO.duration,
      ease: MOTION_TIMINGS.HERO.ease,
    },
  },
};

export const staggerContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
};

export const microHoverScale = {
  rest: { scale: 1 },
  hover: {
    scale: 1.02,
    transition: {
      duration: MOTION_TIMINGS.MICRO.duration,
      ease: MOTION_TIMINGS.MICRO.ease,
    },
  },
  tap: {
    scale: 0.98,
    transition: {
      duration: MOTION_TIMINGS.MICRO.duration,
      ease: MOTION_TIMINGS.MICRO.ease,
    },
  },
};
