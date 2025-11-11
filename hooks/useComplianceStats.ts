/**
 * Hooks de React Query para estadísticas de cumplimiento
 * Optimiza queries a Supabase con caché inteligente
 */

import { useQuery } from '@tanstack/react-query';
import { ComplianceService } from '@/lib/services/compliance';

/**
 * Hook para estadísticas generales de cumplimiento
 * Caché: 15 minutos (datos cambian poco durante el día)
 */
export const useComplianceOverallStats = (filters?: { station?: string; month?: string }) => {
  return useQuery({
    queryKey: ['compliance-overall-stats', filters?.station, filters?.month],
    queryFn: () => ComplianceService.getOverallStats(filters),
    staleTime: 15 * 60 * 1000, // 15 minutos
    gcTime: 30 * 60 * 1000,    // 30 minutos en cache
    // Mantener datos previos mientras carga nuevos (mejor UX)
    placeholderData: (previousData) => previousData,
  });
};

/**
 * Hook para tendencias mensuales
 * Caché: 15 minutos
 */
export const useComplianceMonthlyTrends = (filters?: { station?: string; month?: string }) => {
  return useQuery({
    queryKey: ['compliance-monthly-trends', filters?.station, filters?.month],
    queryFn: () => ComplianceService.getMonthlyTrends(filters),
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });
};

/**
 * Hook para desglose de cumplimiento (Conforme/No Conforme/No Aplica)
 * Caché: 10 minutos (puede cambiar más frecuentemente)
 */
export const useComplianceBreakdown = (filters?: { station?: string }) => {
  return useQuery({
    queryKey: ['compliance-breakdown', filters?.station],
    queryFn: () => ComplianceService.getComplianceBreakdown(filters),
    staleTime: 10 * 60 * 1000, // 10 minutos
    gcTime: 20 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });
};

/**
 * Hook para top issues (no conformidades más frecuentes)
 * Caché: 10 minutos
 */
export const useComplianceTopIssues = (
  limit: number = 10,
  filters?: { station?: string }
) => {
  return useQuery({
    queryKey: ['compliance-top-issues', limit, filters?.station],
    queryFn: () => ComplianceService.getTopIssues(limit, filters),
    staleTime: 10 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });
};

/**
 * Hook para cumplimiento diario (inspecciones por día)
 * Caché: 15 minutos
 */
export const useComplianceDailyCompliance = (filters?: {
  station?: string;
  month?: string;
  aggregateAll?: boolean;
}) => {
  return useQuery({
    queryKey: [
      'compliance-daily',
      filters?.station,
      filters?.month,
      filters?.aggregateAll,
    ],
    queryFn: () => ComplianceService.getDailyCompliance(filters),
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });
};

/**
 * Hook para estado de cumplimiento por estación
 * Solo para Admin/SIG que ven todas las estaciones
 * Caché: 15 minutos
 */
export const useComplianceStationStatus = (
  filters?: { month?: string },
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: ['compliance-station-status', filters?.month],
    queryFn: () => ComplianceService.getStationComplianceStatus(filters),
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    placeholderData: (previousData) => previousData,
    enabled, // Solo ejecutar si enabled=true
  });
};

/**
 * Hook combinado que carga todas las estadísticas en paralelo
 * Útil para el dashboard principal
 * NOTA: Este hook usa los hooks individuales, aprovechando el caché compartido
 */
export const useComplianceDashboard = (filters: {
  station?: string;
  month?: string;
  showAllStations: boolean;
}) => {
  const overallStats = useComplianceOverallStats({
    station: filters.station,
    month: filters.month,
  });

  const monthlyTrends = useComplianceMonthlyTrends({
    station: filters.station,
    month: filters.month,
  });

  const complianceBreakdown = useComplianceBreakdown({
    station: filters.station,
  });

  const topIssues = useComplianceTopIssues(10, {
    station: filters.station,
  });

  const dailyCompliance = useComplianceDailyCompliance({
    station: filters.station,
    month: filters.month,
    aggregateAll: filters.showAllStations && !filters.station,
  });

  const stationStatus = useComplianceStationStatus(
    { month: filters.month },
    filters.showAllStations && !filters.station
  );

  return {
    overallStats,
    monthlyTrends,
    complianceBreakdown,
    topIssues,
    dailyCompliance,
    stationStatus,
    // Estado general de carga
    isLoading:
      overallStats.isLoading ||
      monthlyTrends.isLoading ||
      complianceBreakdown.isLoading ||
      topIssues.isLoading ||
      dailyCompliance.isLoading ||
      stationStatus.isLoading,
    // Si alguno está cargando datos frescos (no desde caché)
    isFetching:
      overallStats.isFetching ||
      monthlyTrends.isFetching ||
      complianceBreakdown.isFetching ||
      topIssues.isFetching ||
      dailyCompliance.isFetching ||
      stationStatus.isFetching,
    // Si hay algún error
    hasError:
      overallStats.isError ||
      monthlyTrends.isError ||
      complianceBreakdown.isError ||
      topIssues.isError ||
      dailyCompliance.isError ||
      stationStatus.isError,
  };
};
