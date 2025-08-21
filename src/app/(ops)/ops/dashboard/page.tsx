
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function OpsDashboard() {
  return (
    <div className="p-4 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Панель оператора</CardTitle>
          <CardDescription>
            Добро пожаловать в панель управления. Для навигации используйте меню слева.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg p-8 text-center text-muted-foreground">
            <p>Выберите раздел в меню, чтобы начать работу.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
