import { Tags } from 'lucide-react';

import { Empty } from '@/components/ui/empty.js';

export function CategoriesEmptyState() {
  return (
    <Empty>
      <Empty.Header>
        <Empty.Media variant="icon">
          <Tags aria-hidden="true" />
        </Empty.Media>
        <Empty.Title>No categories yet</Empty.Title>
        <Empty.Description>
          Categories classify your transactions. Custom categories you create will show up here.
        </Empty.Description>
      </Empty.Header>
    </Empty>
  );
}
