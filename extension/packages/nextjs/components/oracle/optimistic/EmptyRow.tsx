export const EmptyRow = ({
  message = "No assertions match this state.",
  colspan = 4,
}: {
  message?: string;
  colspan?: number;
}) => {
  return (
    <tr>
      <td colSpan={colspan} className="text-center">
        {message}
      </td>
    </tr>
  );
};
