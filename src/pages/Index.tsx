import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { SideMenu } from '@/components/SideMenu';
import { DropZone, AddIngredientInput } from '@/components/DropZone';
import { IngredientList } from '@/components/IngredientList';
import { InstructionsList } from '@/components/InstructionsList';
import { NotesList } from '@/components/NotesList';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { ConversionMode } from '@/components/ConversionMode';
import { ConversionPreview } from '@/components/ConversionPreview';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { parseRecipeText, parseInstructions, parseIngredientLine, type ParsedRecipe, type ParsedIngredient } from '@/lib/parser';
import { isSingleMeasurement, parseSingleMeasurement, loadLastConversion, type ConversionInput } from '@/lib/conversion';
import { encodeRecipeToHash, decodeRecipeFromHash, updateUrlWithTitle, getUrlHash, getUrlTitle } from '@/lib/state';
import { scrapeRecipeFromUrl, type ScrapedRecipe } from '@/lib/scraper';
import { convertUnit, UNITS, formatNumber } from '@/lib/units';
import { useWakeLock } from '@/hooks/useWakeLock';
import { useTheme } from '@/hooks/useTheme';
import { useIsMobile } from '@/hooks/use-mobile';
import { RotateCcw, Share2, ArrowLeftRight } from 'lucide-react';
import { toast } from 'sonner';

export default function Index() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [recipe, setRecipe] = useState<ParsedRecipe>({
    sections: [],
    notes: '',
    instructions: [],
    title: '',
  });
  const [scale, setScale] = useState(1);
  const [useFractions, setUseFractions] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isResetSpinning, setIsResetSpinning] = useState(false);
  
  // Split view state
  const [splitView, setSplitView] = useState(() => {
    try { return localStorage.getItem('splitView') === 'true'; } catch { return false; }
  });
  const [panelOrder, setPanelOrder] = useState<'recipe-notes' | 'notes-recipe'>(() => {
    try { return (localStorage.getItem('panelOrder') as any) || 'recipe-notes'; } catch { return 'recipe-notes'; }
  });
  
  // Conversion mode state
  const [isConversionMode, setIsConversionMode] = useState(false);
  const [conversionInput, setConversionInput] = useState<ConversionInput>(loadLastConversion);
  const [showConversionPreview, setShowConversionPreview] = useState(true);

  const { isActive: cookMode, isSupported: cookModeSupported, toggle: toggleCookMode } = useWakeLock();
  const { resolvedTheme, toggleTheme } = useTheme();
  const isMobile = useIsMobile();

  const hasRecipe = recipe.sections.length > 0;

  // Persist split view settings
  useEffect(() => {
    try { localStorage.setItem('splitView', String(splitView)); } catch {}
  }, [splitView]);
  useEffect(() => {
    try { localStorage.setItem('panelOrder', panelOrder); } catch {}
  }, [panelOrder]);

  const handleToggleSplitView = useCallback(() => {
    setSplitView(prev => !prev);
  }, []);

  const handleSwapPanels = useCallback(() => {
    setPanelOrder(prev => prev === 'recipe-notes' ? 'notes-recipe' : 'recipe-notes');
  }, []);

  // Check for convert query param on mount
  useEffect(() => {
    const convertParam = searchParams.get('convert');
    if (convertParam === 'true' || convertParam === '1') {
      setIsConversionMode(true);
      setShowConversionPreview(false);
    }
  }, [searchParams]);

  // Load state from URL hash on mount
  useEffect(() => {
    const hash = getUrlHash();
    const title = getUrlTitle();

    if (hash) {
      const decoded = decodeRecipeFromHash(hash);
      if (decoded) {
        setRecipe({ ...decoded.recipe, title });
        setScale(decoded.scale);
        setUseFractions(decoded.useFractions);
        setShowConversionPreview(false);
      }
    }
  }, []);

  // Save state to URL hash when it changes
  useEffect(() => {
    if (hasRecipe) {
      const hash = encodeRecipeToHash(recipe, scale, useFractions);
      updateUrlWithTitle(hash, recipe.title);
    } else if (!isConversionMode) {
      updateUrlWithTitle('', '');
    }
  }, [recipe, scale, useFractions, hasRecipe, isConversionMode]);

  // Update URL when entering/leaving conversion mode
  useEffect(() => {
    if (isConversionMode && !hasRecipe) {
      setSearchParams({ convert: '1' }, { replace: true });
    } else if (!isConversionMode && !hasRecipe) {
      setSearchParams({}, { replace: true });
    }
  }, [isConversionMode, hasRecipe, setSearchParams]);

  const handleTextReceived = useCallback((text: string) => {
    // Check if this is a single measurement for conversion mode
    if (isSingleMeasurement(text)) {
      const parsed = parseSingleMeasurement(text);
      if (parsed) {
        setConversionInput(parsed);
        setIsConversionMode(true);
        setShowConversionPreview(false);
        return;
      }
    }
    
    // Otherwise parse as recipe
    const parsed = parseRecipeText(text);
    setRecipe(parsed);
    setScale(1);
    setIsConversionMode(false);
    setShowConversionPreview(false);
  }, []);

  const handleRecipeScraped = useCallback((scraped: ScrapedRecipe) => {
    const { recipe: scrapedRecipe, sourceUrl } = scraped;
    // Prepend source URL to notes
    const urlNote = `Source: ${sourceUrl}`;
    const existingNotes = scrapedRecipe.notes ? scrapedRecipe.notes.trim() : '';
    scrapedRecipe.notes = existingNotes ? `${urlNote}\n${existingNotes}` : urlNote;
    
    setRecipe(scrapedRecipe);
    setScale(1);
    setIsConversionMode(false);
    setShowConversionPreview(false);
  }, []);

  const handleScaleChange = useCallback((newScale: number) => {
    const clamped = Math.max(0.01, Math.min(100, newScale));
    setScale(clamped);
  }, []);

  const handleToggleFractions = useCallback(() => {
    setUseFractions(prev => !prev);
  }, []);

  const handleToggleIngredient = useCallback((sectionId: string, ingredientId: string) => {
    setRecipe(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? {
            ...section,
            ingredients: section.ingredients.map(ing =>
              ing.id === ingredientId
                ? { ...ing, checked: !ing.checked }
                : ing
            ),
          }
          : section
      ),
    }));
  }, []);

  const handleChangeUnit = useCallback((sectionId: string, ingredientId: string, newUnit: string) => {
    setRecipe(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? {
            ...section,
            ingredients: section.ingredients.map(ing => {
              if (ing.id !== ingredientId || !ing.unit || !ing.quantity) return ing;

              const converted = convertUnit(ing.quantity, ing.unit, newUnit);
              if (converted === null) return ing;

              return {
                ...ing,
                quantity: converted,
                unit: newUnit,
              };
            }),
          }
          : section
      ),
    }));
  }, []);

  const handleDeleteIngredient = useCallback((sectionId: string, ingredientId: string) => {
    setRecipe(prev => ({
      ...prev,
      sections: prev.sections
        .map(section =>
          section.id === sectionId
            ? {
              ...section,
              ingredients: section.ingredients.filter(ing => ing.id !== ingredientId),
            }
            : section
        )
        .filter(section => section.ingredients.length > 0),
    }));
  }, []);

  const handleDeleteInstruction = useCallback((index: number) => {
    setRecipe(prev => ({
      ...prev,
      instructions: prev.instructions.filter((_, i) => i !== index),
    }));
  }, []);

  const handleUpdateInstruction = useCallback((index: number, newText: string) => {
    setRecipe(prev => ({
      ...prev,
      instructions: prev.instructions.map((inst, i) => i === index ? newText : inst),
    }));
  }, []);

  const handleReorderInstructions = useCallback((newInstructions: string[]) => {
    setRecipe(prev => ({
      ...prev,
      instructions: newInstructions,
    }));
  }, []);

  const handleUpdateIngredient = useCallback((sectionId: string, ingredientId: string, newText: string) => {
    const parsed = parseIngredientLine(newText);
    if (!parsed) return;
    
    setRecipe(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? {
            ...section,
            ingredients: section.ingredients.map(ing =>
              ing.id === ingredientId ? { ...parsed, id: ingredientId, checked: ing.checked } : ing
            ),
          }
          : section
      ),
    }));
  }, []);

  const handleReorderIngredients = useCallback((sectionId: string, newIngredients: ParsedIngredient[]) => {
    setRecipe(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? { ...section, ingredients: newIngredients }
          : section
      ),
    }));
  }, []);

  const handleResetCheckboxes = useCallback(() => {
    setRecipe(prev => ({
      ...prev,
      sections: prev.sections.map(section => ({
        ...section,
        ingredients: section.ingredients.map(ing => ({
          ...ing,
          checked: false,
        })),
      })),
    }));
    setIsMenuOpen(false);
  }, []);

  const handleResetCheckboxesWithAnimation = useCallback(() => {
    setIsResetSpinning(true);
    handleResetCheckboxes();
    setTimeout(() => setIsResetSpinning(false), 500);
  }, [handleResetCheckboxes]);

  const handleNotesChange = useCallback((notes: string) => {
    setRecipe(prev => ({ ...prev, notes }));
  }, []);

  const handleInstructionsChange = useCallback((text: string) => {
    const instructions = text ? parseInstructions(text) : [];
    setRecipe(prev => ({ ...prev, instructions }));
  }, []);

  const handleTitleChange = useCallback((title: string) => {
    setRecipe(prev => ({ ...prev, title }));
  }, []);

  const handlePrint = useCallback(() => {
    const lines: string[] = [];

    if (recipe.title) {
      lines.push(recipe.title);
      lines.push('='.repeat(recipe.title.length));
      lines.push('');
    }

    if (recipe.notes) {
      lines.push('Notes:');
      lines.push(recipe.notes);
      lines.push('');
    }

    if (recipe.sections.length > 0) {
      lines.push('Ingredients:');
      for (const section of recipe.sections) {
        if (section.title) {
          lines.push(`  ${section.title}`);
        }
        for (const ing of section.ingredients) {
          let line = '  • ';
          if (ing.quantity !== null) {
            const scaled = ing.quantity * scale;
            line += formatNumber(scaled, useFractions);
          }
          if (ing.unit) {
            const unitInfo = UNITS[ing.unit];
            line += ` ${unitInfo?.name || ing.unit}`;
          }
          line += ` ${ing.ingredient}`;
          if (ing.parentheticalQuantity !== null && ing.parentheticalUnit) {
            const scaledParen = ing.parentheticalQuantity * scale;
            const parenUnitInfo = UNITS[ing.parentheticalUnit];
            line += ` (${formatNumber(scaledParen, useFractions)} ${parenUnitInfo?.name || ing.parentheticalUnit})`;
          } else if (ing.parenthetical) {
            line += ` (${ing.parenthetical})`;
          }
          lines.push(line.trim());
        }
      }
      lines.push('');
    }

    if (recipe.instructions.length > 0) {
      lines.push('Instructions:');
      recipe.instructions.forEach((inst, idx) => {
        lines.push(`  ${idx + 1}. ${inst}`);
      });
    }

    const printContent = lines.join('\n');
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${recipe.title || 'Recipe'}</title>
            <style>
              body {
                font-family: 'Georgia', serif;
                line-height: 1.6;
                max-width: 600px;
                margin: 40px auto;
                padding: 20px;
                white-space: pre-wrap;
              }
            </style>
          </head>
          <body>${printContent}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }

    setIsMenuOpen(false);
  }, [recipe, scale, useFractions]);

  const handleClearRecipe = useCallback(() => {
    setRecipe({ sections: [], notes: '', instructions: [], title: '' });
    setScale(1);
    setIsMenuOpen(false);
    setIsConversionMode(false);
    setShowConversionPreview(true);
  }, []);

  const handleShareRecipe = useCallback(() => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      toast.success('Link copied to clipboard!');
    }).catch(() => {
      toast.error('Failed to copy link');
    });
  }, []);

  const handleAddIngredient = useCallback((text: string) => {
    const lines = text.split('\n').filter(l => l.trim());
    const newIngredients = lines.map(line => parseIngredientLine(line)).filter(Boolean);
    
    if (newIngredients.length === 0) return;
    
    setRecipe(prev => {
      if (prev.sections.length === 0) {
        return {
          ...prev,
          sections: [{
            id: `section_${Date.now()}`,
            title: '',
            ingredients: newIngredients as any[],
          }],
        };
      }
      
      const sections = [...prev.sections];
      const lastSection = { ...sections[sections.length - 1] };
      lastSection.ingredients = [...lastSection.ingredients, ...newIngredients as any[]];
      sections[sections.length - 1] = lastSection;
      
      return { ...prev, sections };
    });
  }, []);

  const handleConversionInputChange = useCallback((input: ConversionInput) => {
    setConversionInput(input);
  }, []);

  const handleCloseConversionMode = useCallback(() => {
    setIsConversionMode(false);
    setShowConversionPreview(true);
  }, []);

  const handleOpenConversionMode = useCallback(() => {
    setIsConversionMode(true);
    setShowConversionPreview(false);
  }, []);

  const instructionsText = useMemo(() => {
    return recipe.instructions.map((inst, idx) => `${idx + 1}. ${inst}`).join('\n');
  }, [recipe.instructions]);

  // Render the ingredients + notes panel
  const renderIngredientsNotesPanel = () => (
    <div className="space-y-6 h-full overflow-y-auto">
      {/* Ingredients */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-display">Ingredients</h2>
          <motion.button
            onClick={handleResetCheckboxesWithAnimation}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
            whileTap={{ scale: 0.95 }}
            title="Reset checkboxes"
          >
            <motion.div
              animate={{ rotate: isResetSpinning ? -360 : 0 }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
            >
              <RotateCcw className="w-5 h-5" />
            </motion.div>
          </motion.button>
        </div>

        <IngredientList
          sections={recipe.sections}
          scale={scale}
          useFractions={useFractions}
          onToggleIngredient={handleToggleIngredient}
          onChangeUnit={handleChangeUnit}
          onDeleteIngredient={handleDeleteIngredient}
          onUpdateIngredient={handleUpdateIngredient}
          onReorderIngredients={handleReorderIngredients}
        />
        
        <AddIngredientInput onAdd={handleAddIngredient} />
      </div>

      {/* Notes section */}
      <div className="glass-card p-6">
        <h2 className="text-xl font-display mb-4">Notes</h2>
        <NotesList
          notes={recipe.notes}
          onUpdateNotes={handleNotesChange}
        />
        <textarea
          value={recipe.notes}
          onChange={(e) => handleNotesChange(e.target.value)}
          placeholder="Add any notes about this recipe..."
          className="w-full min-h-[120px] mt-4 p-4 rounded-xl bg-secondary/50 border border-border/50 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
        />
      </div>
    </div>
  );

  // Render the instructions panel
  const renderInstructionsPanel = () => (
    <div className="h-full overflow-y-auto">
      <CollapsibleSection
        title="Instructions"
        placeholder="Paste recipe instructions here..."
        value={instructionsText}
        onChange={handleInstructionsChange}
        renderContent={() => (
          <InstructionsList
            instructions={recipe.instructions}
            onDeleteInstruction={handleDeleteInstruction}
            onUpdateInstruction={handleUpdateInstruction}
            onReorderInstructions={handleReorderInstructions}
          />
        )}
        testId="instructions-section"
      />
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        scale={scale}
        onScaleChange={handleScaleChange}
        useFractions={useFractions}
        onToggleFractions={handleToggleFractions}
        cookMode={cookMode}
        onToggleCookMode={toggleCookMode}
        cookModeSupported={cookModeSupported}
        isDark={resolvedTheme === 'dark'}
        onToggleTheme={toggleTheme}
        hasRecipe={hasRecipe}
        onOpenMenu={() => setIsMenuOpen(true)}
        splitView={splitView}
        onToggleSplitView={handleToggleSplitView}
      />

      <main className={`flex-1 ${splitView && hasRecipe ? 'max-w-6xl' : 'max-w-3xl'} mx-auto w-full px-4 py-8 space-y-6`}>
        {/* Conversion Mode */}
        <AnimatePresence mode="wait">
          {isConversionMode && !hasRecipe && (
            <ConversionMode
              input={conversionInput}
              onInputChange={handleConversionInputChange}
              onClose={handleCloseConversionMode}
              useFractions={useFractions}
            />
          )}
        </AnimatePresence>

        {/* Conversion preview above drop zone when not in conversion mode */}
        {!isConversionMode && !hasRecipe && showConversionPreview && (
          <motion.div 
            className="flex justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <ConversionPreview
              input={conversionInput}
              useFractions={useFractions}
              onClick={handleOpenConversionMode}
            />
          </motion.div>
        )}

        {/* Drop zone / Empty state */}
        {!isConversionMode && (
          <DropZone onTextReceived={handleTextReceived} onRecipeScraped={handleRecipeScraped} isEmpty={!hasRecipe} />
        )}

        {/* Recipe content */}
        {hasRecipe && (
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {/* Title input */}
            <div className="glass-card p-4">
              <input
                type="text"
                value={recipe.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Recipe title (optional)"
                className="w-full text-xl font-display bg-transparent border-none outline-none placeholder:text-muted-foreground/50"
                data-testid="recipe-title-input"
              />
            </div>

            {/* Split view or single column */}
            {splitView ? (
              <div className="relative min-h-[600px]">
                <ResizablePanelGroup direction="horizontal" className="h-full rounded-lg">
                  <ResizablePanel defaultSize={50} minSize={30}>
                    <div className="h-full pr-2">
                      {panelOrder === 'recipe-notes' ? renderIngredientsNotesPanel() : renderInstructionsPanel()}
                    </div>
                  </ResizablePanel>
                  <ResizableHandle withHandle className="relative mx-1">
                    <button
                      onClick={handleSwapPanels}
                      className="absolute top-4 left-1/2 -translate-x-1/2 z-10 p-2 rounded-full bg-secondary/80 hover:bg-secondary transition-colors shadow-md"
                      title="Swap panels"
                    >
                      <ArrowLeftRight className="w-4 h-4" />
                    </button>
                  </ResizableHandle>
                  <ResizablePanel defaultSize={50} minSize={30}>
                    <div className="h-full pl-2">
                      {panelOrder === 'recipe-notes' ? renderInstructionsPanel() : renderIngredientsNotesPanel()}
                    </div>
                  </ResizablePanel>
                </ResizablePanelGroup>
              </div>
            ) : (
              <>
                {/* Ingredients */}
                <div className="glass-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-display">Ingredients</h2>
                    <motion.button
                      onClick={handleResetCheckboxesWithAnimation}
                      className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                      whileTap={{ scale: 0.95 }}
                      title="Reset checkboxes"
                    >
                      <motion.div
                        animate={{ rotate: isResetSpinning ? -360 : 0 }}
                        transition={{ duration: 0.5, ease: 'easeInOut' }}
                      >
                        <RotateCcw className="w-5 h-5" />
                      </motion.div>
                    </motion.button>
                  </div>

                  <IngredientList
                    sections={recipe.sections}
                    scale={scale}
                    useFractions={useFractions}
                    onToggleIngredient={handleToggleIngredient}
                    onChangeUnit={handleChangeUnit}
                    onDeleteIngredient={handleDeleteIngredient}
                    onUpdateIngredient={handleUpdateIngredient}
                    onReorderIngredients={handleReorderIngredients}
                  />
                  
                  <AddIngredientInput onAdd={handleAddIngredient} />
                </div>

                {/* Instructions section */}
                <CollapsibleSection
                  title="Instructions"
                  placeholder="Paste recipe instructions here..."
                  value={instructionsText}
                  onChange={handleInstructionsChange}
                  renderContent={() => (
                    <InstructionsList
                      instructions={recipe.instructions}
                      onDeleteInstruction={handleDeleteInstruction}
                      onUpdateInstruction={handleUpdateInstruction}
                      onReorderInstructions={handleReorderInstructions}
                    />
                  )}
                  testId="instructions-section"
                />
                
                {/* Notes section (non-split view) */}
                <CollapsibleSection
                  title="Notes"
                  placeholder="Add any notes about this recipe..."
                  value={recipe.notes}
                  onChange={handleNotesChange}
                  renderContent={() => (
                    <NotesList
                      notes={recipe.notes}
                      onUpdateNotes={handleNotesChange}
                    />
                  )}
                  testId="notes-section"
                />
              </>
            )}
          </motion.div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-sm text-muted-foreground no-print">
        {hasRecipe ? (
          <motion.button
            onClick={handleShareRecipe}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-secondary/50 transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Share2 className="w-4 h-4" />
            <span>Share this recipe</span>
          </motion.button>
        ) : (
          <p>Made with 🥄 for cooks who love precision</p>
        )}
      </footer>

      {/* Side menu */}
      <SideMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        scale={scale}
        onScaleChange={handleScaleChange}
        useFractions={useFractions}
        onToggleFractions={handleToggleFractions}
        cookMode={cookMode}
        onToggleCookMode={toggleCookMode}
        cookModeSupported={cookModeSupported}
        isDark={resolvedTheme === 'dark'}
        onToggleTheme={toggleTheme}
        onReset={handleResetCheckboxes}
        onPrint={handlePrint}
        onClearRecipe={handleClearRecipe}
        isMobile={isMobile}
        splitView={splitView}
        onToggleSplitView={handleToggleSplitView}
      />
    </div>
  );
}
