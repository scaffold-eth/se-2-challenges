export const LoadingRow = () => {
  return (
    <tr className="border-b border-base-300">
      <td>
        <div className="h-5 bg-base-300 rounded animate-pulse"></div>
      </td>

      <td>
        <div className="h-5 w-24 bg-base-300 rounded animate-pulse"></div>
      </td>

      <td>
        <div className="h-5 w-24 bg-base-300 rounded animate-pulse"></div>
      </td>

      <td>
        <div className="w-6 h-6 rounded-full bg-base-300 animate-pulse mx-auto"></div>
      </td>
    </tr>
  );
};
