import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { 
  UNITS, 
  convertUnit, 
  formatNumber, 
  getCompatibleUnits, 
  isImperialUnit,
  fractionToDecimal 
} from '@/lib/units';
import { saveLastConversion, type ConversionInput } from '@/lib/conversion';

interface ConversionModeProps {
  input: ConversionInput;
  onInputChange: (input: ConversionInput) => void;
  onClose: () => void;
  useFractions: boolean;
}

// All volume + weight unit keys for the "From" selector
const ALL_CONVERTIBLE_UNITS = Object.entries(UNITS)
  .filter(([, u]) => u.category === 'volume' || u.category === 'weight')
  .map(([key]) => key);

export function ConversionMode({ input, onInputChange, onClose, useFractions }: ConversionModeProps) {
  const [copiedUnit, setCopiedUnit] = useState<string | null>(null);
  const [editingUnit, setEditingUnit] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const activeFromRef = useRef<HTMLButtonElement>(null);

  const preferImperial = isImperialUnit(input.unit);
  const compatibleUnits = useMemo(() => 
    getCompatibleUnits(input.unit, preferImperial),
    [input.unit, preferImperial]
  );

  // Save to localStorage when input changes
  useEffect(() => {
    saveLastConversion(input);
  }, [input]);

  // Scroll active "from" unit into view
  useEffect(() => {
    activeFromRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [input.unit]);

  // Get all conversions
  const conversions = useMemo(() => {
    return compatibleUnits.map(unitKey => {
      const converted = convertUnit(input.quantity, input.unit, unitKey);
      const unitInfo = UNITS[unitKey];
      return {
        unitKey,
        unitName: unitInfo?.name || unitKey,
        value: converted,
        formatted: converted !== null ? formatNumber(converted, useFractions) : null,
      };
    }).filter(c => c.value !== null);
  }, [input.quantity, input.unit, compatibleUnits, useFractions]);

  const handleCopyValue = useCallback((unitKey: string, formatted: string, unitName: string) => {
    const text = `${formatted} ${unitName}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedUnit(unitKey);
      toast.success(`Copied: ${text}`);
      setTimeout(() => setCopiedUnit(null), 2000);
    }).catch(() => {
      toast.error('Failed to copy');
    });
  }, []);

  const handleStartEdit = useCallback((unitKey: string, currentValue: number) => {
    setEditingUnit(unitKey);
    setEditValue(formatNumber(currentValue, useFractions));
  }, [useFractions]);

  const handleEditComplete = useCallback((unitKey: string) => {
    const parsed = fractionToDecimal(editValue);
    if (parsed !== null && parsed > 0) {
      // Convert back to original unit
      const newOriginalValue = convertUnit(parsed, unitKey, input.unit);
      if (newOriginalValue !== null) {
        onInputChange({ ...input, quantity: newOriginalValue });
      }
    }
    setEditingUnit(null);
    setEditValue('');
  }, [editValue, input, onInputChange]);

  const handleInputQuantityChange = useCallback((value: string) => {
    const parsed = fractionToDecimal(value);
    if (parsed !== null && parsed > 0) {
      onInputChange({ ...input, quantity: parsed });
    }
  }, [input, onInputChange]);

  const handleSelectFromUnit = useCallback((unitKey: string) => {
    if (unitKey === input.unit) return;
    // Keep quantity, change unit
    onInputChange({ ...input, unit: unitKey });
  }, [input, onInputChange]);

  return (
    <motion.div
      className="w-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      {/* Header with close button */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-display">Unit Converter</h2>
        <motion.button
          onClick={onClose}
          className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
          whileTap={{ scale: 0.95 }}
        >
          <X className="w-5 h-5" />
        </motion.button>
      </div>

      <div className="flex gap-8 items-start">
        {/* Left side - Input with scrollable unit selector */}
        <div className="flex-shrink-0 w-48">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">From</label>
            <div className="mb-3">
              <input
                type="text"
                value={formatNumber(input.quantity, useFractions)}
                onChange={(e) => handleInputQuantityChange(e.target.value)}
                className="w-full text-3xl font-display bg-transparent border-b-2 border-primary/30 focus:border-primary outline-none text-center transition-colors"
              />
            </div>
            <div className="max-h-[340px] overflow-y-auto conversion-dropdown pr-1 space-y-0.5">
              {ALL_CONVERTIBLE_UNITS.map((unitKey) => {
                const unitInfo = UNITS[unitKey];
                const isActive = unitKey === input.unit;
                const category = unitInfo?.category;

                return (
                  <motion.button
                    key={unitKey}
                    ref={isActive ? activeFromRef : undefined}
                    onClick={() => handleSelectFromUnit(unitKey)}
                    className={`w-full text-left py-2 px-3 rounded-lg transition-colors text-sm ${
                      isActive
                        ? 'bg-primary text-primary-foreground font-medium'
                        : 'hover:bg-secondary/50 text-muted-foreground hover:text-foreground'
                    }`}
                    whileTap={{ scale: 0.97 }}
                  >
                    <span>{unitInfo?.name || unitKey}</span>
                    {category === 'weight' && !isActive && (
                      <span className="text-xs text-muted-foreground/50 ml-1">(weight)</span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right side - Scrollable conversions */}
        <div className="flex-1 min-w-0">
          <label className="text-sm text-muted-foreground block mb-2">To</label>
          <div className="max-h-[400px] overflow-y-auto conversion-dropdown pr-2 space-y-1">
            {conversions.map(({ unitKey, unitName, value, formatted }) => {
              const isEditing = editingUnit === unitKey;
              const isCopied = copiedUnit === unitKey;
              const category = UNITS[unitKey]?.category;

              return (
                <motion.div
                  key={unitKey}
                  className="flex items-center justify-between py-3 px-4 rounded-xl hover:bg-secondary/50 transition-colors group cursor-pointer"
                  onClick={() => !isEditing && handleCopyValue(unitKey, formatted!, unitName)}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => handleEditComplete(unitKey)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleEditComplete(unitKey);
                          if (e.key === 'Escape') {
                            setEditingUnit(null);
                            setEditValue('');
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                        className="w-24 text-lg font-medium bg-secondary/50 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    ) : (
                      <span 
                        className="text-lg font-medium cursor-text"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartEdit(unitKey, value!);
                        }}
                      >
                        {formatted}
                      </span>
                    )}
                    <span className="text-muted-foreground">{unitName}</span>
                    {category === 'weight' && (
                      <span className="text-xs text-muted-foreground/50 ml-1">(weight)</span>
                    )}
                  </div>

                  <motion.div
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    initial={false}
                    animate={{ scale: isCopied ? 1.2 : 1 }}
                  >
                    {isCopied ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4 text-muted-foreground" />
                    )}
                  </motion.div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
