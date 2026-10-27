import { EllipsisVertical, Pencil, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge.js';
import { Button } from '@/components/ui/button.js';
import { DropdownMenu } from '@/components/ui/dropdown-menu.js';
import type { Category } from '@/features/categories/gateways/categories.js';
import type { GroupedCategories } from '@/features/categories/lib/group-categories.js';
import { categoryIcon } from '@/features/categories/lib/category-icons.js';

export interface CategoryFlatListProps {
  groups: GroupedCategories;
  onRename: (category: Category) => void;
  onDelete: (category: Category) => void;
}

interface CategoryRowProps {
  category: Category;
  variant: 'parent' | 'sub';
  subcategoryCount?: number;
  onRename: (category: Category) => void;
  onDelete: (category: Category) => void;
}

function CategoryRow({
  category,
  variant,
  subcategoryCount,
  onRename,
  onDelete,
}: CategoryRowProps) {
  const Icon = categoryIcon(category.icon);
  const isParent = variant === 'parent';

  return (
    <li
      className={`flex items-center gap-3 py-2.5 ${isParent ? '' : 'pl-10'}`}
      data-testid={isParent ? 'category-parent' : 'category-sub'}
    >
      <span
        className={`flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground ${isParent ? 'bg-muted' : 'bg-muted/60'}`}
      >
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <span className={`truncate text-sm ${isParent ? 'font-medium' : ''}`}>{category.name}</span>
        {!category.isSystem && <Badge variant="secondary">Custom</Badge>}
      </span>
      {isParent && subcategoryCount !== undefined && subcategoryCount > 0 && (
        <span className="shrink-0 text-xs text-muted-foreground">
          {subcategoryCount} subcategor{subcategoryCount === 1 ? 'y' : 'ies'}
        </span>
      )}
      <DropdownMenu>
        <DropdownMenu.Trigger
          render={
            <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${category.name}`} />
          }
        >
          <EllipsisVertical aria-hidden="true" />
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="end">
          <DropdownMenu.Group>
            <DropdownMenu.Item onClick={() => onRename(category)}>
              <Pencil aria-hidden="true" />
              Rename
            </DropdownMenu.Item>
            {!category.isSystem && (
              <DropdownMenu.Item variant="destructive" onClick={() => onDelete(category)}>
                <Trash2 aria-hidden="true" />
                Delete
              </DropdownMenu.Item>
            )}
          </DropdownMenu.Group>
        </DropdownMenu.Content>
      </DropdownMenu>
    </li>
  );
}

// Layout: one dense flat list; subcategories are indented rows under their parent.
export function CategoryFlatList({ groups, onRename, onDelete }: CategoryFlatListProps) {
  return (
    <ul className="flex flex-col divide-y px-4">
      {groups.parents.flatMap((parent) => {
        const subcategories = groups.subcategoriesByParent.get(parent.id) ?? [];

        return [
          <CategoryRow
            key={parent.id}
            category={parent}
            variant="parent"
            subcategoryCount={subcategories.length}
            onRename={onRename}
            onDelete={onDelete}
          />,
          ...subcategories.map((subcategory) => (
            <CategoryRow
              key={subcategory.id}
              category={subcategory}
              variant="sub"
              onRename={onRename}
              onDelete={onDelete}
            />
          )),
        ];
      })}
    </ul>
  );
}
