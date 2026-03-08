import { motion } from 'framer-motion';
import { useState } from 'react';
import { Sun, Moon, Hash, Percent, Coffee, RotateCcw, Menu, PanelLeftClose, PanelLeft } from 'lucide-react';
import { ScaleDial } from './ScaleDial';

interface HeaderProps {
  scale: number;
  onScaleChange: (scale: number) => void;
  useFractions: boolean;
  onToggleFractions: () => void;
  cookMode: boolean;
  onToggleCookMode: () => void;
  cookModeSupported: boolean;
  isDark: boolean;
  onToggleTheme: () => void;
  hasRecipe: boolean;
  onOpenMenu?: () => void;
  splitView?: boolean;
  onToggleSplitView?: () => void;
}

interface TooltipButtonProps {
  onClick: () => void;
  tooltip: string;
  isActive?: boolean;
  children: React.ReactNode;
  testId?: string;
}

function TooltipButton({ onClick, tooltip, isActive, children, testId }: TooltipButtonProps) {
  return (
    <div className="tooltip-wrapper">
      <motion.button
        onClick={onClick}
        className={`p-2.5 rounded-xl transition-colors ${isActive
          ? 'bg-primary text-primary-foreground'
          : 'bg-secondary/50 hover:bg-secondary text-foreground'
          }`}
        whileTap={{ scale: 0.95 }}
        data-testid={testId}
      >
        {children}
      </motion.button>
      <span className="tooltip-content">{tooltip}</span>
    </div>
  );
}

export function Header({
  scale,
  onScaleChange,
  useFractions,
  onToggleFractions,
  cookMode,
  onToggleCookMode,
  cookModeSupported,
  isDark,
  onToggleTheme,
  hasRecipe,
  onOpenMenu,
  splitView,
  onToggleSplitView,
}: HeaderProps) {
  return (
    <motion.header
      className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50 no-print"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 25 }}
    >
      <div className="max-w-3xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Logo */}
          <motion.div
            className="flex items-center gap-2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <span className="text-3xl">🥄</span>
            <h1 className="text-xl hidden sm:block">Measuring Spoon</h1>
          </motion.div>

          {/* Desktop controls */}
          <div className="hidden md:flex items-center gap-3">
            {hasRecipe && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-3"
              >
                <ScaleDial value={scale} onChange={onScaleChange} size="sm" />

                <div className="w-px h-8 bg-border" />

                <TooltipButton
                  onClick={onToggleFractions}
                  tooltip={useFractions ? 'Switch to decimals' : 'Switch to fractions'}
                  isActive={useFractions}
                  testId="header-fractions-toggle"
                >
                  {useFractions ? <Hash className="w-4 h-4" /> : <Percent className="w-4 h-4" />}
                </TooltipButton>

                {cookModeSupported && (
                  <TooltipButton
                    onClick={onToggleCookMode}
                    tooltip={cookMode ? 'Disable cook mode' : 'Keep screen on'}
                    isActive={cookMode}
                    testId="header-cook-toggle"
                  >
                    <Coffee className="w-4 h-4" />
                  </TooltipButton>
                )}

                <div className="w-px h-8 bg-border" />
              </motion.div>
            )}

            {hasRecipe && onToggleSplitView && (
              <TooltipButton
                onClick={onToggleSplitView}
                tooltip={splitView ? 'Single view' : 'Side-by-side view'}
                isActive={splitView}
                testId="header-split-toggle"
              >
                {splitView ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
              </TooltipButton>
            )}

            <TooltipButton
              onClick={onToggleTheme}
              tooltip={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              testId="header-theme-toggle"
            >
              {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </TooltipButton>
            {onOpenMenu && (
              <motion.button
                onClick={onOpenMenu}
                className="p-2.5 rounded-xl bg-secondary/50 hover:bg-secondary text-foreground transition-colors"
                whileTap={{ scale: 0.95 }}
              >
                <Menu className="w-4 h-4" />
              </motion.button>
            )}
          </div>

          {/* Mobile controls */}
          <div className="flex md:hidden items-center gap-2">
            {hasRecipe && (
              <div className="flex items-center gap-2 mr-2">
                <span className="text-sm font-medium">{scale}×</span>
              </div>
            )}
            <TooltipButton
              onClick={onToggleTheme}
              tooltip={isDark ? 'Light mode' : 'Dark mode'}
            >
              {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </TooltipButton>
            {onOpenMenu && (
              <motion.button
                onClick={onOpenMenu}
                className="p-2.5 rounded-xl bg-secondary/50 hover:bg-secondary text-foreground transition-colors"
                whileTap={{ scale: 0.95 }}
              >
                <Menu className="w-4 h-4" />
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </motion.header>
  );
}
