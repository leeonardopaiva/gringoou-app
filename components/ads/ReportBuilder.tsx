'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Download, Play, Save, Search, X } from 'lucide-react';
import { useToast } from '@/components/feedback/ToastProvider';
import { Button, Card, Input, Select, Toggle } from '@/components/ui';
import { Checkbox } from '@/components/ui/Input';
import {
  defaultReportDimensions,
  defaultReportMetrics,
  reportDimensionCatalog,
  reportMetricCatalog,
  sortReportRows,
  type AdsOverviewRow,
  type AdsReportData,
  type ReportDimensionId,
  type ReportMetricId,
} from '@/lib/ads/dashboard';

type ReportBuilderProps = {
  data: AdsReportData;
  rows: AdsOverviewRow[];
};

const storageKey = 'gringoou:ads-report-builder';

type BuilderState = {
  reportName: string;
  emails: string;
  leadGen: boolean;
  outputFormat: 'CSV' | 'XLSX';
  scheduled: boolean;
  startDate: string;
  endDate: string;
  scope: 'campaign' | 'group' | 'ad';
  search: string;
  selectedDimensions: ReportDimensionId[];
  selectedMetrics: ReportMetricId[];
};

const today = new Date();
const defaultStart = new Date(today);
defaultStart.setDate(defaultStart.getDate() - 7);

const defaultState: BuilderState = {
  reportName: 'Build Report',
  emails: '',
  leadGen: true,
  outputFormat: 'CSV',
  scheduled: false,
  startDate: defaultStart.toISOString().slice(0, 10),
  endDate: today.toISOString().slice(0, 10),
  scope: 'campaign',
  search: '',
  selectedDimensions: defaultReportDimensions,
  selectedMetrics: defaultReportMetrics,
};

const groupedDimensions = [
  {
    title: 'Entrega',
    items: reportDimensionCatalog.filter((item) => ['campaign_name', 'campaign_id', 'group_name', 'group_id', 'ad_name', 'objective', 'platform'].includes(item.id)),
  },
  {
    title: 'Data',
    items: reportDimensionCatalog.filter((item) => item.id === 'date'),
  },
];

const groupedMetrics = [
  {
    title: 'Basico',
    items: reportMetricCatalog,
  },
];

export function ReportBuilder({ data, rows }: ReportBuilderProps) {
  const { showToast } = useToast();
  const [state, setState] = useState<BuilderState>(defaultState);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (!stored) return;
      const parsed = JSON.parse(stored) as Partial<BuilderState>;
      setState((current) => ({
        ...current,
        ...parsed,
      }));
    } catch {
      localStorage.removeItem(storageKey);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(state));
  }, [state]);

  const filteredRows = useMemo(() => {
    const search = state.search.trim().toLowerCase();
    return sortReportRows(
      rows.filter((row) => {
        if (!search) return true;
        return [row.label, row.goal, row.plan, row.regionLabel, row.paymentProvider]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(search));
      }),
    );
  }, [rows, state.search]);

  const selectedDimensionItems = useMemo(
    () => reportDimensionCatalog.filter((item) => state.selectedDimensions.includes(item.id)),
    [state.selectedDimensions],
  );
  const selectedMetricItems = useMemo(
    () => reportMetricCatalog.filter((item) => state.selectedMetrics.includes(item.id)),
    [state.selectedMetrics],
  );

  const toggleDimension = (id: ReportDimensionId) =>
    setState((current) => ({
      ...current,
      selectedDimensions: current.selectedDimensions.includes(id)
        ? current.selectedDimensions.filter((item) => item !== id)
        : [...current.selectedDimensions, id],
    }));

  const toggleMetric = (id: ReportMetricId) =>
    setState((current) => ({
      ...current,
      selectedMetrics: current.selectedMetrics.includes(id)
        ? current.selectedMetrics.filter((item) => item !== id)
        : [...current.selectedMetrics, id],
    }));

  const downloadReport = async () => {
    setExporting(true);
    try {
      const response = await fetch('/api/ads/reports/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? 'Nao foi possivel gerar o relatorio.');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${state.reportName || 'ads-report'}.${state.outputFormat === 'XLSX' ? 'xlsx' : 'csv'}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : 'Nao foi possivel gerar o relatorio.', 'error');
    } finally {
      setExporting(false);
    }
  };

  const saveReport = () => {
    localStorage.setItem(`${storageKey}:saved`, JSON.stringify(state));
    showToast('Relatorio salvo localmente.', 'success');
  };

  return (
    <div className="mx-auto w-full max-w-[1360px]">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-[12px] font-bold uppercase tracking-wide text-slate-400">Build Report</p>
          <h1 className="mt-1 text-[34px] font-extrabold leading-none text-[#132f40]">Build Report</h1>
        </div>
        <Button iconLeft={<Play size={18} />} onClick={() => void downloadReport()} loading={exporting}>
          Run report
        </Button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
        <div className="space-y-5">
          <Card className="rounded-[24px] border border-slate-200 p-0 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 className="text-[17px] font-bold text-[#132f40]">Settings</h2>
              <ChevronDown size={16} className="text-slate-400" />
            </div>
            <div className="space-y-4 px-5 py-5">
              <div>
                <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-slate-400">Report name</p>
                <Input value={state.reportName} onChange={(event) => setState((current) => ({ ...current, reportName: event.target.value }))} placeholder="Report Name" />
              </div>
              <div>
                <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-slate-400">Email report to (optional)</p>
                <Input
                  value={state.emails}
                  onChange={(event) => setState((current) => ({ ...current, emails: event.target.value }))}
                  placeholder="johndoe@example.com, janedoe@..."
                />
                <p className="mt-2 text-[12px] text-slate-400">Para multiplos e-mails, separe com virgula</p>
              </div>
              <Toggle
                checked={state.leadGen}
                onChange={(checked) => setState((current) => ({ ...current, leadGen: checked }))}
                label={<span className="text-[14px] font-medium text-[#243b53]">Lead Gen Report</span>}
              />
              <div>
                <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-slate-400">Output format</p>
                <div className="flex gap-4">
                  {(['CSV', 'XLSX'] as const).map((option) => (
                    <label key={option} className="flex items-center gap-2 text-[14px] font-medium text-[#243b53]">
                      <input
                        type="radio"
                        checked={state.outputFormat === option}
                        onChange={() => setState((current) => ({ ...current, outputFormat: option }))}
                      />
                      {option === 'CSV' ? 'CSV (.csv)' : 'Excel (.xlsx)'}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-[14px] font-semibold text-[#243b53]">Scheduled Report is OFF</span>
                <Toggle
                  checked={state.scheduled}
                  onChange={(checked) => setState((current) => ({ ...current, scheduled: checked }))}
                />
              </div>
            </div>
          </Card>

          <Card className="rounded-[24px] border border-slate-200 p-0 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 className="text-[17px] font-bold text-[#132f40]">Filter</h2>
              <ChevronDown size={16} className="text-slate-400" />
            </div>
            <div className="space-y-4 px-5 py-5">
              <div className="flex items-center justify-between text-[14px]">
                <span className="font-medium text-[#243b53]">Time Zone:</span>
                <span className="font-bold text-brand-500">{Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
              </div>
              <div>
                <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-slate-400">Start date</p>
                <Input
                  type="date"
                  value={state.startDate}
                  onChange={(event) => setState((current) => ({ ...current, startDate: event.target.value }))}
                />
              </div>
              <div>
                <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-slate-400">End date</p>
                <Input
                  type="date"
                  value={state.endDate}
                  onChange={(event) => setState((current) => ({ ...current, endDate: event.target.value }))}
                />
              </div>
              <div>
                <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-slate-400">Campaigns / groups / ads</p>
                <div className="flex gap-2">
                  <Select
                    value={state.scope}
                    onChange={(event) => setState((current) => ({ ...current, scope: event.target.value as BuilderState['scope'] }))}
                    className="w-[126px]"
                  >
                    <option value="campaign">Campanha</option>
                    <option value="group">Grupo</option>
                    <option value="ad">Anuncio</option>
                  </Select>
                  <Input
                    value={state.search}
                    onChange={(event) => setState((current) => ({ ...current, search: event.target.value }))}
                    placeholder="Buscar..."
                    prefixIcon={<Search size={16} />}
                  />
                </div>
              </div>
              <div>
                <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-slate-400">Attribution window</p>
                <Select value="7d">
                  <option value="7d">7 dias apos clique</option>
                </Select>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <div className="space-y-5">
            <Card className="rounded-[24px] border border-slate-200 p-0 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <div>
                  <h2 className="text-[17px] font-bold text-[#132f40]">Column selectors</h2>
                  <p className="text-[12px] text-slate-400">Selecione as colunas para incluir no export.</p>
                </div>
                <Input value={state.search} onChange={(event) => setState((current) => ({ ...current, search: event.target.value }))} placeholder="Search columns" prefixIcon={<Search size={16} />} className="w-[240px]" />
              </div>
              <div className="grid gap-0 lg:grid-cols-[1fr_340px]">
                <div className="border-b border-slate-200 p-5 lg:border-b-0 lg:border-r">
                  <div className="space-y-4">
                    {groupedDimensions.map((group) => (
                      <details key={group.title} open className="group rounded-2xl border border-slate-100 p-4">
                        <summary className="cursor-pointer list-none text-[15px] font-bold text-[#243b53]">{group.title}</summary>
                        <div className="mt-4 space-y-3">
                          {group.items
                            .filter((item) => item.label.toLowerCase().includes(state.search.trim().toLowerCase()))
                            .map((item) => (
                              <Checkbox
                                key={item.id}
                                id={item.id}
                                checked={state.selectedDimensions.includes(item.id)}
                                onChange={() => toggleDimension(item.id)}
                                label={item.label}
                              />
                            ))}
                        </div>
                      </details>
                    ))}
                  </div>
                </div>
                <div className="p-5">
                  <p className="mb-2 text-[12px] font-bold uppercase tracking-wide text-slate-400">Selected dimensions</p>
                  <p className="text-[12px] text-slate-400">Seu relatorio vai baixar nesta ordem de coluna.</p>
                  <div className="mt-4 space-y-2">
                    {selectedDimensionItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleDimension(item.id)}
                        className="flex w-full items-center justify-between rounded-full border border-slate-200 px-4 py-2 text-left text-[13px] font-semibold text-[#243b53]"
                      >
                        <span>{item.label}</span>
                        <X size={14} className="text-slate-400" />
                      </button>
                    ))}
                  </div>
                  <p className="mt-4 text-[12px] italic text-slate-300">Arraste para reordenar</p>
                </div>
              </div>
            </Card>

            <Card className="rounded-[24px] border border-slate-200 p-0 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <div>
                  <h2 className="text-[17px] font-bold text-[#132f40]">Metrics</h2>
                  <p className="text-[12px] text-slate-400">Selecione as metricas para incluir no export.</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setState((current) => ({ ...current, selectedMetrics: defaultReportMetrics, selectedDimensions: defaultReportDimensions }))}>
                  Select All
                </Button>
              </div>
              <div className="grid gap-0 lg:grid-cols-[1fr_340px]">
                <div className="border-b border-slate-200 p-5 lg:border-b-0 lg:border-r">
                  <div className="space-y-4">
                    {groupedMetrics.map((group) => (
                      <details key={group.title} open className="group rounded-2xl border border-slate-100 p-4">
                        <summary className="cursor-pointer list-none text-[15px] font-bold text-[#243b53]">{group.title}</summary>
                        <div className="mt-4 space-y-3">
                          {group.items
                            .filter((item) => item.label.toLowerCase().includes(state.search.trim().toLowerCase()))
                            .map((item) => (
                              <Checkbox
                                key={item.id}
                                id={item.id}
                                checked={state.selectedMetrics.includes(item.id)}
                                onChange={() => toggleMetric(item.id)}
                                label={item.label}
                              />
                            ))}
                        </div>
                      </details>
                    ))}
                  </div>
                </div>
                <div className="p-5">
                  <p className="mb-2 text-[12px] font-bold uppercase tracking-wide text-slate-400">Selected metrics</p>
                  <p className="text-[12px] text-slate-400">Seu relatorio vai baixar nesta ordem de coluna.</p>
                  <div className="mt-4 space-y-2">
                    {selectedMetricItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleMetric(item.id)}
                        className="flex w-full items-center justify-between rounded-full border border-slate-200 px-4 py-2 text-left text-[13px] font-semibold text-[#243b53]"
                      >
                        <span>{item.label}</span>
                        <X size={14} className="text-slate-400" />
                      </button>
                    ))}
                  </div>
                  <p className="mt-4 text-[12px] italic text-slate-300">Arraste para reordenar</p>
                </div>
              </div>
            </Card>
          </div>

          <Card className="rounded-[24px] border border-slate-200 p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-[16px] font-bold text-[#132f40]">Pronto para gerar?</p>
                <p className="text-[12px] text-slate-400">
                  {selectedMetricItems.length} metricas, {selectedDimensionItems.length} dimensoes e {filteredRows.length} campanhas no filtro
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="secondary" iconLeft={<Save size={16} />} onClick={saveReport}>
                  Salvar Relatorio
                </Button>
                <Button iconLeft={<Download size={16} />} onClick={() => void downloadReport()} loading={exporting}>
                  Run report
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
