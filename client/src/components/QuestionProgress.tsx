import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { Streamdown } from 'streamdown';
import { Lightbulb, ChevronRight } from 'lucide-react';
import { trpc } from '@/lib/trpc';

interface QuestionProgressProps {
  questionId: number;
  userAnswer?: string;
  correctAnswer?: string;
  isCorrect?: boolean;
}

export function QuestionProgress({ questionId, userAnswer, correctAnswer, isCorrect }: QuestionProgressProps) {
  const [showExplanation, setShowExplanation] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleExplainFurther = async () => {
    setShowExplanation(true);
    if (explanation) return;

    setLoading(true);
    try {
      // Call explanation endpoint
      const response = await fetch('/api/trpc/questions.explainQuestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, userAnswer, correctAnswer }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setExplanation(data.explanation);
      }
    } catch (error) {
      console.error('Failed to get explanation:', error);
      setExplanation('Unable to generate explanation at this time.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card className="p-6 mt-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg">
              {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
            </h3>
            {!isCorrect && correctAnswer && (
              <p className="text-sm text-muted-foreground mt-2">
                Correct answer: <span className="font-medium">{correctAnswer}</span>
              </p>
            )}
          </div>
          <Button
            onClick={handleExplainFurther}
            variant="outline"
            className="gap-2"
          >
            <Lightbulb className="w-4 h-4" />
            Explain Further
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </Card>

      <Dialog open={showExplanation} onOpenChange={setShowExplanation}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detailed Explanation</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Spinner />
              </div>
            ) : explanation ? (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <Streamdown>{explanation}</Streamdown>
              </div>
            ) : (
              <p className="text-muted-foreground">No explanation available.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
