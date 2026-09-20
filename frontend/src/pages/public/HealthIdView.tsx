import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { QrCode } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { useParams, useEffect, useState } from 'react';
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
  [data, setData] = useState<HealthIdData | null>(null);
  [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    api.get(`/health-id/${token}`).then((r: any) => {
      setData(r.data || null);
      setLoading(false);
    }).catch(() => {
      setData(null);
      setLoading(false);
    });
  }, [token]);

  if (loading || !data) {
    return (
      <Container text-center py-8>
        <h3>Health ID Card</h3>
        {token ? (
          <p className="text-muted-foreground mt-2">Loading emergency info…</p>
        ) : (
          <p className="text-muted-foreground">Scan a valid Health ID QR code.</p>
        )}
      </Container>
    );
  }

  const bgColor = data.bloodGroup?.toLowerCase().includes('a') || data.bloodGroup?.toLowerCase().includes('ab')
    ? 'bg-red-100 text-red-800' :
    data.bloodGroup?.toLowerCase().includes('b') || data.bloodGroup?.toLowerCase().includes('ab')
      ? 'bg-orange-100 text-orange-800' :
    'bg-green-100 text-green-800';

  return (
    <Container className="pt-4">
      <Row className="g-4">
        <Col md={6} xs={12}>
          <Card className="h-100">
            <CardBody className="p-5">
              <div className="text-center mb-4">
                <QrCode
                  value={process.env.FRONTEND_URL || 'http://localhost:3000'}/health-id/{token}
                  size={180}
                  bgColor="white"
                  fgColor="black"
                />
                <div className="mt-3">
                  <small>Health ID QR Token</small>
                  <code className="font-mono text-sm break-all">{token}</code>
                </div>
              </div>

              <h2 className="h3 mb-3">{data.name}</h2>

              <div className="mb-3">
                <div className="text-primary small">Age:</div>
                <p className="font-medium">{data.age !== null ? `${data.age} years` : 'N/A'}</p>
              </div>

              <div className="mb-5">
                <div className="text-primary small">Blood Group:</div>
                <p className="h4 font-black {bgColor}" style={{ whiteSpace: 'nowrap' }}>
                  {data.bloodGroup}
                </p>
              </div>

              {/* Allergies */}
              {data.allergies.length > 0 && (
                <Details open>
                  <Details.Summary className="text-primary fw-bold small">Allergies <span className="text-danger small">({data.allergies.length})</span></Details.Summary>
                  <ul className="ps-3 small mt-1">
                    {data.allergies.map((a, i) => (
                      <li key={i} className="mb-1">
                        <strong>{a.allergen}:</strong> {a.reaction} ({a.severity})
                      </li>
                    ))}
                  </ul>
                </Details>
              )}

              {/* Known Conditions */}
              {data.knownConditions.length > 0 && (
                <Details open>
                  <Details.Summary className="text-primary fw-bold small">Conditions <span className="text-info small">({data.knownConditions.length})</span></Details.Summary>
                  <ul className="ps-3 small mt-1">
                    {data.knownConditions.map((c, i) => (
                      <li key={i} className="mb-1">
                        <strong>{c.condition}</strong> since {c.since || '—'}
                        {c.notes && <div className="text-muted-foreground small mt-1">{c.notes}</div>}
                      </li>
                    ))}
                  </ul>
                </Details>
              )}

              {/* Emergency Contact */}
              <Details>
                <Details.Summary className="text-success fw-bold small">Emergency Contact</Details.Summary>
                <div className="small mt-2">
                  <strong>{data.emergencyContact.name}</strong><br />
                  <a href={`tel:${data.emergencyContact.phone}`} className="text-primary">
                    {data.emergencyContact.phone}
                  </a>
                </div>
              </Details>

              {/* Quick actions */}
              <hr className="my-4" />
              <div className="d-flex gap-2 justify-content-center">
                <Button variant="link" size="sm">
                  <i className="bi bi-telephone"></i> Call Emergency
                </Button>
                <Button variant="link" size="sm">
                  <i className="bi bi-ambulance"></i> Ambulance
                </Button>
              </div>
            </CardBody>
          </Card>
        </Col>

        <Col md={6} xs={12}>
          <Card className="h-100">
            <CardBody className="p-5">
              <h4 className="h5 mb-3">What this card contains</h4>
              <ul className="list-unstyled small text-muted-foreground">
                <li><strong>Name</strong> — Patient's full name</li>
                <li><strong>Age</strong> — Calculated from date of birth</li>
                <li><strong>Blood Group</strong> — Prominently displayed for fast matching</li>
                <li><strong>Allergies</strong> — Allergens, reaction type, severity</li>
                <li><strong>Conditions</strong> — Chronic conditions (diabetes, BP, etc.)</li>
                <li><strong>Emergency Contact</strong> — Name & phone with tap-to-call</li>
              </ul>

              <hr className="my-3" />
              <p className="text-muted-foreground small">
                This is a FindMedi Health ID card. For emergency use only.
                Share with doctors, paramedics, or anyone assisting in an emergency.
              </p>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}