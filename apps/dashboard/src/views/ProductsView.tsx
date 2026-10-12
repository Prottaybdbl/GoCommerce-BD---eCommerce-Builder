import React, { useState } from "react";
import { Plus, Image as ImageIcon, Loader2, Search, Package, ChevronRight, X } from "lucide-react";
import { formatBdt } from "@gocom/contracts";
import {
  compressImageTo3Widths,
  uploadResizedImageToR2,
} from "../lib/image-compress.js";
import { useLanguage } from "../context/LanguageContext.js";

export interface Product {
  id: string;
  title: string;
  banglaTitle?: string | null;
  slug: string;
  price: number;
  compareAtPrice?: number | null;
  stockQuantity: number;
  imageUrl?: string | null;
  isActive: boolean;
}

interface ProductsViewProps {
  products: Product[];
  onAddProduct: (productData: any) => Promise<void>;
}

export const ProductsView: React.FC<ProductsViewProps> = ({ products, onAddProduct }) => {
  const { t, language } = useLanguage();
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [compressionStatus, setCompressionStatus] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    banglaTitle: "",
    priceBdt: "",
    compareAtPriceBdt: "",
    stockQuantity: "100",
    description: "",
  });

  const filteredProducts = products.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      (p.banglaTitle && p.banglaTitle.toLowerCase().includes(search.toLowerCase())) ||
      p.slug.toLowerCase().includes(search.toLowerCase())
  );

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCompressionStatus(
      language === "bn"
        ? `প্রসেসিং... (মূল সাইজ: ${(file.size / (1024 * 1024)).toFixed(1)} MB)`
        : `Processing... (Original size: ${(file.size / (1024 * 1024)).toFixed(1)} MB)`
    );
    try {
      // Invariant #3: Client-side 3-width resize (360px, 720px, 1080px) and direct R2 upload
      const result = await uploadResizedImageToR2(file, "/v1", (msg) => {
        setCompressionStatus(msg);
      });
      setPreviewUrl(result.primaryUrl);
      setUploadedImageUrl(result.primaryUrl);
      setCompressionStatus(
        language === "bn"
          ? `✅ ৩টি সাইজ আপলোড ও ভেরিফাই সম্পন্ন (${result.format === "image/webp" ? "WebP" : "Safari JPEG fallback"})`
          : `✅ 3 sizes uploaded & verified (${result.format === "image/webp" ? "WebP" : "Safari JPEG fallback"})`
      );
    } catch (err: any) {
      // Fallback for local offline development without R2 storage
      try {
        const batch = await compressImageTo3Widths(file);
        const objectUrl = URL.createObjectURL(batch.large);
        setPreviewUrl(objectUrl);
        setUploadedImageUrl(objectUrl);
        setCompressionStatus(
          language === "bn" ? "⚠️ লোকাল প্রিভিউ মোড (R2 অফলাইন)" : "⚠️ Local Preview Mode (R2 Offline)"
        );
      } catch (clientErr: any) {
        setCompressionStatus(`Error: ${clientErr.message}`);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.priceBdt) return;

    setIsSubmitting(true);
    try {
      const pricePoisha = Math.round(parseFloat(formData.priceBdt) * 100);
      const compareAtPoisha = formData.compareAtPriceBdt
        ? Math.round(parseFloat(formData.compareAtPriceBdt) * 100)
        : undefined;

      const slug =
        formData.title
          .toLowerCase()
          .replace(/[^\w\s-]/g, "")
          .replace(/\s+/g, "-") +
        "-" +
        Math.floor(Math.random() * 1000);

      await onAddProduct({
        title: formData.title,
        banglaTitle: formData.banglaTitle || formData.title,
        slug,
        description: formData.description,
        price: pricePoisha,
        compareAtPrice: compareAtPoisha,
        stockQuantity: parseInt(formData.stockQuantity, 10) || 100,
        imageUrl: uploadedImageUrl,
      });

      setShowModal(false);
      setFormData({
        title: "",
        banglaTitle: "",
        priceBdt: "",
        compareAtPriceBdt: "",
        stockQuantity: "100",
        description: "",
      });
      setPreviewUrl(null);
      setUploadedImageUrl(null);
      setCompressionStatus(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#878a99] uppercase tracking-wider mb-1">
            <span>{t.catalogBreadcrumb}</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-[#495057]">{t.productsBreadcrumb}</span>
          </div>
          <h2 className="text-xl font-bold text-[#495057]">{t.productsTitle}</h2>
          <p className="text-xs text-[#878a99] mt-0.5">
            {t.productsSubtitle}
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#405189] hover:bg-[#364574] text-white rounded-lg text-xs font-bold shadow-xs transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>{t.addProductBtn}</span>
        </button>
      </div>

      {/* Main Table Card */}
      <div className="card-velzon">
        <div className="card-header-velzon flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold text-[#495057] uppercase tracking-wider">
              {t.allProductsListTitle} ({filteredProducts.length})
            </h4>
          </div>

          <div className="relative w-full sm:w-64">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.productSearchPlaceholder}
              className="w-full bg-[#f3f3f9] text-[#495057] placeholder-[#878a99] text-xs font-medium pl-8 pr-3 py-1.5 rounded-lg border border-[#e9ebec] focus:outline-none focus:border-[#405189]"
            />
            <Search className="w-3.5 h-3.5 text-[#878a99] absolute left-2.5 top-2" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#495057]">
            <thead className="bg-[#f3f3f9] text-[#878a99] font-bold uppercase border-b border-[#e9ebec]">
              <tr>
                <th className="px-4 py-3">{t.productAndImageCol}</th>
                <th className="px-4 py-3">{t.priceBdtCol}</th>
                <th className="px-4 py-3">{t.compareAtCol}</th>
                <th className="px-4 py-3">{t.stockQuantityCol}</th>
                <th className="px-4 py-3">{t.productStatusCol}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e9ebec]">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-[#878a99]">
                    {t.noProductsFound}
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-[#f3f3f9]/60 transition-colors">
                    <td className="px-4 py-3.5 font-semibold text-[#495057]">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#e9ebec] overflow-hidden flex items-center justify-center shrink-0 border border-[#e9ebec]">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Package className="w-5 h-5 text-[#878a99]" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800">{product.title}</div>
                          <div className="text-[10px] text-[#878a99]">
                            {product.banglaTitle || product.slug}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 font-bold text-[#495057]">
                      {formatBdt(product.price)}
                    </td>

                    <td className="px-4 py-3.5 text-[#878a99]">
                      {product.compareAtPrice ? (
                        <span className="line-through">{formatBdt(product.compareAtPrice)}</span>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td className="px-4 py-3.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          product.stockQuantity > 10
                            ? "bg-[#0ab39c]/10 text-[#0ab39c]"
                            : "bg-[#f06548]/10 text-[#f06548]"
                        }`}
                      >
                        {product.stockQuantity} {language === "bn" ? "টি মজুদ" : "in stock"}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="text-[10px] bg-[#0ab39c]/10 text-[#0ab39c] font-bold px-2 py-0.5 rounded">
                        {t.liveAndActiveBadge}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Product Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-[#e9ebec] overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-5 py-4 bg-[#f3f3f9] border-b border-[#e9ebec] flex items-center justify-between shrink-0">
              <h3 className="text-sm font-bold text-[#495057]">{t.modalAddProductTitle}</h3>
              <button onClick={() => setShowModal(false)} className="text-[#878a99] hover:text-[#495057]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-bold text-[#495057] mb-1">
                  {t.productTitleEnLabel} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Wireless Smart Watch Series 9"
                  className="w-full bg-[#f3f3f9] text-xs font-medium px-3 py-2 rounded-lg border border-[#e9ebec] focus:outline-none focus:border-[#405189]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#495057] mb-1">
                  {t.productTitleBnLabel}
                </label>
                <input
                  type="text"
                  value={formData.banglaTitle}
                  onChange={(e) => setFormData({ ...formData, banglaTitle: e.target.value })}
                  placeholder="যেমন: স্মার্ট ওয়্যারলেস ওয়াচ ৯"
                  className="w-full bg-[#f3f3f9] text-xs font-medium px-3 py-2 rounded-lg border border-[#e9ebec] focus:outline-none focus:border-[#405189]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#495057] mb-1">{t.priceBdtLabel} *</label>
                  <input
                    type="number"
                    required
                    value={formData.priceBdt}
                    onChange={(e) => setFormData({ ...formData, priceBdt: e.target.value })}
                    placeholder="1250"
                    className="w-full bg-[#f3f3f9] text-xs font-medium px-3 py-2 rounded-lg border border-[#e9ebec] focus:outline-none focus:border-[#405189]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#495057] mb-1">{t.comparePriceBdtLabel}</label>
                  <input
                    type="number"
                    value={formData.compareAtPriceBdt}
                    onChange={(e) => setFormData({ ...formData, compareAtPriceBdt: e.target.value })}
                    placeholder="1850"
                    className="w-full bg-[#f3f3f9] text-xs font-medium px-3 py-2 rounded-lg border border-[#e9ebec] focus:outline-none focus:border-[#405189]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#495057] mb-1">{t.stockQtyLabel}</label>
                <input
                  type="number"
                  value={formData.stockQuantity}
                  onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })}
                  className="w-full bg-[#f3f3f9] text-xs font-medium px-3 py-2 rounded-lg border border-[#e9ebec] focus:outline-none focus:border-[#405189]"
                />
              </div>

              {/* Invariant #3 Zero-Server Client Resize Upload */}
              <div className="border border-dashed border-[#e9ebec] p-4 rounded-xl text-center bg-[#f3f3f9]/50">
                <input
                  type="file"
                  id="product-image-input"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <label htmlFor="product-image-input" className="cursor-pointer block">
                  {previewUrl ? (
                    <div className="w-24 h-24 mx-auto rounded-lg overflow-hidden border border-[#e9ebec]">
                      <img src={previewUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#405189]/10 text-[#405189] mx-auto flex items-center justify-center mb-1">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                  )}
                  <p className="text-xs font-bold text-[#405189] mt-2">
                    {previewUrl
                      ? (language === "bn" ? "অন্য ছবি বাছাই করুন" : "Choose Different Photo")
                      : (language === "bn" ? "পণ্যের ছবি আপলোড করুন" : "Upload Product Photo")}
                  </p>
                  <p className="text-[10px] text-[#878a99]">
                    {t.imageOptimizationNotice}
                  </p>
                </label>
                {compressionStatus && (
                  <p className="text-[11px] font-semibold text-[#0ab39c] mt-2 bg-[#0ab39c]/10 py-1 px-2 rounded">
                    {compressionStatus}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#e9ebec]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#878a99] hover:bg-[#f3f3f9] rounded-lg"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#405189] hover:bg-[#364574] rounded-lg shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isSubmitting ? t.savingProductBtn : t.saveProductBtn}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
