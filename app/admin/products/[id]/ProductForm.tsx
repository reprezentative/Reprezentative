"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MediaPicker } from "@/components/MediaPicker";

export type AdminProductFormValues = {
  name: string;
  slug: string;
  description: string;
  price: number;
  sku: string;
  category: string;
  featured: boolean;
  isNew: boolean;
  inStock: boolean;
  status: string;
  // Initial COGS captured on create (persisted to ProductCOGS by the API).
  fabricCost: number;
  laborCost: number;
  freightCost: number;
  inventoryCost: number;
};

export type AdminProductInitial = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  sku: string;
  category: string;
  imageUrl?: string;
  images?: string[];
  featured: boolean;
  isNew: boolean;
  inStock: boolean;
  status?: string;
  tags?: string[];
};

export function ProductForm({
  product,
  mode = "edit",
}: {
  product: AdminProductInitial;
  mode?: "create" | "edit";
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>(
    product.images && product.images.length > 0
      ? product.images
      : product.imageUrl
        ? [product.imageUrl]
        : [],
  );
  const [tags, setTags] = useState<string[]>(product.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AdminProductFormValues>({
    defaultValues: {
      name: product.name,
      slug: product.slug,
      description: product.description,
      price: product.price,
      sku: product.sku,
      category: product.category,
      featured: product.featured,
      isNew: product.isNew,
      inStock: product.inStock,
      status: product.status ?? "ACTIVE",
      fabricCost: 0,
      laborCost: 0,
      freightCost: 0,
      inventoryCost: 0,
    },
  });

  const addImage = (url: string) =>
    setImages((prev) => (prev.includes(url) ? prev : [...prev, url]));
  const removeImage = (i: number) =>
    setImages((prev) => prev.filter((_, j) => j !== i));
  const makePrimary = (i: number) =>
    setImages((prev) => [prev[i], ...prev.filter((_, j) => j !== i)]);

  const addTag = (t: string) => {
    const v = t.trim();
    if (v && !tags.includes(v)) setTags((prev) => [...prev, v]);
    setTagInput("");
  };

  const onSubmit = async (data: AdminProductFormValues) => {
    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const payload = JSON.stringify({ ...data, images, tags });
      const response =
        mode === "edit" && product.id
          ? await fetch(`/api/admin/products/${product.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: payload,
            })
          : await fetch("/api/admin/products", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: payload,
            });

      if (!response.ok) {
        throw new Error("Failed to save product");
      }

      const json = (await response.json()) as { id?: string };

      setStatusMessage("Product saved successfully.");

      if (mode === "create" && json.id) {
        router.push(`/admin/products/${json.id}`);
      }
    } catch (error) {
      console.error(error);
      setStatusMessage("There was an error saving this product.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-8 rounded-md border border-neutral-800 bg-zinc-950/60 p-6 text-xs text-white"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">
            {mode === "create" ? "Create Product" : "Edit Product"}
          </h1>
          <p className="mt-1 text-[0.7rem] text-neutral-400">
            {mode === "create"
              ? "Create a new product for your catalog. Variants and advanced inventory can be configured after saving."
              : "Update product details, pricing, and cost of goods."}
          </p>
        </div>
        <Link
          href="/admin/products"
          className="rounded-md border border-neutral-700 px-3 py-1.5 text-[0.7rem] uppercase tracking-[0.16em] text-neutral-200 hover:bg-neutral-900"
        >
          Back to list
        </Link>
      </div>

      {/* Basic info */}
      <section className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-400">
              Name
            </label>
            <input
              type="text"
              className="h-9 w-full rounded-md border border-neutral-800 bg-black px-3 text-xs text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
              {...register("name", { required: "Name is required" })}
            />
            {errors.name && (
              <p className="mt-1 text-[0.7rem] text-red-400">
                {errors.name.message}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-400">
              Images
            </label>
            {images.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {images.map((url, i) => (
                  <div key={url + i} className="w-16">
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt=""
                        className="h-16 w-16 rounded object-cover ring-1 ring-neutral-800"
                      />
                      {i === 0 && (
                        <span className="absolute left-0 top-0 rounded-br bg-emerald-600 px-1 text-[0.5rem] font-semibold uppercase text-white">
                          Primary
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex gap-1">
                      {i !== 0 && (
                        <button
                          type="button"
                          onClick={() => makePrimary(i)}
                          className="flex-1 rounded border border-neutral-700 text-[0.5rem] uppercase text-neutral-300 hover:bg-neutral-900"
                          title="Make primary"
                        >
                          ★
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="flex-1 rounded border border-rose-900/60 text-[0.55rem] text-rose-300 hover:bg-rose-950/40"
                        title="Remove"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <MediaPicker onSelect={addImage} label="Add image" />
            <div className="mt-2 flex gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="…or paste an image URL"
                className="h-8 flex-1 rounded-md border border-neutral-800 bg-black px-3 text-xs text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
              />
              <button
                type="button"
                onClick={() => {
                  const u = urlInput.trim();
                  if (u) {
                    addImage(u);
                    setUrlInput("");
                  }
                }}
                className="rounded-md border border-neutral-700 px-3 text-[0.6rem] uppercase tracking-[0.16em] text-neutral-200 hover:bg-neutral-900"
              >
                Add
              </button>
            </div>
            <p className="mt-1 text-[0.65rem] text-neutral-500">
              First image is the primary (shown on the store). Upload, pick from
              the Media Library, or paste URLs.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-400">
              Slug
            </label>
            <input
              type="text"
              className="h-9 w-full rounded-md border border-neutral-800 bg-black px-3 text-xs text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
              {...register("slug", { required: "Slug is required" })}
            />
            {errors.slug && (
              <p className="mt-1 text-[0.7rem] text-red-400">
                {errors.slug.message}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-400">
              SKU
            </label>
            <input
              type="text"
              className="h-9 w-full rounded-md border border-neutral-800 bg-black px-3 text-xs text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
              {...register("sku", { required: "SKU is required" })}
            />
            {errors.sku && (
              <p className="mt-1 text-[0.7rem] text-red-400">
                {errors.sku.message}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-400">
              Category
            </label>
            <input
              type="text"
              className="h-9 w-full rounded-md border border-neutral-800 bg-black px-3 text-xs text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
              {...register("category", { required: "Category is required" })}
            />
            {errors.category && (
              <p className="mt-1 text-[0.7rem] text-red-400">
                {errors.category.message}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-400">
              Description
            </label>
            <textarea
              rows={6}
              className="w-full rounded-md border border-neutral-800 bg-black px-3 py-2 text-xs text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
              {...register("description", {
                required: "Description is required",
              })}
            />
            {errors.description && (
              <p className="mt-1 text-[0.7rem] text-red-400">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                Price (USD)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="h-9 w-full rounded-md border border-neutral-800 bg-black px-3 text-xs text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
                {...register("price", {
                  required: "Price is required",
                  valueAsNumber: true,
                  min: { value: 0, message: "Price must be positive" },
                })}
              />
              {errors.price && (
                <p className="mt-1 text-[0.7rem] text-red-400">
                  {errors.price.message}
                </p>
              )}
            </div>

            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 text-[0.7rem] font-medium text-neutral-300">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 rounded border-neutral-700 bg-black text-emerald-500"
                  {...register("featured")}
                />
                Featured
              </label>
            </div>

            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 text-[0.7rem] font-medium text-neutral-300">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 rounded border-neutral-700 bg-black text-blue-500"
                  {...register("inStock")}
                />
                In Stock
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                Status
              </label>
              <select
                {...register("status")}
                className="h-9 w-full rounded-md border border-neutral-800 bg-black px-2 text-xs text-white outline-none focus:border-neutral-500"
              >
                <option value="ACTIVE">Active (visible on store)</option>
                <option value="DRAFT">Draft (hidden)</option>
                <option value="ARCHIVED">Archived (hidden)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-400">
              Tags
            </label>
            {tags.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 rounded-full bg-neutral-800 px-2 py-0.5 text-[0.65rem] text-neutral-200"
                  >
                    {t}
                    <button
                      type="button"
                      onClick={() => setTags((prev) => prev.filter((x) => x !== t))}
                      className="text-neutral-400 hover:text-white"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addTag(tagInput);
                }
              }}
              placeholder="Type a tag and press Enter (e.g. hoodie, new-drop)"
              className="h-9 w-full rounded-md border border-neutral-800 bg-black px-3 text-xs text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-[0.7rem] font-medium text-neutral-300">
              <input
                type="checkbox"
                className="h-3.5 w-3.5 rounded border-neutral-700 bg-black text-amber-500"
                {...register("isNew")}
              />
              Mark as New Arrival
            </label>
          </div>
        </div>
      </section>

      {/* COGS section */}
      <section className="space-y-4 rounded-md border border-neutral-800 bg-black/40 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-300">
              Cost of Goods (COGS)
            </h2>
            <p className="mt-1 text-[0.7rem] text-neutral-500">
              {mode === "create"
                ? "Optional starting cost per item. Saved to the Finance Hub's COGS Manager, where you can add full detail later."
                : "For detailed cost editing, use the Finance Hub's COGS Manager (these fields set an initial estimate only)."}
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-400">
              Materials
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="h-9 w-full rounded-md border border-neutral-800 bg-black px-3 text-xs text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
              {...register("fabricCost", {
                valueAsNumber: true,
                min: { value: 0, message: "Must be positive" },
              })}
            />
            {errors.fabricCost && (
              <p className="mt-1 text-[0.7rem] text-red-400">
                {errors.fabricCost.message}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-400">
              Manufacturing
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="h-9 w-full rounded-md border border-neutral-800 bg-black px-3 text-xs text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
              {...register("laborCost", {
                valueAsNumber: true,
                min: { value: 0, message: "Must be positive" },
              })}
            />
            {errors.laborCost && (
              <p className="mt-1 text-[0.7rem] text-red-400">
                {errors.laborCost.message}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-400">
              Freight & Duties
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="h-9 w-full rounded-md border border-neutral-800 bg-black px-3 text-xs text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
              {...register("freightCost", {
                valueAsNumber: true,
                min: { value: 0, message: "Must be positive" },
              })}
            />
            {errors.freightCost && (
              <p className="mt-1 text-[0.7rem] text-red-400">
                {errors.freightCost.message}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-neutral-400">
              Inventory & Handling
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="h-9 w-full rounded-md border border-neutral-800 bg-black px-3 text-xs text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
              {...register("inventoryCost", {
                valueAsNumber: true,
                min: { value: 0, message: "Must be positive" },
              })}
            />
            {errors.inventoryCost && (
              <p className="mt-1 text-[0.7rem] text-red-400">
                {errors.inventoryCost.message}
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="flex items-center justify-between gap-4">
        {statusMessage && (
          <p className="text-[0.7rem] text-neutral-300">{statusMessage}</p>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="ml-auto inline-flex items-center justify-center rounded-md bg-white px-4 py-2 text-[0.75rem] font-semibold uppercase tracking-[0.18em] text-black hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Saving..." : "Save Product"}
        </button>
      </div>
    </form>
  );
}


