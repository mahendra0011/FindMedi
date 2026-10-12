import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';
import FormRenderer from '@/components/forms/FormRenderer';
import {
  FileText,
  Plus,
  Trash2,
  Save,
  Eye,
  Settings2,
  Type,
  Hash,
  Calendar,
  List,
  CheckSquare,
  Activity,
  PenTool,
  Upload,
  Table as TableIcon,
  Sparkles,
} from 'lucide-react';

interface FormField {
  id: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
  min?: number;
  max?: number;
}

interface FormSection {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
}

export default function FormBuilderStudio() {
  const [templateKey, setTemplateKey] = useState('clinical-admission-assessment');
  const [templateTitle, setTemplateTitle] = useState('Clinical Specialty Assessment');
  const [category, setCategory] = useState('Clinical');
  const [sections, setSections] = useState<FormSection[]>([
    {
      id: 'sec-general',
      title: 'Primary Assessment & Chief Complaints',
      fields: [
        { id: 'chief_complaint', label: 'Chief Complaint', type: 'textarea', required: true, placeholder: 'Enter symptoms...' },
        { id: 'onset_date', label: 'Onset Date', type: 'date', required: true },
        { id: 'pain_score', label: 'Pain Score (0 to 10)', type: 'scale', min: 0, max: 10, required: false },
      ],
    },
    {
      id: 'sec-vitals',
      title: 'Initial Vitals & Triage',
      fields: [
        { id: 'vitals', label: 'Baseline Vitals Profile', type: 'vitals', required: true },
        { id: 'consciousness_level', label: 'AVPU Consciousness Level', type: 'select', options: ['Alert', 'Voice', 'Pain', 'Unresponsive'], required: true },
      ],
    },
  ]);

  const [activeSectionIdx, setActiveSectionIdx] = useState(0);
  const [previewMode, setPreviewMode] = useState(false);
  const [previewValues, setPreviewValues] = useState<Record<string, any>>({});

  const fieldTypesList = [
    { type: 'text', label: 'Short Text', icon: Type },
    { type: 'textarea', label: 'Long Notes', icon: FileText },
    { type: 'number', label: 'Number', icon: Hash },
    { type: 'date', label: 'Date', icon: Calendar },
    { type: 'select', label: 'Dropdown Select', icon: List },
    { type: 'yesno', label: 'Yes / No Toggle', icon: CheckSquare },
    { type: 'vitals', label: 'Vitals Battery (BP/HR/SpO2)', icon: Activity },
    { type: 'signature', label: 'Digital Signature', icon: PenTool },
    { type: 'file', label: 'File Attachment', icon: Upload },
    { type: 'scale', label: 'Numeric Scale (0-10)', icon: Hash },
  ];

  const [dropIdx, setDropIdx] = useState<number | null>(null);

  const handleAddField = (type: string, label: string, insertAt?: number) => {
    const fieldId = `field_${Date.now()}`;
    const newField: FormField = {
      id: fieldId,
      label,
      type,
      required: false,
      options: type === 'select' ? ['Normal', 'Mild', 'Moderate', 'Severe'] : undefined,
      placeholder: `Enter ${label.toLowerCase()}...`,
    };

    setSections((prev) => {
      const copy = prev.map((s, i) => (i === activeSectionIdx ? { ...s, fields: [...s.fields] } : s));
      const arr = copy[activeSectionIdx].fields;
      const at = insertAt == null || insertAt < 0 || insertAt > arr.length ? arr.length : insertAt;
      arr.splice(at, 0, newField);
      return copy;
    });
    toast.success(`Added ${label} field`);
  };

  // Drag-drop reorder: move field from `from` to sit before index `to`.
  const moveField = (from: number, to: number) => {
    if (from === to || from + 1 === to) return;
    setSections((prev) => {
      const copy = prev.map((s, i) => (i === activeSectionIdx ? { ...s, fields: [...s.fields] } : s));
      const arr = copy[activeSectionIdx].fields;
      const [moved] = arr.splice(from, 1);
      const target = to > from ? to - 1 : to;
      arr.splice(Math.max(0, Math.min(target, arr.length)), 0, moved);
      return copy;
    });
    toast.success('Field reordered');
  };

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const newFieldData = e.dataTransfer.getData('application/x-newfield');
    const moveIdxRaw = e.dataTransfer.getData('application/x-movefield');
    const target = (e.target as HTMLElement).closest('[data-field-idx]');
    const at = target ? Number(target.getAttribute('data-field-idx')) : sections[activeSectionIdx]?.fields.length ?? 0;
    if (newFieldData) {
      const sep = newFieldData.indexOf('::');
      handleAddField(newFieldData.slice(0, sep), newFieldData.slice(sep + 2), at);
    } else if (moveIdxRaw) {
      moveField(Number(moveIdxRaw), at);
    }
    setDropIdx(null);
  };

  const handleRemoveField = (fieldIdx: number) => {
    setSections((prev) => {
      const copy = [...prev];
      copy[activeSectionIdx].fields.splice(fieldIdx, 1);
      return copy;
    });
  };

  const handleAddSection = () => {
    const newSec: FormSection = {
      id: `sec_${Date.now()}`,
      title: `Section ${sections.length + 1}`,
      fields: [],
    };
    setSections([...sections, newSec]);
    setActiveSectionIdx(sections.length);
  };

  const handleSaveTemplate = async () => {
    if (!templateKey || !templateTitle) {
      toast.error('Template key and title required');
      return;
    }
    const payload = {
      key: templateKey.toLowerCase().replace(/\s+/g, '-'),
      title: templateTitle,
      category,
      definition: {
        sections: sections.map((s) => ({
          id: s.id,
          title: s.title,
          description: s.description,
          fields: s.fields,
        })),
      },
    };

    try {
      await api.post('/forms/templates', payload);
      toast.success('Clinical template schema published successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save form schema');
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              Dynamic Clinical Form Builder Studio
            </h1>
            <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 border-indigo-500/20">
              Module #98
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Build specialized specialty forms, scoring engines, and structured EMR documentation without code deploys.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPreviewMode(!previewMode)}
            className="flex items-center gap-2"
          >
            <Eye className="h-4 w-4" />
            {previewMode ? 'Exit Preview' : 'Interactive Preview'}
          </Button>
          <Button onClick={handleSaveTemplate} className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2">
            <Save className="h-4 w-4" />
            Publish Schema
          </Button>
        </div>
      </div>

      {previewMode ? (
        /* Preview Tab */
        <Card className="border-border/60 shadow-sm max-w-3xl mx-auto">
          <CardHeader className="bg-muted/20 border-b p-4">
            <CardTitle className="text-lg">{templateTitle}</CardTitle>
            <CardDescription>Live dynamic preview rendering via FormRenderer engine.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <FormRenderer
              template={{
                definition: { sections },
              }}
              values={previewValues}
              onChange={setPreviewValues}
              onSubmit={() => toast.success('Preview submission captured')}
            />
          </CardContent>
        </Card>
      ) : (
        /* Design Studio Workspace */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Toolbox */}
          <div className="space-y-4">
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="p-4 bg-muted/20 border-b">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-primary" />
                  Clinical Widgets
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-2">
                {fieldTypesList.map((ft) => {
                  const Icon = ft.icon;
                  return (
                    <Button
                      key={ft.type}
                      variant="outline"
                      size="sm"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('application/x-newfield', `${ft.type}::${ft.label}`);
                        e.dataTransfer.effectAllowed = 'copy';
                      }}
                      onClick={() => handleAddField(ft.type, ft.label)}
                      className="w-full justify-start text-xs h-8 gap-2 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:text-indigo-600 cursor-grab active:cursor-grabbing"
                      title="Click to insert, or drag onto the canvas"
                    >
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      {ft.label}
                    </Button>
                  );
                })}
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-sm">
              <CardHeader className="p-4 bg-muted/20 border-b">
                <CardTitle className="text-sm font-semibold">Metadata & Key</CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-muted-foreground">Template Title</label>
                  <Input
                    value={templateTitle}
                    onChange={(e) => setTemplateTitle(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="font-semibold text-muted-foreground">System Key ID</label>
                  <Input
                    value={templateKey}
                    onChange={(e) => setTemplateKey(e.target.value)}
                    className="mt-1 font-mono text-[11px]"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Center Canvas */}
          <div className="lg:col-span-3 space-y-4">
            {/* Sections Selector Tabs */}
            <div className="flex items-center gap-2 border-b pb-2 overflow-x-auto">
              {sections.map((sec, idx) => (
                <Button
                  key={sec.id}
                  size="sm"
                  variant={activeSectionIdx === idx ? 'default' : 'outline'}
                  onClick={() => setActiveSectionIdx(idx)}
                  className="text-xs h-8"
                >
                  {sec.title}
                </Button>
              ))}
              <Button size="sm" variant="ghost" onClick={handleAddSection} className="text-xs h-8 gap-1">
                <Plus className="h-3.5 w-3.5" />
                Add Section
              </Button>
            </div>

            {/* Active Section Designer */}
            {sections[activeSectionIdx] && (
              <Card className="border-border/60 shadow-sm">
                <CardHeader className="p-4 bg-muted/20 border-b flex flex-row items-center justify-between">
                  <div className="flex-1 mr-4">
                    <Input
                      value={sections[activeSectionIdx].title}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSections((prev) => {
                          const copy = [...prev];
                          copy[activeSectionIdx].title = val;
                          return copy;
                        });
                      }}
                      className="font-semibold text-base h-8 bg-transparent border-dashed"
                    />
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {sections[activeSectionIdx].fields.length} Fields
                  </Badge>
                </CardHeader>
                <CardContent
                  className="p-4 space-y-3"
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
                  onDrop={handleCanvasDrop}
                >
                  {sections[activeSectionIdx].fields.length === 0 ? (
                    <div className="p-10 border-2 border-dashed rounded-xl text-center text-muted-foreground">
                      <Sparkles className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                      <p className="text-sm font-medium">This section has no fields yet.</p>
                      <p className="text-xs">Click a widget from the left panel — or drag it here — to insert a field.</p>
                    </div>
                  ) : (
                    sections[activeSectionIdx].fields.map((f, fIdx) => (
                      <div
                        key={f.id}
                        data-field-idx={fIdx}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('application/x-movefield', String(fIdx));
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDropIdx(fIdx); }}
                        onDragLeave={() => setDropIdx((cur) => (cur === fIdx ? null : cur))}
                        className={`p-3 rounded-lg border bg-card/60 flex items-center justify-between gap-4 transition-colors cursor-grab active:cursor-grabbing ${
                          dropIdx === fIdx ? 'border-primary border-dashed shadow-sm ring-2 ring-primary/30' : 'hover:border-primary/40'
                        }`}
                      >
                        <div className="flex-1 grid grid-cols-3 gap-2 items-center">
                          <Input
                            value={f.label}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSections((prev) => {
                                const copy = [...prev];
                                copy[activeSectionIdx].fields[fIdx].label = val;
                                return copy;
                              });
                            }}
                            className="h-8 text-xs font-medium"
                          />
                          <Badge variant="secondary" className="w-fit text-[10px] font-mono">
                            {f.type}
                          </Badge>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`req_${f.id}`}
                              checked={f.required}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setSections((prev) => {
                                  const copy = [...prev];
                                  copy[activeSectionIdx].fields[fIdx].required = checked;
                                  return copy;
                                });
                              }}
                              className="rounded text-primary"
                            />
                            <label htmlFor={`req_${f.id}`} className="text-xs text-muted-foreground cursor-pointer">
                              Required
                            </label>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveField(fIdx)}
                          className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
