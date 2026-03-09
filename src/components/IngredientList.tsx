import React, { forwardRef, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import type { ParsedSection, ParsedIngredient } from '@/lib/parser';
import { IngredientRow } from './IngredientRow';
import { SwipeToDelete } from './SwipeToDelete';
import { TotalVolume } from './TotalVolume';
import { EditableItem } from './EditableItem';
import { useLongPress } from '@/hooks/useLongPress';
import { isImperialUnit } from '@/lib/units';

interface SortableIngredientProps {
  ingredient: ParsedIngredient;
  sectionId: string;
  scale: number;
  useFractions: boolean;
  preferImperial: boolean;
  isEditing: boolean;
  onToggleIngredient: (sectionId: string, ingredientId: string) => void;
  onChangeUnit: (sectionId: string, ingredientId: string, newUnit: string) => void;
  onDeleteIngredient?: (sectionId: string, ingredientId: string) => void;
  onStartEdit: () => void;
  onSaveEdit: (newText: string) => void;
  onCancelEdit: () => void;
}

function SortableIngredient({
  ingredient,
  sectionId,
  scale,
  useFractions,
  preferImperial,
  isEditing,
  onToggleIngredient,
  onChangeUnit,
  onDeleteIngredient,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
}: SortableIngredientProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: ingredient.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.8 : 1,
  };

  const { isPressed, handlers } = useLongPress({
    onLongPress: onStartEdit,
    delay: 500,
  });

  if (isEditing) {
    return (
      <div ref={setNodeRef} style={style} className="relative group">
        <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center px-1 py-2 text-muted-foreground/30 opacity-0">
          <GripVertical className="w-4 h-4" />
        </div>
        <div className="w-full p-2 rounded-xl bg-secondary/30">
          <EditableItem
            value={ingredient.original}
            isEditing={true}
            onSave={onSaveEdit}
            onCancel={onCancelEdit}
          >
            <span>{ingredient.original}</span>
          </EditableItem>
        </div>
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <button
        className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center px-1 py-2 text-muted-foreground/30 hover:text-muted-foreground cursor-grab active:cursor-grabbing touch-none opacity-0 group-hover:opacity-100 transition-opacity z-10"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <div className="w-full" {...handlers}>
        <SwipeToDelete onDelete={() => onDeleteIngredient?.(sectionId, ingredient.id)}>
          <IngredientRow
            ingredient={ingredient}
            scale={scale}
            useFractions={useFractions}
            preferImperial={preferImperial}
            onToggleChecked={() => onToggleIngredient(sectionId, ingredient.id)}
            onUnitChange={(newUnit) => onChangeUnit(sectionId, ingredient.id, newUnit)}
          />
        </SwipeToDelete>
      </div>
    </div>
  );
}

interface IngredientListProps {
  sections: ParsedSection[];
  scale: number;
  useFractions: boolean;
  onToggleIngredient: (sectionId: string, ingredientId: string) => void;
  onChangeUnit: (sectionId: string, ingredientId: string, newUnit: string) => void;
  onDeleteIngredient?: (sectionId: string, ingredientId: string) => void;
  onUpdateIngredient?: (sectionId: string, ingredientId: string, newText: string) => void;
  onReorderIngredients?: (sectionId: string, newIngredients: ParsedIngredient[]) => void;
}

export const IngredientList = forwardRef<HTMLDivElement, IngredientListProps>(function IngredientList({
  sections,
  scale,
  useFractions,
  onToggleIngredient,
  onChangeUnit,
  onDeleteIngredient,
  onUpdateIngredient,
  onReorderIngredients,
}, ref) {
  const [editingId, setEditingId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  if (sections.length === 0) {
    return null;
  }

  // Detect if recipe uses imperial units by checking the first ingredient with a unit
  const preferImperial = (() => {
    for (const section of sections) {
      for (const ingredient of section.ingredients) {
        if (ingredient.unit) {
          return isImperialUnit(ingredient.unit);
        }
      }
    }
    return true; // Default to imperial
  })();

  const handleDragEnd = (sectionId: string, ingredients: ParsedIngredient[]) => (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = ingredients.findIndex((item) => item.id === active.id);
      const newIndex = ingredients.findIndex((item) => item.id === over.id);
      const newIngredients = arrayMove(ingredients, oldIndex, newIndex);
      onReorderIngredients?.(sectionId, newIngredients);
    }
  };

  return (
    <div className="space-y-4" data-testid="ingredient-list" ref={ref}>
      <div className="space-y-6">
        {sections.map((section, sectionIdx) => (
          <motion.div
            key={section.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: sectionIdx * 0.1 }}
          >
            {section.title && (
              <h3 className="text-lg mb-3 px-2">{section.title}</h3>
            )}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd(section.id, section.ingredients)}
            >
              <SortableContext
                items={section.ingredients.map(ing => ing.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-1">
                  {section.ingredients.map((ingredient) => (
                    <SortableIngredient
                      key={ingredient.id}
                      ingredient={ingredient}
                      sectionId={section.id}
                      scale={scale}
                      useFractions={useFractions}
                      preferImperial={preferImperial}
                      isEditing={editingId === ingredient.id}
                      onToggleIngredient={onToggleIngredient}
                      onChangeUnit={onChangeUnit}
                      onDeleteIngredient={onDeleteIngredient}
                      onStartEdit={() => setEditingId(ingredient.id)}
                      onSaveEdit={(newText) => {
                        onUpdateIngredient?.(section.id, ingredient.id, newText);
                        setEditingId(null);
                      }}
                      onCancelEdit={() => setEditingId(null)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </motion.div>
        ))}
      </div>
      
      <TotalVolume
        sections={sections}
        scale={scale}
        useFractions={useFractions}
      />
    </div>
  );
});
