import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { SwipeToDelete } from './SwipeToDelete';
import { DraggableList } from './DraggableList';
import { EditableItem } from './EditableItem';
import { useLongPress } from '@/hooks/useLongPress';

interface NoteItemProps {
  note: string;
  isEditing: boolean;
  onStartEdit: () => void;
  onSave: (newText: string) => void;
  onCancelEdit: () => void;
}

function NoteItem({ 
  note, 
  isEditing,
  onStartEdit,
  onSave,
  onCancelEdit 
}: NoteItemProps) {
  const { isPressed, handlers } = useLongPress({
    onLongPress: onStartEdit,
    delay: 500,
  });

  if (isEditing) {
    return (
      <div className="p-4 rounded-xl bg-secondary/30">
        <EditableItem
          value={note}
          isEditing={true}
          onSave={onSave}
          onCancel={onCancelEdit}
        >
          <span>{note}</span>
        </EditableItem>
      </div>
    );
  }

  // Render note text with clickable links
  const renderNoteText = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    
    return parts.map((part, i) => {
      if (urlRegex.test(part)) {
        return (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2 hover:text-primary/80 break-all"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <motion.div
      className={`p-4 rounded-xl bg-secondary/30 cursor-pointer transition-colors select-none ${
        isPressed ? 'bg-secondary/50 scale-[0.98]' : 'hover:bg-secondary/40'
      }`}
      {...handlers}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
    >
      <p className="whitespace-pre-wrap">{renderNoteText(note)}</p>
    </motion.div>
  );
}

interface NotesListProps {
  notes: string;
  onUpdateNotes: (notes: string) => void;
}

export function NotesList({ notes, onUpdateNotes }: NotesListProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Split notes into individual items by line breaks
  const noteItems = useMemo(() => {
    return notes
      .split('\n')
      .map((line, index) => ({
        id: `note-${index}`,
        text: line.trim(),
      }))
      .filter(item => item.text.length > 0);
  }, [notes]);

  const handleReorder = (newItems: typeof noteItems) => {
    onUpdateNotes(newItems.map(item => item.text).join('\n'));
  };

  const handleSave = (index: number, newText: string) => {
    const newItems = [...noteItems];
    newItems[index] = { ...newItems[index], text: newText };
    onUpdateNotes(newItems.map(item => item.text).join('\n'));
    setEditingIndex(null);
  };

  const handleDelete = (index: number) => {
    const newItems = noteItems.filter((_, i) => i !== index);
    onUpdateNotes(newItems.map(item => item.text).join('\n'));
  };

  if (noteItems.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-8">
        Add any notes about this recipe...
      </p>
    );
  }

  return (
    <div data-testid="notes-list">
      <DraggableList
        items={noteItems}
        getItemId={(item) => item.id}
        onReorder={handleReorder}
        renderItem={(item, index) => (
          <SwipeToDelete
            key={item.id}
            onDelete={() => handleDelete(index)}
          >
            <NoteItem
              note={item.text}
              isEditing={editingIndex === index}
              onStartEdit={() => setEditingIndex(index)}
              onSave={(newText) => handleSave(index, newText)}
              onCancelEdit={() => setEditingIndex(null)}
            />
          </SwipeToDelete>
        )}
      />
    </div>
  );
}
