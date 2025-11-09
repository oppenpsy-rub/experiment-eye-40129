import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface DataTableProps {
  data: any[];
}

export const DataTable = ({ data }: DataTableProps) => {
  if (!data || data.length === 0) return null;

  const keys = Object.keys(data[0]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Datenvorschau</CardTitle>
        <CardDescription>Erste {Math.min(10, data.length)} Einträge</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-auto max-h-96">
          <Table>
            <TableHeader>
              <TableRow>
                {keys.map((key) => (
                  <TableHead key={key} className="font-semibold">
                    {key}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.slice(0, 10).map((row, index) => (
                <TableRow key={index}>
                  {keys.map((key) => (
                    <TableCell key={key}>
                      {typeof row[key] === 'number' 
                        ? row[key].toFixed(2) 
                        : row[key]}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
