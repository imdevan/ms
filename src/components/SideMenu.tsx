import { motion, AnimatePresence } from 'framer-motion';
import { useState, forwardRef } from 'react';
import { X, Sun, Moon, RotateCcw, Hash, Percent, Coffee, Printer, Trash2, PanelLeft } from 'lucide-react';
import { ScaleDial } from './ScaleDial';

interface SideMenuProps {
  isOpen: boolean;
  onClose: () => void;
  scale: number;
  onScaleChange: (scale: number) => void;
  useFractions: boolean;
  onToggleFractions: () => void;
  cookMode: boolean;
  onToggleCookMode: () => void;
  cookModeSupported: boolean;
  isDark: boolean;
  onToggleTheme: () => void;
  onReset: () => void;
  onPrint: () => void;
  onClearRecipe: () => void;
  isMobile: boolean;
  splitView?: boolean;
  onToggleSplitView?: () => void;
}

const ResetButtonMenu = forwardRef<HTMLButtonElement, { onClick: () => void }>(function ResetButtonMenu({ onClick }, ref) {
  const [isSpinning, setIsSpinning] = useState(false);

  const handleClick = () => {
    setIsSpinning(true);
    onClick();
    setTimeout(() => setIsSpinning(false), 500);
  };

  return (
    <button
      ref={ref}
      onClick={handleClick}
      className="w-full flex items-center gap-3 p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors"
      data-testid="reset-button"
    >
      <motion.div
        animate={{ rotate: isSpinning ? -360 : 0 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
      >
        <RotateCcw className="w-5 h-5" />
      </motion.div>
      <span>Reset Checkboxes</span>
    </button>
  );
});

export function SideMenu({
  isOpen,
  onClose,
  scale,
  onScaleChange,
  useFractions,
  onToggleFractions,
  cookMode,
  onToggleCookMode,
  cookModeSupported,
  isDark,
  onToggleTheme,
  onReset,
  onPrint,
  onClearRecipe,
  isMobile,
}: SideMenuProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Menu panel */}
          <motion.div
            className="fixed right-0 top-0 bottom-0 w-80 max-w-[85vw] bg-card border-l border-border z-50 flex flex-col"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl">Settings</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-secondary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 p-6 space-y-8 overflow-y-auto">
              {/* Scale control */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Recipe Scale
                </h3>
                <div className="flex flex-col items-center gap-4">
                  <ScaleDial value={scale} onChange={onScaleChange} size="lg" />
                </div>
              </div>

              {/* Toggles - only show on mobile */}
              {isMobile && (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Display
                  </h3>

                  {/* Fractions toggle */}
                  <button
                    onClick={onToggleFractions}
                    className="w-full flex items-center justify-between p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors"
                    data-testid="fractions-toggle"
                  >
                    <div className="flex items-center gap-3">
                      {useFractions ? <Hash className="w-5 h-5" /> : <Percent className="w-5 h-5" />}
                      <span>{useFractions ? 'Fractions' : 'Decimals'}</span>
                    </div>
                    <div className={`w-12 h-7 rounded-full transition-colors ${useFractions ? 'bg-primary' : 'bg-muted'} p-1`}>
                      <motion.div
                        className="w-5 h-5 rounded-full bg-card shadow-sm"
                        animate={{ x: useFractions ? 20 : 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    </div>
                  </button>

                  {/* Theme toggle */}
                  <button
                    onClick={onToggleTheme}
                    className="w-full flex items-center justify-between p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors"
                    data-testid="theme-toggle"
                  >
                    <div className="flex items-center gap-3">
                      {isDark ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                      <span>{isDark ? 'Dark Mode' : 'Light Mode'}</span>
                    </div>
                    <div className={`w-12 h-7 rounded-full transition-colors ${isDark ? 'bg-primary' : 'bg-muted'} p-1`}>
                      <motion.div
                        className="w-5 h-5 rounded-full bg-card shadow-sm"
                        animate={{ x: isDark ? 20 : 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    </div>
                  </button>

                  {/* Cook mode toggle */}
                  {cookModeSupported && (
                    <button
                      onClick={onToggleCookMode}
                      className="w-full flex items-center justify-between p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors"
                      data-testid="cook-mode-toggle"
                    >
                      <div className="flex items-center gap-3">
                        <Coffee className="w-5 h-5" />
                        <div className="text-left">
                          <span className="block">Cook Mode</span>
                          <span className="text-xs text-muted-foreground">Keep screen awake</span>
                        </div>
                      </div>
                      <div className={`w-12 h-7 rounded-full transition-colors ${cookMode ? 'bg-primary' : 'bg-muted'} p-1`}>
                        <motion.div
                          className="w-5 h-5 rounded-full bg-card shadow-sm"
                          animate={{ x: cookMode ? 20 : 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                      </div>
                    </button>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </h3>

                <button
                  onClick={onPrint}
                  className="w-full flex items-center gap-3 p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors"
                  data-testid="print-button"
                >
                  <Printer className="w-5 h-5" />
                  <span>Print Recipe</span>
                </button>

                <ResetButtonMenu onClick={onReset} />

                <button
                  onClick={onClearRecipe}
                  className="w-full flex items-center gap-3 p-4 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                  data-testid="clear-recipe-button"
                >
                  <Trash2 className="w-5 h-5" />
                  <span>Clear Recipe</span>
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
