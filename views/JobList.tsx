"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { Briefcase, MapPin, Plus } from "lucide-react";
import UnifiedSearchInput from "@/components/search/UnifiedSearchInput";
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
import { User, UserRole } from "@/types";

type Job = {
  id: string;
  title: string;
  company: string;
  description: string;
  employmentType: string;
  locationLabel: string;
  salary?: string | null;
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
};

export default function JobList({ user }: { user: User }) {
  const { showToast } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [search, setSearch] = useState("");
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
  const canPublish =
    user.role === UserRole.COMPANY ||
    user.role === UserRole.ADMIN ||
    user.recruiterVerified;

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), pageSize: "8" });
      if (search) params.set("q", search);
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
  }, [employmentType, location, page, salary, search, showToast]);

  const createJob = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
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
      <header className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-h2 font-bold text-foreground">Vagas</h1>
          <p className="text-body-sm text-muted-foreground">
            Oportunidades verificadas para a comunidade.
          </p>
        </div>
        <Button
          size="sm"
          iconLeft={<Plus size={16} />}
          onClick={() =>
            canPublish ? setModalOpen(true) : setCompanyInviteOpen(true)
          }
        >
          Criar anuncio
        </Button>
      </header>
      <UnifiedSearchInput
        value={search}
        onChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        staticPlaceholder="Buscar por cargo, empresa ou palavra-chave..."
      />
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
            <Card key={job.id} className="border border-border shadow-xs">
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
        title="Publique como empresa"
        description="Vagas podem ser publicadas apenas por empresas ou recrutadores verificados."
      >
        <p className="text-body-sm text-muted-foreground">
          Migre para um perfil corporativo ou solicite verificacao para anunciar
          oportunidades.
        </p>
        <Link
          href="/profile"
          className="mt-5 inline-flex rounded-full bg-brand-500 px-5 py-3 text-sm font-bold text-white"
        >
          Ir para configuracoes do perfil
        </Link>
      </Modal>
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Criar vaga"
      >
        <div className="space-y-3">
          <Input
            placeholder="Titulo"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
          <Input
            placeholder="Empresa"
            value={draft.company}
            onChange={(e) => setDraft({ ...draft, company: e.target.value })}
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
            placeholder="Link para candidatura"
            value={draft.contactUrl}
            onChange={(e) => setDraft({ ...draft, contactUrl: e.target.value })}
          />
          <Button fullWidth loading={saving} onClick={() => void createJob()}>
            Publicar vaga
          </Button>
        </div>
      </Modal>
    </ContentColumn>
  );
}
