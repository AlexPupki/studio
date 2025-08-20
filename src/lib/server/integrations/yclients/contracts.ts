export interface IYclientsAdapter {
  getAvailability(companyId: number, serviceId: number, date: string, traceId?: string): Promise<any>;
  createAppointment(params: {
    companyId: number;
    personId: number;
    serviceId: number;
    datetime: string;
    clientName: string;
    clientPhone: string;
  }, traceId?: string): Promise<any>;
  cancelAppointment(companyId: number, appointmentId: number, traceId?: string): Promise<any>;
}
