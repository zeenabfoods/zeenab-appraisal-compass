import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { cardItemVariants, hoverVariants, tapVariants } from '@/utils/animations';
import { forwardRef, ReactNode } from 'react';

interface AnimatedCardProps {
  children: ReactNode;
  delay?: number;
  interactive?: boolean;
  className?: string;
}

export const AnimatedCard = forwardRef<HTMLDivElement, AnimatedCardProps>(
  ({ children, delay = 0, interactive = true, className }, ref) => {
    return (
      <motion.div
        ref={ref}
        variants={cardItemVariants}
        initial="hidden"
        animate="visible"
        whileHover={interactive ? "hover" : undefined}
        whileTap={interactive ? "tap" : undefined}
        transition={{
          delay,
        }}
        {...(interactive && { variants: { ...cardItemVariants, ...hoverVariants, ...tapVariants } })}
      >
        <Card className={className}>
          {children}
        </Card>
      </motion.div>
    );
  }
);

AnimatedCard.displayName = 'AnimatedCard';
