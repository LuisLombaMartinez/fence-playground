type Asset = {
  id: string;
  nominal_value: number;
  status: string;
  due_date: string;
};

export function AssetsTable({ assets }: { assets: Asset[] }) {
  return (
    <table className="w-full border-collapse border">
      <thead>
        <tr>
          <th className="border p-2">ID</th>
          <th className="border p-2">Nominal Value</th>
          <th className="border p-2">Status</th>
          <th className="border p-2">Due Date</th>
        </tr>
      </thead>
      <tbody>
        {assets.map((asset) => (
          <tr key={asset.id}>
            <td className="border p-2">{asset.id}</td>
            <td className="border p-2">{asset.nominal_value}</td>
            <td className="border p-2">{asset.status}</td>
            <td className="border p-2">{asset.due_date}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
