import { useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAdminData } from "@/context/AdminDataContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ArrowLeft, Upload, X, Camera, Images, Link2, Loader2, Package } from "lucide-react";
import { toast } from "sonner";
import { uploadProductImage } from "@/lib/supabase-storage";

export default function ProductForm() {
  const { id }    = useParams();
  const isEdit    = Boolean(id);
  const navigate  = useNavigate();
  const { products, categories, addProduct, updateProduct } = useAdminData();

  const existing = isEdit ? products.find((p) => p.id === id) : null;

  const [form, setForm] = useState({
    name:          existing?.name          ?? "",
    description:   existing?.description   ?? "",
    price:         existing?.price?.toString()         ?? "",
    originalPrice: existing?.originalPrice?.toString() ?? "",
    category:      existing?.category      ?? (categories[0]?.slug ?? "skincare"),
    image:         existing?.image         ?? "",
    badge:         existing?.badge         ?? "",
    rating:        existing?.rating?.toString()        ?? "4.5",
    reviewCount:   existing?.reviewCount?.toString()   ?? "0",
    stock:         existing?.stock?.toString()         ?? "0",  // SECURITY v2
    isBestSeller:  existing?.isBestSeller  ?? false,
    isFeatured:    existing?.isFeatured    ?? false,
  });

  const [imagePreview,   setImagePreview]   = useState<string>(
    existing?.image && !existing.image.startsWith("data:") ? existing.image : ""
  );
  const [pickerOpen,     setPickerOpen]     = useState(false);
  const [showUrlInput,   setShowUrlInput]   = useState(false);
  const [urlValue,       setUrlValue]       = useState(
    existing?.image && !existing.image.startsWith("data:") ? existing.image : ""
  );
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving,         setSaving]         = useState(false);

  const cameraRef  = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const ALLOWED_IMAGE_TYPES = ["image/jpeg","image/jpg","image/png","image/webp","image/gif"];
  const MAX_IMAGE_SIZE_MB   = 5;

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) { toast.error("Only JPEG, PNG, WebP, and GIF images are allowed."); e.target.value = ""; return; }
    if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) { toast.error(`Image must be smaller than ${MAX_IMAGE_SIZE_MB}MB.`); e.target.value = ""; return; }

    const localPreview = URL.createObjectURL(file);
    setImagePreview(localPreview);
    setUploadingImage(true);

    try {
      const publicUrl = await uploadProductImage(file);
      setForm((f) => ({ ...f, image: publicUrl }));
      setImagePreview(publicUrl);
      URL.revokeObjectURL(localPreview);
      toast.success("Image uploaded successfully");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      toast.error(msg);
      setImagePreview("");
      setForm((f) => ({ ...f, image: "" }));
      URL.revokeObjectURL(localPreview);
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  };

  const handleApplyUrl = () => {
    if (!urlValue) return;
    try {
      const parsed = new URL(urlValue);
      if (parsed.protocol !== "https:") { toast.error("Only HTTPS image URLs are allowed."); return; }
    } catch {
      toast.error("Please enter a valid URL (must start with https://)."); return;
    }
    setImagePreview(urlValue);
    setForm((f) => ({ ...f, image: urlValue }));
    setPickerOpen(false);
    setShowUrlInput(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.price || !form.category) { toast.error("Please fill in all required fields"); return; }
    if (uploadingImage) { toast.error("Please wait for the image upload to complete."); return; }

    const stockVal = parseInt(form.stock) || 0;
    if (stockVal < 0) { toast.error("Stock cannot be negative."); return; }

    const productData = {
      name:          form.name,
      description:   form.description,
      price:         parseFloat(form.price),
      originalPrice: form.originalPrice ? parseFloat(form.originalPrice) : undefined,
      category:      form.category as "skincare" | "makeup" | "fragrance" | "tools",
      image:         form.image,
      badge:         form.badge || undefined,
      rating:        parseFloat(form.rating) || 4.5,
      reviewCount:   parseInt(form.reviewCount) || 0,
      stock:         stockVal,   // SECURITY v2
      isBestSeller:  form.isBestSeller,
      isFeatured:    form.isFeatured,
    };

    setSaving(true);
    try {
      if (isEdit && id) {
        await updateProduct(id, productData);
        toast.success("Product updated successfully");
      } else {
        await addProduct(productData);
        toast.success("Product added successfully");
      }
      navigate("/admin/products");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to save product: ${msg}`, { duration: 8000 });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/products")} className="h-9 w-9">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{isEdit ? "Edit Product" : "Add Product"}</h1>
          <p className="text-gray-500 text-sm">{isEdit ? `Editing ${existing?.name}` : "Create a new product"}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Image Upload */}
        <div className="bg-white rounded-xl border shadow-sm p-4">
          <Label className="text-sm font-semibold text-gray-700 mb-3 block">Product Image</Label>
          <div
            className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-rose-300 hover:bg-rose-50 transition-colors"
            onClick={() => !uploadingImage && setPickerOpen(true)}
          >
            {uploadingImage ? (
              <div className="flex flex-col items-center gap-2 py-4">
                <Loader2 className="w-8 h-8 text-rose-400 animate-spin" />
                <p className="text-sm text-gray-500">Uploading to storage…</p>
              </div>
            ) : imagePreview ? (
              <div className="relative inline-block">
                <img src={imagePreview} alt="Preview" className="h-32 w-32 object-cover rounded-lg mx-auto" />
                <button type="button"
                  onClick={(e) => { e.stopPropagation(); setImagePreview(""); setUrlValue(""); setForm((f) => ({ ...f, image: "" })); }}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="w-8 h-8 text-gray-300 mx-auto" />
                <p className="text-sm text-gray-500">Tap to upload image</p>
                <p className="text-xs text-gray-400">PNG, JPG up to 5MB — stored in Supabase Storage</p>
              </div>
            )}
            <input ref={cameraRef}  type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageChange} />
            <input ref={galleryRef} type="file" accept="image/*" className="hidden"              onChange={handleImageChange} />
          </div>

          <Sheet open={pickerOpen} onOpenChange={setPickerOpen}>
            <SheetContent side="bottom" className="rounded-t-2xl p-0 h-auto">
              <div className="p-5 space-y-3">
                <p className="text-sm font-semibold text-gray-700 text-center pb-1">Choose Image Source</p>
                <button type="button" onClick={() => { setPickerOpen(false); setShowUrlInput(false); setTimeout(() => cameraRef.current?.click(), 150); }}
                  className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors text-left">
                  <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0"><Camera className="w-5 h-5 text-rose-500" /></div>
                  <div><p className="text-sm font-medium text-gray-900">Take a Photo</p><p className="text-xs text-gray-500">Uploads directly to Supabase Storage</p></div>
                </button>
                <button type="button" onClick={() => { setPickerOpen(false); setShowUrlInput(false); setTimeout(() => galleryRef.current?.click(), 150); }}
                  className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors text-left">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0"><Images className="w-5 h-5 text-purple-500" /></div>
                  <div><p className="text-sm font-medium text-gray-900">Choose from Gallery</p><p className="text-xs text-gray-500">Uploads directly to Supabase Storage</p></div>
                </button>
                <button type="button" onClick={() => setShowUrlInput(true)}
                  className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors text-left">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0"><Link2 className="w-5 h-5 text-blue-500" /></div>
                  <div><p className="text-sm font-medium text-gray-900">Use Image URL</p><p className="text-xs text-gray-500">Must be a public https:// URL</p></div>
                </button>
                {showUrlInput && (
                  <div className="flex gap-2 pt-1">
                    <Input autoFocus placeholder="https://example.com/image.jpg" value={urlValue} onChange={(e) => setUrlValue(e.target.value)} className="h-11 text-sm" />
                    <Button type="button" className="h-11 bg-rose-500 hover:bg-rose-600 text-white px-4 flex-shrink-0" onClick={handleApplyUrl}>Apply</Button>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Basic Info */}
        <div className="bg-white rounded-xl border shadow-sm p-4 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Basic Information</h2>
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-sm text-gray-600">Product Name <span className="text-red-500">*</span></Label>
            <Input id="name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Rose Petal Moisturizer" required className="h-11" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-sm text-gray-600">Description</Label>
            <Textarea id="description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Product description..." rows={3} className="resize-none" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="category" className="text-sm text-gray-600">Category <span className="text-red-500">*</span></Label>
            <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                {categories.length > 0 ? (
                  categories.map((cat) => <SelectItem key={cat.id} value={cat.slug}>{cat.name}</SelectItem>)
                ) : (
                  <>
                    <SelectItem value="skincare">Skincare</SelectItem>
                    <SelectItem value="makeup">Makeup</SelectItem>
                    <SelectItem value="fragrance">Fragrance</SelectItem>
                    <SelectItem value="tools">Beauty Tools</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Pricing & Stock */}
        <div className="bg-white rounded-xl border shadow-sm p-4 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Pricing & Inventory</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="price" className="text-sm text-gray-600">Price ($) <span className="text-red-500">*</span></Label>
              <Input id="price" type="number" min="0.01" step="0.01" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} placeholder="0.00" required className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="originalPrice" className="text-sm text-gray-600">Original Price ($)</Label>
              <Input id="originalPrice" type="number" min="0" step="0.01" value={form.originalPrice} onChange={(e) => setForm((f) => ({ ...f, originalPrice: e.target.value }))} placeholder="Optional" className="h-11" />
            </div>
          </div>

          {/* SECURITY v2: Stock field */}
          <div className="space-y-1.5">
            <Label htmlFor="stock" className="text-sm text-gray-600 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-gray-400" />
              Stock Quantity <span className="text-red-500">*</span>
              <span className="text-xs text-gray-400 font-normal ml-1">(used for inventory control)</span>
            </Label>
            <Input
              id="stock"
              type="number"
              min="0"
              step="1"
              value={form.stock}
              onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
              placeholder="0"
              required
              className="h-11"
            />
            <p className="text-xs text-gray-400">
              Orders will be rejected when stock reaches 0.
            </p>
          </div>
        </div>

        {/* Additional */}
        <div className="bg-white rounded-xl border shadow-sm p-4 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Additional Details</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rating" className="text-sm text-gray-600">Rating</Label>
              <Input id="rating" type="number" min="0" max="5" step="0.1" value={form.rating} onChange={(e) => setForm((f) => ({ ...f, rating: e.target.value }))} className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reviewCount" className="text-sm text-gray-600">Reviews</Label>
              <Input id="reviewCount" type="number" min="0" value={form.reviewCount} onChange={(e) => setForm((f) => ({ ...f, reviewCount: e.target.value }))} className="h-11" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="badge" className="text-sm text-gray-600">Badge</Label>
            <Input id="badge" value={form.badge} onChange={(e) => setForm((f) => ({ ...f, badge: e.target.value }))} placeholder="e.g. New, Best Seller, Sale" className="h-11" />
          </div>
          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.isBestSeller} onChange={(e) => setForm((f) => ({ ...f, isBestSeller: e.target.checked }))} className="w-4 h-4 accent-rose-500" />
              <span className="text-sm text-gray-700">Mark as Best Seller</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm((f) => ({ ...f, isFeatured: e.target.checked }))} className="w-4 h-4 accent-rose-500" />
              <span className="text-sm text-gray-700">Show in Featured section</span>
            </label>
          </div>
        </div>

        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={() => navigate("/admin/products")} className="flex-1 h-11">Cancel</Button>
          <Button type="submit" disabled={saving || uploadingImage} className="flex-1 h-11 bg-rose-500 hover:bg-rose-600 text-white disabled:opacity-60">
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Product"}
          </Button>
        </div>
      </form>
    </div>
  );
}
