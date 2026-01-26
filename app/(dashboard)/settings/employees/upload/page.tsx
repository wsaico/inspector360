import { BulkUploadForm } from "@/components/safety-talks/bulk-upload-form";

export default function BulkUploadPage() {
    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Carga Masiva de Personal</h1>
                <p className="text-muted-foreground">Sube tu Excel con la lista maestra de empleados.</p>
            </div>

            <BulkUploadForm />
        </div>
    );
}
