import { InsightsPanel } from './components/InsightsPanel';
import { AssetsTable } from './components/AssetsTable';

async function getAssets() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/assets`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to fetch assets');
  return res.json();
}

async function getInsights() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/insights`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to fetch insights');
  return res.json();
}

export default async function Home() {
  const [assets, insights] = await Promise.all([getAssets(), getInsights()]);

  return (
    <main className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Portfolio Dashboard</h1>
      <InsightsPanel insights={insights} />
      <AssetsTable assets={assets} />
    </main>
  );
}
