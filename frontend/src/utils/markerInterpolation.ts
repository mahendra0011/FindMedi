/**
 * Linear Interpolation (LERP) helper for 60fps smooth Leaflet marker movement.
 * Smoothly animates vehicle marker between incoming GPS points over the expected interval.
 */

export interface PositionPoint {
  lat: number;
  lng: number;
  bearing?: number; // Heading in degrees (0 - 360)
  timestamp?: number;
}

export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

/**
 * Calculates shortest angle difference for smooth 360-degree compass rotation.
 */
export function lerpBearing(startAngle: number, endAngle: number, t: number): number {
  const difference = (endAngle - startAngle) % 360;
  const shortestAngle = (2 * difference) % 360 - difference;
  return (startAngle + shortestAngle * t + 360) % 360;
}

export class MarkerSmoother {
  private currentLat: number;
  private currentLng: number;
  private currentBearing: number;
  private targetLat: number;
  private targetLng: number;
  private targetBearing: number;
  private startTime: number = 0;
  private durationMs: number = 1500;
  private animationFrameId: number | null = null;
  private onUpdate: (pos: [number, number], bearing: number) => void;

  constructor(initial: PositionPoint, onUpdate: (pos: [number, number], bearing: number) => void) {
    this.currentLat = initial.lat;
    this.currentLng = initial.lng;
    this.currentBearing = initial.bearing || 0;
    this.targetLat = initial.lat;
    this.targetLng = initial.lng;
    this.targetBearing = initial.bearing || 0;
    this.onUpdate = onUpdate;
  }

  public setNextTarget(next: PositionPoint, durationMs: number = 1500) {
    // Current animated position becomes the new start
    this.targetLat = next.lat;
    this.targetLng = next.lng;
    this.targetBearing = next.bearing ?? this.currentBearing;
    this.durationMs = durationMs;
    this.startTime = performance.now();

    if (!this.animationFrameId) {
      this.animate();
    }
  }

  private animate = () => {
    const now = performance.now();
    const elapsed = now - this.startTime;
    const progress = Math.min(elapsed / this.durationMs, 1.0);

    // Ease-out cubic curve for smooth slowing down at destination
    const easeProgress = 1 - Math.pow(1 - progress, 3);

    const lat = lerp(this.currentLat, this.targetLat, easeProgress);
    const lng = lerp(this.currentLng, this.targetLng, easeProgress);
    const bearing = lerpBearing(this.currentBearing, this.targetBearing, easeProgress);

    this.onUpdate([lat, lng], bearing);

    if (progress < 1.0) {
      this.animationFrameId = requestAnimationFrame(this.animate);
    } else {
      this.currentLat = this.targetLat;
      this.currentLng = this.targetLng;
      this.currentBearing = this.targetBearing;
      this.animationFrameId = null;
    }
  };

  public destroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
}
