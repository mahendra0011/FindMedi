import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    api.get(`/health-id/${token}`)
      .then((r: any) => { setData(r || null); setLoading(false); })
      .catch(() => { setData(null); setLoading(false); });
  }, [token]);

  if (loading || !data) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center">
        <h3 className="text-xl font-black mb-2">Health ID Card</h3>
        <p className="text-muted-foreground">
          {loading ? 'Loading emergency info…' : 'Card not found or disabled.'}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <Card>
        <CardContent className="p-6 text-center">
          <QRCodeSVG
            value={`${window.location.origin}/health-id/${token}`}
            size={180}
            bgColor="#ffffff"
            fgColor="#000000"
          />
          <h2 className="text-2xl font-black mt-4">{data.name}</h2>
          <p className="text-sm text-muted-foreground">
            {data.age !== null ? `${data.age} years` : 'Age: N/A'} · {data.gender}
          </p>

          <div className="mt-4 inline-block rounded-2xl bg-red-600 text-white px-6 py-3">
            <p className="text-xs uppercase tracking-wide">Blood Group</p>
            <p className="text-3xl font-black">{data.bloodGroup || '—'}</p>
          </div>
        </CardContent>
      </Card>

      {data.allergies?.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-bold text-sm mb-2">⚠️ Allergies</h3>
            <ul className="text-sm space-y-1">
              {data.allergies.map((a, i) => (
                <li key={i}><strong>{a.allergen}</strong> — {a.reaction} ({a.severity})</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {data.knownConditions?.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-bold text-sm mb-2">Known Conditions</h3>
            <ul className="text-sm space-y-1">
              {data.knownConditions.map((c, i) => (
                <li key={i}>
                  <strong>{c.condition}</strong> {c.since ? `(since ${c.since})` : ''}
                  {c.notes && <div className="text-muted-foreground">{c.notes}</div>}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4">
          <h3 className="font-bold text-sm mb-2">Emergency Contact</h3>
          <p className="font-semibold">{data.emergencyContact?.name}</p>
          <a href={`tel:${data.emergencyContact?.phone}`}>
            <Button className="mt-2 w-full rounded-xl font-bold">
              📞 Call {data.emergencyContact?.phone}
            </Button>
          </a>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        FindMedi Health ID — Emergency info only.
      </p>
    </div>
  );
}
