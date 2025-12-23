import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Package } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';

type InventoryItem = Tables<'inventory_items'>;

interface LowStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: InventoryItem[];
}

export const LowStockDialog = ({ open, onOpenChange, items }: LowStockDialogProps) => {
  const criticalItems = items.filter(item => item.current_stock <= 0);
  const lowItems = items.filter(item => item.current_stock > 0 && item.current_stock <= item.min_stock_level);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Low Stock Items ({items.length})
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto space-y-4 pr-2">
          {criticalItems.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-destructive mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                Out of Stock ({criticalItems.length})
              </h3>
              <div className="space-y-2">
                {criticalItems.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-destructive/10 border border-destructive/20"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
                        <Package className="w-4 h-4 text-destructive" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.category || 'Uncategorized'}</p>
                      </div>
                    </div>
                    <Badge variant="destructive" className="font-mono">
                      {Number(item.current_stock)} {item.unit}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {lowItems.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-amber-500 mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Low Stock ({lowItems.length})
              </h3>
              <div className="space-y-2">
                {lowItems.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/20"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                        <Package className="w-4 h-4 text-amber-500" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Min: {item.min_stock_level} {item.unit}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 font-mono">
                      {Number(item.current_stock)} {item.unit}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {items.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>All items are well stocked!</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
