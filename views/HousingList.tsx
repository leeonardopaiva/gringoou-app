"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { MapPin, Plus } from "lucide-react";
import {
  Button,
  Card,
  ContentColumn,
  Input,
  Modal,
  Pagination,
  Select,
  Textarea,
} from "@/components/ui";
import { FilterPopover } from "@/components/ui/FilterPopover";
import { useToast } from "@/components/feedback/ToastProvider";
import { User } from "@/types";
import CloudinaryImageField from "@/components/forms/CloudinaryImageField";
import ImageGalleryField from "@/components/forms/ImageGalleryField";
import AddressAutocomplete from "@/components/forms/AddressAutocomplete";
import PageHeader from "@/components/navigation/PageHeader";

type Housing = {
  id: string;
  title: string;
  description: string;
  propertyType: string;
  locationLabel: string;
  price: string;
  imageUrl?: string | null;
  galleryUrls: string[];
};
const emptyDraft = {
  title: "",
  description: "",
  propertyType: "Apartamento",
  locationLabel: "",
  price: "",
  imageUrl: "",
  galleryUrls: [] as string[],
  contactUrl: "",
};

export default function HousingList({ user: _user }: { user: User }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<Housing[]>([]);
  const [propertyType, setPropertyType] = useState("");
  const [location, setLocation] = useState("");
  const [price, setPrice] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const formatPrice = (value: string) => {
    const amount = Number(value.replace(/[^0-9.,]/g, '').replace(',', '.'));
    if (!Number.isFinite(amount) || amount <= 0) return value || 'Valor a combinar';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
  };
  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), pageSize: "8" });
      if (propertyType) params.set("propertyType", propertyType);
      if (location) params.set("location", location);
      if (price) params.set("price", price);
      try {
        const response = await fetch(`/api/housing?${params}`, {
          signal: controller.signal,
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error);
        setItems(payload.housing || []);
        setTotalPages(Math.max(1, payload.pagination?.totalPages || 1));
      } catch (error) {
        if (!controller.signal.aborted)
          showToast(
            error instanceof Error
              ? error.message
              : "Nao foi possivel carregar moradias.",
            "error",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [location, page, price, propertyType, showToast]);
  const createHousing = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/housing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, galleryUrls: draft.galleryUrls.filter(Boolean) }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok)
        throw new Error(payload?.error || "Nao foi possivel publicar.");
      setItems((current) => [payload.housing, ...current]);
      setDraft(emptyDraft);
      setModalOpen(false);
      showToast("Anuncio publicado.", "success");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Nao foi possivel publicar.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <ContentColumn className="animate-in space-y-5 px-5 pb-24 fade-in duration-500">
      <PageHeader title="Moradia" action={
        <Button
          size="sm"
          iconLeft={<Plus size={16} />}
          onClick={() => setModalOpen(true)}
        >
          Criar anúncio
        </Button>
      } />
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-body-sm font-bold">Imoveis disponiveis</h2>
          <FilterPopover>
            <Select
              value={propertyType}
              onChange={(e) => {
                setPropertyType(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Todos os tipos</option>
              <option>Apartamento</option>
              <option>Casa</option>
              <option>Quarto</option>
              <option>Republica</option>
            </Select>
            <Input
              value={location}
              onChange={(e) => {
                setLocation(e.target.value);
                setPage(1);
              }}
              placeholder="Localizacao"
            />
            <Input
              value={price}
              onChange={(e) => {
                setPrice(e.target.value);
                setPage(1);
              }}
              placeholder="Preco"
            />
          </FilterPopover>
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground">
            Atualizando resultados...
          </p>
        ) : items.length ? (
          items.map((item) => (
            <Card
              key={item.id}
              padded={false}
              className="overflow-hidden border border-border shadow-xs"
            >
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  className="h-44 w-full object-cover"
                  alt={item.title}
                />
              ) : null}
            <div className="p-4">
                <h3 className="text-body-sm font-bold">{item.title}</h3>
                <p className="mt-1 flex items-center gap-1 text-caption text-muted-foreground">
                  <MapPin size={13} /> {item.locationLabel}
                </p>
                <p className="mt-2 font-bold">{formatPrice(item.price)}</p>
                <Link
                  href={`/moradia/${item.id}`}
                  className="mt-3 inline-flex rounded-full bg-brand-500 px-4 py-2 text-xs font-bold text-white"
                >
                  Ver detalhes
                </Link>
            </div>
            </Card>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            Nenhuma moradia encontrada.
          </p>
        )}
      </section>
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Criar anuncio de moradia"
      >
        <div className="space-y-3">
          <Input
            placeholder="Titulo"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
          <Textarea
            placeholder="Descricao"
            value={draft.description}
            onChange={(e) =>
              setDraft({ ...draft, description: e.target.value })
            }
          />
          <Select
            value={draft.propertyType}
            onChange={(e) =>
              setDraft({ ...draft, propertyType: e.target.value })
            }
          >
            <option>Apartamento</option>
            <option>Casa</option>
            <option>Quarto</option>
            <option>Republica</option>
          </Select>
          <AddressAutocomplete
            placeholder="Pesquise cidade, rua ou endereço"
            value={draft.locationLabel}
            onChange={(locationLabel) => setDraft({ ...draft, locationLabel })}
          />
          <Input
            placeholder="Preco"
            value={draft.price}
            onChange={(e) => setDraft({ ...draft, price: e.target.value })}
          />
          <CloudinaryImageField
            value={draft.imageUrl}
            onChange={(imageUrl) => setDraft({ ...draft, imageUrl })}
            folder="housing"
            height={180}
            hint="Clique na area para selecionar a foto do anuncio."
          />
          <ImageGalleryField value={draft.galleryUrls} onChange={(galleryUrls) => setDraft({ ...draft, galleryUrls })} folder="housing" maxItems={6} hint="Adicione até 6 fotos dos ambientes da moradia." />
          <Input
            placeholder="Link de contato"
            value={draft.contactUrl}
            onChange={(e) => setDraft({ ...draft, contactUrl: e.target.value })}
          />
          <Button
            fullWidth
            loading={saving}
            onClick={() => void createHousing()}
          >
            Publicar anuncio
          </Button>
        </div>
      </Modal>
    </ContentColumn>
  );
}
