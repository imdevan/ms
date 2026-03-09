import { parseRecipeText, parseInstructions, parseIngredientLine, type ParsedRecipe } from './parser';

export interface ScrapedRecipe {
  recipe: ParsedRecipe;
  title: string;
  sourceUrl: string;
}

// Check if text looks like a URL
export function isUrl(text: string): boolean {
  const trimmed = text.trim();
  return /^https?:\/\//i.test(trimmed) || /^www\./i.test(trimmed);
}

// Fetch and parse a recipe from a URL
export async function scrapeRecipeFromUrl(url: string): Promise<ScrapedRecipe> {
  let normalizedUrl = url.trim();
  if (!/^https?:\/\//i.test(normalizedUrl)) {
    normalizedUrl = `https://${normalizedUrl}`;
  }

  // Fetch via CORS proxy
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(normalizedUrl)}`;
  
  const response = await fetch(proxyUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch page (${response.status})`);
  }
  
  const html = await response.text();
  
  // Try JSON-LD first (most reliable)
  const jsonLdRecipe = parseJsonLd(html);
  if (jsonLdRecipe) {
    return { ...jsonLdRecipe, sourceUrl: normalizedUrl };
  }
  
  // Try microdata / WPRM markup
  const microdataRecipe = parseMicrodata(html);
  if (microdataRecipe) {
    return { ...microdataRecipe, sourceUrl: normalizedUrl };
  }
  
  // Fallback: try to extract text content and parse it
  const fallback = parseFallback(html);
  if (fallback) {
    return { ...fallback, sourceUrl: normalizedUrl };
  }
  
  throw new Error('Could not find a recipe on this page');
}

// Parse JSON-LD Recipe schema
function parseJsonLd(html: string): Omit<ScrapedRecipe, 'sourceUrl'> | null {
  const scriptRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  
  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      const recipe = findRecipeInJsonLd(data);
      if (recipe) {
        return convertJsonLdToRecipe(recipe);
      }
    } catch {
      // Continue to next script tag
    }
  }
  
  return null;
}

// Recursively find Recipe object in JSON-LD
function findRecipeInJsonLd(data: any): any | null {
  if (!data) return null;
  
  if (Array.isArray(data)) {
    for (const item of data) {
      const found = findRecipeInJsonLd(item);
      if (found) return found;
    }
    return null;
  }
  
  if (typeof data === 'object') {
    if (data['@type'] === 'Recipe' || 
        (Array.isArray(data['@type']) && data['@type'].includes('Recipe'))) {
      return data;
    }
    
    // Check @graph
    if (data['@graph']) {
      return findRecipeInJsonLd(data['@graph']);
    }
  }
  
  return null;
}

// Convert JSON-LD Recipe to our format
function convertJsonLdToRecipe(data: any): Omit<ScrapedRecipe, 'sourceUrl'> {
  const title = data.name || '';
  
  // Parse ingredients
  const ingredientLines: string[] = [];
  if (Array.isArray(data.recipeIngredient)) {
    ingredientLines.push(...data.recipeIngredient);
  }
  
  // Parse instructions
  const instructionTexts: string[] = [];
  if (Array.isArray(data.recipeInstructions)) {
    for (const inst of data.recipeInstructions) {
      if (typeof inst === 'string') {
        instructionTexts.push(stripHtml(inst));
      } else if (inst['@type'] === 'HowToStep') {
        instructionTexts.push(stripHtml(inst.text || inst.name || ''));
      } else if (inst['@type'] === 'HowToSection') {
        // Section with steps
        if (Array.isArray(inst.itemListElement)) {
          for (const step of inst.itemListElement) {
            if (typeof step === 'string') {
              instructionTexts.push(stripHtml(step));
            } else {
              instructionTexts.push(stripHtml(step.text || step.name || ''));
            }
          }
        }
      }
    }
  }
  
  // Parse notes from description
  const notes = data.description ? stripHtml(data.description) : '';
  
  // Build recipe text for parsing
  const recipeText = ingredientLines.join('\n');
  const recipe = parseRecipeText(recipeText);
  recipe.instructions = instructionTexts.filter(t => t.trim().length > 0);
  recipe.title = title;
  recipe.notes = notes;
  
  return { recipe, title };
}

// Parse WPRM / microdata markup from HTML
function parseMicrodata(html: string): Omit<ScrapedRecipe, 'sourceUrl'> | null {
  // Look for WPRM recipe container
  const ingredientRegex = /<li[^>]*class="[^"]*wprm-recipe-ingredient[^"]*"[^>]*>([\s\S]*?)<\/li>/gi;
  const instructionRegex = /<li[^>]*class="[^"]*wprm-recipe-instruction[^"]*"[^>]*>([\s\S]*?)<\/li>/gi;
  const titleRegex = /<h2[^>]*class="[^"]*wprm-recipe-name[^"]*"[^>]*>([\s\S]*?)<\/h2>/i;
  
  const ingredients: string[] = [];
  let ingMatch;
  while ((ingMatch = ingredientRegex.exec(html)) !== null) {
    const text = stripHtml(ingMatch[1]).trim();
    if (text) ingredients.push(text);
  }
  
  if (ingredients.length === 0) {
    // Try generic itemprop="recipeIngredient"
    const itemPropRegex = /<[^>]*itemprop=["']recipeIngredient["'][^>]*>([\s\S]*?)<\/[^>]*>/gi;
    while ((ingMatch = itemPropRegex.exec(html)) !== null) {
      const text = stripHtml(ingMatch[1]).trim();
      if (text) ingredients.push(text);
    }
  }
  
  if (ingredients.length === 0) return null;
  
  const instructions: string[] = [];
  let instMatch;
  while ((instMatch = instructionRegex.exec(html)) !== null) {
    const text = stripHtml(instMatch[1]).trim();
    if (text) instructions.push(text);
  }
  
  // Get title
  const titleMatch = titleRegex.exec(html);
  const title = titleMatch ? stripHtml(titleMatch[1]).trim() : '';
  
  const recipeText = ingredients.join('\n');
  const recipe = parseRecipeText(recipeText);
  recipe.instructions = instructions;
  recipe.title = title;
  
  return { recipe, title };
}

// Fallback: extract visible text and try to parse
function parseFallback(html: string): Omit<ScrapedRecipe, 'sourceUrl'> | null {
  // Remove script and style tags
  let text = html.replace(/<script[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<nav[\s\S]*?<\/nav>/gi, '');
  text = text.replace(/<footer[\s\S]*?<\/footer>/gi, '');
  text = text.replace(/<header[\s\S]*?<\/header>/gi, '');
  
  // Convert <br>, <p>, <li>, <div> to newlines
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/(p|div|li|h[1-6])>/gi, '\n');
  text = text.replace(/<li[^>]*>/gi, '• ');
  
  // Strip remaining HTML
  text = stripHtml(text);
  
  // Clean up whitespace
  text = text.replace(/\n{3,}/g, '\n\n').trim();
  
  if (text.length < 20) return null;
  
  const recipe = parseRecipeText(text);
  if (recipe.sections.length === 0) return null;
  
  // Try to extract title from HTML <title>
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? stripHtml(titleMatch[1]).trim().split('|')[0].split('-')[0].trim() : '';
  recipe.title = title;
  
  return { recipe, title };
}

// Strip HTML tags and decode entities
function stripHtml(html: string): string {
  let text = html.replace(/<[^>]*>/g, ' ');
  // Decode common HTML entities
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&#8217;/g, "'");
  text = text.replace(/&#8220;/g, '"');
  text = text.replace(/&#8221;/g, '"');
  text = text.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)));
  // Normalize whitespace
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}
