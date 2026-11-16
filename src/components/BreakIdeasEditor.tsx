import { Plus, X } from 'lucide-react';
import { useState } from 'react';
import { useBreakIdeas } from '../data/hooks';
import * as repos from '../data/repos';
import { Button, IconButton, inputClass } from './ui';

/** Customize the reward ideas suggested after each focus block. */
export function BreakIdeasEditor() {
  const ideas = useBreakIdeas() ?? [];
  const [draft, setDraft] = useState('');

  async function add() {
    const text = draft.trim();
    if (!text) return;
    await repos.breakIdeas.create({ text, order: Math.max(-1, ...ideas.map((i) => i.order)) + 1 });
    setDraft('');
  }

  return (
    <div className="space-y-2 py-2">
      <ul className="space-y-1.5">
        {ideas.map((idea, i) => (
          <li key={idea.id} className="flex items-center gap-2">
            <input
              className={inputClass}
              defaultValue={idea.text}
              aria-label={`Break idea ${i + 1}`}
              onBlur={(e) => {
                const text = e.target.value.trim();
                if (text && text !== idea.text) void repos.breakIdeas.update(idea.id, { text });
                else e.target.value = idea.text;
              }}
            />
            <IconButton label={`Remove "${idea.text}"`} onClick={() => repos.breakIdeas.remove(idea.id)}>
              <X className="size-4" aria-hidden="true" />
            </IconButton>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <input
          className={inputClass}
          placeholder="Add an idea, e.g. Play with the dog"
          aria-label="New break idea"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <Button onClick={add} disabled={!draft.trim()} aria-label="Add break idea">
          <Plus className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
