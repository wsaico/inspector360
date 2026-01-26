'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null
    };

    public static getDerivedStateFromError(error: Error): State {
        // Actualiza el estado para que el siguiente renderizado muestre la UI alternativa.
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        console.error("Component Stack:", errorInfo.componentStack);
        this.setState({ errorInfo });
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="flex h-screen w-full items-center justify-center bg-gray-50 p-4">
                    <Card className="w-full max-w-lg shadow-xl border-red-200">
                        <CardHeader className="bg-red-50 border-b border-red-100 pb-4">
                            <div className="flex items-center gap-3 text-red-700">
                                <div className="bg-red-100 p-2 rounded-full">
                                    <AlertTriangle className="h-6 w-6" />
                                </div>
                                <CardTitle className="text-xl">Algo salió mal</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                            <div className="space-y-2">
                                <p className="font-semibold text-gray-900">
                                    Se ha producido un error inesperado al renderizar este componente.
                                </p>
                                <p className="text-sm text-gray-500">
                                    Detalles técnicos han sido registrados en la consola del navegador (F12).
                                </p>
                            </div>

                            {this.state.error && (
                                <div className="bg-slate-900 rounded-lg p-4 overflow-auto max-h-60 text-xs font-mono text-red-300 my-4 border border-slate-700 shadow-inner">
                                    <p className="font-bold text-red-400 mb-2">{this.state.error.toString()}</p>
                                    {this.state.errorInfo && (
                                        <pre className="text-slate-400 whitespace-pre-wrap">
                                            {this.state.errorInfo.componentStack}
                                        </pre>
                                    )}
                                </div>
                            )}

                            <div className="pt-2 flex justify-end">
                                <Button
                                    onClick={() => window.location.reload()}
                                    className="bg-red-600 hover:bg-red-700 text-white shadow-md transition-all active:scale-95"
                                >
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Recargar Página
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            );
        }

        return this.props.children;
    }
}
