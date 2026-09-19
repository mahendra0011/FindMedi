import React, { useState, useEffect, useRef } from 'react';
import { MapPin, LocateFixed, Loader2, X, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export interface LocationPoint {
  address: string;
  lat: number;
  lng: number;
}

interface LocationInputProps {
  label: string;
  placeholder?: string;
  value: LocationPoint | null;
  onChange: (point: LocationPoint | null) => void;
  showCurrentLocationButton?: boolean;
  pinColor?: string;
}

export default function LocationInput({
  label,
  placeholder = 'Enter landmark or address',
  value,
  onChange,
  showCurrentLocationButton = false,
  pinColor = 'text-primary',
}: LocationInputProps) {
  const [query, setQuery] = useState(value?.address || '');
  const [loadingLoc, setLoadingLoc] = useState(false);
  const [suggestions, setSuggestions] = useState<LocationPoint[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<any>(null);

  useEffect(() => {
    setQuery(value?.address || '');
  }, [value?.address]);

  // Common landmarks for quick fallback autocompletion
  const POPULAR_LOCATIONS: LocationPoint[] = [
    { address: 'City Central Hospital, Wright Town, Jabalpur', lat: 23.1685, lng: 79.9339 },
    { address: 'Medical College & Hospital, Garha, Jabalpur', lat: 23.1492, lng: 79.8837 },
    { address: 'Victoria District Hospital, Omti, Jabalpur', lat: 23.1722, lng: 79.9405 },
    { address: 'Railway Station Platform 1, Jabalpur', lat: 23.1601, lng: 79.9572 },
    { address: 'Dumna Airport Terminal, Jabalpur', lat: 23.1784, lng: 80.0526 },
    { address: 'Civic Centre Market, Marhatal, Jabalpur', lat: 23.1678, lng: 79.9328 },
    { address: 'Bhedaghat Dhuandhar Fall Rd, Jabalpur', lat: 23.1311, lng: 79.8005 },
  ];

  const handleSearch = (text: string) => {
    setQuery(text);
    if (!text.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      onChange(null);
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      // 1. Local landmark matches
      const localMatches = POPULAR_LOCATIONS.filter((l) =>
        l.address.toLowerCase().includes(text.toLowerCase())
      );

      // 2. Query OpenStreetMap Nominatim for live suggestions
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            text
          )}&countrycodes=in&limit=5`
        );
        if (res.ok) {
          const data = await res.json();
          const osmMatches = (data || []).map((item: any) => ({
            address: item.display_name,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
          }));
          const combined = [...localMatches, ...osmMatches].slice(0, 6);
          setSuggestions(combined);
          setShowSuggestions(combined.length > 0);
          return;
        }
      } catch {
        // Fallback to local
      }

      setSuggestions(localMatches);
      setShowSuggestions(localMatches.length > 0);
    }, 350);
  };

  const handleSelect = (item: LocationPoint) => {
    setQuery(item.address);
    onChange(item);
    setShowSuggestions(false);
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setLoadingLoc(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          // Reverse geocode via OSM Nominatim
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          if (res.ok) {
            const data = await res.json();
            const point: LocationPoint = {
              address: data.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
              lat: latitude,
              lng: longitude,
            };
            setQuery(point.address);
            onChange(point);
            toast.success('Current location detected!');
            setLoadingLoc(false);
            return;
          }
        } catch {}

        const fallbackPoint: LocationPoint = {
          address: `Current GPS (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
          lat: latitude,
          lng: longitude,
        };
        setQuery(fallbackPoint.address);
        onChange(fallbackPoint);
        setLoadingLoc(false);
      },
      (err) => {
        setLoadingLoc(false);
        toast.error('Unable to fetch GPS position. Please enter address manually.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  return (
    <div className="relative space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <MapPin className={cn('w-3.5 h-3.5', pinColor)} />
          {label}
        </label>
        {showCurrentLocationButton && (
          <button
            type="button"
            onClick={handleDetectLocation}
            disabled={loadingLoc}
            className="text-[11px] text-primary hover:underline font-medium flex items-center gap-1 transition-colors"
          >
            {loadingLoc ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <LocateFixed className="w-3 h-3" />
            )}
            Use Current Location
          </button>
        )}
      </div>

      <div className="relative">
        <Input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) setShowSuggestions(true);
          }}
          placeholder={placeholder}
          className="h-10 text-sm pr-8 bg-background border-border/80 rounded-xl focus-visible:ring-primary/20"
        />

        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              onChange(null);
              setSuggestions([]);
              setShowSuggestions(false);
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-popover/95 backdrop-blur-md border border-border/80 shadow-xl rounded-xl z-50 overflow-hidden divide-y divide-border/50 max-h-56 overflow-y-auto">
          {suggestions.map((s, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelect(s)}
              className="w-full text-left px-3.5 py-2.5 hover:bg-muted/60 transition-colors flex items-start gap-2.5 text-xs text-foreground"
            >
              <MapPin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
              <span className="line-clamp-2">{s.address}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
