"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { Briefcase, MapPin, Plus } from "lucide-react";
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
import { useToast } from "@/components/feedback/ToastProvider";
import { User } from "@/types";
import PageHeader from "@/components/navigation/PageHeader";
import CloudinaryImageField from "@/components/forms/CloudinaryImageField";
import ImageGalleryField from "@/components/forms/ImageGalleryField";

type Job = {
  id: string;
  title: string;
  company: string;
  description: string;
  employmentType: string;
  locationLabel: string;
  salary?: string | null;
  imageUrl?: string | null;
  galleryUrls: string[];
};
const emptyDraft = {
  title: "",
  company: "",
  description: "",
  employmentType: "Tempo integral",
  locationLabel: "",
  countryCode: "US",
  salary: "",
  contactUrl: "",
  businessId: "",
  imageUrl: "",
  galleryUrls: [] as string[],
};

export default function JobList({ user }: { user: User }) {
  const { showToast } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [employmentType, setEmploymentType] = useState("");
  const [location, setLocation] = useState("");
  const [salary, setSalary] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [companyInviteOpen, setCompanyInviteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [publishAs, setPublishAs] = useState<'person' | 'business'>('person');
  const [businesses, setBusinesses] = useState<Array<{ id: string; name: string }>>([]);
  const canPublish = Boolean(user.id);

  useEffect(() => {
    void fetch('/api/businesses?mine=1').then((response) => response.ok ? response.json() : null).then((payload) => {
      setBusinesses(Array.isArray(payload?.businesses) ? payload.businesses : []);
    }).catch(() => setBusinesses([]));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), pageSize: "8" });
      if (employmentType) params.set("employmentType", employmentType);
      if (location) params.set("location", location);
      if (salary) params.set("salary", salary);
      try {
        const response = await fetch(`/api/jobs?${params}`, {
          signal: controller.signal,
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error);
        setJobs(payload.jobs || []);
        setTotalPages(Math.max(1, payload.pagination?.totalPages || 1));
      } catch (error) {
        if (!controller.signal.aborted)
          showToast(
            error instanceof Error
              ? error.message
              : "Nao foi possivel carregar as vagas.",
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
  }, [employmentType, location, page, salary, showToast]);

  const createJob = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft,
          galleryUrls: draft.galleryUrls.filter(Boolean),
          businessId: draft.businessId || undefined,
          company: publishAs === 'person' ? draft.company || user.name : draft.company,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok)
        throw new Error(payload?.error || "Nao foi possivel publicar a vaga.");
      setJobs((current) => [payload.job, ...current]);
      setDraft(emptyDraft);
      setModalOpen(false);
      showToast("Vaga publicada.", "success");
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Nao foi possivel publicar a vaga.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <ContentColumn className="animate-in space-y-5 px-5 pb-24 fade-in duration-500">
      <PageHeader title="Vagas" action={
        <Button
          size="sm"
          iconLeft={<Plus size={16} />}
          onClick={() =>
            canPublish ? setModalOpen(true) : setCompanyInviteOpen(true)
          }
        >
          Criar vaga
        </Button>
      } />
      <div className="grid gap-3 sm:grid-cols-3">
        <Select
          value={employmentType}
          onChange={(e) => {
            setEmploymentType(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Todos os contratos</option>
          <option>Tempo integral</option>
          <option>Meio periodo</option>
          <option>Freelancer</option>
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
          value={salary}
          onChange={(e) => {
            setSalary(e.target.value);
            setPage(1);
          }}
          placeholder="Faixa salarial"
        />
      </div>
      <section className="space-y-3">
        <h2 className="text-body-sm font-bold text-foreground">
          Vagas disponiveis
        </h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">
            Atualizando resultados...
          </p>
        ) : jobs.length ? (
          jobs.map((job) => (
            <Card key={job.id} padded={false} className="overflow-hidden border border-border shadow-xs">
            {job.imageUrl ? <img src={job.imageUrl} alt={'Capa da vaga ' + job.title} className="h-36 w-full object-cover" /> : null}
            <div className="p-4">
            <div className="p-1">
                <h3 className="text-body-sm font-bold">{job.title}</h3>
                <p className="mt-1 flex items-center gap-1 text-caption font-semibold text-brand-500">
                  <Briefcase size={13} /> {job.company}
                </p>
                <p className="mt-2 flex items-center gap-1 text-caption text-muted-foreground">
                  <MapPin size={13} /> {job.locationLabel}
                </p>
                <p className="mt-1 text-sm font-bold">
                  {job.salary || "Salario a combinar"}
                </p>
                <Link
                  href={`/vagas/${job.id}`}
                  className="mt-3 inline-flex rounded-full bg-brand-500 px-4 py-2 text-xs font-bold text-white"
                >
                  Ver vaga
                </Link>
            </div>
            </div>
            </Card>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            Nenhuma vaga encontrada.
          </p>
        )}
      </section>
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      <Modal
        open={companyInviteOpen}
        onClose={() => setCompanyInviteOpen(false)}
        title="Cadastre seu negócio"
        description="Para publicar como empresa, cadastre primeiro a página profissional do negócio."
      >
        <p className="text-body-sm text-muted-foreground">
          Você também pode publicar diretamente como pessoa pelo botão Criar vaga.
        </p>
        <Link
          href="/profile"
          className="mt-5 inline-flex rounded-full bg-brand-500 px-5 py-3 text-sm font-bold text-white"
        >
          Criar negócio
        </Link>
      </Modal>
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Criar vaga"
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-50 p-1">
            <button type="button" onClick={() => { setPublishAs('person'); setDraft((current) => ({ ...current, businessId: '' })); }} className={`rounded-xl px-3 py-2 text-xs font-bold ${publishAs === 'person' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500'}`}>Como pessoa</button>
            <button type="button" onClick={() => setPublishAs('business')} className={`rounded-xl px-3 py-2 text-xs font-bold ${publishAs === 'business' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500'}`}>Como empresa</button>
          </div>
          {publishAs === 'business' ? businesses.length ? (
            <Select value={draft.businessId} onChange={(event) => setDraft({ ...draft, businessId: event.target.value })}>
              <option value="">Selecione o negócio</option>
              {businesses.map((business) => <option key={business.id} value={business.id}>{business.name}</option>)}
            </Select>
          ) : (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Você ainda não possui negócio cadastrado. <Link className="font-bold underline" href="/negocios?create=1">Criar negócio</Link></div>
          ) : null}
          <CloudinaryImageField
            value={draft.imageUrl}
            onChange={(imageUrl) => setDraft({ ...draft, imageUrl })}
            folder="jobs"
            height={160}
            hint="Adicione uma capa para destacar a vaga."
          />
          <ImageGalleryField value={draft.galleryUrls} onChange={(galleryUrls) => setDraft({ ...draft, galleryUrls })} folder="jobs" maxItems={6} hint="Adicione até 6 fotos da vaga, equipe ou ambiente." />
          <Input
            placeholder="Titulo"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
          <Input
            placeholder="Empresa"
            value={draft.company}
            onChange={(e) => setDraft({ ...draft, company: e.target.value })}
            disabled={publishAs === 'business' && Boolean(draft.businessId)}
          />
          <Textarea
            placeholder="Descricao"
            value={draft.description}
            onChange={(e) =>
              setDraft({ ...draft, description: e.target.value })
            }
          />
          <Select
            value={draft.employmentType}
            onChange={(e) =>
              setDraft({ ...draft, employmentType: e.target.value })
            }
          >
            <option>Tempo integral</option>
            <option>Meio periodo</option>
            <option>Freelancer</option>
          </Select>
          <Input
            placeholder="Localizacao"
            value={draft.locationLabel}
            onChange={(e) =>
              setDraft({ ...draft, locationLabel: e.target.value })
            }
          />
          <Select value={draft.countryCode} onChange={(event) => setDraft({ ...draft, countryCode: event.target.value })}>
            <option value="US">Estados Unidos</option><option value="BR">Brasil</option><option value="PT">Portugal</option><option value="CA">Canadá</option><option value="GB">Reino Unido</option><option value="IE">Irlanda</option>
          </Select>
          <Input
            placeholder="Salario"
            value={draft.salary}
            onChange={(e) => setDraft({ ...draft, salary: e.target.value })}
          />
          <Input
            placeholder="Link ou telefone para contato"
            value={draft.contactUrl}
            onChange={(e) => setDraft({ ...draft, contactUrl: e.target.value })}
          />
          <Button fullWidth loading={saving} disabled={publishAs === 'business' && (!draft.businessId || businesses.length === 0)} onClick={() => void createJob()}>
            Publicar vaga
          </Button>
        </div>
      </Modal>
    </ContentColumn>
  );
}
