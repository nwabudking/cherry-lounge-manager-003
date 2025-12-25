import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, GripVertical, Check, X } from "lucide-react";
import {
  useMenuCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useToggleCategoryActive,
} from "@/hooks/useMenu";

interface Category {
  id: string;
  name: string;
  sort_order: number | null;
  is_active: boolean;
}

export const CategoriesTab = () => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [newName, setNewName] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const { data: categories = [], isLoading } = useMenuCategories();
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();
  const toggleActiveMutation = useToggleCategoryActive();

  const handleCreate = () => {
    if (newName.trim()) {
      const maxOrder = Math.max(...categories.map((c) => c.sort_order || 0), 0);
      createMutation.mutate(
        { name: newName.trim(), sort_order: maxOrder + 1 },
        {
          onSuccess: () => {
            setNewName("");
            setIsAdding(false);
          },
        }
      );
    }
  };

  const startEdit = (category: Category) => {
    setEditingId(category.id);
    setEditName(category.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };

  const saveEdit = () => {
    if (editingId && editName.trim()) {
      updateMutation.mutate(
        { id: editingId, data: { name: editName.trim() } },
        {
          onSuccess: () => {
            setEditingId(null);
          },
        }
      );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground">
          Organize your menu items into categories
        </p>
        {!isAdding && (
          <Button onClick={() => setIsAdding(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        )}
      </div>

      {/* Add new category */}
      {isAdding && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Category name"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newName.trim()) {
                    handleCreate();
                  }
                  if (e.key === "Escape") {
                    setIsAdding(false);
                    setNewName("");
                  }
                }}
              />
              <Button
                size="icon"
                onClick={handleCreate}
                disabled={!newName.trim() || createMutation.isPending}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setIsAdding(false);
                  setNewName("");
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : (
        <div className="space-y-2">
          {categories.map((category) => (
            <Card key={category.id} className={!category.is_active ? "opacity-50" : ""}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />

                  {editingId === category.id ? (
                    <>
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit();
                          if (e.key === "Escape") cancelEdit();
                        }}
                      />
                      <Button 
                        size="icon" 
                        onClick={saveEdit} 
                        disabled={!editName.trim() || updateMutation.isPending}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={cancelEdit}>
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 font-medium">{category.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Active</span>
                        <Switch
                          checked={category.is_active}
                          onCheckedChange={(checked) =>
                            toggleActiveMutation.mutate({ id: category.id, is_active: checked })
                          }
                        />
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => startEdit(category)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteMutation.mutate(category.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {categories.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No categories yet. Add your first category above.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
