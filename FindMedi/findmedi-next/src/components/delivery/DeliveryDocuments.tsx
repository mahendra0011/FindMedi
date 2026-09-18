'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api/endpoints';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export interface DeliveryDocument {
  _id: string;
  name: string;
  type: 'permit' | 'license' | 'insurance' | 'id' | 'other';
  url?: string;
  status: 'pending' | 'approved' | 'rejected';
  uploadedAt?: string;
}

export interface DeliveryDocumentsProps {
  onDocumentSelect?: (doc: DeliveryDocument) => void;
}

export default function DeliveryDocuments({ onDocumentSelect }: DeliveryDocumentsProps) {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<DeliveryDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await api.getDeliveryDocuments(user._id);
        setDocuments((res.documents as unknown) as DeliveryDocument[]);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to load documents');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [user]);

  if (isLoading && documents.length === 0) {
    return <p className="text-muted-foreground">Loading...</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Delivery Documents</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && documents.length === 0 ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : documents.length === 0 ? (
          <p className="text-muted-foreground">No documents found</p>
        ) : (
          <div className="space-y-3">
            {documents.map((doc: DeliveryDocument) => {
              const hasUrl = doc.url != null && doc._id != null;
              return (
                <div key={doc._id} className="p-3 rounded border">
                  <div className="flex items-start gap-3">
                    <div className="w-3 h-3 rounded-full bg-secondary/60" />
                    <div>
                      <p className="font-medium">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {doc.type}
                      </p>
                    </div>
                    <Badge
                      variant={doc.status === 'approved' ? 'default' : doc.status === 'rejected' ? 'destructive' : 'secondary'}
                    >
                      {doc.status}
                    </Badge>
                  </div>
                  {hasUrl && (
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => onDocumentSelect?.(doc)}
                    >
                      View
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}