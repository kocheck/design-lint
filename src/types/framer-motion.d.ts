// Type declarations for framer-motion dist import
declare module "framer-motion/dist/framer-motion" {
  import { motion as motionOriginal } from "framer-motion";

  export const motion: typeof motionOriginal & {
    li: React.ForwardRefExoticComponent<
      React.HTMLAttributes<HTMLLIElement> & {
        positionTransition?: boolean;
        layout?: boolean | string;
        layoutId?: string;
        variants?: Record<string, unknown>;
        initial?: string | Record<string, unknown>;
        animate?: string | Record<string, unknown>;
        exit?: string | Record<string, unknown>;
        whileTap?: Record<string, unknown>;
        whileHover?: Record<string, unknown>;
        key?: string | number;
        [key: string]: unknown;
      }
    >;
    div: React.ForwardRefExoticComponent<
      React.HTMLAttributes<HTMLDivElement> & {
        positionTransition?: boolean;
        layout?: boolean | string;
        layoutId?: string;
        variants?: Record<string, unknown>;
        initial?: string | Record<string, unknown>;
        animate?: string | Record<string, unknown>;
        exit?: string | Record<string, unknown>;
        whileTap?: Record<string, unknown>;
        whileHover?: Record<string, unknown>;
        key?: string | number;
        [key: string]: unknown;
      }
    >;
    button: React.ForwardRefExoticComponent<
      React.ButtonHTMLAttributes<HTMLButtonElement> & {
        positionTransition?: boolean;
        layout?: boolean | string;
        layoutId?: string;
        variants?: Record<string, unknown>;
        initial?: string | Record<string, unknown>;
        animate?: string | Record<string, unknown>;
        exit?: string | Record<string, unknown>;
        whileTap?: Record<string, unknown>;
        whileHover?: Record<string, unknown>;
        key?: string | number;
        [key: string]: unknown;
      }
    >;
    ul: React.ForwardRefExoticComponent<
      React.HTMLAttributes<HTMLUListElement> & {
        positionTransition?: boolean;
        layout?: boolean | string;
        layoutId?: string;
        variants?: Record<string, unknown>;
        initial?: string | Record<string, unknown>;
        animate?: string | Record<string, unknown>;
        exit?: string | Record<string, unknown>;
        whileTap?: Record<string, unknown>;
        whileHover?: Record<string, unknown>;
        key?: string | number;
        [key: string]: unknown;
      }
    >;
    span: React.ForwardRefExoticComponent<
      React.HTMLAttributes<HTMLSpanElement> & {
        positionTransition?: boolean;
        layout?: boolean | string;
        layoutId?: string;
        variants?: Record<string, unknown>;
        initial?: string | Record<string, unknown>;
        animate?: string | Record<string, unknown>;
        exit?: string | Record<string, unknown>;
        whileTap?: Record<string, unknown>;
        whileHover?: Record<string, unknown>;
        key?: string | number;
        [key: string]: unknown;
      }
    >;
    p: React.ForwardRefExoticComponent<
      React.HTMLAttributes<HTMLParagraphElement> & {
        positionTransition?: boolean;
        layout?: boolean | string;
        layoutId?: string;
        variants?: Record<string, unknown>;
        initial?: string | Record<string, unknown>;
        animate?: string | Record<string, unknown>;
        exit?: string | Record<string, unknown>;
        whileTap?: Record<string, unknown>;
        whileHover?: Record<string, unknown>;
        key?: string | number;
        [key: string]: unknown;
      }
    >;
  };

  export const AnimatePresence: React.FC<{
    children?: React.ReactNode;
    mode?: "sync" | "wait" | "popLayout";
    initial?: boolean;
    onExitComplete?: () => void;
    exitBeforeEnter?: boolean;
    presenceAffectsLayout?: boolean;
  }>;

  export * from "framer-motion";
}
