import { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, Clipboard, ArrowRight, Plus, Link, Loader2 } from 'lucide-react';
import { isUrl, scrapeRecipeFromUrl, type ScrapedRecipe } from '@/lib/scraper';
import { toast } from 'sonner';

interface DropZoneProps {
  onTextReceived: (text: string) => void;
  onRecipeScraped?: (scraped: ScrapedRecipe) => void;
  isEmpty: boolean;
}

export function DropZone({ onTextReceived, onRecipeScraped, isEmpty }: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmitUrl = useCallback(async (url: string) => {
    if (!onRecipeScraped) return;
    setIsLoading(true);
    try {
      const scraped = await scrapeRecipeFromUrl(url);
      onRecipeScraped(scraped);
      setPasteText('');
      toast.success('Recipe imported successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch recipe from URL');
    } finally {
      setIsLoading(false);
    }
  }, [onRecipeScraped]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const text = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('text');
    if (text) {
      if (isUrl(text) && onRecipeScraped) {
        handleSubmitUrl(text);
      } else {
        onTextReceived(text);
      }
    }
  }, [onTextReceived, onRecipeScraped, handleSubmitUrl]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    if (isEmpty) {
      e.preventDefault();
      const text = e.clipboardData.getData('text');
      if (text) {
        if (isUrl(text.trim()) && onRecipeScraped) {
          handleSubmitUrl(text.trim());
        } else {
          onTextReceived(text);
        }
      }
    }
  }, [isEmpty, onTextReceived, onRecipeScraped, handleSubmitUrl]);

  const handleSubmit = useCallback(() => {
    const trimmed = pasteText.trim();
    if (!trimmed) return;
    
    if (isUrl(trimmed) && onRecipeScraped) {
      handleSubmitUrl(trimmed);
    } else {
      onTextReceived(trimmed);
      setPasteText('');
    }
  }, [pasteText, onTextReceived, onRecipeScraped, handleSubmitUrl]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey || e.shiftKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const handleGlobalPaste = useCallback((e: React.ClipboardEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') {
      if (target.closest('[data-no-global-paste]')) {
        return;
      }
    }
    
    if (isEmpty) {
      const text = e.clipboardData.getData('text');
      if (text) {
        e.preventDefault();
        if (isUrl(text.trim()) && onRecipeScraped) {
          handleSubmitUrl(text.trim());
        } else {
          onTextReceived(text);
        }
      }
    }
  }, [isEmpty, onTextReceived, onRecipeScraped, handleSubmitUrl]);

  if (!isEmpty) {
    return null;
  }

  const inputLooksLikeUrl = isUrl(pasteText.trim());

  return (
    <motion.div
      className={`drop-zone ${isDragOver ? 'active' : ''} p-8 sm:p-12`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onPaste={handleGlobalPaste}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 25 }}
      data-testid="drop-zone"
    >
      <div className="flex flex-col items-center gap-6 text-center">
        <motion.div
          className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center"
          animate={isDragOver ? { scale: 1.1, rotate: 5 } : isLoading ? { scale: [1, 1.05, 1] } : { scale: 1, rotate: 0 }}
          transition={isLoading ? { repeat: Infinity, duration: 1.5 } : undefined}
        >
          {isLoading ? (
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
          ) : isDragOver ? (
            <Upload className="w-10 h-10 text-primary" />
          ) : (
            <Clipboard className="w-10 h-10 text-primary" />
          )}
        </motion.div>

        <div className="space-y-2">
          <h2 className="text-2xl">{isLoading ? 'Fetching recipe...' : 'Paste your recipe'}</h2>
          <p className="text-muted-foreground max-w-md">
            {isLoading 
              ? 'Importing ingredients, instructions, and notes from the page'
              : 'Paste a recipe URL or ingredient list to get started'
            }
          </p>
        </div>

        {!isLoading && (
          <div className="w-full max-w-md space-y-4">
            <textarea
              ref={textareaRef}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              onPaste={handlePaste}
              onKeyDown={handleKeyDown}
              placeholder="Paste a recipe URL or ingredients here..."
              className="w-full h-40 p-4 rounded-xl bg-secondary/50 border border-border/50 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              data-testid="paste-textarea"
            />

            <motion.button
              onClick={handleSubmit}
              disabled={!pasteText.trim()}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              whileHover={pasteText.trim() ? { scale: 1.02 } : undefined}
              whileTap={pasteText.trim() ? { scale: 0.98 } : undefined}
              data-testid="parse-button"
            >
              {inputLooksLikeUrl ? (
                <>
                  <Link className="w-5 h-5" />
                  <span>Import from URL</span>
                </>
              ) : (
                <>
                  <span>Parse Ingredients</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </motion.button>
          </div>
        )}

        {!isLoading && (
          <p className="text-sm text-muted-foreground">
            Tip: You can also drag text directly from any website
          </p>
        )}
      </div>
    </motion.div>
  );
}

// Subtle inline input for adding more ingredients
interface AddIngredientInputProps {
  onAdd: (text: string) => void;
}

export function AddIngredientInput({ onAdd }: AddIngredientInputProps) {
  const [value, setValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = useCallback(() => {
    if (value.trim()) {
      onAdd(value.trim());
      setValue('');
    }
  }, [value, onAdd]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || ((e.metaKey || e.ctrlKey || e.shiftKey) && e.key === 'Enter')) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  return (
    <motion.div 
      className="mt-2"
      initial={false}
      animate={{ 
        opacity: isFocused || value ? 1 : 0.4,
      }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center gap-2">
        <Plus className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder="Add more ingredients..."
          className="flex-1 py-2 px-0 text-sm bg-transparent border-none outline-none placeholder:text-muted-foreground/50 focus:placeholder:text-muted-foreground/70"
        />
      </div>
    </motion.div>
  );
}
