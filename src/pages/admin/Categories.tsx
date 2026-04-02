import { useState } from "react";
import { useAdminData, Category } from "@/context/AdminDataContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Tag } from "lucide-react";
import { toast } from "sonner";
import { useAdminData as useData } from "@/context/AdminDataContext";

type FormState = { name: string; slug: string; description: string };

function CategoryDialog({
  open,
  onClose,
  initial,
  onSave,
  title,
}: {
  open: boolean;
  onClose: () => void;
  initial?: FormState;
  onSave: (data: FormState) => void;
  title: string;
}) {
  const [form, setForm] = useState<FormState>(
    initial ?? { name: "", slug: "", description: "" }
  );

  const handleNameChange = (name: string) => {
    setForm((f) => ({
      ...f,
      name,
      slug: f.slug || name.toLowerCase().replace(/\s+/g, "-"),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.slug) return;
    onSave(form);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm mx-4 rounded-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-sm">Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Skincare"
              required
              className="h-11"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Slug *</Label>
            <Input
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              placeholder="e.g. skincare"
              required
              className="h-11"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Short description..."
              rows={2}
              className="resize-none"
            />
          </div>
          <DialogFooter className="flex gap-2 mt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1 bg-rose-500 hover:bg-rose-600 text-white">
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Categories() {
  const { categories, addCategory, updateCategory, deleteCategory, products } = useAdminData();
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Category | null>(null);

  const getCount = (id: string) =>
    products.filter((p) => p.category === id).length;

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Categories</h1>
          <p className="text-gray-500 text-sm mt-0.5">{categories.length} categories</p>
        </div>
        <Button
          onClick={() => setAddOpen(true)}
          className="bg-rose-500 hover:bg-rose-600 text-white h-9 gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Category</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>

      <div className="space-y-3">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="bg-white rounded-xl border shadow-sm p-4 flex items-center gap-4"
          >
            <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center flex-shrink-0">
              <Tag className="w-5 h-5 text-rose-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">{cat.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {cat.description || cat.slug} · {getCount(cat.id)} products
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-gray-400 hover:text-gray-700"
                onClick={() => setEditTarget(cat)}
              >
                <Pencil className="w-4 h-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Category</AlertDialogTitle>
                    <AlertDialogDescription>
                      Delete "{cat.name}"? Products in this category won't be deleted.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        deleteCategory(cat.id);
                        toast.success("Category deleted");
                      }}
                      className="bg-red-500 hover:bg-red-600 text-white"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ))}
      </div>

      <CategoryDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Category"
        onSave={(data) => {
          addCategory(data);
          toast.success("Category added");
        }}
      />

      {editTarget && (
        <CategoryDialog
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
          title="Edit Category"
          initial={{
            name: editTarget.name,
            slug: editTarget.slug,
            description: editTarget.description,
          }}
          onSave={(data) => {
            updateCategory(editTarget.id, data);
            setEditTarget(null);
            toast.success("Category updated");
          }}
        />
      )}
    </div>
  );
}
