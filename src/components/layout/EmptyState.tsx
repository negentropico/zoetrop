/**
 * EmptyState Component
 *
 * Displays a helpful empty state with optional action.
 */

import type { EmptyStateProps } from '@/types/components';
import { FolderOpen, Upload, Plus, Search } from 'lucide-react';

// Icon mapping
const ICONS: Record<string, React.ElementType> = {
  'folder-open': FolderOpen,
  upload: Upload,
  plus: Plus,
  search: Search,
};

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon = 'folder-open',
}: EmptyStateProps) {
  const IconComponent = ICONS[icon] || FolderOpen;

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <IconComponent className="w-8 h-8 text-gray-400" aria-hidden="true" />
      </div>

      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>

      <p className="text-sm text-gray-500 max-w-sm mb-6">{description}</p>

      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export default EmptyState;
