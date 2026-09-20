import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useParams } from 'react-router-dom';
import { api } from '@/lib/api';

interface HealthIdData {
  name: string;
  age: number | null;
  gender: string;
  bloodGroup: string;
  allergies: { allergen: string; reaction: string; severity: string }[];
  knownConditions: { condition: string; since: string; notes: string }[];
  emergencyContact: { name: string; phone: string };
}

export default function HealthIdView() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<HealthIdData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setNotFound(true);
      return;
    }
    api.get(`/health-id/${token}`).then((r: any) => {
      setData(r || null);
      setNotFound(!r);
      setLoading(false);
    }).catch(() => {
      setData(null);
      setNotFound(true);
      setLoading(false);
    });
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div>
          <h3 className="font-bold text-lg">Health ID Card</h3>
          <p className="text-muted-foreground mt-2 text-sm">Loading emergency info…</p>
        </div>
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div className="max-w-sm rounded-3xl border p-8">
          <p className="text-2xl">🪪</p>
          <h3 className="font-black text-lg mt-2">Card not found or disabled</h3>
          <p className="text-muted-foreground text-sm mt-1">Scan a valid Health ID QR code.</p>
        </div>
      </div>
    );
  }

  const bg = data.bloodGroup || '—';

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-3xl mx-auto grid md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="text-center">
              <QRCodeSVG
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/health-id/${token}`}
                size={160}
                bgColor="#ffffff"
                fgColor="#000000"
              />
              <p className="mt-2 text-[11px] text-muted-foreground">Health ID QR Token</p>
              <code className="font-mono text-xs break-all">{token}</code>
            </div>

            <h2 className="text-xl font-black">{data.name}</h2>
            <div className="flex items-center gap-3">
              <div>
                <p className="text-[11px] text-muted-foreground font-bold uppercase">Age</p>
                <p className="font-semibold text-sm">{data.age !== null ? `${data.age} years` : 'N/A'}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground font-bold uppercase">Blood Group</p>
                <p className="inline-block px-4 py-1.5 rounded-xl bg-red-600 text-white text-lg font-black animate-pulse">{bg}</p>
              </div>
            </div>

            {(data.allergies?.length > 0) && (
              <details open className="rounded-xl border p-3">
                <summary className="font-bold text-sm cursor-pointer">Allergies ({data.allergies.length})</summary>
                <ul className="pl-4 mt-1 space-y-1 text-sm list-disc">
                  {data.allergies.map((a, i) => (
                    <li key={i}>
                      <strong>{a.allergen}:</strong> {a.reaction} ({a.severity})
                    </li>
                  ))}
                </ul>
              </details>
            )}

            {(data.knownConditions?.length > 0) && (
              <details open className="rounded-xl border p-3">
                <summary className="font-bold text-sm cursor-pointer">Conditions ({data.knownConditions.length})</summary>
                <ul className="pl-4 mt-1 space-y-1 text-sm list-disc">
                  {data.knownConditions.map((c, i) => (
                    <li key={i}>
                      <strong>{c.condition}</strong> since {c.since || '—'}
                      {c.notes ? <div className="text-muted-foreground text-xs mt-0.5">{c.notes}</div> : null}
                    </li>
                  ))}
                </ul>
              </details>
            )}

            <details className="rounded-xl border p-3">
              <summary className="font-bold text-sm cursor-pointer">Emergency Contact</summary>
              <div className="text-sm mt-2">
                <strong>{data.emergencyContact?.name}</strong><br />
                {data.emergencyContact?.phone ? (
                  <a href={`tel:${data.emergencyContact.phone}`} className="text-sky-600 font-bold">{data.emergencyContact.phone}</a>
                ) : null}
              </div>
            </details>

            <div className="flex gap-2 justify-center pt-1">
              {data.emergencyContact?.phone ? (
                <a href={`tel:${data.emergencyContact.phone}`}>
                  <Button size="sm">📞 Call Emergency Contact</Button>
                </a>
              ) : null}
              <a href="tel:108"><Button size="sm" variant="outline">🚑 Call 108</Button></a>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-3">
            <h4 className="font-bold">What this card contains</h4>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-4">
              <li><strong>Name</strong> — Patient's full name</li>
              <li><strong>Age</strong> — Calculated from date of birth</li>
              <li><strong>Blood Group</strong> — Prominently displayed for fast matching</li>
              <li><strong>Allergies</strong> — Allergens, reaction type, severity</li>
              <li><strong>Conditions</strong> — Chronic conditions (diabetes, BP, etc.)</li>
              <li><strong>Emergency Contact</strong> — Name &amp; phone with tap-to-call</li>
            </ul>
            <p className="text-muted-foreground text-xs border-t pt-3">
              This is a FindMedi Health ID card. For emergency use only.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
