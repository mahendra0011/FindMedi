import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Phone, AlertTriangle, Heart, Shield, Clock, Users } from 'lucide-react';
import { api } from '@/lib/api';
const EMERGENCY_CONTACTS = [
    {
        name: "National Suicide Prevention Lifeline",
        number: "988",
        description: "24/7 crisis support and suicide prevention",
        type: "crisis",
        available: "24/7"
    },
    {
        name: "Crisis Text Line",
        number: "Text HOME to 741741",
        description: "24/7 crisis support via text",
        type: "crisis",
        available: "24/7"
    },
    {
        name: "SAMHSA National Helpline",
        number: "1-800-662-4357",
        description: "Mental health and substance abuse treatment referral",
        type: "support",
        available: "24/7"
    },
    {
        name: "Campus Counseling Center",
        number: "Call your institution",
        description: "On-campus mental health support",
        type: "support",
        available: "Business Hours"
    },
    {
        name: "Emergency Services",
        number: "911",
        description: "Immediate medical emergency",
        type: "medical",
        available: "24/7"
    }
];
const COPING_STRATEGIES = [
    {
        title: "Grounding Technique (5-4-3-2-1)",
        steps: [
            "Name 5 things you can see",
            "Name 4 things you can touch",
            "Name 3 things you can hear",
            "Name 2 things you can smell",
            "Name 1 thing you can taste"
        ]
    },
    {
        title: "Box Breathing",
        steps: [
            "Inhale for 4 counts",
            "Hold for 4 counts",
            "Exhale for 4 counts",
            "Hold for 4 counts",
            "Repeat 4-6 times"
        ]
    },
    {
        title: "Progressive Muscle Relaxation",
        steps: [
            "Tense your fists for 5 seconds, then release",
            "Tense your arms for 5 seconds, then release",
            "Tense your shoulders for 5 seconds, then release",
            "Continue with each muscle group",
            "Notice the contrast between tension and relaxation"
        ]
    }
];
const SAFETY_PLAN_TEMPLATE = [
    "Warning signs that a crisis may be developing",
    "Internal coping strategies I can use",
    "People and social settings that provide distraction",
    "Family members or friends I can ask for help",
    "Mental health professionals I can contact",
    "How to make my environment safe"
];
const EmergencySupport = ({ onCrisisDetected }) => {
    const [activeTab, setActiveTab] = useState('contacts');
    const [crisisMode, setCrisisMode] = useState(false);
    const handleCrisisAlert = async () => {
        setCrisisMode(true);
        onCrisisDetected?.();
        try {
            await api.post("/api/wellness/emergency", {
                type: "crisis",
                source: "public-emergency-widget",
                message: "Emergency widget crisis alert requested",
            });
        } catch {
            // Guests still receive immediate crisis contacts on this screen.
        }
    };
    const getContactIcon = (type) => {
        switch (type) {
            case 'crisis': return <AlertTriangle className="h-5 w-5 text-emergency"/>;
            case 'support': return <Heart className="h-5 w-5 text-primary"/>;
            case 'medical': return <Shield className="h-5 w-5 text-destructive"/>;
            default: return <Phone className="h-5 w-5"/>;
        }
    };
    if (crisisMode) {
        return (<div className="space-y-6">
        <Alert className="border-emergency bg-emergency/10">
          <AlertTriangle className="h-4 w-4 text-emergency"/>
          <AlertDescription className="text-emergency font-medium">
            Crisis mode activated. Help is available immediately.
          </AlertDescription>
        </Alert>

        <div className="grid gap-4 md:grid-cols-2">
          {EMERGENCY_CONTACTS.filter(contact => contact.type === 'crisis').map((contact, index) => (<Card key={index} className="glass-card border-emergency/30">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3 mb-3">
                  {getContactIcon(contact.type)}
                  <h3 className="font-semibold text-emergency">{contact.name}</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{contact.description}</p>
                <Button className="w-full bg-emergency text-emergency-foreground hover:bg-emergency/90" onClick={() => window.open(`tel:${contact.number.replace(/\D/g, '')}`)}>
                  <Phone className="h-4 w-4 mr-2"/>
                  {contact.number}
                </Button>
              </CardContent>
            </Card>))}
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-emergency">Immediate Coping Strategies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-primary/10 rounded-lg">
                <h4 className="font-semibold mb-2">Right Now:</h4>
                <ul className="text-sm space-y-1">
                  <li>• You are safe right now</li>
                  <li>• This feeling will pass</li>
                  <li>• Focus on your breathing</li>
                  <li>• You are not alone</li>
                </ul>
              </div>
              
              <div className="p-4 bg-secondary/10 rounded-lg">
                <h4 className="font-semibold mb-2">Grounding (5-4-3-2-1):</h4>
                <ul className="text-sm space-y-1">
                  <li>• 5 things you can see</li>
                  <li>• 4 things you can touch</li>
                  <li>• 3 things you can hear</li>
                  <li>• 2 things you can smell</li>
                  <li>• 1 thing you can taste</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button variant="outline" onClick={() => setCrisisMode(false)} className="w-full">
          Exit Crisis Mode
        </Button>
      </div>);
    }
    return (<div className="space-y-6">
      <div className="flex gap-2 flex-wrap">
        <Button variant={activeTab === 'contacts' ? 'default' : 'outline'} onClick={() => setActiveTab('contacts')} size="sm">
          <Phone className="h-4 w-4 mr-2"/>
          Emergency Contacts
        </Button>
        <Button variant={activeTab === 'coping' ? 'default' : 'outline'} onClick={() => setActiveTab('coping')} size="sm">
          <Heart className="h-4 w-4 mr-2"/>
          Coping Strategies
        </Button>
        <Button variant={activeTab === 'safety' ? 'default' : 'outline'} onClick={() => setActiveTab('safety')} size="sm">
          <Shield className="h-4 w-4 mr-2"/>
          Safety Planning
        </Button>
      </div>

      <Button onClick={handleCrisisAlert} className="w-full bg-emergency text-emergency-foreground hover:bg-emergency/90 glow-primary" size="lg">
        <AlertTriangle className="h-5 w-5 mr-2"/>
        I Need Help Right Now
      </Button>

      {activeTab === 'contacts' && (<div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
          {EMERGENCY_CONTACTS.map((contact, index) => (<Card key={index} className="glass-card floating-card">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3 mb-3">
                  {getContactIcon(contact.type)}
                  <div className="flex-1">
                    <h3 className="font-semibold">{contact.name}</h3>
                    <p className="text-sm text-muted-foreground">{contact.description}</p>
                    <div className="flex items-center space-x-2 mt-2">
                      <Clock className="h-3 w-3 text-muted-foreground"/>
                      <span className="text-xs text-muted-foreground">{contact.available}</span>
                    </div>
                  </div>
                </div>
                <Button variant="outline" className="w-full" onClick={() => {
                    if (contact.number.includes('Text')) {
                        window.open('sms:741741?body=HOME');
                    }
                    else {
                        window.open(`tel:${contact.number.replace(/\D/g, '')}`);
                    }
                }}>
                  <Phone className="h-4 w-4 mr-2"/>
                  {contact.number}
                </Button>
              </CardContent>
            </Card>))}
        </div>)}

      {activeTab === 'coping' && (<div className="space-y-6">
          {COPING_STRATEGIES.map((strategy, index) => (<Card key={index} className="glass-card floating-card">
              <CardHeader>
                <CardTitle className="gradient-text">{strategy.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-2">
                  {strategy.steps.map((step, stepIndex) => (<li key={stepIndex} className="flex items-start space-x-2">
                      <span className="flex-shrink-0 w-6 h-6 bg-primary/20 text-primary rounded-full flex items-center justify-center text-sm font-medium">
                        {stepIndex + 1}
                      </span>
                      <span className="text-sm">{step}</span>
                    </li>))}
                </ol>
              </CardContent>
            </Card>))}
        </div>)}

      {activeTab === 'safety' && (<Card className="glass-card">
          <CardHeader>
            <CardTitle className="gradient-text">Personal Safety Plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              A safety plan is a personalized, practical plan to improve your safety and help you through difficult times.
            </p>
            
            <div className="space-y-4">
              {SAFETY_PLAN_TEMPLATE.map((item, index) => (<div key={index} className="p-4 bg-muted/30 rounded-lg">
                  <h4 className="font-medium mb-2">Step {index + 1}:</h4>
                  <p className="text-sm text-muted-foreground">{item}</p>
                  <div className="mt-2 p-2 bg-background/50 rounded border-2 border-dashed border-muted text-center text-xs text-muted-foreground">
                    Save your personalized safety plan through your MindSupport account
                  </div>
                </div>))}
            </div>

            <Alert>
              <Users className="h-4 w-4"/>
              <AlertDescription>
                Work with a counselor to develop your personalized safety plan. This template provides a starting framework.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>)}
    </div>);
};
export default EmergencySupport;
