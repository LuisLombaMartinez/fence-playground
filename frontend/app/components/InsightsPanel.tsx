type Insight = {
  id: string;
  name: string;
  value: number;
};

export function InsightsPanel({ insights }: { insights: Insight[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 mb-8">
      {insights.map((insight) => (
        <div key={insight.id} className="p-4 border rounded">
          <div className="text-sm text-gray-500">{insight.name}</div>
          <div className="text-xl font-semibold">{insight.value}</div>
        </div>
      ))}
    </div>
  );
}
