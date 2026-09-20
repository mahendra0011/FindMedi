import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Smile, Meh, Frown, Heart } from 'lucide-react';
const MOOD_EMOJIS = [
    { icon: <Frown className="h-8 w-8"/>, label: 'Very Low', color: 'text-destructive' },
    { icon: <Meh className="h-8 w-8"/>, label: 'Low', color: 'text-warning' },
    { icon: <Meh className="h-8 w-8"/>, label: 'Neutral', color: 'text-muted-foreground' },
    { icon: <Smile className="h-8 w-8"/>, label: 'Good', color: 'text-success' },
    { icon: <Heart className="h-8 w-8"/>, label: 'Excellent', color: 'text-primary' },
];
const MOOD_TAGS = ['Stressed', 'Anxious', 'Happy', 'Productive', 'Tired', 'Motivated'];
const MoodTracker = () => {
    const [currentMood, setCurrentMood] = useState(3);
    const [notes, setNotes] = useState('');
    const [selectedTags, setSelectedTags] = useState([]);
    const toggleTag = (tag) => {
        setSelectedTags(prev => prev.includes(tag)
            ? prev.filter(t => t !== tag)
            : [...prev, tag]);
    };
    const handleSubmit = () => {
        console.log('Mood entry:', { mood: currentMood, notes, tags: selectedTags });
        // Reset form
        setNotes('');
        setSelectedTags([]);
        setCurrentMood(3);
    };
    return (<Card className="glass-card floating-card">
      <CardHeader>
        <CardTitle className="gradient-text">Mood Tracker</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="font-medium">How are you feeling today?</h3>
          <div className="flex justify-between items-center">
            {MOOD_EMOJIS.map((mood, index) => (<button key={index} onClick={() => setCurrentMood(index + 1)} className={`p-3 rounded-lg transition-all ${currentMood === index + 1
                ? 'bg-primary/20 scale-110 glow-primary'
                : 'hover:bg-muted/50'}`}>
                <div className={mood.color}>{mood.icon}</div>
                <div className="text-xs mt-1">{mood.label}</div>
              </button>))}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-medium">Tags</h3>
          <div className="flex flex-wrap gap-2">
            {MOOD_TAGS.map((tag) => (<Badge key={tag} variant={selectedTags.includes(tag) ? "default" : "outline"} className="cursor-pointer hover:scale-105" onClick={() => toggleTag(tag)}>
                {tag}
              </Badge>))}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-medium">Notes (Optional)</h3>
          <Textarea placeholder="How was your day? What influenced your mood?" value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-[100px]"/>
        </div>

        <Button onClick={handleSubmit} className="w-full glow-primary">
          Save Mood Entry
        </Button>
      </CardContent>
    </Card>);
};
export default MoodTracker;
