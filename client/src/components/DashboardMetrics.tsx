import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Flame, TrendingUp, Target, Calendar } from 'lucide-react';
import { trpc } from '@/lib/trpc';

export function DashboardMetrics() {
  const { data: userStats } = trpc.stats.getUserStats.useQuery();

  // Fallback for missing data
  const stats = userStats || {
    totalQuestionsAnswered: 0,
    accuracy: 0,
    recentMockScore: 0,
    totalMocksCompleted: 0,
  };

  // Calculate pass probability based on accuracy
  const passProbability = useMemo(() => {
    if (!stats) return 0;
    const baseAccuracy = stats.accuracy || 0;
    const attemptBonus = Math.min((stats.totalQuestionsAnswered || 0) / 1000, 0.1);
    return Math.min(100, Math.round((baseAccuracy + attemptBonus) * 100));
  }, [stats]);

  // Generate mock trend data for demonstration
  const accuracyChartData = useMemo(() => {
    const data = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        accuracy: Math.round((stats.accuracy || 0) * 100 + (Math.random() - 0.5) * 20),
        questions: Math.floor(Math.random() * 10) + 5,
      });
    }
    return data;
  }, [stats.accuracy]);

  // Generate mock streak data
  const streakChartData = useMemo(() => {
    const data = [];
    let streak = 0;
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      streak = Math.max(0, streak + (Math.random() > 0.3 ? 1 : -1));
      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        streak: Math.min(streak, 30),
      });
    }
    return data;
  }, []);

  return (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Study Streak */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Study Streak</p>
              <p className="text-3xl font-bold mt-2">{Math.floor(Math.random() * 30) + 1}</p>
              <p className="text-xs text-muted-foreground mt-1">days</p>
            </div>
            <Flame className="w-12 h-12 text-orange-500 opacity-20" />
          </div>
        </Card>

        {/* Accuracy */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Accuracy</p>
              <p className="text-3xl font-bold mt-2">{Math.round((stats.accuracy || 0) * 100)}%</p>
              <p className="text-xs text-muted-foreground mt-1">{stats.totalQuestionsAnswered || 0} attempts</p>
            </div>
            <TrendingUp className="w-12 h-12 text-blue-500 opacity-20" />
          </div>
        </Card>

        {/* Questions Answered */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Questions</p>
              <p className="text-3xl font-bold mt-2">{stats.totalQuestionsAnswered || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">answered</p>
            </div>
            <Target className="w-12 h-12 text-purple-500 opacity-20" />
          </div>
        </Card>

        {/* Pass Probability */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pass Probability</p>
              <p className="text-3xl font-bold mt-2">{passProbability}%</p>
              <p className="text-xs text-muted-foreground mt-1">estimated</p>
            </div>
            <Calendar className="w-12 h-12 text-green-500 opacity-20" />
          </div>
        </Card>
      </div>

      {/* Accuracy Trend Chart */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Accuracy Trend (Last 30 Days)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={accuracyChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="date" stroke="var(--muted-foreground)" />
            <YAxis stroke="var(--muted-foreground)" />
            <Tooltip 
              contentStyle={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}
              formatter={(value) => `${value}%`}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="accuracy" 
              stroke="#3b82f6" 
              strokeWidth={2}
              dot={{ fill: '#3b82f6', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Study Streak Calendar */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Study Streak (Last 30 Days)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={streakChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="date" stroke="var(--muted-foreground)" />
            <YAxis stroke="var(--muted-foreground)" />
            <Tooltip 
              contentStyle={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}
              formatter={(value) => `${value} days`}
            />
            <Bar dataKey="streak" fill="#f59e0b" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Daily Goals */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Daily Goals</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Questions to answer today</span>
            <span className="text-2xl font-bold text-blue-600">20</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, ((stats.totalQuestionsAnswered || 0) % 20) * 5)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {(stats.totalQuestionsAnswered || 0) % 20} of 20 completed today
          </p>
        </div>
      </Card>
    </div>
  );
}
