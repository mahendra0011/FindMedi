/**
 * Doctor setup page — Client Component.
 * First-time setup flow for doctors after OTP verification.
 */
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Stethoscope, FileText, Award } from 'lucide-react';
import Link from 'next/link';

export default function DoctorSetupPage() {
  const [step, setStep] = useState(1);

  return (
    <div className="container mx-auto flex items-center justify-center min-h-screen py-12 px-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">Doctor Profile Setup</CardTitle>
          <CardDescription>Complete your profile to get started on FindMedi.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" placeholder="Dr. Jane Smith" />
                </div>
                <div>
                  <Label htmlFor="specialization">Specialization</Label>
                  <Select>
                    <SelectTrigger id="specialization">
                      <SelectValue placeholder="Select specialty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cardiology">Cardiology</SelectItem>
                      <SelectItem value="neurology">Neurology</SelectItem>
                      <SelectItem value="orthopedics">Orthopedics</SelectItem>
                      <SelectItem value="pediatrics">Pediatrics</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="qualifications">Qualifications</Label>
                <Input id="qualifications" placeholder="MBBS, MD, ... " />
              </div>
              <div>
                <Label htmlFor="experience">Years of Experience</Label>
                <Input id="experience" type="number" placeholder="10" />
              </div>
              <Button className="w-full" onClick={() => setStep(2)}>Continue</Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="registration">Medical Registration Number</Label>
                <Input id="registration" placeholder="e.g. MCI-12345" />
              </div>
              <div>
                <Label htmlFor="bio">Professional Bio</Label>
                <textarea
                  id="bio"
                  className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Tell patients about your practice..."
                />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Back</Button>
                <Button className="flex-1">Complete Setup</Button>
              </div>
            </div>
          )}

          <div className="text-center text-sm">
            <Link href="/dashboard" className="text-primary hover:underline">Skip for now</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
