import React from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Moon } from 'lucide-react';

export default function NotFound() {
  const [_, setLocation] = useLocation();
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-gradient-romantic text-white gap-6">
      <Moon className="w-16 h-16 text-primary opacity-60" />
      <h1 className="text-4xl font-serif font-bold">Page Not Found</h1>
      <p className="text-white/50 text-lg">This page doesn't exist in the moonlight.</p>
      <Button onClick={() => setLocation('/')} className="mt-2">Back to Moonlight</Button>
    </div>
  );
}
