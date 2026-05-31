/**
 * Analytics tracking utilities for Question Grove 360
 * Integrates with Manus built-in analytics
 */

export interface AnalyticsEvent {
  eventName: string;
  properties?: Record<string, any>;
  timestamp?: number;
}

export class Analytics {
  private static instance: Analytics;
  private analyticsUrl: string;
  private websiteId: string;

  private constructor() {
    this.analyticsUrl = import.meta.env.VITE_ANALYTICS_ENDPOINT || "";
    this.websiteId = import.meta.env.VITE_ANALYTICS_WEBSITE_ID || "";
  }

  static getInstance(): Analytics {
    if (!Analytics.instance) {
      Analytics.instance = new Analytics();
    }
    return Analytics.instance;
  }

  /**
   * Track a user action or event
   */
  trackEvent(eventName: string, properties?: Record<string, any>): void {
    if (!this.analyticsUrl || !this.websiteId) {
      console.warn("Analytics not configured");
      return;
    }

    const event: AnalyticsEvent = {
      eventName,
      properties: {
        ...properties,
        timestamp: Date.now(),
        url: window.location.href,
      },
    };

    // Send to analytics endpoint
    fetch(`${this.analyticsUrl}/api/event`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        website_id: this.websiteId,
        ...event,
      }),
    }).catch((err) => console.error("Analytics tracking failed:", err));
  }

  /**
   * Track page view
   */
  trackPageView(pageName: string): void {
    this.trackEvent("page_view", {
      page: pageName,
      referrer: document.referrer,
    });
  }

  /**
   * Track question answered
   */
  trackQuestionAnswered(questionId: number, isCorrect: boolean, specialty: string, timeSpent: number): void {
    this.trackEvent("question_answered", {
      question_id: questionId,
      is_correct: isCorrect,
      specialty,
      time_spent_seconds: timeSpent,
    });
  }

  /**
   * Track mock exam started
   */
  trackMockExamStarted(examId: number, examName: string): void {
    this.trackEvent("mock_exam_started", {
      exam_id: examId,
      exam_name: examName,
    });
  }

  /**
   * Track mock exam completed
   */
  trackMockExamCompleted(examId: number, score: number, totalQuestions: number, duration: number): void {
    this.trackEvent("mock_exam_completed", {
      exam_id: examId,
      score,
      total_questions: totalQuestions,
      percentage: Math.round((score / totalQuestions) * 100),
      duration_seconds: duration,
    });
  }

  /**
   * Track flashcard reviewed
   */
  trackFlashcardReviewed(cardId: number, quality: number, mastery: string): void {
    this.trackEvent("flashcard_reviewed", {
      card_id: cardId,
      quality_rating: quality,
      mastery_level: mastery,
    });
  }

  /**
   * Track SCA consultation started
   */
  trackSCAConsultationStarted(caseId: number, specialty: string): void {
    this.trackEvent("sca_consultation_started", {
      case_id: caseId,
      specialty,
    });
  }

  /**
   * Track SCA consultation completed
   */
  trackSCAConsultationCompleted(caseId: number, score: number, domains: Record<string, number>): void {
    this.trackEvent("sca_consultation_completed", {
      case_id: caseId,
      overall_score: score,
      domain_scores: domains,
    });
  }

  /**
   * Track subscription action
   */
  trackSubscriptionAction(action: "upgrade" | "cancel" | "downgrade", plan: string, price: number): void {
    this.trackEvent("subscription_action", {
      action,
      plan,
      price,
    });
  }

  /**
   * Track feature usage
   */
  trackFeatureUsage(feature: string, action: string): void {
    this.trackEvent("feature_usage", {
      feature,
      action,
    });
  }

  /**
   * Track error
   */
  trackError(errorName: string, errorMessage: string, context?: Record<string, any>): void {
    this.trackEvent("error", {
      error_name: errorName,
      error_message: errorMessage,
      ...context,
    });
  }
}

// Export singleton instance
export const analytics = Analytics.getInstance();

// Track page views on route changes
export function setupAnalyticsTracking(): void {
  // Track initial page view
  analytics.trackPageView(window.location.pathname);

  // Track page views on history changes
  window.addEventListener("popstate", () => {
    analytics.trackPageView(window.location.pathname);
  });
}
