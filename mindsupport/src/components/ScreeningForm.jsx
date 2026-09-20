import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
const PHQ9_QUESTIONS = [
    "Little interest or pleasure in doing things",
    "Feeling down, depressed, or hopeless",
    "Trouble falling or staying asleep, or sleeping too much",
    "Feeling tired or having little energy",
    "Poor appetite or overeating",
    "Feeling bad about yourself or that you are a failure",
    "Trouble concentrating on things",
    "Moving or speaking slowly, or being fidgety/restless",
    "Thoughts that you would be better off dead or hurting yourself"
];
const GAD7_QUESTIONS = [
    "Feeling nervous, anxious, or on edge",
    "Not being able to stop or control worrying",
    "Worrying too much about different things",
    "Trouble relaxing",
    "Being so restless that it's hard to sit still",
    "Becoming easily annoyed or irritable",
    "Feeling afraid as if something awful might happen"
];
const ScreeningForm = ({ type, onComplete }) => {
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState([]);
    const [showResults, setShowResults] = useState(false);
    const questions = type === 'PHQ9' ? PHQ9_QUESTIONS : GAD7_QUESTIONS;
    const totalQuestions = questions.length;
    const progress = ((currentQuestion + 1) / totalQuestions) * 100;
    const handleAnswer = (value) => {
        const newAnswers = [...answers];
        newAnswers[currentQuestion] = parseInt(value);
        setAnswers(newAnswers);
        if (currentQuestion < totalQuestions - 1) {
            setCurrentQuestion(currentQuestion + 1);
        }
        else {
            // Calculate score and show results
            const totalScore = newAnswers.reduce((sum, score) => sum + score, 0);
            const riskLevel = calculateRiskLevel(totalScore, type);
            setShowResults(true);
            onComplete(totalScore, riskLevel);
        }
    };
    const calculateRiskLevel = (score, screeningType) => {
        if (screeningType === 'PHQ9') {
            if (score <= 4)
                return 'minimal';
            if (score <= 9)
                return 'mild';
            if (score <= 14)
                return 'moderate';
            if (score <= 19)
                return 'moderately-severe';
            return 'severe';
        }
        else { // GAD7
            if (score <= 4)
                return 'minimal';
            if (score <= 9)
                return 'mild';
            if (score <= 14)
                return 'moderate';
            return 'severe';
        }
    };
    const getRiskColor = (level) => {
        switch (level) {
            case 'minimal': return 'text-success';
            case 'mild': return 'text-warning';
            case 'moderate': return 'text-warning';
            case 'moderately-severe': return 'text-destructive';
            case 'severe': return 'text-emergency';
            default: return 'text-foreground';
        }
    };
    const getRiskIcon = (level) => {
        switch (level) {
            case 'minimal': return <CheckCircle className="h-5 w-5 text-success"/>;
            case 'mild':
            case 'moderate': return <Info className="h-5 w-5 text-warning"/>;
            case 'moderately-severe':
            case 'severe': return <AlertTriangle className="h-5 w-5 text-destructive"/>;
            default: return null;
        }
    };
    const score = answers.reduce((sum, answer) => sum + answer, 0);
    const riskLevel = calculateRiskLevel(score, type);
    if (showResults) {
        return (<Card className="glass-card floating-card">
        <CardHeader>
          <CardTitle className="gradient-text text-center">
            {type} Screening Results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <div className="text-4xl font-bold mb-2">{score}</div>
            <div className="text-sm text-muted-foreground">
              out of {totalQuestions * 3} total points
            </div>
          </div>

          <Alert>
            {getRiskIcon(riskLevel)}
            <AlertDescription className={`ml-2 ${getRiskColor(riskLevel)} font-medium`}>
              Risk Level: {riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)}
              {riskLevel === 'severe' && ' - Please consider speaking with a counselor'}
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <h4 className="font-semibold">Recommendations:</h4>
            {riskLevel === 'minimal' && (<p className="text-sm text-muted-foreground">
                Continue maintaining your mental wellness with regular self-care practices.
              </p>)}
            {(riskLevel === 'mild' || riskLevel === 'moderate') && (<ul className="text-sm text-muted-foreground space-y-1">
                <li>• Practice stress management techniques</li>
                <li>• Maintain regular sleep schedule</li>
                <li>• Consider peer support groups</li>
              </ul>)}
            {(riskLevel === 'moderately-severe' || riskLevel === 'severe') && (<ul className="text-sm text-muted-foreground space-y-1">
                <li>• Strongly recommended to speak with a counselor</li>
                <li>• Practice crisis management techniques</li>
                <li>• Maintain regular contact with support systems</li>
              </ul>)}
          </div>

          <Button onClick={() => {
                setCurrentQuestion(0);
                setAnswers([]);
                setShowResults(false);
            }} variant="outline" className="w-full">
            Take Assessment Again
          </Button>
        </CardContent>
      </Card>);
    }
    return (<Card className="glass-card floating-card">
      <CardHeader>
        <CardTitle className="gradient-text">
          {type} Assessment - Question {currentQuestion + 1} of {totalQuestions}
        </CardTitle>
        <Progress value={progress} className="mt-2"/>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">
            Over the last 2 weeks, how often have you been bothered by:
          </h3>
          <p className="text-xl font-semibold text-foreground">
            {questions[currentQuestion]}
          </p>
        </div>

        <RadioGroup onValueChange={handleAnswer} className="space-y-3">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="0" id="not-at-all"/>
            <Label htmlFor="not-at-all">Not at all (0)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="1" id="several-days"/>
            <Label htmlFor="several-days">Several days (1)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="2" id="more-than-half"/>
            <Label htmlFor="more-than-half">More than half the days (2)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="3" id="nearly-every-day"/>
            <Label htmlFor="nearly-every-day">Nearly every day (3)</Label>
          </div>
        </RadioGroup>

        <div className="text-sm text-muted-foreground">
          This assessment is for educational purposes and does not replace professional consultation.
        </div>
      </CardContent>
    </Card>);
};
export default ScreeningForm;
