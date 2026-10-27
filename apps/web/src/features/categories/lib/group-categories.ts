import type { Category } from '@/features/categories/gateways/categories.js';

export interface GroupedCategories {
  parents: Category[];
  subcategoriesByParent: Map<string, Category[]>;
}

// Categories nest at most one level: group subcategories under their parent,
// alphabetical within each level.
export function groupCategories(categories: Category[]): GroupedCategories {
  const sorted = [...categories].sort((a, b) => a.name.localeCompare(b.name));
  const parents = sorted.filter((category) => category.parentId === null);
  const subcategoriesByParent = new Map<string, Category[]>();
  for (const subcategory of sorted) {
    if (subcategory.parentId === null) {
      continue;
    }
    const siblings = subcategoriesByParent.get(subcategory.parentId) ?? [];
    siblings.push(subcategory);
    subcategoriesByParent.set(subcategory.parentId, siblings);
  }

  return { parents, subcategoriesByParent };
}
