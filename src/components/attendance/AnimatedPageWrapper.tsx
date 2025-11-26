import { motion } from 'framer-motion';
import { pageVariants } from '@/utils/animations';
import { ReactNode } from 'react';

interface AnimatedPageWrapperProps {
  children: ReactNode;
  className?: string;
}

export function AnimatedPageWrapper({ children, className }: AnimatedPageWrapperProps) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={className}
    >
      {children}
    </motion.div>
  );
}
