"use client";

import { motion, type Variants, type HTMLMotionProps } from "framer-motion";

const EASE = [0.25, 0.46, 0.45, 0.94] as const;

const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay, ease: EASE },
  }),
};

const fadeInVariants: Variants = {
  hidden: { opacity: 0 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    transition: { duration: 0.5, delay, ease: EASE },
  }),
};

const scaleInVariants: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, delay, ease: EASE },
  }),
};

const staggerVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0 },
  },
};

type MotionDivProps = HTMLMotionProps<"div"> & {
  delay?: number;
  className?: string;
  children?: React.ReactNode;
};

export function FadeUp({ delay = 0, className, children, ...rest }: MotionDivProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-40px" }}
      variants={fadeUpVariants}
      custom={delay}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function FadeIn({ delay = 0, className, children, ...rest }: MotionDivProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-40px" }}
      variants={fadeInVariants}
      custom={delay}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function ScaleIn({ delay = 0, className, children, ...rest }: MotionDivProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-40px" }}
      variants={scaleInVariants}
      custom={delay}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function StaggerContainer({ className, children, ...rest }: MotionDivProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-40px" }}
      variants={staggerVariants}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ className, children, ...rest }: MotionDivProps) {
  return (
    <motion.div variants={fadeUpVariants} custom={0} className={className} {...rest}>
      {children}
    </motion.div>
  );
}

export function HeroEntrance({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
